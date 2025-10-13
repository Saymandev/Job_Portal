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
}

