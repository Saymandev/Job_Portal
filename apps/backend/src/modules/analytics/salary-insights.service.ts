import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';

export interface SalaryInsight {
  position: string;
  location: string;
  experienceLevel: string;
  salaryRange: {
    min: number;
    max: number;
    median: number;
    average: number;
  };
  marketTrend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  percentile: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  recommendations: {
    competitiveSalary: number;
    budgetRange: { min: number; max: number };
    negotiationTips: string[];
  };
  dataPoints: number;
  lastUpdated: Date;
}

export interface MarketAnalysis {
  overallTrend: 'growing' | 'declining' | 'stable';
  hotSkills: Array<{ skill: string; demand: number; avgSalary: number }>;
  topPayingRoles: Array<{ role: string; avgSalary: number; growth: number }>;
  locationInsights: Array<{ location: string; avgSalary: number; costOfLiving: number }>;
  experienceLevelInsights: Array<{ level: string; avgSalary: number; demand: number }>;
}

@Injectable()
export class SalaryInsightsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {}

  /**
   * Get salary insights for a specific position and location
   */
  async getSalaryInsights(
    position: string,
    location: string,
    experienceLevel: string,
  ): Promise<SalaryInsight> {
    // Get all jobs matching the criteria
    const jobs = await this.jobModel.find({
      title: { $regex: position, $options: 'i' },
      location: { $regex: location, $options: 'i' },
      experienceLevel,
      salaryMin: { $exists: true, $ne: null },
      salaryMax: { $exists: true, $ne: null },
    }).select('salaryMin salaryMax title location experienceLevel createdAt');

    if (jobs.length === 0) {
      // Return default insights if no data
      return this.getDefaultSalaryInsight(position, location, experienceLevel);
    }

    // Calculate salary statistics
    const salaries = jobs.flatMap(job => [
      job.salaryMin,
      job.salaryMax,
    ]).filter(salary => salary && salary > 0);

    if (salaries.length === 0) {
      return this.getDefaultSalaryInsight(position, location, experienceLevel);
    }

    salaries.sort((a, b) => a - b);
    
    const min = Math.min(...salaries);
    const max = Math.max(...salaries);
    const median = this.calculateMedian(salaries);
    const average = salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length;

    // Calculate percentiles
    const p25 = this.calculatePercentile(salaries, 25);
    const p50 = median;
    const p75 = this.calculatePercentile(salaries, 75);
    const p90 = this.calculatePercentile(salaries, 90);

    // Calculate market trend (simplified)
    const marketTrend = this.calculateMarketTrend(jobs);

    // Generate recommendations
    const recommendations = this.generateRecommendations(median, p75, p90);

    return {
      position,
      location,
      experienceLevel,
      salaryRange: { min, max, median, average: Math.round(average) },
      marketTrend,
      percentile: { p25, p50, p75, p90 },
      recommendations,
      dataPoints: jobs.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get market analysis for a specific industry or location
   */
  async getMarketAnalysis(
    industry?: string,
    location?: string,
  ): Promise<MarketAnalysis> {
    // Build query based on parameters
    const query: any = {};
    if (industry) {
      query.title = { $regex: industry, $options: 'i' };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const jobs = await this.jobModel.find({
      ...query,
      salaryMin: { $exists: true, $ne: null },
      salaryMax: { $exists: true, $ne: null },
    }).select('title location salaryMin salaryMax experienceLevel skills createdAt');

    if (jobs.length === 0) {
      return this.getDefaultMarketAnalysis();
    }

    // Analyze overall trend
    const overallTrend = this.analyzeOverallTrend(jobs);

    // Find hot skills
    const hotSkills = this.findHotSkills(jobs);

    // Find top paying roles
    const topPayingRoles = this.findTopPayingRoles(jobs);

    // Location insights
    const locationInsights = this.analyzeLocationInsights(jobs);

    // Experience level insights
    const experienceLevelInsights = this.analyzeExperienceLevelInsights(jobs);

    return {
      overallTrend,
      hotSkills,
      topPayingRoles,
      locationInsights,
      experienceLevelInsights,
    };
  }

  /**
   * Get salary comparison between different locations
   */
  async getLocationComparison(
    position: string,
    locations: string[],
  ): Promise<Array<{
    location: string;
    avgSalary: number;
    medianSalary: number;
    salaryRange: { min: number; max: number };
    costOfLivingIndex: number;
    adjustedSalary: number;
  }>> {
    const comparisons = await Promise.all(
      locations.map(async (location) => {
        const jobs = await this.jobModel.find({
          title: { $regex: position, $options: 'i' },
          location: { $regex: location, $options: 'i' },
          salaryMin: { $exists: true, $ne: null },
          salaryMax: { $exists: true, $ne: null },
        }).select('salaryMin salaryMax');

        if (jobs.length === 0) {
          return {
            location,
            avgSalary: 0,
            medianSalary: 0,
            salaryRange: { min: 0, max: 0 },
            costOfLivingIndex: 100,
            adjustedSalary: 0,
          };
        }

        const salaries = jobs.flatMap(job => [job.salaryMin, job.salaryMax])
          .filter(salary => salary && salary > 0);
        
        const avgSalary = salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length;
        const medianSalary = this.calculateMedian(salaries);
        const min = Math.min(...salaries);
        const max = Math.max(...salaries);

        // Mock cost of living index (in production, use real data)
        const costOfLivingIndex = this.getCostOfLivingIndex(location);
        const adjustedSalary = avgSalary * (100 / costOfLivingIndex);

        return {
          location,
          avgSalary: Math.round(avgSalary),
          medianSalary: Math.round(medianSalary),
          salaryRange: { min, max },
          costOfLivingIndex,
          adjustedSalary: Math.round(adjustedSalary),
        };
      })
    );

    return comparisons.sort((a, b) => b.adjustedSalary - a.adjustedSalary);
  }

  /**
   * Get salary negotiation insights
   */
  async getNegotiationInsights(
    position: string,
    location: string,
    experienceLevel: string,
    currentSalary?: number,
  ): Promise<{
    marketValue: number;
    negotiationRange: { min: number; max: number };
    leveragePoints: string[];
    redFlags: string[];
    tips: string[];
  }> {
    const insights = await this.getSalaryInsights(position, location, experienceLevel);
    
    const marketValue = insights.salaryRange.median;
    const negotiationRange = {
      min: Math.round(insights.percentile.p25),
      max: Math.round(insights.percentile.p75),
    };

    const leveragePoints = this.generateLeveragePoints(insights, currentSalary);
    const redFlags = this.generateRedFlags(insights, currentSalary);
    const tips = this.generateNegotiationTips(insights, currentSalary);

    return {
      marketValue,
      negotiationRange,
      leveragePoints,
      redFlags,
      tips,
    };
  }

  // Helper methods
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private calculateMarketTrend(jobs: any[]): { direction: 'up' | 'down' | 'stable'; percentage: number; period: string } {
    // Simplified trend calculation based on recent jobs
    const recentJobs = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return jobDate > sixMonthsAgo;
    });

    if (recentJobs.length < 2) {
      return { direction: 'stable', percentage: 0, period: '6 months' };
    }

    const recentAvg = recentJobs.reduce((sum, job) => sum + (job.salaryMin + job.salaryMax) / 2, 0) / recentJobs.length;
    const olderJobs = jobs.filter(job => !recentJobs.includes(job));
    const olderAvg = olderJobs.length > 0 
      ? olderJobs.reduce((sum, job) => sum + (job.salaryMin + job.salaryMax) / 2, 0) / olderJobs.length
      : recentAvg;

    const percentage = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
      direction: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
      percentage: Math.round(Math.abs(percentage) * 10) / 10,
      period: '6 months',
    };
  }

  private generateRecommendations(median: number, p75: number, p90: number): {
    competitiveSalary: number;
    budgetRange: { min: number; max: number };
    negotiationTips: string[];
  } {
    return {
      competitiveSalary: Math.round(p75),
      budgetRange: {
        min: Math.round(median * 0.9),
        max: Math.round(p90),
      },
      negotiationTips: [
        'Research shows 75th percentile is the sweet spot for competitive offers',
        'Consider total compensation package, not just base salary',
        'Highlight unique skills and achievements during negotiations',
        'Be prepared to discuss market data to support your request',
      ],
    };
  }

  private getDefaultSalaryInsight(position: string, location: string, experienceLevel: string): SalaryInsight {
    return {
      position,
      location,
      experienceLevel,
      salaryRange: { min: 50000, max: 100000, median: 75000, average: 75000 },
      marketTrend: { direction: 'stable', percentage: 0, period: '6 months' },
      percentile: { p25: 60000, p50: 75000, p75: 90000, p90: 110000 },
      recommendations: {
        competitiveSalary: 90000,
        budgetRange: { min: 67500, max: 110000 },
        negotiationTips: ['Research market rates', 'Highlight relevant experience'],
      },
      dataPoints: 0,
      lastUpdated: new Date(),
    };
  }

  private getDefaultMarketAnalysis(): MarketAnalysis {
    return {
      overallTrend: 'stable',
      hotSkills: [],
      topPayingRoles: [],
      locationInsights: [],
      experienceLevelInsights: [],
    };
  }

  private analyzeOverallTrend(jobs: any[]): 'growing' | 'declining' | 'stable' {
    // Simplified analysis
    return 'stable';
  }

  private findHotSkills(jobs: any[]): Array<{ skill: string; demand: number; avgSalary: number }> {
    // Simplified skill analysis
    return [];
  }

  private findTopPayingRoles(jobs: any[]): Array<{ role: string; avgSalary: number; growth: number }> {
    // Simplified role analysis
    return [];
  }

  private analyzeLocationInsights(jobs: any[]): Array<{ location: string; avgSalary: number; costOfLiving: number }> {
    // Simplified location analysis
    return [];
  }

  private analyzeExperienceLevelInsights(jobs: any[]): Array<{ level: string; avgSalary: number; demand: number }> {
    // Simplified experience analysis
    return [];
  }

  private getCostOfLivingIndex(location: string): number {
    // Mock cost of living data
    const mockData: { [key: string]: number } = {
      'san francisco': 150,
      'new york': 140,
      'seattle': 130,
      'boston': 125,
      'austin': 110,
      'denver': 105,
      'chicago': 100,
      'atlanta': 95,
      'dallas': 90,
      'phoenix': 85,
    };

    const locationKey = location.toLowerCase().split(',')[0].trim();
    return mockData[locationKey] || 100;
  }

  private generateLeveragePoints(insights: SalaryInsight, currentSalary?: number): string[] {
    const points = [];
    
    if (currentSalary && currentSalary < insights.percentile.p50) {
      points.push('Your current salary is below market median');
    }
    
    if (insights.marketTrend.direction === 'up') {
      points.push('Market is trending upward - good time to negotiate');
    }
    
    points.push('You have access to current market data');
    
    return points;
  }

  private generateRedFlags(insights: SalaryInsight, currentSalary?: number): string[] {
    const flags = [];
    
    if (currentSalary && currentSalary > insights.percentile.p90) {
      flags.push('Your salary is above 90th percentile - may be at ceiling');
    }
    
    if (insights.marketTrend.direction === 'down') {
      flags.push('Market is declining - negotiate carefully');
    }
    
    return flags;
  }

  private generateNegotiationTips(insights: SalaryInsight, currentSalary?: number): string[] {
    return [
      'Use the 75th percentile as your target salary',
      'Prepare specific examples of your achievements',
      'Consider the total compensation package',
      'Be ready to walk away if the offer is too low',
      'Practice your negotiation pitch beforehand',
    ];
  }
}
