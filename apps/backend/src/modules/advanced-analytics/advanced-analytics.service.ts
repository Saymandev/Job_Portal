import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationsService } from '../applications/applications.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AnalyticsInsight, AnalyticsInsightDocument, InsightCategory, InsightType } from './schemas/analytics-insight.schema';

@Injectable()
export class AdvancedAnalyticsService {
  constructor(
    @InjectModel(AnalyticsInsight.name) private analyticsInsightModel: Model<AnalyticsInsightDocument>,
    private subscriptionsService: SubscriptionsService,
    private jobsService: JobsService,
    private applicationsService: ApplicationsService,
    private notificationsService: NotificationsService,
  ) {}

  async generateInsights(userId: string, filters: any = {}): Promise<AnalyticsInsight[]> {
    // Check if user has advanced analytics access
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasAdvancedAnalyticsAccess(subscription.plan)) {
      throw new BadRequestException('Advanced analytics requires Pro or Enterprise subscription');
    }

    const insights: AnalyticsInsight[] = [];

    // Generate market trend insights
    const marketTrendInsight = await this.generateMarketTrendInsight(userId, filters);
    if (marketTrendInsight) insights.push(marketTrendInsight);

    // Generate candidate demographics insights
    const demographicsInsight = await this.generateCandidateDemographicsInsight(userId, filters);
    if (demographicsInsight) insights.push(demographicsInsight);

    // Generate salary analysis insights
    const salaryInsight = await this.generateSalaryAnalysisInsight(userId, filters);
    if (salaryInsight) insights.push(salaryInsight);

    // Generate skill demand insights
    const skillDemandInsight = await this.generateSkillDemandInsight(userId, filters);
    if (skillDemandInsight) insights.push(skillDemandInsight);

    // Generate hiring patterns insights
    const hiringPatternsInsight = await this.generateHiringPatternsInsight(userId, filters);
    if (hiringPatternsInsight) insights.push(hiringPatternsInsight);

    // Generate performance metrics insights
    const performanceInsight = await this.generatePerformanceMetricsInsight(userId, filters);
    if (performanceInsight) insights.push(performanceInsight);

    // Generate predictive insights
    const predictiveInsight = await this.generatePredictiveInsights(userId, filters);
    if (predictiveInsight) insights.push(predictiveInsight);

    return insights;
  }

  async generateAndSaveInsights(userId: string, filters: any = {}): Promise<AnalyticsInsight[]> {
    // Generate insights
    const insights = await this.generateInsights(userId, filters);
    
    if (insights.length > 0) {
      // Save insights to database
      const savedInsights = await this.analyticsInsightModel.insertMany(
        insights.map(insight => ({
          ...insight,
          userId,
          isActive: true,
          isRead: false,
        }))
      );

      // Send notification about new insights
      await this.notificationsService.createNotification({
        user: userId,
        title: '📊 New Analytics Insights Available',
        message: `${insights.length} new analytics insights have been generated for your account. Check them out to optimize your hiring strategy.`,
        type: 'info',
        actionUrl: '/settings/advanced-analytics',
        metadata: {
          insightsCount: insights.length,
          categories: [...new Set(insights.map(i => i.category))],
          types: [...new Set(insights.map(i => i.type))],
          generatedAt: new Date(),
        },
      });

      return savedInsights;
    }

    return [];
  }

  async getInsights(userId: string, filters: any = {}): Promise<AnalyticsInsight[]> {
    const query: any = { userId, isActive: true };
    
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    return this.analyticsInsightModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(filters.limit || 50);
  }

  async getInsight(userId: string, insightId: string): Promise<AnalyticsInsight> {
    const insight = await this.analyticsInsightModel.findOne({
      _id: insightId,
      userId,
      isActive: true,
    });

    if (!insight) {
      throw new NotFoundException('Analytics insight not found');
    }

    return insight;
  }

  async markAsRead(userId: string, insightId: string): Promise<AnalyticsInsight> {
    const insight = await this.analyticsInsightModel.findOneAndUpdate(
      { _id: insightId, userId, isActive: true },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!insight) {
      throw new NotFoundException('Analytics insight not found');
    }

    return insight;
  }

  async getAnalyticsDashboard(userId: string): Promise<any> {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasAdvancedAnalyticsAccess(subscription.plan)) {
      throw new BadRequestException('Advanced analytics requires Pro or Enterprise subscription');
    }

    const insights = await this.getInsights(userId, { limit: 10 });
    const unreadCount = await this.analyticsInsightModel.countDocuments({
      userId,
      isActive: true,
      isRead: false,
    });

    const insightsByType = await this.analyticsInsightModel.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    return {
      totalInsights: insights.length,
      unreadCount,
      insightsByType,
      recentInsights: insights.slice(0, 5),
      subscription: {
        plan: subscription.plan,
        features: this.getAnalyticsFeatures(subscription.plan),
      },
    };
  }

  private async generateMarketTrendInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    // Mock data - in real implementation, this would analyze market data
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.MARKET_TREND,
      category: InsightCategory.GENERAL,
      title: 'Software Engineering Job Market Trends',
      description: 'Analysis of current software engineering job market trends and opportunities',
      summary: 'The software engineering job market shows strong growth with increasing demand for AI/ML skills',
      data: {
        metrics: [
          { name: 'Job Growth Rate', value: 15.2, change: 2.1, changeType: 'increase', unit: '%' },
          { name: 'Average Salary', value: 95000, change: 5.3, changeType: 'increase', unit: 'USD' },
          { name: 'Remote Jobs', value: 68, change: 12.5, changeType: 'increase', unit: '%' },
        ],
        charts: [
          {
            type: 'line',
            title: 'Job Postings Over Time',
            data: [
              { month: 'Jan', jobs: 1200 },
              { month: 'Feb', jobs: 1350 },
              { month: 'Mar', jobs: 1420 },
              { month: 'Apr', jobs: 1580 },
              { month: 'May', jobs: 1650 },
            ],
            xAxis: 'Month',
            yAxis: 'Job Postings',
          },
        ],
        insights: [
          {
            title: 'AI/ML Skills in High Demand',
            description: 'Job postings requiring AI/ML skills have increased by 45% this quarter',
            impact: 'high',
            actionable: true,
          },
          {
            title: 'Remote Work Continues to Grow',
            description: 'Remote software engineering positions now represent 68% of all postings',
            impact: 'medium',
            actionable: true,
          },
        ],
        recommendations: [
          {
            title: 'Focus on AI/ML Skills',
            description: 'Consider highlighting AI/ML experience in job postings to attract more candidates',
            priority: 'high',
            effort: 'medium',
            impact: 'high',
          },
          {
            title: 'Emphasize Remote Work',
            description: 'Clearly advertise remote work options to increase candidate pool',
            priority: 'medium',
            effort: 'low',
            impact: 'medium',
          },
        ],
      },
      confidence: 85,
      isAI_Generated: true,
      isActionable: true,
      priority: 4,
      tags: ['market', 'trends', 'software-engineering'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generateCandidateDemographicsInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.CANDIDATE_DEMOGRAPHICS,
      category: InsightCategory.COMPANY_SPECIFIC,
      title: 'Candidate Demographics Analysis',
      description: 'Analysis of your candidate pool demographics and diversity metrics',
      summary: 'Your candidate pool shows good diversity with opportunities for improvement in certain areas',
      data: {
        metrics: [
          { name: 'Total Candidates', value: 1250, change: 8.2, changeType: 'increase', unit: 'candidates' },
          { name: 'Diversity Score', value: 7.2, change: 0.5, changeType: 'increase', unit: '/10' },
          { name: 'Female Candidates', value: 42, change: 3.1, changeType: 'increase', unit: '%' },
          { name: 'Underrepresented Groups', value: 28, change: 1.8, changeType: 'increase', unit: '%' },
        ],
        charts: [
          {
            type: 'pie',
            title: 'Gender Distribution',
            data: [
              { name: 'Male', value: 58 },
              { name: 'Female', value: 38 },
              { name: 'Non-binary', value: 4 },
            ],
          },
          {
            type: 'bar',
            title: 'Age Distribution',
            data: [
              { age: '22-25', count: 180 },
              { age: '26-30', count: 320 },
              { age: '31-35', count: 280 },
              { age: '36-40', count: 220 },
              { age: '41+', count: 150 },
            ],
            xAxis: 'Age Range',
            yAxis: 'Number of Candidates',
          },
        ],
        insights: [
          {
            title: 'Strong Young Talent Pool',
            description: '68% of your candidates are under 35, indicating a strong pipeline of emerging talent',
            impact: 'high',
            actionable: true,
          },
          {
            title: 'Diversity Improvement Needed',
            description: 'While diversity is improving, there are opportunities to attract more underrepresented candidates',
            impact: 'medium',
            actionable: true,
          },
        ],
        recommendations: [
          {
            title: 'Implement Blind Screening',
            description: 'Use blind screening processes to reduce unconscious bias in initial candidate evaluation',
            priority: 'high',
            effort: 'medium',
            impact: 'high',
          },
          {
            title: 'Partner with Diversity Organizations',
            description: 'Collaborate with organizations that support underrepresented groups in tech',
            priority: 'medium',
            effort: 'high',
            impact: 'medium',
          },
        ],
      },
      confidence: 78,
      isAI_Generated: true,
      isActionable: true,
      priority: 3,
      tags: ['demographics', 'diversity', 'candidates'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generateSalaryAnalysisInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.SALARY_ANALYSIS,
      category: InsightCategory.ROLE_SPECIFIC,
      title: 'Salary Analysis & Market Positioning',
      description: 'Analysis of salary trends and your company\'s market positioning',
      summary: 'Your salary offerings are competitive but below market average for senior roles',
      data: {
        metrics: [
          { name: 'Average Offer', value: 85000, change: 2.1, changeType: 'increase', unit: 'USD' },
          { name: 'Market Average', value: 92000, change: 3.2, changeType: 'increase', unit: 'USD' },
          { name: 'Competitiveness Score', value: 7.2, change: -0.3, changeType: 'decrease', unit: '/10' },
          { name: 'Acceptance Rate', value: 68, change: 5.2, changeType: 'increase', unit: '%' },
        ],
        charts: [
          {
            type: 'bar',
            title: 'Salary by Experience Level',
            data: [
              { level: 'Entry', your: 65000, market: 70000 },
              { level: 'Mid', your: 80000, market: 85000 },
              { level: 'Senior', your: 95000, market: 110000 },
              { level: 'Lead', your: 115000, market: 130000 },
            ],
            xAxis: 'Experience Level',
            yAxis: 'Salary (USD)',
          },
        ],
        insights: [
          {
            title: 'Senior Role Gap',
            description: 'Your senior role salaries are 13% below market average, affecting candidate acceptance',
            impact: 'high',
            actionable: true,
          },
          {
            title: 'Entry Level Competitive',
            description: 'Your entry-level salaries are well-positioned and competitive in the market',
            impact: 'medium',
            actionable: false,
          },
        ],
        recommendations: [
          {
            title: 'Adjust Senior Salaries',
            description: 'Increase senior role salaries by 10-15% to match market rates',
            priority: 'high',
            effort: 'medium',
            impact: 'high',
          },
          {
            title: 'Implement Performance Bonuses',
            description: 'Add performance-based bonuses to make offers more attractive',
            priority: 'medium',
            effort: 'low',
            impact: 'medium',
          },
        ],
      },
      confidence: 92,
      isAI_Generated: true,
      isActionable: true,
      priority: 5,
      tags: ['salary', 'compensation', 'market-analysis'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generateSkillDemandInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.SKILL_DEMAND,
      category: InsightCategory.INDUSTRY_SPECIFIC,
      title: 'In-Demand Skills Analysis',
      description: 'Analysis of the most in-demand skills in your industry and role types',
      summary: 'React, TypeScript, and cloud technologies are the most in-demand skills this quarter',
      data: {
        metrics: [
          { name: 'Top Skill Demand', value: 89, change: 12.3, changeType: 'increase', unit: '%' },
          { name: 'Emerging Skills', value: 15, change: 8.7, changeType: 'increase', unit: 'skills' },
          { name: 'Skill Gap', value: 23, change: -2.1, changeType: 'decrease', unit: '%' },
        ],
        charts: [
          {
            type: 'bar',
            title: 'Top 10 In-Demand Skills',
            data: [
              { skill: 'React', demand: 89 },
              { skill: 'TypeScript', demand: 85 },
              { skill: 'AWS', demand: 78 },
              { skill: 'Node.js', demand: 72 },
              { skill: 'Python', demand: 68 },
              { skill: 'Docker', demand: 65 },
              { skill: 'Kubernetes', demand: 58 },
              { skill: 'GraphQL', demand: 52 },
              { skill: 'Machine Learning', demand: 48 },
              { skill: 'Blockchain', demand: 35 },
            ],
            xAxis: 'Skills',
            yAxis: 'Demand Score',
          },
        ],
        insights: [
          {
            title: 'Frontend Skills Dominate',
            description: 'React and TypeScript are the most in-demand skills, with 89% and 85% demand respectively',
            impact: 'high',
            actionable: true,
          },
          {
            title: 'Cloud Skills Growing',
            description: 'AWS and cloud-related skills show strong growth and high demand',
            impact: 'medium',
            actionable: true,
          },
        ],
        recommendations: [
          {
            title: 'Update Job Requirements',
            description: 'Emphasize React and TypeScript skills in your job postings',
            priority: 'high',
            effort: 'low',
            impact: 'high',
          },
          {
            title: 'Invest in Cloud Training',
            description: 'Provide cloud technology training for existing team members',
            priority: 'medium',
            effort: 'high',
            impact: 'medium',
          },
        ],
      },
      confidence: 88,
      isAI_Generated: true,
      isActionable: true,
      priority: 4,
      tags: ['skills', 'demand', 'technology'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generateHiringPatternsInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.HIRING_PATTERNS,
      category: InsightCategory.COMPANY_SPECIFIC,
      title: 'Hiring Patterns & Efficiency Analysis',
      description: 'Analysis of your hiring patterns, time-to-hire, and efficiency metrics',
      summary: 'Your hiring process is efficient but could benefit from faster initial screening',
      data: {
        metrics: [
          { name: 'Average Time to Hire', value: 28, change: -3.2, changeType: 'decrease', unit: 'days' },
          { name: 'Interview Success Rate', value: 72, change: 5.1, changeType: 'increase', unit: '%' },
          { name: 'Offer Acceptance Rate', value: 68, change: 2.3, changeType: 'increase', unit: '%' },
          { name: 'Cost per Hire', value: 3500, change: -8.7, changeType: 'decrease', unit: 'USD' },
        ],
        charts: [
          {
            type: 'line',
            title: 'Time to Hire by Role',
            data: [
              { role: 'Frontend Developer', days: 25 },
              { role: 'Backend Developer', days: 32 },
              { role: 'Full Stack Developer', days: 28 },
              { role: 'DevOps Engineer', days: 35 },
              { role: 'Data Scientist', days: 42 },
            ],
            xAxis: 'Role',
            yAxis: 'Days',
          },
        ],
        insights: [
          {
            title: 'Frontend Roles Fill Fastest',
            description: 'Frontend developer positions fill 7 days faster than average',
            impact: 'medium',
            actionable: true,
          },
          {
            title: 'Data Science Takes Longer',
            description: 'Data science roles take 14 days longer than average due to specialized requirements',
            impact: 'medium',
            actionable: true,
          },
        ],
        recommendations: [
          {
            title: 'Streamline Data Science Process',
            description: 'Create specialized screening process for data science roles to reduce time to hire',
            priority: 'medium',
            effort: 'medium',
            impact: 'medium',
          },
          {
            title: 'Apply Frontend Process to Other Roles',
            description: 'Use successful frontend hiring process as template for other technical roles',
            priority: 'low',
            effort: 'high',
            impact: 'medium',
          },
        ],
      },
      confidence: 82,
      isAI_Generated: true,
      isActionable: true,
      priority: 3,
      tags: ['hiring', 'efficiency', 'patterns'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generatePerformanceMetricsInsight(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.PERFORMANCE_METRICS,
      category: InsightCategory.COMPANY_SPECIFIC,
      title: 'Job Posting Performance Analysis',
      description: 'Analysis of your job posting performance and optimization opportunities',
      summary: 'Your job postings perform well but could benefit from better keyword optimization',
      data: {
        metrics: [
          { name: 'Average Views per Post', value: 1250, change: 8.3, changeType: 'increase', unit: 'views' },
          { name: 'Application Rate', value: 12.5, change: 1.2, changeType: 'increase', unit: '%' },
          { name: 'Quality Score', value: 7.8, change: 0.3, changeType: 'increase', unit: '/10' },
          { name: 'Time to First Application', value: 4.2, change: -0.8, changeType: 'decrease', unit: 'hours' },
        ],
        charts: [
          {
            type: 'area',
            title: 'Views Over Time',
            data: [
              { day: 'Day 1', views: 450 },
              { day: 'Day 2', views: 320 },
              { day: 'Day 3', views: 280 },
              { day: 'Day 4', views: 200 },
              { day: 'Day 5', views: 150 },
            ],
            xAxis: 'Days',
            yAxis: 'Views',
          },
        ],
        insights: [
          {
            title: 'Strong Initial Engagement',
            description: 'Job postings receive 60% of total views in the first 24 hours',
            impact: 'medium',
            actionable: true,
          },
          {
            title: 'Application Rate Above Average',
            description: 'Your 12.5% application rate is above the industry average of 8.2%',
            impact: 'high',
            actionable: false,
          },
        ],
        recommendations: [
          {
            title: 'Optimize for Keywords',
            description: 'Include more relevant keywords in job titles and descriptions',
            priority: 'medium',
            effort: 'low',
            impact: 'medium',
          },
          {
            title: 'Extend Posting Duration',
            description: 'Keep postings active longer to capture more views over time',
            priority: 'low',
            effort: 'low',
            impact: 'low',
          },
        ],
      },
      confidence: 75,
      isAI_Generated: true,
      isActionable: true,
      priority: 2,
      tags: ['performance', 'optimization', 'job-postings'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  private async generatePredictiveInsights(userId: string, filters: any): Promise<AnalyticsInsight | null> {
    const insight = new this.analyticsInsightModel({
      userId,
      type: InsightType.PREDICTIVE_INSIGHTS,
      category: InsightCategory.GENERAL,
      title: 'Predictive Hiring Insights',
      description: 'AI-powered predictions for your hiring needs and market conditions',
      summary: 'Q4 hiring is expected to be challenging with increased competition for top talent',
      data: {
        metrics: [
          { name: 'Predicted Q4 Difficulty', value: 8.2, change: 1.5, changeType: 'increase', unit: '/10' },
          { name: 'Expected Salary Increase', value: 4.8, change: 0.9, changeType: 'increase', unit: '%' },
          { name: 'Competition Index', value: 7.5, change: 2.1, changeType: 'increase', unit: '/10' },
        ],
        charts: [
          {
            type: 'line',
            title: 'Hiring Difficulty Forecast',
            data: [
              { month: 'Oct', difficulty: 7.2 },
              { month: 'Nov', difficulty: 8.1 },
              { month: 'Dec', difficulty: 8.8 },
              { month: 'Jan', difficulty: 7.9 },
              { month: 'Feb', difficulty: 7.1 },
            ],
            xAxis: 'Month',
            yAxis: 'Difficulty Score',
          },
        ],
        insights: [
          {
            title: 'Q4 Hiring Challenge',
            description: 'Q4 2024 is predicted to be the most challenging quarter for hiring in 2 years',
            impact: 'high',
            actionable: true,
          },
          {
            title: 'Salary Pressure Increasing',
            description: 'Expected 4.8% salary increase will put pressure on your compensation packages',
            impact: 'high',
            actionable: true,
          },
        ],
        recommendations: [
          {
            title: 'Start Q4 Hiring Early',
            description: 'Begin Q4 hiring in September to avoid peak competition period',
            priority: 'high',
            effort: 'medium',
            impact: 'high',
          },
          {
            title: 'Review Compensation Strategy',
            description: 'Update salary ranges to account for expected 4.8% market increase',
            priority: 'high',
            effort: 'low',
            impact: 'high',
          },
        ],
      },
      confidence: 78,
      isAI_Generated: true,
      isActionable: true,
      priority: 5,
      tags: ['predictive', 'forecasting', 'hiring'],
      metadata: {
        source: 'ai_analytics',
        version: '1.0',
        generatedAt: new Date(),
        lastUpdated: new Date(),
      },
    });

    return insight.save();
  }

  /**
   * Check for high-priority insights and send notifications
   */
  async checkHighPriorityInsights(userId: string): Promise<void> {
    const highPriorityInsights = await this.analyticsInsightModel.find({
      userId,
      isActive: true,
      isRead: false,
      priority: { $gte: 8 }, // High priority insights
    }).sort({ createdAt: -1 }).limit(5);

    if (highPriorityInsights.length > 0) {
      await this.notificationsService.createNotification({
        user: userId,
        title: '🚨 High-Priority Analytics Alert',
        message: `You have ${highPriorityInsights.length} high-priority analytics insights that require your attention. These insights could significantly impact your hiring strategy.`,
        type: 'warning',
        actionUrl: '/settings/advanced-analytics',
        metadata: {
          insightsCount: highPriorityInsights.length,
          insightIds: highPriorityInsights.map(i => i._id.toString()),
          categories: [...new Set(highPriorityInsights.map(i => i.category))],
          checkedAt: new Date(),
        },
      });
    }
  }

  private hasAdvancedAnalyticsAccess(plan: string): boolean {
    return ['pro', 'enterprise'].includes(plan);
  }

  private getAnalyticsFeatures(plan: string): any {
    const baseFeatures = {
      basicInsights: true,
      marketTrends: true,
      candidateDemographics: true,
    };

    if (plan === 'pro') {
      return {
        ...baseFeatures,
        salaryAnalysis: true,
        skillDemand: true,
        hiringPatterns: true,
        performanceMetrics: true,
        aiInsights: true,
      };
    }

    if (plan === 'enterprise') {
      return {
        ...baseFeatures,
        salaryAnalysis: true,
        skillDemand: true,
        hiringPatterns: true,
        performanceMetrics: true,
        aiInsights: true,
        predictiveInsights: true,
        customReports: true,
        apiAccess: true,
        realTimeUpdates: true,
      };
    }

    return baseFeatures;
  }
}
