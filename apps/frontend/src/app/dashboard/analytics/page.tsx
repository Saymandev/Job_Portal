'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Target,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobSeekerAnalyticsPage() {
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

    if (!isAuthenticated || user?.role !== 'job_seeker') {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, user, router, isHydrated]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/analytics/job-seeker');
      if (response.data.success) {
        setAnalytics(response.data.data);
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'job_seeker') {
    return null;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">No analytics data available</div>
        </div>
      </div>
    );
  }

  const { overview, trends, topAppliedCategories } = analytics;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Application Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Track your job search progress and insights
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                  <p className="text-3xl font-bold">{overview.totalApplications}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </div>
                <FileText className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-3xl font-bold">{overview.responseRate.toFixed(0)}%</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Responded
                  </p>
                </div>
                <Target className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Response Time</p>
                  <p className="text-3xl font-bold">{overview.averageResponseTime}</p>
                  <p className="text-xs text-muted-foreground mt-1">days</p>
                </div>
                <Clock className="h-12 w-12 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-bold">
                    {overview.applicationsByStatus.accepted 
                      ? ((overview.applicationsByStatus.accepted / overview.totalApplications) * 100).toFixed(0)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.applicationsByStatus.accepted || 0} accepted
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-7 gap-4">
              {Object.entries(overview.applicationsByStatus).map(([status, count]: [string, any]) => {
                const statusConfig: Record<string, { icon: any; color: string }> = {
                  pending: { icon: Clock, color: 'text-yellow-600' },
                  reviewing: { icon: Eye, color: 'text-blue-600' },
                  shortlisted: { icon: TrendingUp, color: 'text-purple-600' },
                  interview_scheduled: { icon: Clock, color: 'text-indigo-600' },
                  interviewed: { icon: Target, color: 'text-orange-600' },
                  accepted: { icon: CheckCircle, color: 'text-green-600' },
                  rejected: { icon: XCircle, color: 'text-red-600' },
                };

                const config = statusConfig[status] || { icon: FileText, color: 'text-gray-600' };
                const Icon = config.icon;

                return (
                  <div key={status} className="text-center p-4 border rounded-lg">
                    <Icon className={`h-8 w-8 mx-auto mb-2 ${config.color}`} />
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {status.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Applied Categories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Most Applied Job Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAppliedCategories.map((category: any) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {category.category.replace('-', ' ')}
                    </span>
                    <Badge variant="secondary">{category.count} applications</Badge>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(category.count / overview.totalApplications) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Application Activity (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.map((trend: any) => (
                  <div key={trend.date} className="flex items-center justify-between text-sm">
                    <span>{new Date(trend.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-primary rounded-full" style={{ width: `${trend.count * 20}px` }} />
                      <span className="font-medium">{trend.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
