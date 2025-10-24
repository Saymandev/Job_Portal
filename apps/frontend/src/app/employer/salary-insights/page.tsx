'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
    AlertCircle,
    BarChart3,
    DollarSign,
    RefreshCw,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SalaryInsight {
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

interface MarketAnalysis {
  overallTrend: 'growing' | 'declining' | 'stable';
  hotSkills: Array<{ skill: string; demand: number; avgSalary: number }>;
  topPayingRoles: Array<{ role: string; avgSalary: number; growth: number }>;
  locationInsights: Array<{ location: string; avgSalary: number; costOfLiving: number }>;
}

export default function SalaryInsightsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [salaryInsights, setSalaryInsights] = useState<SalaryInsight | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [searchParams, setSearchParams] = useState({
    position: 'Software Engineer',
    location: 'San Francisco',
    experienceLevel: 'Mid-level',
  });

  const fetchSalaryInsights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/salary-insights', {
        params: searchParams,
      });
      setSalaryInsights((response.data as any).data);
    } catch (error: any) {
      console.error('Error fetching salary insights:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch salary insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, toast]);

  const fetchMarketAnalysis = useCallback(async () => {
    try {
      const response = await api.get('/analytics/market-analysis');
      setMarketAnalysis((response.data as any).data);
    } catch (error: any) {
      console.error('Error fetching market analysis:', error);
    }
  }, []);

  useEffect(() => {
    fetchSalaryInsights();
    fetchMarketAnalysis();
  }, [fetchSalaryInsights, fetchMarketAnalysis]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Insights List Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Salary Insights & Market Data</h1>
            <p className="text-muted-foreground">
              Comprehensive salary data and market trends for informed hiring decisions
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Enterprise Feature
          </Badge>
        </div>
      </div>

      {/* Search Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Salary Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Position</label>
              <input
                type="text"
                value={searchParams.position}
                onChange={(e) => setSearchParams({ ...searchParams, position: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <input
                type="text"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., San Francisco"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Experience Level</label>
              <select
                value={searchParams.experienceLevel}
                onChange={(e) => setSearchParams({ ...searchParams, experienceLevel: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Entry-level">Entry-level</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior-level">Senior-level</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
          </div>
          <Button onClick={fetchSalaryInsights} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Insights
          </Button>
        </CardContent>
      </Card>

      {salaryInsights && (
        <>
          {/* Salary Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Median Salary</p>
                    <p className="text-2xl font-bold">{formatCurrency(salaryInsights.salaryRange.median)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Salary</p>
                    <p className="text-2xl font-bold">{formatCurrency(salaryInsights.salaryRange.average)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Salary Range</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(salaryInsights.salaryRange.min)} - {formatCurrency(salaryInsights.salaryRange.max)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Trend</p>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(salaryInsights.marketTrend.direction)}
                      <span className={`text-lg font-bold ${getTrendColor(salaryInsights.marketTrend.direction)}`}>
                        {salaryInsights.marketTrend.percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{salaryInsights.marketTrend.period}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Salary Percentiles */}
            <Card>
              <CardHeader>
                <CardTitle>Salary Percentiles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">25th Percentile</span>
                    <span className="font-semibold">{formatCurrency(salaryInsights.percentile.p25)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">50th Percentile (Median)</span>
                    <span className="font-semibold">{formatCurrency(salaryInsights.percentile.p50)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">75th Percentile</span>
                    <span className="font-semibold">{formatCurrency(salaryInsights.percentile.p75)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">90th Percentile</span>
                    <span className="font-semibold">{formatCurrency(salaryInsights.percentile.p90)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Hiring Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Competitive Salary</p>
                    <p className="text-xl font-bold">{formatCurrency(salaryInsights.recommendations.competitiveSalary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Budget Range</p>
                    <p className="font-semibold">
                      {formatCurrency(salaryInsights.recommendations.budgetRange.min)} - {formatCurrency(salaryInsights.recommendations.budgetRange.max)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Negotiation Tips</p>
                    <ul className="text-sm space-y-1">
                      {salaryInsights.recommendations.negotiationTips.slice(0, 3).map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Analysis */}
          {marketAnalysis && (
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Hot Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketAnalysis.hotSkills.slice(0, 5).map((skill, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{skill.skill}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatCurrency(skill.avgSalary)}</span>
                          <p className="text-xs text-muted-foreground">Demand: {skill.demand}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Paying Roles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketAnalysis.topPayingRoles.slice(0, 5).map((role, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{role.role}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatCurrency(role.avgSalary)}</span>
                          <p className="text-xs text-muted-foreground">Growth: {role.growth}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketAnalysis.locationInsights.slice(0, 5).map((location, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{location.location}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatCurrency(location.avgSalary)}</span>
                          <p className="text-xs text-muted-foreground">COL: {location.costOfLiving}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Data Source Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Based on {salaryInsights.dataPoints} data points</span>
                </div>
                <div>
                  Last updated: {new Date(salaryInsights.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!salaryInsights && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Salary Data Available</h3>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t find salary data for the specified criteria. Try adjusting your search parameters.
            </p>
            <Button onClick={fetchSalaryInsights}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
