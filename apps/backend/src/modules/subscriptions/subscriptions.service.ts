import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { MailService } from '../mail/mail.service';
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
    private mailService: MailService,
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

    // Received webhook event

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
        // Unhandled webhook event type
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const { userId, plan } = session.metadata;

    // Skip notification if no userId (test events)
    if (!userId) {
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

    // Send subscription receipt email to user
    const userSubscription = await this.subscriptionModel.findOne({ user: userId });
    if (userSubscription) {
      await this.sendSubscriptionReceiptEmail(userId, userSubscription, plan as SubscriptionPlan, stripeSubscription);
    }
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
    // Subscription created
    // This event is typically handled by checkout.session.completed
    // But we can add additional logic here if needed
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    // Subscription deleted
    
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
    // Payment succeeded
    
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
    // Payment failed
    
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
    // Payment action required
    
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: invoice.customer as string,
    });

    if (subscription) {
      // Payment requires additional authentication (e.g., 3D Secure)
      // Keep subscription active but log the event
      // Payment authentication required
      
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
      // Verifying session
      
      // Retrieve the session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      // Session retrieved
      
      if (!session || session.payment_status !== 'paid') {
        throw new Error(`Invalid or unpaid session. Status: ${session?.payment_status}`);
      }

      if (!session.subscription) {
        throw new Error('No subscription found in session');
      }

      // Get the subscription from Stripe
      const stripeSubscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
      // Stripe subscription retrieved
      
      if (!stripeSubscription.items.data.length) {
        throw new Error('No items found in subscription');
      }

      const priceId = stripeSubscription.items.data[0].price.id;
      // Price ID retrieved
      
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
          ...this.setEmployerPlanFeatures(plan),
        },
        { upsert: true, new: true }
      );

      // Subscription updated in database

      // Notify admins about the new subscription
      await this.notifyAdminsAboutNewSubscription(userId, plan);

      // Send subscription receipt email to user
      await this.sendSubscriptionReceiptEmail(userId, subscription, plan, stripeSubscription);

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
      // Starting admin notification for subscription
      
      // Get all admin users
      const admins = await this.userModel.find({ role: 'admin' }).select('_id fullName email');
      // Found admin users
      
      if (admins.length === 0) {
        // No admin users found to notify
        return;
      }

      // Get user details for the notification
      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) {
        // User not found for subscription notification
        return;
      }
      
      // User found

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
        // Could not fetch price from Stripe, using default
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
      // Creating notifications for admins
      for (const notification of notifications) {
        try {
          const createdNotification = await this.notificationsService.createNotification(notification);
          // Notification created for admin
        } catch (error) {
          console.error(`❌ Failed to create notification for admin ${notification.user}:`, error);
        }
      }

      // Notified admins about new subscription
    } catch (error) {
      console.error('❌ Error notifying admins about new subscription:', error);
      // Don't fail the subscription creation if notification fails
    }
  }

  /**
   * Send subscription receipt email to user
   */
  private async sendSubscriptionReceiptEmail(
    userId: string, 
    subscription: any, 
    plan: SubscriptionPlan, 
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      // Sending subscription receipt email
      
      // Get user details
      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) {
        // User not found for receipt email
        return;
      }

      // Get price information from Stripe
      let amount = 'Custom pricing';
      let nextBillingDate: Date | undefined;
      
      try {
        const priceId = stripeSubscription.items.data[0]?.price?.id;
        if (priceId) {
          const stripePrice = await this.stripe.prices.retrieve(priceId);
          if (stripePrice.unit_amount) {
            const priceAmount = (stripePrice.unit_amount / 100).toFixed(2);
            const currency = stripePrice.currency.toUpperCase();
            const interval = stripePrice.recurring?.interval || 'month';
            amount = `$${priceAmount}/${interval}`;
          }
        }
        
        // Get next billing date
        if (stripeSubscription.current_period_end) {
          nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
        }
      } catch (error) {
        // Could not fetch price details from Stripe, using default
      }

      // Send receipt email
      await this.mailService.sendSubscriptionReceipt(
        user.email,
        user.fullName,
        plan,
        amount,
        subscription._id.toString(),
        nextBillingDate
      );

      // Subscription receipt email sent
    } catch (error) {
      console.error('❌ Error sending subscription receipt email:', error);
      // Don't throw error to prevent subscription creation from failing
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
        // No admin users found to notify about subscription update
        return;
      }

      // Get user details for the notification
      const user = await this.userModel.findById(userId).select('fullName email');
      if (!user) {
        // User not found for subscription update notification
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

      // Notified admins about subscription update
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

      // Notified admins about payment issue
    } catch (error) {
      console.error('❌ Error notifying admins about payment issue:', error);
    }
  }

  /**
   * Set enhanced features for employers (job holders) based on subscription plan
   */
  private setEmployerPlanFeatures(plan: SubscriptionPlan): any {
    const features: any = {};

    switch (plan) {
      case SubscriptionPlan.FREE:
        features.priorityApplicationsEnabled = false;
        features.enhancedMatchingEnabled = false;
        features.applicationAnalyticsEnabled = false;
        features.directMessagingEnabled = false;
        features.featuredProfileEnabled = false;
        features.unlimitedResumeDownloads = false;
        features.salaryInsightsEnabled = false;
        features.interviewPrepEnabled = false;
        features.applicationsLimit = 0;
        features.applicationsUsed = 0;
        break;
      
      case SubscriptionPlan.BASIC:
        features.priorityApplicationsEnabled = true;
        features.enhancedMatchingEnabled = true;
        features.applicationAnalyticsEnabled = true;
        features.unlimitedResumeDownloads = true;
        features.directMessagingEnabled = false;
        features.featuredProfileEnabled = false;
        features.salaryInsightsEnabled = false;
        features.interviewPrepEnabled = false;
        features.applicationsLimit = 0;
        features.applicationsUsed = 0;
        break;
      
      case SubscriptionPlan.PRO:
        features.priorityApplicationsEnabled = true;
        features.enhancedMatchingEnabled = true;
        features.applicationAnalyticsEnabled = true;
        features.directMessagingEnabled = true;
        features.featuredProfileEnabled = true;
        features.unlimitedResumeDownloads = true;
        features.salaryInsightsEnabled = true;
        features.interviewPrepEnabled = true;
        features.applicationsLimit = 0;
        features.applicationsUsed = 0;
        break;
      
      case SubscriptionPlan.ENTERPRISE:
        features.priorityApplicationsEnabled = true;
        features.enhancedMatchingEnabled = true;
        features.applicationAnalyticsEnabled = true;
        features.directMessagingEnabled = true;
        features.featuredProfileEnabled = true;
        features.unlimitedResumeDownloads = true;
        features.salaryInsightsEnabled = true;
        features.interviewPrepEnabled = true;
        features.applicationsLimit = 0;
        features.applicationsUsed = 0;
        break;
    }

    return features;
  }
}

