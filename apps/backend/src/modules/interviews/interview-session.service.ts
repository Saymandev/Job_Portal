import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InterviewSession, InterviewSessionDocument, SessionFeedback, SessionQuestion, SessionStatus } from './schemas/interview-session.schema';

export interface CreateSessionDto {
  title: string;
  description: string;
  candidateId: string;
  jobId?: string;
  applicationId?: string;
  templateId?: string;
  scheduledDate: Date;
  duration: number;
  location: string;
  meetingLink?: string;
  meetingPassword?: string;
  tags?: string[];
  metadata?: any;
  attendees?: string[];
  notes?: string;
}

export interface UpdateSessionDto extends Partial<CreateSessionDto> {
  status?: SessionStatus;
  actualStartDate?: Date;
  actualEndDate?: Date;
  questions?: SessionQuestion[];
  feedback?: SessionFeedback;
  isRecorded?: boolean;
  recordingUrl?: string;
  totalScore?: number;
  maxScore?: number;
  isArchived?: boolean;
}

export interface SessionQuery {
  interviewerId?: string;
  candidateId?: string;
  jobId?: string;
  status?: SessionStatus;
  scheduledDateFrom?: Date;
  scheduledDateTo?: Date;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class InterviewSessionService {
  constructor(
    @InjectModel(InterviewSession.name)
    private sessionModel: Model<InterviewSessionDocument>,
  ) {}

  /**
   * Create a new interview session
   */
  async createSession(createSessionDto: CreateSessionDto, interviewerId: string): Promise<InterviewSession> {
    const session = new this.sessionModel({
      ...createSessionDto,
      interviewerId,
      status: SessionStatus.SCHEDULED,
    });

    return await session.save();
  }

  /**
   * Get sessions with filtering and pagination
   */
  async getSessions(query: SessionQuery): Promise<{
    sessions: InterviewSession[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      interviewerId,
      candidateId,
      jobId,
      status,
      scheduledDateFrom,
      scheduledDateTo,
      tags,
      search,
      page = 1,
      limit = 10,
      sortBy = 'scheduledDate',
      sortOrder = 'asc',
    } = query;

    const filter: any = {};

    if (interviewerId) filter.interviewerId = interviewerId;
    if (candidateId) filter.candidateId = candidateId;
    if (jobId) filter.jobId = jobId;
    if (status) filter.status = status;
    if (tags && tags.length > 0) filter.tags = { $in: tags };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (scheduledDateFrom || scheduledDateTo) {
      filter.scheduledDate = {};
      if (scheduledDateFrom) filter.scheduledDate.$gte = scheduledDateFrom;
      if (scheduledDateTo) filter.scheduledDate.$lte = scheduledDateTo;
    }

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('interviewerId', 'name email')
        .populate('candidateId', 'name email')
        .populate('jobId', 'title company')
        .populate('templateId', 'name description')
        .exec(),
      this.sessionModel.countDocuments(filter),
    ]);

    return {
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single session by ID
   */
  async getSessionById(id: string): Promise<InterviewSession> {
    const session = await this.sessionModel
      .findById(id)
      .populate('interviewerId', 'name email')
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company')
      .populate('templateId', 'name description')
      .exec();

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    return session;
  }

  /**
   * Update a session
   */
  async updateSession(
    id: string,
    updateSessionDto: UpdateSessionDto,
    userId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    // Check permissions
    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own interview sessions');
    }

    Object.assign(session, updateSessionDto);
    return await session.save();
  }

  /**
   * Start an interview session
   */
  async startSession(id: string, userId: string): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only start your own interview sessions');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session can only be started if it is scheduled');
    }

    session.status = SessionStatus.IN_PROGRESS;
    session.actualStartDate = new Date();

    return await session.save();
  }

  /**
   * Complete an interview session
   */
  async completeSession(
    id: string,
    userId: string,
    questions: SessionQuestion[],
    feedback?: SessionFeedback,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only complete your own interview sessions');
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session can only be completed if it is in progress');
    }

    // Calculate scores
    const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const maxScore = questions.length * 10; // Assuming max score per question is 10

    session.status = SessionStatus.COMPLETED;
    session.actualEndDate = new Date();
    session.questions = questions;
    session.feedback = feedback;
    session.totalScore = totalScore;
    session.maxScore = maxScore;

    return await session.save();
  }

  /**
   * Cancel an interview session
   */
  async cancelSession(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own interview sessions');
    }

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed session');
    }

    session.status = SessionStatus.CANCELLED;
    if (reason) {
      session.notes = (session.notes || '') + `\nCancellation reason: ${reason}`;
    }

    return await session.save();
  }

  /**
   * Mark session as no-show
   */
  async markNoShow(id: string, userId: string): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own interview sessions');
    }

    session.status = SessionStatus.NO_SHOW;
    session.actualEndDate = new Date();

    return await session.save();
  }

  /**
   * Add question to session
   */
  async addQuestion(
    id: string,
    userId: string,
    question: SessionQuestion,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own interview sessions');
    }

    session.questions.push(question);
    return await session.save();
  }

  /**
   * Update question in session
   */
  async updateQuestion(
    id: string,
    questionId: string,
    userId: string,
    questionData: Partial<SessionQuestion>,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own interview sessions');
    }

    const questionIndex = session.questions.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) {
      throw new NotFoundException('Question not found in session');
    }

    session.questions[questionIndex] = { ...session.questions[questionIndex], ...questionData };
    return await session.save();
  }

  /**
   * Submit feedback for session
   */
  async submitFeedback(
    id: string,
    userId: string,
    feedback: SessionFeedback,
  ): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only submit feedback for your own interview sessions');
    }

    if (session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException('Feedback can only be submitted for completed sessions');
    }

    session.feedback = feedback;
    return await session.save();
  }

  /**
   * Archive a session
   */
  async archiveSession(id: string, userId: string): Promise<InterviewSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.interviewerId.toString() !== userId) {
      throw new ForbiddenException('You can only archive your own interview sessions');
    }

    session.isArchived = true;
    session.archivedAt = new Date();
    session.archivedBy = userId;

    return await session.save();
  }

  /**
   * Get upcoming sessions for interviewer
   */
  async getUpcomingSessions(interviewerId: string, limit: number = 10): Promise<InterviewSession[]> {
    return await this.sessionModel
      .find({
        interviewerId,
        status: SessionStatus.SCHEDULED,
        scheduledDate: { $gte: new Date() },
      })
      .sort({ scheduledDate: 1 })
      .limit(limit)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company')
      .exec();
  }

  /**
   * Get session statistics
   */
  async getSessionStats(interviewerId?: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    averageScore: number;
    averageDuration: number;
  }> {
    const filter = interviewerId ? { interviewerId } : {};

    const [
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      averageScore,
      averageDuration,
    ] = await Promise.all([
      this.sessionModel.countDocuments(filter),
      this.sessionModel.countDocuments({ ...filter, status: SessionStatus.COMPLETED }),
      this.sessionModel.countDocuments({ ...filter, status: SessionStatus.CANCELLED }),
      this.sessionModel.countDocuments({ ...filter, status: SessionStatus.NO_SHOW }),
      this.sessionModel.aggregate([
        { $match: { ...filter, status: SessionStatus.COMPLETED, totalScore: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$totalScore' } } },
      ]),
      this.sessionModel.aggregate([
        { $match: { ...filter, status: SessionStatus.COMPLETED, actualStartDate: { $exists: true }, actualEndDate: { $exists: true } } },
        {
          $addFields: {
            duration: {
              $divide: [
                { $subtract: ['$actualEndDate', '$actualStartDate'] },
                60000, // Convert to minutes
              ],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
    ]);

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      averageScore: Math.round((averageScore[0]?.avg || 0) * 10) / 10,
      averageDuration: Math.round((averageDuration[0]?.avg || 0) * 10) / 10,
    };
  }

  /**
   * Get sessions by date range
   */
  async getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    interviewerId?: string,
  ): Promise<InterviewSession[]> {
    const filter: any = {
      scheduledDate: { $gte: startDate, $lte: endDate },
    };

    if (interviewerId) {
      filter.interviewerId = interviewerId;
    }

    return await this.sessionModel
      .find(filter)
      .sort({ scheduledDate: 1 })
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company')
      .exec();
  }
}
