import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Interview, InterviewDocument } from './schemas/interview.schema';

@Injectable()
export class InterviewsCronService {
  constructor(
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

  // Run every hour to check for interview reminders
  @Cron(CronExpression.EVERY_HOUR)
  async sendInterviewReminders() {
    

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    // Find interviews in the next 24 hours that haven't been reminded
    const interviews24h = await this.interviewModel
      .find({
        scheduledDate: {
          $gte: now,
          $lte: in24Hours,
        },
        status: { $in: ['scheduled', 'confirmed', 'rescheduled'] },
        reminderSent: { $ne: true },
      })
      .populate('candidate', 'email fullName')
      .populate('job', 'title')
      .populate('company', 'name')
      .exec();

    // Send 24-hour reminders
    for (const interview of interviews24h) {
      try {
        const candidate = interview.candidate as any;
        const job = interview.job as any;
        const company = interview.company as any;

        // Send email reminder
        await this.mailService['transporter'].sendMail({
          from: this.mailService['configService'].get('MAIL_FROM'),
          to: candidate.email,
          subject: `Interview Reminder: ${job.title} - Tomorrow`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>⏰ Interview Reminder</h2>
              <p>This is a reminder about your upcoming interview tomorrow:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Position:</strong> ${job.title}</p>
                <p><strong>Company:</strong> ${company.name}</p>
                <p><strong>Date:</strong> ${new Date(interview.scheduledDate).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${interview.duration} minutes</p>
                ${interview.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>` : ''}
                ${interview.location ? `<p><strong>Location:</strong> ${interview.location}</p>` : ''}
              </div>
              <p>Good luck with your interview!</p>
            </div>
          `,
        });

        // Send in-app notification
        await this.notificationsService.createNotification({
          user: candidate._id,
          title: 'Interview Tomorrow',
          message: `Reminder: Interview for ${job.title} at ${company.name} is scheduled for tomorrow`,
          type: 'interview',
          actionUrl: `/interviews`,
        });

        // Mark reminder as sent
        await this.interviewModel.findByIdAndUpdate(interview._id, {
          reminderSent: true,
        });

        
      } catch (error) {
        console.error(`Error sending reminder for interview ${interview._id}:`, error);
      }
    }

    // Find interviews in the next 1 hour for last-minute reminders
    const interviews1h = await this.interviewModel
      .find({
        scheduledDate: {
          $gte: now,
          $lte: in1Hour,
        },
        status: { $in: ['scheduled', 'confirmed', 'rescheduled'] },
      })
      .populate('candidate', 'email fullName')
      .populate('job', 'title')
      .exec();

    // Send 1-hour reminders (in-app only to avoid spam)
    for (const interview of interviews1h) {
      try {
        const candidate = interview.candidate as any;
        const job = interview.job as any;

        await this.notificationsService.createNotification({
          user: candidate._id,
          title: 'Interview Starting Soon',
          message: `Your interview for ${job.title} starts in less than 1 hour!`,
          type: 'interview',
          actionUrl: `/interviews`,
        });

        
      } catch (error) {
        console.error(`Error sending 1-hour reminder for interview ${interview._id}:`, error);
      }
    }
  }

  // Run every hour to update past interviews
  @Cron(CronExpression.EVERY_HOUR)
  async updatePastInterviews() {
  

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Find interviews that have passed and are still in scheduled/confirmed status
    const pastInterviews = await this.interviewModel.find({
      scheduledDate: { $lt: twoHoursAgo },
      status: { $in: ['scheduled', 'confirmed', 'rescheduled'] },
    });

    for (const interview of pastInterviews) {
      try {
        // Mark as no-show if not updated
        interview.status = 'no_show' as any;
        await interview.save();

        

        // Notify both parties
        await this.notificationsService.createNotification({
          user: interview.candidate,
          title: 'Interview Marked as No-Show',
          message: 'Your scheduled interview was marked as no-show. Please contact the employer if this is incorrect.',
          type: 'interview',
          actionUrl: `/interviews`,
        });
      } catch (error) {
        console.error(`Error updating past interview ${interview._id}:`, error);
      }
    }
  }

  // Run daily at 9 AM to send interview prep tips
  @Cron('0 9 * * *')
  async sendInterviewPrepTips() {
    

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find interviews scheduled for tomorrow
    const tomorrowInterviews = await this.interviewModel
      .find({
        scheduledDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
        status: { $in: ['scheduled', 'confirmed', 'rescheduled'] },
      })
      .populate('candidate', 'email fullName')
      .populate('job', 'title')
      .exec();

    for (const interview of tomorrowInterviews) {
      try {
        const candidate = interview.candidate as any;
        const job = interview.job as any;

        await this.notificationsService.createNotification({
          user: candidate._id,
          title: 'Interview Preparation Tips',
          message: `Your interview for ${job.title} is tomorrow! Here are some tips: Research the company, prepare questions, test your tech setup, and review your resume.`,
          type: 'interview',
          actionUrl: `/interviews`,
        });

        
      } catch (error) {
        console.error(`Error sending prep tips for interview ${interview._id}:`, error);
      }
    }
  }
}
