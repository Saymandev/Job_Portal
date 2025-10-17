'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Activity,
  Briefcase,
  Building,
  FileText,
  TrendingUp,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminAnalyticsPage() {
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

    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, user, router, isHydrated]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/analytics/admin');
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
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

  const { overview, growth, topPerformers, platformHealth } = analytics;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Monitor platform performance and growth metrics
          </p>
        </div>

        {/* Platform Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{overview.totalUsers}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {platformHealth.activeUsersLast7Days} active (7d)
                  </p>
                </div>
                <Users className="h-12 w-12 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

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
                <Briefcase className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-3xl font-bold">{overview.totalApplications}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.pendingApplications} pending
                  </p>
                </div>
                <FileText className="h-12 w-12 text-green-500 dark:text-green-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Companies</p>
                  <p className="text-3xl font-bold">{overview.totalCompanies}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    registered
                  </p>
                </div>
                <Building className="h-12 w-12 text-orange-500 dark:text-orange-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Health Score */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Platform Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Health</span>
                  <span className="text-2xl font-bold">{platformHealth.healthScore}/100</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      platformHealth.healthScore >= 80
                        ? 'bg-green-500 dark:bg-green-600'
                        : platformHealth.healthScore >= 60
                        ? 'bg-yellow-500 dark:bg-yellow-600'
                        : 'bg-red-500 dark:bg-red-600'
                    }`}
                    style={{ width: `${platformHealth.healthScore}%` }}
                  />
                </div>
              </div>
              <Activity className="h-16 w-16 text-primary opacity-20" />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{platformHealth.activeUsersLast7Days}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Users (7d)</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{platformHealth.newJobsLast7Days}</p>
                <p className="text-xs text-muted-foreground mt-1">New Jobs (7d)</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{platformHealth.newApplicationsLast7Days}</p>
                <p className="text-xs text-muted-foreground mt-1">New Applications (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Companies */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Companies by Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.companies.slice(0, 10).map((company: any, index: number) => (
                <div key={company.companyId} className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.jobCount} jobs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{company.applicationCount}</p>
                    <p className="text-xs text-muted-foreground">applications</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Categories Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Job Categories Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.jobCategories.map((category: any) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{category.category.replace('-', ' ')}</span>
                    <span className="font-medium">{category.count} jobs</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(category.count / overview.totalJobs) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
