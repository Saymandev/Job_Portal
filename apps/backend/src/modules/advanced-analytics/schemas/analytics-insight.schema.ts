import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsInsightDocument = AnalyticsInsight & Document;

export enum InsightType {
  MARKET_TREND = 'market_trend',
  CANDIDATE_DEMOGRAPHICS = 'candidate_demographics',
  SALARY_ANALYSIS = 'salary_analysis',
  SKILL_DEMAND = 'skill_demand',
  HIRING_PATTERNS = 'hiring_patterns',
  COMPETITION_ANALYSIS = 'competition_analysis',
  PERFORMANCE_METRICS = 'performance_metrics',
  PREDICTIVE_INSIGHTS = 'predictive_insights',
}

export enum InsightCategory {
  GENERAL = 'general',
  INDUSTRY_SPECIFIC = 'industry_specific',
  COMPANY_SPECIFIC = 'company_specific',
  ROLE_SPECIFIC = 'role_specific',
}

@Schema({ timestamps: true })
export class AnalyticsInsight {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, enum: InsightType })
  type: InsightType;

  @Prop({ required: true, enum: InsightCategory })
  category: InsightCategory;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: Object, required: true })
  data: {
    metrics: Array<{
      name: string;
      value: number | string;
      change?: number;
      changeType?: 'increase' | 'decrease' | 'stable';
      unit?: string;
    }>;
    charts: Array<{
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
      title: string;
      data: any[];
      xAxis?: string;
      yAxis?: string;
    }>;
    insights: Array<{
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      effort: 'low' | 'medium' | 'high';
      impact: 'high' | 'medium' | 'low';
    }>;
  };

  @Prop({ type: Object, default: {} })
  filters: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    industry?: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    salaryRange?: {
      min: number;
      max: number;
    };
  };

  @Prop({ default: 0 })
  confidence: number; // 0-100

  @Prop({ default: false })
  isAI_Generated: boolean;

  @Prop({ default: false })
  isActionable: boolean;

  @Prop({ default: 0 })
  priority: number; // 1-5

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: {
    source: string;
    version: string;
    generatedAt: Date;
    expiresAt?: Date;
    lastUpdated: Date;
  };
}

export const AnalyticsInsightSchema = SchemaFactory.createForClass(AnalyticsInsight);

AnalyticsInsightSchema.index({ userId: 1 });
AnalyticsInsightSchema.index({ type: 1 });
AnalyticsInsightSchema.index({ category: 1 });
AnalyticsInsightSchema.index({ isActive: 1 });
AnalyticsInsightSchema.index({ createdAt: -1 });
