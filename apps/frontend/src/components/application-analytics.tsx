'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { BarChart3, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface AnalyticsData {
  overview: {
    totalApplications: number;
    uniqueCandidates: number;
    activeJobs: number;
    avgApplicationsPerJob: number;
    conversionRate: number;
    statusBreakdown: Record<string, number>;
  };
  trends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
  };
  topPerformingJobs: Array<{
    jobId: string;
    title: string;
    applications: number;
    accepted: number;
    conversionRate: number;
  }>;
  candidateInsights: {
    topSkills: Array<{ skill: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
    experienceDistribution: Record<string, number>;
  };
  conversionFunnel: {
    applied: number;
    reviewed: number;
    shortlisted: number;
    interviewed: number;
    accepted: number;
  };
  timeToHire: {
    averageDays: number;
    medianDays: number;
    fastestHire: number;
    slowestHire: number;
  };
}

interface ApplicationAnalyticsProps {
  isEnabled: boolean;
  timeRange?: string;
}

export default function ApplicationAnalytics({ isEnabled, timeRange = '30d' }: ApplicationAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`analytics/applications?timeRange=${timeRange}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, timeRange]);

  useEffect(() => {
    if (isEnabled) {
      fetchAnalytics();
    }
  }, [isEnabled, timeRange, fetchAnalytics]);

  const handleUpgradePlan = () => {
    router.push('/pricing');
    toast({
      title: "Upgrade Required",
      description: "Redirecting to pricing page...",
    });
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Analytics
            <Badge variant="secondary">Premium Feature</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 mb-4">
            Upgrade your plan to access detailed application analytics and insights.
          </p>
          <Button onClick={handleUpgradePlan} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Analytics
            <Badge variant="default">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading analytics data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Analytics
            <Badge variant="destructive">Error</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Analytics
            <Badge variant="default">No Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No analytics data available for the selected time period.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Analytics
            <Badge variant="default">Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.overview.totalApplications}</div>
              <div className="text-sm text-muted-foreground">Total Applications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.overview.uniqueCandidates}</div>
              <div className="text-sm text-muted-foreground">Unique Candidates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.overview.activeJobs}</div>
              <div className="text-sm text-muted-foreground">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.overview.conversionRate}%</div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Application Status Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(analytics.overview.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm capitalize">{status}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Conversion Funnel</h4>
            <div className="space-y-2">
              {[
                { label: 'Applied', count: analytics.conversionFunnel.applied, color: 'bg-blue-500' },
                { label: 'Reviewed', count: analytics.conversionFunnel.reviewed, color: 'bg-yellow-500' },
                { label: 'Shortlisted', count: analytics.conversionFunnel.shortlisted, color: 'bg-orange-500' },
                { label: 'Interviewed', count: analytics.conversionFunnel.interviewed, color: 'bg-purple-500' },
                { label: 'Accepted', count: analytics.conversionFunnel.accepted, color: 'bg-green-500' },
              ].map((stage, index) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium">{stage.label}</div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stage.color}`}
                      style={{ 
                        width: `${(stage.count / analytics.conversionFunnel.applied) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="w-12 text-sm text-right">{stage.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Time to Hire */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Time to Hire</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{analytics.timeToHire.averageDays}</div>
                <div className="text-xs text-muted-foreground">Avg Days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{analytics.timeToHire.medianDays}</div>
                <div className="text-xs text-muted-foreground">Median Days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{analytics.timeToHire.fastestHire}</div>
                <div className="text-xs text-muted-foreground">Fastest</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{analytics.timeToHire.slowestHire}</div>
                <div className="text-xs text-muted-foreground">Slowest</div>
              </div>
            </div>
          </div>

          {/* Top Performing Jobs */}
          <div>
            <h4 className="font-semibold mb-3">Top Performing Jobs</h4>
            <div className="space-y-2">
              {analytics.topPerformingJobs.slice(0, 5).map((job, index) => (
                <div key={job.jobId} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{job.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.applications} applications • {job.conversionRate}% conversion
                    </div>
                  </div>
                  <Badge variant="outline">{job.accepted} hired</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
