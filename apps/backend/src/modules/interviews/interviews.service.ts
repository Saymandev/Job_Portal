import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Interview, InterviewDocument } from './schemas/interview.schema';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

  async scheduleInterview(data: {
    applicationId: string;
    scheduledDate: Date;
    duration: number;
    type: string;
    location?: string;
    meetingLink?: string;
    notes?: string;
  }): Promise<InterviewDocument> {
    const application = await this.applicationModel
      .findById(data.applicationId)
      .populate('job')
      .populate('applicant')
      .populate('company');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check for scheduling conflicts
    const conflict = await this.interviewModel.findOne({
      interviewer: (application.job as any).postedBy,
      scheduledDate: {
        $gte: new Date(new Date(data.scheduledDate).getTime() - data.duration * 60000),
        $lte: new Date(new Date(data.scheduledDate).getTime() + data.duration * 60000),
      },
      status: { $in: ['scheduled', 'confirmed'] },
    });

    if (conflict) {
      throw new ConflictException('You have another interview scheduled at this time');
    }

    const interview = await this.interviewModel.create({
      application: data.applicationId,
      job: application.job,
      candidate: application.applicant,
      interviewer: (application.job as any).postedBy,
      company: application.company,
      scheduledDate: data.scheduledDate,
      duration: data.duration,
      type: data.type,
      location: data.location,
      meetingLink: data.meetingLink,
      notes: data.notes,
      status: 'scheduled',
    });

    // Update application status
    await this.applicationModel.findByIdAndUpdate(data.applicationId, {
      status: 'interview_scheduled',
      interviewDate: data.scheduledDate,
    });

    // Send notifications
    const applicant = application.applicant as any;
    const job = application.job as any;
    const company = application.company as any;

    await Promise.all([
      this.notificationsService.createNotification({
        user: applicant._id,
        title: 'Interview Scheduled',
        message: `Your interview for ${job.title} has been scheduled`,
        type: 'interview',
        application: data.applicationId,
        actionUrl: `/dashboard/interviews/${interview._id}`,
      }),
      this.mailService.sendInterviewScheduledEmail(
        applicant.email,
        job.title,
        company.name,
        data.scheduledDate,
      ),
    ]);

    return interview;
  }

  async getUserInterviews(userId: string, role: string): Promise<InterviewDocument[]> {
    const query = role === 'employer' 
      ? { interviewer: userId }
      : { candidate: userId };

    return this.interviewModel
      .find(query)
      .populate('job', 'title')
      .populate('candidate', 'fullName email')
      .populate('interviewer', 'fullName email')
      .populate('company', 'name')
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async getInterviewById(id: string): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(id)
      .populate('job')
      .populate('candidate', 'fullName email avatar')
      .populate('interviewer', 'fullName email avatar')
      .populate('company', 'name logo')
      .populate('application')
      .exec();

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async updateInterviewStatus(
    id: string,
    status: string,
    feedback?: string,
    cancelReason?: string,
  ): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(id)
      .populate('candidate');

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    interview.status = status as any;
    if (feedback) interview.feedback = feedback;
    if (cancelReason) interview.cancelReason = cancelReason;

    await interview.save();

    // Notify candidate
    const candidate = interview.candidate as any;
    await this.notificationsService.createNotification({
      user: candidate._id,
      title: 'Interview Status Updated',
      message: `Your interview status has been updated to ${status}`,
      type: 'interview',
      actionUrl: `/dashboard/interviews/${id}`,
    });

    return interview;
  }

  async rescheduleInterview(
    id: string,
    newDate: Date,
    notes?: string,
  ): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(id)
      .populate('candidate');

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    interview.scheduledDate = newDate;
    interview.status = 'rescheduled' as any;
    if (notes) interview.notes = notes;

    await interview.save();

    // Notify candidate
    const candidate = interview.candidate as any;
    await this.notificationsService.createNotification({
      user: candidate._id,
      title: 'Interview Rescheduled',
      message: `Your interview has been rescheduled to ${new Date(newDate).toLocaleString()}`,
      type: 'interview',
      actionUrl: `/dashboard/interviews/${id}`,
    });

    return interview;
  }

  async getUpcomingInterviews(userId: string, role: string): Promise<InterviewDocument[]> {
    const query: any = {
      scheduledDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed', 'rescheduled'] },
    };

    if (role === 'employer') {
      query.interviewer = userId;
    } else {
      query.candidate = userId;
    }

    return this.interviewModel
      .find(query)
      .populate('job', 'title')
      .populate('candidate', 'fullName email')
      .populate('interviewer', 'fullName email')
      .populate('company', 'name')
      .sort({ scheduledDate: 1 })
      .limit(10)
      .exec();
  }

  async getPendingRescheduleRequests(userId: string): Promise<InterviewDocument[]> {
    return this.interviewModel
      .find({
        interviewer: userId,
        rescheduleRequested: true,
        rescheduleApproved: false,
      })
      .populate('job', 'title')
      .populate('candidate', 'fullName email')
      .populate('company', 'name')
      .sort({ rescheduleRequestedAt: -1 })
      .exec();
  }

  async requestReschedule(
    interviewId: string,
    requestedNewDate: string,
    rescheduleReason: string,
    candidateId: string,
  ): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(interviewId)
      .populate('job', 'title')
      .populate('interviewer', 'fullName email');
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    // Check if the candidate is the one requesting reschedule
    if (interview.candidate.toString() !== candidateId.toString()) {
      throw new BadRequestException('Only the candidate can request reschedule');
    }

    // Check if reschedule has already been requested (limit to 1 time)
    if (interview.rescheduleRequestCount >= 1) {
      throw new BadRequestException('Reschedule request limit reached (1 time only)');
    }

    // Check if interview is in a valid state for reschedule request
    if (!['scheduled', 'confirmed'].includes(interview.status)) {
      throw new BadRequestException('Interview cannot be rescheduled in current status');
    }

    // Update interview with reschedule request
    interview.rescheduleRequested = true;
    interview.rescheduleReason = rescheduleReason;
    interview.requestedNewDate = new Date(requestedNewDate);
    interview.rescheduleRequestCount += 1;
    interview.rescheduleRequestedAt = new Date();
    interview.rescheduleApproved = false;

    await interview.save();

    // Send notification to interviewer about reschedule request
    try {
      console.log('Sending notification to interviewer:', interview.interviewer.toString());
      const notification = await this.notificationsService.createNotification({
        user: interview.interviewer.toString(),
        title: 'Interview Reschedule Request',
        message: `Candidate has requested to reschedule the interview for ${(interview.job as any)?.title || 'the position'}. Reason: ${rescheduleReason}`,
        type: 'interview_reschedule_request',
        actionUrl: `/dashboard/interviews/${interviewId}`,
        metadata: {
          interviewId: interviewId,
          candidateId: candidateId,
          requestedNewDate: requestedNewDate,
          rescheduleReason: rescheduleReason,
        },
      });
      console.log('Notification created successfully:', notification._id);
    } catch (error) {
      console.error('Error sending reschedule notification:', error);
      // Don't fail the reschedule request if notification fails
    }

    return this.getInterviewById(interviewId);
  }

  async approveReschedule(
    interviewId: string,
    approved: boolean,
    newDate?: string,
    notes?: string,
    interviewerId?: string,
  ): Promise<InterviewDocument> {
    const interview = await this.interviewModel
      .findById(interviewId)
      .populate('job', 'title')
      .populate('candidate', 'fullName email');
    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    // Check if there's a pending reschedule request
    if (!interview.rescheduleRequested) {
      throw new BadRequestException('No pending reschedule request');
    }

    // Check if the interviewer is the one approving (if interviewerId provided)
    if (interviewerId && interview.interviewer.toString() !== interviewerId.toString()) {
      throw new BadRequestException('Only the interviewer can approve reschedule requests');
    }

    if (approved) {
      // Approve the reschedule
      interview.rescheduleApproved = true;
      interview.rescheduleApprovedAt = new Date();
      
      if (newDate) {
        interview.scheduledDate = new Date(newDate);
      } else if (interview.requestedNewDate) {
        interview.scheduledDate = interview.requestedNewDate;
      }
      
      if (notes) {
        interview.notes = notes;
      }
      
      // Reset reschedule request flags
      interview.rescheduleRequested = false;
      interview.requestedNewDate = undefined;
      interview.rescheduleReason = undefined;
    } else {
      // Reject the reschedule
      interview.rescheduleApproved = false;
      interview.rescheduleRequested = false;
      interview.requestedNewDate = undefined;
      interview.rescheduleReason = undefined;
    }

    await interview.save();

    // Send notification to candidate about reschedule decision
    try {
      console.log('Sending reschedule decision notification to candidate:', interview.candidate.toString());
      const notification = await this.notificationsService.createNotification({
        user: interview.candidate.toString(),
        title: approved ? 'Interview Reschedule Approved' : 'Interview Reschedule Rejected',
        message: approved 
          ? `Your reschedule request for ${(interview.job as any)?.title || 'the position'} has been approved. New date: ${interview.scheduledDate.toLocaleDateString()}`
          : `Your reschedule request for ${(interview.job as any)?.title || 'the position'} has been rejected. The original date remains unchanged.`,
        type: approved ? 'interview_reschedule_approved' : 'interview_reschedule_rejected',
        actionUrl: `/dashboard/interviews/${interviewId}`,
        metadata: {
          interviewId: interviewId,
          approved: approved,
          newDate: approved ? interview.scheduledDate : undefined,
          notes: notes,
        },
      });
      console.log('Reschedule decision notification created successfully:', notification._id);
    } catch (error) {
      console.error('Error sending reschedule approval notification:', error);
      // Don't fail the approval if notification fails
    }

    return this.getInterviewById(interviewId);
  }
}
