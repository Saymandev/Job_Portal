import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SalaryData {
  position: string;
  location: string;
  experienceLevel: string;
  salaryRange: {
    min: number;
    max: number;
    median: number;
    average: number;
  };
  percentile: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  marketTrend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  dataSource: string;
  lastUpdated: Date;
  confidence: number; // 0-100
}

export interface MarketAnalysis {
  overallTrend: string;
  hotSkills: Array<{
    skill: string;
    demand: number;
    avgSalary: number;
  }>;
  topPayingRoles: Array<{
    role: string;
    avgSalary: number;
    growth: number;
  }>;
  locationInsights: Array<{
    location: string;
    avgSalary: number;
    costOfLiving: string;
  }>;
  dataSource: string;
  lastUpdated: Date;
}

@Injectable()
export class SalaryDataService {
  private readonly logger = new Logger(SalaryDataService.name);
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private configService: ConfigService) {}

  /**
   * Get salary data from multiple sources with fallback
   */
  async getSalaryData(query: {
    position: string;
    location: string;
    experienceLevel: string;
  }): Promise<SalaryData> {
    const cacheKey = `salary_${query.position}_${query.location}_${query.experienceLevel}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Returning cached salary data for ${query.position}`);
      return cached.data;
    }

    try {
      // Try multiple APIs in order of preference (free APIs first)
      const apis = [
        () => this.getAdzunaSalary(query),
        () => this.getIndeedSalary(query),
        () => this.getGlassdoorSalary(query),
        () => this.getPayScaleSalary(query),
        () => this.getLinkedInSalary(query),
        () => this.getFallbackSalary(query),
      ];

      for (const apiCall of apis) {
        try {
          const data = await apiCall();
          if (data) {
            // Cache the result
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
          }
        } catch (error) {
          this.logger.warn(`API call failed, trying next source: ${error.message}`);
        }
      }

      throw new Error('All salary data sources failed');
    } catch (error) {
      this.logger.error('Failed to fetch salary data:', error);
      // Return fallback data
      return this.getFallbackSalary(query);
    }
  }

  /**
   * Get market analysis from multiple sources
   */
  async getMarketAnalysis(): Promise<MarketAnalysis> {
    const cacheKey = 'market_analysis';
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log('Returning cached market analysis');
      return cached.data;
    }

    try {
      // Try multiple APIs
      const apis = [
        () => this.getGlassdoorMarketAnalysis(),
        () => this.getLinkedInMarketAnalysis(),
        () => this.getFallbackMarketAnalysis(),
      ];

      for (const apiCall of apis) {
        try {
          const data = await apiCall();
          if (data) {
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
          }
        } catch (error) {
          this.logger.warn(`Market analysis API call failed: ${error.message}`);
        }
      }

      throw new Error('All market analysis sources failed');
    } catch (error) {
      this.logger.error('Failed to fetch market analysis:', error);
      return this.getFallbackMarketAnalysis();
    }
  }

  /**
   * Adzuna API integration (Free alternative)
   */
  private async getAdzunaSalary(query: any): Promise<SalaryData | null> {
    const appId = this.configService.get('ADZUNA_APP_ID');
    const appKey = this.configService.get('ADZUNA_APP_KEY');
    
    if (!appId || !appKey) {
      this.logger.warn('Adzuna API credentials not configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.adzuna.com/v1/api/jobs/us/search/1', {
        params: {
          app_id: appId,
          app_key: appKey,
          what: query.position,
          where: query.location,
          results_per_page: 50,
          content_type: 'application/json',
        },
        timeout: 10000,
      });

      if (response.data && response.data.results) {
        return this.transformAdzunaData(response.data, query);
      }
    } catch (error) {
      this.logger.error('Adzuna API error:', error.message);
    }

    return null;
  }

  /**
   * Indeed API integration (Free alternative)
   */
  private async getIndeedSalary(query: any): Promise<SalaryData | null> {
    const publisherId = this.configService.get('INDEED_PUBLISHER_ID');
    
    if (!publisherId) {
      this.logger.warn('Indeed API credentials not configured');
      return null;
    }

    try {
      const response = await axios.get('https://indeed-indeed.p.rapidapi.com/apisearch', {
        params: {
          publisher: publisherId,
          q: query.position,
          l: query.location,
          sort: 'date',
          radius: '25',
          limit: '50',
          fromage: '30',
        },
        headers: {
          'X-RapidAPI-Key': this.configService.get('RAPIDAPI_KEY'),
          'X-RapidAPI-Host': 'indeed-indeed.p.rapidapi.com',
        },
        timeout: 10000,
      });

      if (response.data && response.data.results) {
        return this.transformIndeedData(response.data, query);
      }
    } catch (error) {
      this.logger.error('Indeed API error:', error.message);
    }

    return null;
  }

  /**
   * Glassdoor API integration
   */
  private async getGlassdoorSalary(query: any): Promise<SalaryData | null> {
    const apiKey = this.configService.get('GLASSDOOR_API_KEY');
    if (!apiKey) {
      this.logger.warn('Glassdoor API key not configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.glassdoor.com/api/api.htm', {
        params: {
          't.p': apiKey,
          't.k': this.configService.get('GLASSDOOR_PARTNER_ID'),
          userip: '0.0.0.0',
          useragent: 'Mozilla/5.0',
          format: 'json',
          v: '1',
          action: 'jobs-stats',
          jobTitle: query.position,
          location: query.location,
        },
        timeout: 10000,
      });

      if (response.data && response.data.response && response.data.response.jobs) {
        const jobData = response.data.response.jobs[0];
        return this.transformGlassdoorData(jobData, query);
      }
    } catch (error) {
      this.logger.error('Glassdoor API error:', error.message);
    }

    return null;
  }

  /**
   * PayScale API integration
   */
  private async getPayScaleSalary(query: any): Promise<SalaryData | null> {
    const apiKey = this.configService.get('PAYSCALE_API_KEY');
    if (!apiKey) {
      this.logger.warn('PayScale API key not configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.payscale.com/v1/salary', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          job_title: query.position,
          location: query.location,
          experience_level: query.experienceLevel,
        },
        timeout: 10000,
      });

      if (response.data && response.data.salary) {
        return this.transformPayScaleData(response.data, query);
      }
    } catch (error) {
      this.logger.error('PayScale API error:', error.message);
    }

    return null;
  }

  /**
   * LinkedIn Salary Insights integration
   */
  private async getLinkedInSalary(query: any): Promise<SalaryData | null> {
    const apiKey = this.configService.get('LINKEDIN_API_KEY');
    if (!apiKey) {
      this.logger.warn('LinkedIn API key not configured');
      return null;
    }

    try {
      const response = await axios.get('https://api.linkedin.com/v2/salaryInsights', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          jobTitle: query.position,
          location: query.location,
          experienceLevel: query.experienceLevel,
        },
        timeout: 10000,
      });

      if (response.data && response.data.salaryInsights) {
        return this.transformLinkedInData(response.data, query);
      }
    } catch (error) {
      this.logger.error('LinkedIn API error:', error.message);
    }

    return null;
  }

  /**
   * Fallback salary data when APIs fail
   */
  private getFallbackSalary(query: any): SalaryData {
    const baseSalary = this.getBaseSalary(query.position, query.experienceLevel);
    const locationMultiplier = this.getLocationMultiplier(query.location);
    const adjustedSalary = Math.round(baseSalary * locationMultiplier);

    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: Math.round(adjustedSalary * 0.8),
        max: Math.round(adjustedSalary * 1.3),
        median: adjustedSalary,
        average: Math.round(adjustedSalary * 1.05),
      },
      percentile: {
        p25: Math.round(adjustedSalary * 0.85),
        p50: adjustedSalary,
        p75: Math.round(adjustedSalary * 1.15),
        p90: Math.round(adjustedSalary * 1.25),
      },
      marketTrend: {
        direction: 'stable',
        percentage: 0,
        period: 'last 12 months',
      },
      dataSource: 'fallback',
      lastUpdated: new Date(),
      confidence: 30,
    };
  }

  /**
   * Transform Adzuna data to our format
   */
  private transformAdzunaData(data: any, query: any): SalaryData {
    const results = data.results || [];
    const salaries = results
      .map((job: any) => job.salary_min || job.salary_max)
      .filter((salary: any) => salary && salary > 0);

    if (salaries.length === 0) {
      return this.getFallbackSalary(query);
    }

    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);
    const medianSalary = this.calculateMedian(salaries);
    const averageSalary = salaries.reduce((sum: number, salary: number) => sum + salary, 0) / salaries.length;

    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: Math.round(minSalary),
        max: Math.round(maxSalary),
        median: Math.round(medianSalary),
        average: Math.round(averageSalary),
      },
      percentile: {
        p25: Math.round(this.calculatePercentile(salaries, 25)),
        p50: Math.round(medianSalary),
        p75: Math.round(this.calculatePercentile(salaries, 75)),
        p90: Math.round(this.calculatePercentile(salaries, 90)),
      },
      marketTrend: {
        direction: 'stable',
        percentage: 0,
        period: 'last 30 days',
      },
      dataSource: 'adzuna',
      lastUpdated: new Date(),
      confidence: 70,
    };
  }

  /**
   * Transform Indeed data to our format
   */
  private transformIndeedData(data: any, query: any): SalaryData {
    const results = data.results || [];
    const salaries = results
      .map((job: any) => this.extractSalaryFromText(job.snippet || job.jobtitle))
      .filter((salary: any) => salary && salary > 0);

    if (salaries.length === 0) {
      return this.getFallbackSalary(query);
    }

    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);
    const medianSalary = this.calculateMedian(salaries);
    const averageSalary = salaries.reduce((sum: number, salary: number) => sum + salary, 0) / salaries.length;

    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: Math.round(minSalary),
        max: Math.round(maxSalary),
        median: Math.round(medianSalary),
        average: Math.round(averageSalary),
      },
      percentile: {
        p25: Math.round(this.calculatePercentile(salaries, 25)),
        p50: Math.round(medianSalary),
        p75: Math.round(this.calculatePercentile(salaries, 75)),
        p90: Math.round(this.calculatePercentile(salaries, 90)),
      },
      marketTrend: {
        direction: 'stable',
        percentage: 0,
        period: 'last 30 days',
      },
      dataSource: 'indeed',
      lastUpdated: new Date(),
      confidence: 60,
    };
  }

  /**
   * Transform Glassdoor data to our format
   */
  private transformGlassdoorData(data: any, query: any): SalaryData {
    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: data.salaryMin || 0,
        max: data.salaryMax || 0,
        median: data.salaryMedian || 0,
        average: data.salaryAverage || 0,
      },
      percentile: {
        p25: data.salaryP25 || 0,
        p50: data.salaryMedian || 0,
        p75: data.salaryP75 || 0,
        p90: data.salaryP90 || 0,
      },
      marketTrend: {
        direction: data.trendDirection || 'stable',
        percentage: data.trendPercentage || 0,
        period: 'last 12 months',
      },
      dataSource: 'glassdoor',
      lastUpdated: new Date(),
      confidence: 85,
    };
  }

  /**
   * Transform PayScale data to our format
   */
  private transformPayScaleData(data: any, query: any): SalaryData {
    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: data.salary.min || 0,
        max: data.salary.max || 0,
        median: data.salary.median || 0,
        average: data.salary.mean || 0,
      },
      percentile: {
        p25: data.salary.p25 || 0,
        p50: data.salary.median || 0,
        p75: data.salary.p75 || 0,
        p90: data.salary.p90 || 0,
      },
      marketTrend: {
        direction: data.trend?.direction || 'stable',
        percentage: data.trend?.percentage || 0,
        period: 'last 12 months',
      },
      dataSource: 'payscale',
      lastUpdated: new Date(),
      confidence: 90,
    };
  }

  /**
   * Transform LinkedIn data to our format
   */
  private transformLinkedInData(data: any, query: any): SalaryData {
    return {
      position: query.position,
      location: query.location,
      experienceLevel: query.experienceLevel,
      salaryRange: {
        min: data.salaryInsights.min || 0,
        max: data.salaryInsights.max || 0,
        median: data.salaryInsights.median || 0,
        average: data.salaryInsights.average || 0,
      },
      percentile: {
        p25: data.salaryInsights.p25 || 0,
        p50: data.salaryInsights.median || 0,
        p75: data.salaryInsights.p75 || 0,
        p90: data.salaryInsights.p90 || 0,
      },
      marketTrend: {
        direction: data.trend?.direction || 'stable',
        percentage: data.trend?.percentage || 0,
        period: 'last 12 months',
      },
      dataSource: 'linkedin',
      lastUpdated: new Date(),
      confidence: 95,
    };
  }

  /**
   * Get market analysis from Glassdoor
   */
  private async getGlassdoorMarketAnalysis(): Promise<MarketAnalysis | null> {
    // Implementation for Glassdoor market analysis
    return null;
  }

  /**
   * Get market analysis from LinkedIn
   */
  private async getLinkedInMarketAnalysis(): Promise<MarketAnalysis | null> {
    // Implementation for LinkedIn market analysis
    return null;
  }

  /**
   * Fallback market analysis
   */
  private getFallbackMarketAnalysis(): MarketAnalysis {
    return {
      overallTrend: 'growing',
      hotSkills: [
        { skill: 'React', demand: 85, avgSalary: 95000 },
        { skill: 'Node.js', demand: 78, avgSalary: 92000 },
        { skill: 'Python', demand: 82, avgSalary: 88000 },
        { skill: 'AWS', demand: 75, avgSalary: 105000 },
        { skill: 'TypeScript', demand: 88, avgSalary: 98000 },
      ],
      topPayingRoles: [
        { role: 'Senior Software Engineer', avgSalary: 130000, growth: 12 },
        { role: 'DevOps Engineer', avgSalary: 125000, growth: 18 },
        { role: 'Data Scientist', avgSalary: 120000, growth: 15 },
        { role: 'Product Manager', avgSalary: 115000, growth: 8 },
        { role: 'Full Stack Developer', avgSalary: 110000, growth: 10 },
      ],
      locationInsights: [
        { location: 'San Francisco', avgSalary: 140000, costOfLiving: 'High' },
        { location: 'New York', avgSalary: 135000, costOfLiving: 'High' },
        { location: 'Seattle', avgSalary: 125000, costOfLiving: 'Medium-High' },
        { location: 'Austin', avgSalary: 110000, costOfLiving: 'Medium' },
        { location: 'Denver', avgSalary: 105000, costOfLiving: 'Medium' },
      ],
      dataSource: 'fallback',
      lastUpdated: new Date(),
    };
  }

  /**
   * Helper methods for fallback data
   */
  private getBaseSalary(position: string, experienceLevel: string): number {
    const baseSalaries: { [key: string]: { [key: string]: number } } = {
      'Software Engineer': { 'Entry-level': 70000, 'Mid-level': 95000, 'Senior-level': 130000, 'Executive': 180000 },
      'Data Scientist': { 'Entry-level': 80000, 'Mid-level': 110000, 'Senior-level': 150000, 'Executive': 200000 },
      'Product Manager': { 'Entry-level': 75000, 'Mid-level': 105000, 'Senior-level': 140000, 'Executive': 190000 },
      'DevOps Engineer': { 'Entry-level': 85000, 'Mid-level': 115000, 'Senior-level': 155000, 'Executive': 210000 },
    };

    return baseSalaries[position]?.[experienceLevel] || 95000;
  }

  private getLocationMultiplier(location: string): number {
    const multipliers: { [key: string]: number } = {
      'San Francisco': 1.4,
      'New York': 1.35,
      'Seattle': 1.25,
      'Austin': 1.1,
      'Denver': 1.05,
      'Chicago': 1.0,
      'Atlanta': 0.95,
      'Dallas': 0.9,
    };

    return multipliers[location] || 1.0;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Salary data cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Calculate median from array of numbers
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = numbers.sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Number.isInteger(index)) {
      return sorted[index];
    }
    
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Extract salary from job description text
   */
  private extractSalaryFromText(text: string): number | null {
    if (!text) return null;
    
    // Look for salary patterns like $50,000, $50k, 50000, etc.
    const salaryPatterns = [
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|thousand)/g,
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+year|annually|yearly)/gi,
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:-\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?))?\s*(?:per\s+year|annually|yearly)/gi,
    ];
    
    for (const pattern of salaryPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const salary = matches[0].replace(/[$,]/g, '');
        const numSalary = parseFloat(salary);
        
        if (numSalary > 1000 && numSalary < 1000000) {
          // Convert k to thousands
          if (salary.includes('k') || salary.includes('K')) {
            return numSalary * 1000;
          }
          return numSalary;
        }
      }
    }
    
    return null;
  }
}
