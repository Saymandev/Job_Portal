import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Subscription, SubscriptionDocument, SubscriptionPlan, SubscriptionStatus } from './schemas/subscription.schema';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(userId: string, plan: SubscriptionPlan) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only employers can create subscriptions
    if (user.role !== 'employer') {
      throw new ForbiddenException('Only employers can create subscriptions. Job seekers can apply to jobs for free.');
    }

    let priceId: string;
    switch (plan) {
      case SubscriptionPlan.BASIC:
        priceId = this.configService.get('STRIPE_PRICE_ID_BASIC');
        break;
      case SubscriptionPlan.PRO:
        priceId = this.configService.get('STRIPE_PRICE_ID_PRO');
        break;
      case SubscriptionPlan.ENTERPRISE:
        priceId = this.configService.get('STRIPE_PRICE_ID_ENTERPRISE');
        break;
      default:
        throw new Error('Invalid plan');
    }

    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/subscription/cancel`,
      metadata: {
        userId: userId.toString(),
        plan,
      },
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`📡 Received webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_action_required':
        await this.handlePaymentActionRequired(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    console.log('🛒 Checkout session completed:', {
      sessionId: session.id,
      metadata: session.metadata,
      customer: session.customer
    });

    const { userId, plan } = session.metadata;

    // Skip notification if no userId (test events)
    if (!userId) {
      console.log('⚠️ No userId in session metadata, skipping admin notifications (likely test event)');
      return;
    }

    // Get subscription details
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Get or create subscription record
    let subscription = await this.subscriptionModel.findOne({ user: userId });

    const jobPostsLimit = this.getJobPostsLimit(plan as SubscriptionPlan);

    if (subscription) {
      subscription.plan = plan as SubscriptionPlan;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.stripeCustomerId = session.customer as string;
      subscription.stripeSubscriptionId = session.subscription as string;
      subscription.stripePriceId = stripeSubscription.items.data[0].price.id;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.jobPostsLimit = jobPostsLimit;
      subscription.autoRenew = true;
      await subscription.save();
    } else {
      await this.subscriptionModel.create({
        user: userId,
        plan: plan as SubscriptionPlan,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        jobPostsLimit,
        jobPostsUsed: 0,
        autoRenew: true,
      });
    }

    // Notify all admins about the new subscription
    await this.notifyAdminsAboutNewSubscription(userId, plan as SubscriptionPlan);
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      const oldStatus = subscription.status;
      subscription.status = stripeSubscription.status as any;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      await subscription.save();

      // Notify admins about subscription status changes
      if (oldStatus !== subscription.status) {
        await this.notifyAdminsAboutSubscriptionUpdate(subscription.user.toString(), subscription.plan, oldStatus, subscription.status);
      }
    }
  }

  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
    console.log('🆕 Subscription created:', stripeSubscription.id);
    // This event is typically handled by checkout.session.completed
    // But we can add additional logic here if needed
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    console.log('🗑️ Subscription deleted:', stripeSubscription.id);
    
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      const oldStatus = subscription.status;
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.autoRenew = false;
      await subscription.save();

      // Notify admins about subscription cancellation
      await this.notifyAdminsAboutSubscriptionUpdate(
        subscription.user.toString(),
        subscription.plan,
        oldStatus,
        SubscriptionStatus.CANCELLED
      );
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log('💳 Payment succeeded:', invoice.id);
    
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: invoice.customer as string,
    });

    if (subscription && subscription.status === SubscriptionStatus.PAST_DUE) {
      const oldStatus = subscription.status;
      subscription.status = SubscriptionStatus.ACTIVE;
      await subscription.save();

      // Notify admins about payment success (recovery from past due)
      await this.notifyAdminsAboutSubscriptionUpdate(
        subscription.user.toString(),
        subscription.plan,
        oldStatus,
        SubscriptionStatus.ACTIVE
      );
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log('❌ Payment failed:', invoice.id);
    
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: invoice.customer as string,
    });

    if (subscription) {
      const oldStatus = subscription.status;
      subscription.status = SubscriptionStatus.PAST_DUE;
      await subscription.save();

      // Notify admins about payment failure
      await this.notifyAdminsAboutSubscriptionUpdate(
        subscription.user.toString(),
        subscription.plan,
        oldStatus,
        SubscriptionStatus.PAST_DUE
      );
    }
  }

  private async handlePaymentActionRequired(invoice: Stripe.Invoice) {
    console.log('⚠️ Payment action required:', invoice.id);
    
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: invoice.customer as string,
    });

    if (subscription) {
      // Payment requires additional authentication (e.g., 3D Secure)
      // Keep subscription active but log the event
      console.log(`Payment authentication required for subscription ${subscription._id}`);
      
      // Optionally notify admins about payment issues
      await this.notifyAdminsAboutPaymentIssue(
        subscription.user.toString(),
        subscription.plan,
        'Payment authentication required'
      );
    }
  }

  async getUserSubscription(userId: string): Promise<SubscriptionDocument | null> {
    // Get user to check their role
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Job seekers don't need subscriptions - they can apply for free
    if (user.role === 'job_seeker') {
      return null;
    }

    // Only employers and admins can have subscriptions
    let subscription = await this.subscriptionModel.findOne({ user: userId });

    if (!subscription && user.role === 'employer') {
      // Create free subscription only for employers
      subscription = await this.subscriptionModel.create({
        user: userId,
        plan: SubscriptionPlan.FREE,
        status: 'active',
        jobPostsLimit: 5,
        jobPostsUsed: 0,
      });
    }

    return subscription;
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.subscriptionModel.findOne({ user: userId });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('Active subscription not found');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.autoRenew = false;
    await subscription.save();

    return subscription;
  }

  private getJobPostsLimit(plan: SubscriptionPlan): number {
    switch (plan) {
      case SubscriptionPlan.FREE:
        return 5;
      case SubscriptionPlan.BASIC:
        return 25; // Matches frontend
      case SubscriptionPlan.PRO:
        return 100; // Matches frontend (was unlimited in frontend)
      case SubscriptionPlan.ENTERPRISE:
        return 1000; // Matches frontend (was unlimited in frontend)
      default:
        return 5;
    }
  }

  async incrementJobPostsUsed(userId: string): Promise<void> {
    await this.subscriptionModel.findOneAndUpdate(
      { user: userId },
      { $inc: { jobPostsUsed: 1 } },
    );
  }

  async getSubscriptionLimits(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    
    // Get current active job count
    const currentJobCount = await this.jobModel.countDocuments({ 
      postedBy: userId, 
      status: { $in: ['open', 'paused'] } 
    });

    return {
      plan: subscription.plan,
      jobPostsLimit: subscription.jobPostsLimit,
      jobPostsUsed: currentJobCount,
      remainingJobs: Math.max(0, subscription.jobPostsLimit - currentJobCount),
      canPostJob: currentJobCount < subscription.jobPostsLimit,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      autoRenew: subscription.autoRenew,
    };
  }

  async verifyCheckoutSession(userId: string, sessionId: string) {
    try {
      console.log(`Verifying session ${sessionId} for user ${userId}`);
      
      // Retrieve the session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      console.log('Session retrieved:', { id: session.id, payment_status: session.payment_status });
      
      if (!session || session.payment_status !== 'paid') {
        throw new Error(`Invalid or unpaid session. Status: ${session?.payment_status}`);
      }

      if (!session.subscription) {
        throw new Error('No subscription found in session');
      }

      // Get the subscription from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
      console.log('Stripe subscription retrieved:', { id: stripeSubscription.id, status: stripeSubscription.status });
      
      if (!stripeSubscription.items.data.length) {
        throw new Error('No items found in subscription');
      }

      const priceId = stripeSubscription.items.data[0].price.id;
      console.log('Price ID:', priceId);
      
      const plan = this.mapStripePriceToPlan(priceId);
      
      // Update or create subscription in database
      const subscription = await this.subscriptionModel.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: session.customer as string,
          plan: plan,
          status: this.mapStripeStatusToSubscriptionStatus(stripeSubscription.status),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          autoRenew: !stripeSubscription.cancel_at_period_end,
          jobPostsLimit: this.getJobPostsLimit(plan),
        },
        { upsert: true, new: true }
      );

      console.log('Subscription updated in database:', subscription._id);

      // Notify admins about the new subscription
      await this.notifyAdminsAboutNewSubscription(userId, plan);

      return {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    } catch (error) {
      console.error('Session verification error:', error);
      throw new Error(`Failed to verify checkout session: ${error.message}`);
    }
  }

  private mapStripePriceToPlan(priceId: string): SubscriptionPlan {
    const basicPriceId = this.configService.get('STRIPE_PRICE_ID_BASIC');
    const proPriceId = this.configService.get('STRIPE_PRICE_ID_PRO');
    const enterprisePriceId = this.configService.get('STRIPE_PRICE_ID_ENTERPRISE');

    if (priceId === basicPriceId) return SubscriptionPlan.BASIC;
    if (priceId === proPriceId) return SubscriptionPlan.PRO;
    if (priceId === enterprisePriceId) return SubscriptionPlan.ENTERPRISE;
    
    throw new Error('Unknown price ID');
  }

  private mapStripeStatusToSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'unpaid':
        return SubscriptionStatus.INACTIVE;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  /**
   * Notify all admins about a new subscription
   */
  private async notifyAdminsAboutNewSubscription(userId: string, plan: SubscriptionPlan): Promise<void> {
    try {
      console.log(`🔔 Starting admin notification for subscription: userId=${userId}, plan=${plan}`);
      
      // Get all admin users
      const admins = await this.userModel.find({ role: 'admin' }).select('_id fullName email');
      console.log(`👥 Found ${admins.length} admin users:`, admins.map(a => ({ id: a._id, name: a.fullName })));
      
      if (admins.length === 0) {
        console.log('⚠️ No admin users found to notify about new subscription');
        return;
      }

      // Get user details for the notification
      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) {
        console.log(`❌ User not found for subscription notification: ${userId}`);
        return;
      }
      
      console.log(`👤 User found: ${user.fullName} (${user.email})`);

      // Get actual price from Stripe based on plan
      let priceDisplay = 'Custom pricing';
      try {
        const priceId = this.configService.get(`STRIPE_PRICE_ID_${plan.toUpperCase()}`);
        if (priceId) {
          const stripePrice = await this.stripe.prices.retrieve(priceId);
          if (stripePrice.unit_amount) {
            const amount = (stripePrice.unit_amount / 100).toFixed(2);
            const currency = stripePrice.currency.toUpperCase();
            priceDisplay = `$${amount}/${stripePrice.recurring?.interval || 'month'}`;
          }
        }
      } catch (error) {
        console.log('Could not fetch price from Stripe, using default');
      }

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        user: admin._id.toString(),
        title: '💳 New Subscription Created',
        message: `${user.fullName} (${user.email}) has subscribed to the ${plan.toUpperCase()} plan (${priceDisplay}).`,
        type: 'subscription',
        actionUrl: '/admin/subscriptions',
        metadata: {
          subscriberId: userId,
          subscriberName: user.fullName,
          subscriberEmail: user.email,
          plan,
          price: priceDisplay,
          createdAt: new Date(),
        },
      }));

      // Send notifications to all admins
      console.log(`📤 Creating ${notifications.length} notifications for admins...`);
      for (const notification of notifications) {
        try {
          const createdNotification = await this.notificationsService.createNotification(notification);
          console.log(`✅ Notification created for admin ${notification.user}:`, createdNotification._id);
        } catch (error) {
          console.error(`❌ Failed to create notification for admin ${notification.user}:`, error);
        }
      }

      console.log(`✅ Notified ${admins.length} admin(s) about new subscription: ${user.fullName} - ${plan}`);
    } catch (error) {
      console.error('❌ Error notifying admins about new subscription:', error);
      // Don't fail the subscription creation if notification fails
    }
  }

  /**
   * Notify all admins about subscription status changes
   */
  private async notifyAdminsAboutSubscriptionUpdate(userId: string, plan: SubscriptionPlan, oldStatus: SubscriptionStatus, newStatus: SubscriptionStatus): Promise<void> {
    try {
      // Get all admin users
      const admins = await this.userModel.find({ role: 'admin' }).select('_id');
      
      if (admins.length === 0) {
        console.log('No admin users found to notify about subscription update');
        return;
      }

      // Get user details for the notification
      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) {
        console.log('User not found for subscription update notification');
        return;
      }

      // Determine the appropriate notification message and emoji
      let title = '📝 Subscription Updated';
      let message = '';
      
      switch (newStatus) {
        case SubscriptionStatus.CANCELLED:
          title = '❌ Subscription Cancelled';
          message = `${user.fullName} (${user.email}) has cancelled their ${plan.toUpperCase()} subscription.`;
          break;
        case SubscriptionStatus.PAST_DUE:
          title = '⚠️ Subscription Past Due';
          message = `${user.fullName} (${user.email})'s ${plan.toUpperCase()} subscription payment is past due.`;
          break;
        case SubscriptionStatus.INACTIVE:
          title = '🔴 Subscription Inactive';
          message = `${user.fullName} (${user.email})'s ${plan.toUpperCase()} subscription is now inactive.`;
          break;
        case SubscriptionStatus.ACTIVE:
          title = '✅ Subscription Reactivated';
          message = `${user.fullName} (${user.email})'s ${plan.toUpperCase()} subscription has been reactivated.`;
          break;
        default:
          message = `${user.fullName} (${user.email})'s ${plan.toUpperCase()} subscription status changed from ${oldStatus} to ${newStatus}.`;
      }

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        user: admin._id.toString(),
        title,
        message,
        type: 'subscription',
        actionUrl: '/admin/subscriptions',
        metadata: {
          subscriberId: userId,
          subscriberName: user.fullName,
          subscriberEmail: user.email,
          plan,
          oldStatus,
          newStatus,
          updatedAt: new Date(),
        },
      }));

      // Send notifications to all admins
      for (const notification of notifications) {
        await this.notificationsService.createNotification(notification);
      }

      console.log(`✅ Notified ${admins.length} admin(s) about subscription update: ${user.fullName} - ${oldStatus} → ${newStatus}`);
    } catch (error) {
      console.error('❌ Error notifying admins about subscription update:', error);
      // Don't fail the subscription update if notification fails
    }
  }

  /**
   * Notify all admins about payment issues
   */
  private async notifyAdminsAboutPaymentIssue(userId: string, plan: SubscriptionPlan, issue: string): Promise<void> {
    try {
      const admins = await this.userModel.find({ role: 'admin' }).select('_id');
      if (admins.length === 0) return;

      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) return;

      const notifications = admins.map(admin => ({
        user: admin._id.toString(),
        title: '⚠️ Payment Issue Alert',
        message: `${user.fullName} (${user.email}) has a payment issue with their ${plan.toUpperCase()} subscription: ${issue}.`,
        type: 'subscription',
        actionUrl: '/admin/subscriptions',
        metadata: {
          subscriberId: userId,
          subscriberName: user.fullName,
          subscriberEmail: user.email,
          plan,
          issue,
          createdAt: new Date(),
        },
      }));

      for (const notification of notifications) {
        await this.notificationsService.createNotification(notification);
      }

      console.log(`✅ Notified ${admins.length} admin(s) about payment issue: ${user.fullName} - ${issue}`);
    } catch (error) {
      console.error('❌ Error notifying admins about payment issue:', error);
    }
  }
}

