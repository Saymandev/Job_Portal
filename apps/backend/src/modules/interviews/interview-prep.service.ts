import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';

export interface InterviewQuestion {
  _id?: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer: string;
  tips: string[];
  followUpQuestions: string[];
  industry: string;
  role: string;
}

export interface InterviewTemplate {
  _id?: string;
  name: string;
  description: string;
  duration: number; // in minutes
  questions: InterviewQuestion[];
  categories: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  industry: string;
  role: string;
}

export interface InterviewSession {
  _id?: string;
  employerId: string;
  candidateId: string;
  applicationId: string;
  templateId: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes: string;
  rating: number; // 1-5
  feedback: string;
  questions: Array<{
    questionId: string;
    question: string;
    answer: string;
    rating: number;
    notes: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class InterviewPrepService {
  private questions: InterviewQuestion[] = [];
  private templates: InterviewTemplate[] = [];
  private sessions: InterviewSession[] = [];

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {
    this.initializeDefaultData();
  }

  /**
   * Get interview questions by category and difficulty
   */
  async getQuestions(query: any): Promise<InterviewQuestion[]> {
    const { category, difficulty, industry, role } = query;
    return this.getInterviewQuestions(category, difficulty, industry, role, 20);
  }

  async getTemplates(): Promise<InterviewTemplate[]> {
    return this.getInterviewTemplates();
  }

  async getSessions(employerId: string): Promise<InterviewSession[]> {
    return this.getInterviewSessions(employerId);
  }

  async getTips(query: any): Promise<any> {
    const { industry = 'Technology', role = 'Software Engineer', difficulty = 'medium' } = query;
    return this.getInterviewTips(industry, role, difficulty);
  }

  async getInterviewQuestions(
    category?: string,
    difficulty?: string,
    industry?: string,
    role?: string,
    limit: number = 20,
  ): Promise<InterviewQuestion[]> {
    let filteredQuestions = this.questions;

    if (category) {
      filteredQuestions = filteredQuestions.filter(q => q.category === category);
    }
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }
    if (industry) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.industry.toLowerCase().includes(industry.toLowerCase())
      );
    }
    if (role) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.role.toLowerCase().includes(role.toLowerCase())
      );
    }

    // Shuffle and limit
    return this.shuffleArray(filteredQuestions).slice(0, limit);
  }

  /**
   * Get interview templates
   */
  async getInterviewTemplates(
    industry?: string,
    role?: string,
    difficulty?: string,
  ): Promise<InterviewTemplate[]> {
    let filteredTemplates = this.templates;

    if (industry) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.industry.toLowerCase().includes(industry.toLowerCase())
      );
    }
    if (role) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.role.toLowerCase().includes(role.toLowerCase())
      );
    }
    if (difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === difficulty);
    }

    return filteredTemplates;
  }

  /**
   * Create custom interview template
   */
  async createInterviewTemplate(
    employerId: string,
    templateData: Omit<InterviewTemplate, '_id'>,
  ): Promise<InterviewTemplate> {
    const template: InterviewTemplate = {
      _id: Date.now().toString(),
      ...templateData,
    };

    this.templates.push(template);
    return template;
  }

  /**
   * Schedule interview session
   */
  async scheduleInterview(
    employerId: string,
    candidateId: string,
    applicationId: string,
    templateId: string,
    scheduledAt: Date,
  ): Promise<InterviewSession> {
    // Verify application exists and belongs to employer
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job', 'postedBy');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if ((application.job as any).postedBy.toString() !== employerId) {
      throw new NotFoundException('You do not have access to this application');
    }

    const template = this.templates.find(t => t._id === templateId);
    if (!template) {
      throw new NotFoundException('Interview template not found');
    }

    const session: InterviewSession = {
      _id: Date.now().toString(),
      employerId,
      candidateId,
      applicationId,
      templateId,
      status: 'scheduled',
      scheduledAt,
      notes: '',
      rating: 0,
      feedback: '',
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.push(session);
    return session;
  }

  /**
   * Start interview session
   */
  async startInterview(sessionId: string, employerId: string): Promise<InterviewSession> {
    const session = this.sessions.find(s => s._id === sessionId && s.employerId === employerId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.status !== 'scheduled') {
      throw new Error('Interview session cannot be started');
    }

    session.status = 'in-progress';
    session.startedAt = new Date();
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Complete interview session
   */
  async completeInterview(
    sessionId: string,
    employerId: string,
    questions: Array<{
      questionId: string;
      answer: string;
      rating: number;
      notes: string;
    }>,
    overallRating: number,
    feedback: string,
  ): Promise<InterviewSession> {
    const session = this.sessions.find(s => s._id === sessionId && s.employerId === employerId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.status !== 'in-progress') {
      throw new Error('Interview session is not in progress');
    }

    // Map questions to include the question text
    const questionsWithText = questions.map(q => {
      const question = this.questions.find(question => question._id === q.questionId);
      return {
        questionId: q.questionId,
        question: question?.question || 'Question not found',
        answer: q.answer,
        rating: q.rating,
        notes: q.notes,
      };
    });

    session.status = 'completed';
    session.completedAt = new Date();
    session.questions = questionsWithText;
    session.rating = overallRating;
    session.feedback = feedback;
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Get interview sessions for employer
   */
  async getInterviewSessions(employerId: string): Promise<InterviewSession[]> {
    return this.sessions.filter(s => s.employerId === employerId);
  }

  /**
   * Get interview analytics
   */
  async getInterviewAnalytics(employerId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageRating: number;
    categoryBreakdown: Array<{ category: string; count: number; avgRating: number }>;
    difficultyBreakdown: Array<{ difficulty: string; count: number; avgRating: number }>;
    recentSessions: InterviewSession[];
  }> {
    const employerSessions = this.sessions.filter(s => s.employerId === employerId);
    const completedSessions = employerSessions.filter(s => s.status === 'completed');

    const totalSessions = employerSessions.length;
    const completedCount = completedSessions.length;
    const averageRating = completedCount > 0 
      ? completedSessions.reduce((sum, s) => sum + s.rating, 0) / completedCount 
      : 0;

    // Category breakdown
    const categoryBreakdown = this.analyzeByCategory(completedSessions);

    // Difficulty breakdown
    const difficultyBreakdown = this.analyzeByDifficulty(completedSessions);

    // Recent sessions
    const recentSessions = employerSessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalSessions,
      completedSessions: completedCount,
      averageRating: Math.round(averageRating * 10) / 10,
      categoryBreakdown,
      difficultyBreakdown,
      recentSessions,
    };
  }

  /**
   * Get interview preparation tips
   */
  async getInterviewTips(
    industry: string,
    role: string,
    difficulty: string,
  ): Promise<{
    generalTips: string[];
    technicalTips: string[];
    behavioralTips: string[];
    companyResearch: string[];
    questionsToAsk: string[];
  }> {
    return {
      generalTips: [
        'Research the company thoroughly',
        'Practice your elevator pitch',
        'Prepare specific examples using STAR method',
        'Dress appropriately for the role',
        'Arrive 10-15 minutes early',
        'Bring copies of your resume',
        'Prepare thoughtful questions to ask',
      ],
      technicalTips: [
        'Review relevant technical concepts',
        'Practice coding problems if applicable',
        'Prepare to explain your technical projects',
        'Be ready to discuss your technical experience',
        'Practice explaining complex concepts simply',
      ],
      behavioralTips: [
        'Use the STAR method (Situation, Task, Action, Result)',
        'Prepare examples of leadership, teamwork, and problem-solving',
        'Be specific and quantifiable in your answers',
        'Show enthusiasm and passion for the role',
        'Be honest about challenges and how you overcame them',
      ],
      companyResearch: [
        'Understand the company mission and values',
        'Research recent company news and developments',
        'Learn about the team and company culture',
        'Understand the company\'s position in the market',
        'Research the interviewer if possible',
      ],
      questionsToAsk: [
        'What does success look like in this role?',
        'What are the biggest challenges facing the team?',
        'How do you measure performance in this position?',
        'What opportunities are there for growth and development?',
        'What do you enjoy most about working here?',
      ],
    };
  }

  // Helper methods
  private initializeDefaultData(): void {
    // Initialize with sample questions
    this.questions = [
      {
        _id: '1',
        question: 'Tell me about yourself.',
        category: 'behavioral',
        difficulty: 'easy',
        expectedAnswer: 'A concise overview of your background, experience, and what makes you a good fit for the role.',
        tips: ['Keep it under 2 minutes', 'Focus on relevant experience', 'End with why you\'re interested in this role'],
        followUpQuestions: ['What interests you most about this position?', 'How did you get into this field?'],
        industry: 'general',
        role: 'general',
      },
      {
        _id: '2',
        question: 'Describe a challenging project you worked on.',
        category: 'behavioral',
        difficulty: 'medium',
        expectedAnswer: 'Use the STAR method to describe a specific project, the challenges faced, actions taken, and results achieved.',
        tips: ['Be specific with details', 'Quantify your results', 'Show problem-solving skills'],
        followUpQuestions: ['What would you do differently?', 'How did you handle team conflicts?'],
        industry: 'general',
        role: 'general',
      },
      {
        _id: '3',
        question: 'How do you handle tight deadlines?',
        category: 'situational',
        difficulty: 'medium',
        expectedAnswer: 'Describe your approach to time management, prioritization, and communication under pressure.',
        tips: ['Show your organizational skills', 'Mention communication strategies', 'Give specific examples'],
        followUpQuestions: ['Can you give an example?', 'How do you prioritize tasks?'],
        industry: 'general',
        role: 'general',
      },
    ];

    // Initialize with sample templates
    this.templates = [
      {
        _id: '1',
        name: 'Software Engineer Interview',
        description: 'Comprehensive interview for software engineering positions',
        duration: 60,
        questions: this.questions.filter(q => q.role === 'general'),
        categories: ['technical', 'behavioral', 'situational'],
        difficulty: 'intermediate',
        industry: 'technology',
        role: 'software engineer',
      },
    ];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private analyzeByCategory(sessions: InterviewSession[]): Array<{ category: string; count: number; avgRating: number }> {
    const categoryMap = new Map<string, { count: number; totalRating: number }>();
    
    sessions.forEach(session => {
      session.questions.forEach(q => {
        const question = this.questions.find(qu => qu._id === q.questionId);
        if (question) {
          const category = question.category;
          if (!categoryMap.has(category)) {
            categoryMap.set(category, { count: 0, totalRating: 0 });
          }
          const data = categoryMap.get(category)!;
          data.count++;
          data.totalRating += q.rating;
        }
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      avgRating: data.count > 0 ? data.totalRating / data.count : 0,
    }));
  }

  private analyzeByDifficulty(sessions: InterviewSession[]): Array<{ difficulty: string; count: number; avgRating: number }> {
    const difficultyMap = new Map<string, { count: number; totalRating: number }>();
    
    sessions.forEach(session => {
      session.questions.forEach(q => {
        const question = this.questions.find(qu => qu._id === q.questionId);
        if (question) {
          const difficulty = question.difficulty;
          if (!difficultyMap.has(difficulty)) {
            difficultyMap.set(difficulty, { count: 0, totalRating: 0 });
          }
          const data = difficultyMap.get(difficulty)!;
          data.count++;
          data.totalRating += q.rating;
        }
      });
    });

    return Array.from(difficultyMap.entries()).map(([difficulty, data]) => ({
      difficulty,
      count: data.count,
      avgRating: data.count > 0 ? data.totalRating / data.count : 0,
    }));
  }
}
