'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Briefcase,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EmployerAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, user, router, isHydrated]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/analytics/employer');
      if ((response.data as any).success) {
        setAnalytics((response.data as any).data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">No analytics data available</div>
        </div>
      </div>
    );
  }

  const { overview, trends, topPerformingJobs, conversion, timeToHire } = analytics;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Track your recruitment performance and insights
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-3xl font-bold">{overview.totalJobs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.activeJobs} active
                  </p>
                </div>
                <Briefcase className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-3xl font-bold">{overview.totalApplications}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    All time
                  </p>
                </div>
                <Users className="h-12 w-12 text-green-500 dark:text-green-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time to Hire</p>
                  <p className="text-3xl font-bold">{timeToHire.averageDays}</p>
                  <p className="text-xs text-muted-foreground mt-1">days</p>
                </div>
                <Clock className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hired</p>
                  <p className="text-3xl font-bold">{conversion.hired || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversion.conversionRates.toHire.toFixed(1)}% conversion
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-7 gap-4">
              {Object.entries(overview.applicationsByStatus).map(([status, count]: [string, any]) => (
                <div key={status} className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {status.replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recruitment Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Applied ({conversion.applied})</span>
                  <span className="font-medium">100%</span>
                </div>
                <div className="h-8 bg-primary/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Under Review ({conversion.reviewing})</span>
                  <span className="font-medium">{conversion.conversionRates.toReview.toFixed(1)}%</span>
                </div>
                <div className="h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 dark:bg-yellow-600" 
                    style={{ width: `${conversion.conversionRates.toReview}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Shortlisted ({conversion.shortlisted})</span>
                  <span className="font-medium">{conversion.conversionRates.toShortlist.toFixed(1)}%</span>
                </div>
                <div className="h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 dark:bg-purple-600" 
                    style={{ width: `${conversion.conversionRates.toShortlist}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Interviewed ({conversion.interviewed})</span>
                  <span className="font-medium">{conversion.conversionRates.toInterview.toFixed(1)}%</span>
                </div>
                <div className="h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 dark:bg-orange-600" 
                    style={{ width: `${conversion.conversionRates.toInterview}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Hired ({conversion.hired})</span>
                  <span className="font-medium">{conversion.conversionRates.toHire.toFixed(1)}%</span>
                </div>
                <div className="h-8 bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 dark:bg-green-600" 
                    style={{ width: `${conversion.conversionRates.toHire}%` }} 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Jobs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Performing Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformingJobs.slice(0, 5).map((job: any, index: number) => (
                <div key={job.jobId} className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium">{job.applications}</p>
                        <p className="text-xs text-muted-foreground">Applications</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{job.views}</p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div>
                        <Badge variant="secondary">
                          {job.conversionRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time to Hire Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Time to Hire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-3xl font-bold">{timeToHire.averageDays}</p>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fastest Hire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-green-500 dark:text-green-400" />
                <div>
                  <p className="text-3xl font-bold">{timeToHire.fastestDays}</p>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slowest Hire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-8 w-8 text-orange-500 dark:text-orange-400" />
                <div>
                  <p className="text-3xl font-bold">{timeToHire.slowestDays}</p>
                  <p className="text-sm text-muted-foreground">days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
