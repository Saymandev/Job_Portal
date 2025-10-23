'use client';

import ApplicationAnalytics from '@/components/application-analytics';
import EnhancedFeatures from '@/components/enhanced-features';
import EnhancedMatching from '@/components/enhanced-matching';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
// Progress component
const Progress = ({ value = 0, className = "" }: { value?: number; className?: string }) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

interface JobPosting {
  _id: string;
  title: string;
  status: string;
  applicationsCount: number;
  views: number;
  postedAt: string;
  expiresAt: string;
}

interface Candidate {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
  };
  job: {
    _id: string;
    title: string;
  };
  status: string;
  appliedAt: string;
  score?: number;
  resume?: string;
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApplications: number;
  interviewsScheduled: number;
  pendingRescheduleRequests: number;
  hiredCandidates: number;
  profileViews: number;
  teamMembers: number;
}

interface Analytics {
  applicationsThisMonth: number;
  applicationsLastMonth: number;
  conversionRate: number;
  averageTimeToHire: number;
  topPerformingJobs: JobPosting[];
}

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string;
  cancelAtPeriodEnd: boolean;
  boostsAvailable: number;
  boostsUsed: number;
  featuredJobsEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  prioritySupportEnabled: boolean;
  // Enhanced Employer Features
  priorityApplicationsEnabled?: boolean;
  enhancedMatchingEnabled?: boolean;
  applicationAnalyticsEnabled?: boolean;
  unlimitedResumeDownloadsEnabled?: boolean;
  directMessagingEnabled?: boolean;
  featuredProfileEnabled?: boolean;
  salaryInsightsEnabled?: boolean;
  interviewPrepEnabled?: boolean;
}

interface SubscriptionLimits {
  plan: string;
  jobPostsLimit: number;
  jobPostsUsed: number;
  jobPostsRemaining: number;
  boostsAvailable: number;
  boostsUsed: number;
  boostsRemaining: number;
}

export default function EmployerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    interviewsScheduled: 0,
    pendingRescheduleRequests: 0,
    hiredCandidates: 0,
    profileViews: 0,
    teamMembers: 0,
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    applicationsThisMonth: 0,
    applicationsLastMonth: 0,
    conversionRate: 0,
    averageTimeToHire: 0,
    topPerformingJobs: [],
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLimits, setSubscriptionLimits] = useState<SubscriptionLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    // Double check authentication before making any API calls
    if (!isAuthenticated || user?.role !== 'employer') {
      // User not authenticated, skipping API calls
      return;
    }
    
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get('/dashboard/employer/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch pending reschedule requests
      try {
        const rescheduleResponse = await api.get('/interviews/pending-reschedule-requests');
        if (rescheduleResponse.data.success) {
          setStats(prev => ({
            ...prev,
            pendingRescheduleRequests: rescheduleResponse.data.data.length
          }));
        }
      } catch (error) {
        // No pending reschedule requests or error
      }

      // Fetch analytics
      const analyticsResponse = await api.get('/dashboard/employer/analytics');
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }

      // Fetch recent candidates
      const candidatesResponse = await api.get('/applications/employer/recent?limit=10');
      if (candidatesResponse.data.success) {
        setCandidates(candidatesResponse.data.data);
      }

      // Fetch recent jobs
      const jobsResponse = await api.get('/jobs/employer/recent?limit=5');
      if (jobsResponse.data.success) {
        setRecentJobs(jobsResponse.data.data);
      }

      // Fetch subscription data
      try {
        const subscriptionResponse = await api.get('/subscriptions/current');
        if (subscriptionResponse.data.success) {
          setSubscription(subscriptionResponse.data.data);
        }
      } catch (error: any) {
        // If no subscription found (404), user is on free plan
        if (error.response?.status === 404) {
          setSubscription({ 
            plan: 'free', 
            status: 'active',
            startDate: new Date().toISOString(),
            boostsAvailable: 0,
            boostsUsed: 0,
            featuredJobsEnabled: false,
            advancedAnalyticsEnabled: false,
            prioritySupportEnabled: false
          } as Subscription);
        }
        console.error('Error fetching subscription:', error);
      }

      // Fetch subscription limits
      try {
        const limitsResponse = await api.get('/subscriptions/limits');
        if (limitsResponse.data.success) {
          setSubscriptionLimits(limitsResponse.data.data);
        }
      } catch (error) {
        console.error('Error fetching subscription limits:', error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    
    // Only fetch data if user is properly authenticated
    if (isAuthenticated && user?.role === 'employer') {
      fetchDashboardData();
    }
  }, [isAuthenticated, user, router, isHydrated, fetchDashboardData]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'reviewing':
        return <Badge variant="default" className="gap-1"><FileText className="h-3 w-3" />Reviewing</Badge>;
      case 'interview':
        return <Badge variant="default" className="gap-1"><Calendar className="h-3 w-3" />Interview</Badge>;
      case 'hired':
        return <Badge variant="default" className="gap-1 bg-green-600 dark:bg-green-700"><CheckCircle className="h-3 w-3" />Hired</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge variant="default" className="gap-1 bg-green-600 dark:bg-green-700"><CheckCircle className="h-3 w-3" />Active</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Paused</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConversionRate = () => {
    if (!analytics.applicationsLastMonth || analytics.applicationsLastMonth === 0) return 0;
    const change = ((analytics.applicationsThisMonth - analytics.applicationsLastMonth) / analytics.applicationsLastMonth) * 100;
    return Math.round(change);
  };

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employer Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your job postings and candidate pipeline</p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/employer/post-job">
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/employer/candidates">
              <Users className="h-4 w-4 mr-2" />
              View All Candidates
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalJobs || 0} total jobs posted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingApplications || 0} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/interviews')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Interviews
              {(stats.pendingRescheduleRequests || 0) > 0 && (
                <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {stats.pendingRescheduleRequests || 0}
                </Badge>
              )}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewsScheduled || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled this week
              {(stats.pendingRescheduleRequests || 0) > 0 && (
                <span className="block text-destructive font-medium">
                  {stats.pendingRescheduleRequests || 0} reschedule request{(stats.pendingRescheduleRequests || 0) > 1 ? 's' : ''} pending
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hiredCandidates || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Overview */}
      <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Subscription & Boosts
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/employer/subscription">
                View Details
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
              <p className="text-2xl font-bold capitalize">
                {subscription?.plan || 'Free'} Plan
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {subscription?.plan === 'free' 
                  ? 'Upgrade to unlock premium features and job boosts'
                  : 'Enjoy your premium features and job boosts'
                }
              </p>
              
              {/* Job Posts Usage */}
              {subscriptionLimits && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Job Posts</span>
                    <span className="font-medium">
                      {subscriptionLimits.jobPostsUsed}/{subscriptionLimits.jobPostsLimit}
                    </span>
                  </div>
                  <Progress 
                    value={(subscriptionLimits.jobPostsUsed / subscriptionLimits.jobPostsLimit) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscriptionLimits.jobPostsRemaining} remaining this month
                  </p>
                </div>
              )}

              {/* Boosts Usage */}
              {subscriptionLimits && subscriptionLimits.boostsAvailable > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Job Boosts</span>
                    <span className="font-medium">
                      {subscriptionLimits.boostsUsed}/{subscriptionLimits.boostsAvailable}
                    </span>
                  </div>
                  <Progress 
                    value={(subscriptionLimits.boostsUsed / subscriptionLimits.boostsAvailable) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {subscriptionLimits.boostsRemaining} boosts remaining
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col justify-between">
              {/* Plan Features */}
              <div>
                <h4 className="font-semibold mb-2">Plan Features</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${(subscriptionLimits?.jobPostsLimit || 5) > 5 ? 'text-green-500 dark:text-green-400 ' : 'text-muted-foreground'}`} />
                    <span>{subscriptionLimits?.jobPostsLimit || 5} job posts/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${(subscriptionLimits?.boostsAvailable || 0) > 0 ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                    <span>{subscriptionLimits?.boostsAvailable || 0} job boosts/month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${subscription?.featuredJobsEnabled ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                    <span>Featured job listings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${subscription?.advancedAnalyticsEnabled ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                    <span>Enhanced analytics</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4">
                {subscription?.plan === 'free' ? (
                  <Button asChild className="w-full">
                    <Link href="/pricing">
                      Upgrade Now
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/pricing">
                      Change Plan
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Boosts Section */}
      {subscriptionLimits && subscriptionLimits.boostsAvailable > 0 && (
        <Card className="mb-8 border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50 dark:from-yellow-900/20 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Job Boosts Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Boost Your Job Visibility</p>
                <p className="text-lg font-semibold">
                  {subscriptionLimits.boostsRemaining} boost{subscriptionLimits.boostsRemaining !== 1 ? 's' : ''} remaining
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Make your jobs stand out with featured listings and priority placement
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/employer/jobs">
                    Boost Jobs
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/pricing">
                    Get More Boosts
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.applicationsThisMonth || 0}</div>
              <p className="text-sm text-muted-foreground">Applications This Month</p>
              <div className="flex items-center justify-center mt-1">
                <TrendingUp className={`h-4 w-4 ${getConversionRate() >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
                <span className={`text-sm ${getConversionRate() >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {Math.abs(getConversionRate())}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.conversionRate || 0}%</div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.averageTimeToHire || 0} days</div>
              <p className="text-sm text-muted-foreground">Avg. Time to Hire</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.profileViews || 0}</div>
              <p className="text-sm text-muted-foreground">Company Profile Views</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Candidate Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Candidates</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/employer/candidates">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No candidates yet</h3>
                  <p className="text-muted-foreground mb-4">Post your first job to start receiving applications</p>
                  <Button asChild>
                    <Link href="/employer/post-job">Post a Job</Link>
                  </Button>
                </div>
              ) : (
                candidates.slice(0, 5).map((candidate) => {
                  const fullName = candidate.user?.fullName || 'Unknown Applicant';
                  const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                  return (
                    <div key={candidate._id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {initials}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{fullName}</h4>
                          <p className="text-sm text-muted-foreground">{candidate.job?.title || 'Unknown Job'}</p>
                          <p className="text-xs text-muted-foreground">
                            Applied {new Date(candidate.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {candidate.score && (
                          <Badge variant="outline" className="text-xs">
                            {candidate.score}% match
                          </Badge>
                        )}
                        {getStatusBadge(candidate.status)}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/employer/jobs/${candidate.job?._id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/messages?candidate=${candidate._id}`}>
                              <MessageSquare className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        </CardContent>
      </Card>

      {/* Enhanced Features */}
      <EnhancedFeatures subscription={subscription || undefined} />

      {/* Enhanced Matching */}
      {subscription?.enhancedMatchingEnabled && (
        <EnhancedMatching 
          jobId={recentJobs[0]?._id || ''} 
          employerId={user?.id || ''} 
          isEnabled={subscription?.enhancedMatchingEnabled || false}
        />
      )}

      {/* Application Analytics */}
      {subscription?.applicationAnalyticsEnabled && (
        <ApplicationAnalytics 
          isEnabled={subscription?.applicationAnalyticsEnabled || false}
        />
      )}

      {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Job Postings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/employer/jobs">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No jobs posted yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first job posting to start attracting candidates</p>
                  <Button asChild>
                    <Link href="/employer/post-job">Post a Job</Link>
                  </Button>
                </div>
              ) : (
                recentJobs.map((job) => (
                  <div key={job._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{job.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Posted {new Date(job.postedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getJobStatusBadge(job.status)}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employer/jobs/${job._id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applicationsCount} applications
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {job.views || 0} views
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/employer/edit-job/${job._id}`}>Edit</Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/employer/jobs/${job._id}`}>View Applicants</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Jobs */}
      {analytics.topPerformingJobs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
              Top Performing Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPerformingJobs.map((job, index) => (
                <div key={job._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {job.applicationsCount} applications • {job.views} views
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {job.views > 0 ? Math.round((job.applicationsCount / job.views) * 100) : 0}% conversion
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/employer/jobs/${job._id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/employer/post-job">
                <Plus className="h-6 w-6 mb-2" />
                Post New Job
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/employer/candidates">
                <Users className="h-6 w-6 mb-2" />
                View Candidates
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/employer/jobs">
                <Briefcase className="h-6 w-6 mb-2" />
                Manage Jobs
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/employer/analytics">
                <BarChart3 className="h-6 w-6 mb-2" />
                View Analytics
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
