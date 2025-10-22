import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST') || this.configService.get('MAIL_HOST'),
      port: this.configService.get('EMAIL_PORT') || this.configService.get('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER') || this.configService.get('MAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD') || this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Job Portal!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Reset Your Password - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendApplicationConfirmation(email: string, jobTitle: string) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Application Received - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Application Received</h2>
          <p>Your application for <strong>${jobTitle}</strong> has been successfully submitted.</p>
          <p>The employer will review your application and contact you if you're selected for an interview.</p>
          <p>You can track your application status in your dashboard.</p>
          <p>Good luck!</p>
        </div>
      `,
    });
  }

  async sendApplicationStatusUpdate(email: string, jobTitle: string, status: string) {
    let statusMessage = '';
    let statusColor = '#4F46E5';

    switch (status) {
      case 'reviewing':
        statusMessage = 'Your application is being reviewed';
        statusColor = '#F59E0B';
        break;
      case 'shortlisted':
        statusMessage = 'Congratulations! You have been shortlisted';
        statusColor = '#10B981';
        break;
      case 'interview_scheduled':
        statusMessage = 'An interview has been scheduled';
        statusColor = '#3B82F6';
        break;
      case 'rejected':
        statusMessage = 'Thank you for your interest';
        statusColor = '#EF4444';
        break;
      case 'accepted':
        statusMessage = 'Congratulations! Your application has been accepted';
        statusColor = '#10B981';
        break;
      default:
        statusMessage = 'Your application status has been updated';
    }

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: `Application Update: ${jobTitle} - Job Portal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">${statusMessage}</h2>
          <p>Your application for <strong>${jobTitle}</strong> has been updated.</p>
          <p><strong>New Status:</strong> ${status.replace('_', ' ').toUpperCase()}</p>
          <p>Log in to your dashboard for more details.</p>
        </div>
      `,
    });
  }

  async sendDailySummary(email: string, summary: any) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Daily Summary - Job Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Daily Summary</h2>
          <ul>
            <li>New Jobs: ${summary.newJobs}</li>
            <li>Applications Received: ${summary.applicationsReceived}</li>
            <li>Messages: ${summary.unreadMessages}</li>
          </ul>
          <a href="${this.configService.get('FRONTEND_URL')}/dashboard">View Dashboard</a>
        </div>
      `,
    });
  }

  async sendNewJobMatchNotification(email: string, jobTitle: string, companyName: string, jobUrl: string) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: `New Job Match: ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎯 New Job Match!</h2>
          <p>We found a job that matches your profile:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${jobTitle}</h3>
            <p><strong>Company:</strong> ${companyName}</p>
          </div>
          <a href="${jobUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            View Job
          </a>
        </div>
      `,
    });
  }

  async sendMessageNotification(email: string, senderName: string, messagePreview: string) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: `New Message from ${senderName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>💬 New Message</h2>
          <p><strong>${senderName}</strong> sent you a message:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">${messagePreview.substring(0, 150)}...</p>
          </div>
          <a href="${this.configService.get('FRONTEND_URL')}/messages" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Messages
          </a>
        </div>
      `,
    });
  }

  async sendInterviewScheduledEmail(email: string, jobTitle: string, companyName: string, interviewDate: Date) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: `Interview Scheduled: ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📅 Interview Scheduled!</h2>
          <p>Your interview has been scheduled for the following position:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Position:</strong> ${jobTitle}</p>
            <p><strong>Company:</strong> ${companyName}</p>
            <p><strong>Interview Date:</strong> ${new Date(interviewDate).toLocaleString()}</p>
          </div>
          <p>Good luck with your interview!</p>
        </div>
      `,
    });
  }

  async sendWeeklyDigest(email: string, userName: string, stats: any) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Your Weekly Job Search Summary',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📊 Weekly Summary for ${userName}</h2>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Applications Submitted:</strong> ${stats.newApplications || 0}</p>
            <p><strong>Profile Views:</strong> ${stats.profileViews || 0}</p>
            <p><strong>New Job Matches:</strong> ${stats.newMatches || 0}</p>
            <p><strong>Messages Received:</strong> ${stats.newMessages || 0}</p>
          </div>
          <a href="${this.configService.get('FRONTEND_URL')}/dashboard" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Dashboard
          </a>
        </div>
      `,
    });
  }

  async sendNotificationEmail(email: string, title: string, message: string, actionUrl?: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
        to: email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${title}</h2>
            <p>${message}</p>
            ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Details
            </a>` : ''}
          </div>
        `,
      });
      // Email notification sent
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email notification to ${email}:`, error);
      return false;
    }
  }

  async sendSubscriptionReceipt(
    email: string, 
    userName: string, 
    plan: string, 
    amount: string, 
    subscriptionId: string, 
    nextBillingDate?: Date,
    features?: string[]
  ) {
    const planFeatures = features || this.getPlanFeatures(plan);
    
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM') || this.configService.get('EMAIL_USER'),
      to: email,
      subject: `🎉 Subscription Confirmation - ${plan.toUpperCase()} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to ${plan.toUpperCase()}!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your subscription has been successfully activated</p>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #4F46E5; margin: 0;">Receipt & Confirmation</h2>
              <p style="color: #6b7280; margin: 5px 0;">Thank you for subscribing, ${userName}!</p>
            </div>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #374151;">Subscription Details</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Plan:</span>
                <span style="font-weight: 600; color: #374151;">${plan.toUpperCase()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Amount:</span>
                <span style="font-weight: 600; color: #374151;">${amount}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Subscription ID:</span>
                <span style="font-family: monospace; font-size: 12px; color: #6b7280;">${subscriptionId}</span>
              </div>
              ${nextBillingDate ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Next Billing:</span>
                <span style="font-weight: 600; color: #374151;">${new Date(nextBillingDate).toLocaleDateString()}</span>
              </div>
              ` : ''}
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #374151;">✅ Your ${plan.toUpperCase()} Plan Includes:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                ${planFeatures.map(feature => `<li style="margin-bottom: 8px;">${feature}</li>`).join('')}
              </ul>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0; color: #065f46; font-weight: 500;">
                🚀 Your subscription is now active! You can start posting jobs and accessing premium features immediately.
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${this.configService.get('FRONTEND_URL')}/employer/dashboard" 
                 style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px; font-weight: 500;">
                Go to Dashboard
              </a>
              <a href="${this.configService.get('FRONTEND_URL')}/subscription" 
                 style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Manage Subscription
              </a>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Need help? Contact our support team at 
              <a href="mailto:support@jobportal.com" style="color: #4F46E5;">support@jobportal.com</a>
            </p>
            <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
              This receipt was sent to ${email}
            </p>
          </div>
        </div>
      `,
    });
  }

  private getPlanFeatures(plan: string): string[] {
    const features = {
      'free': [
        'Post up to 5 job listings',
        'Basic job posting features',
        'View job applications',
        'Email support'
      ],
      'basic': [
        'Post up to 25 job listings',
        'Advanced job posting features',
        'Application management tools',
        'Priority email support',
        'Job posting analytics',
        'Priority application processing',
        'Enhanced candidate matching',
        'Application analytics dashboard',
        'Unlimited resume downloads'
      ],
      'pro': [
        'Post up to 100 job listings',
        'Premium job posting features',
        'Advanced analytics dashboard',
        'Candidate screening tools',
        'Priority support',
        'Featured job listings',
        'Direct candidate messaging',
        'Featured company profile',
        'Salary insights & market data',
        'Interview preparation tools'
      ],
      'enterprise': [
        'Unlimited job listings',
        'All premium features',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced reporting',
        'All enhanced employer features'
      ]
    };
    
    return features[plan.toLowerCase()] || features['free'];
  }
}

