import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
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

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const { userId, plan } = session.metadata;

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
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = stripeSubscription.status as any;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      await subscription.save();
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.autoRenew = false;
      await subscription.save();
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscription = await this.subscriptionModel.findOne({
      stripeCustomerId: invoice.customer as string,
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await subscription.save();
    }
  }

  async getUserSubscription(userId: string): Promise<SubscriptionDocument> {
    let subscription = await this.subscriptionModel.findOne({ user: userId });

    if (!subscription) {
      // Create free subscription
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
}

