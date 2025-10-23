'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Bookmark,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  MapPin,
  MessageSquare,
  Star,
  TrendingUp,
  User,
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

interface JobRecommendation {
  _id: string;
  title: string;
  company: {
    name: string;
    logo?: string;
  };
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  type: string;
  experience: string;
  matchScore: number;
  skills: string[];
  postedAt: string;
}

interface SavedJob {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: {
      name: string;
      logo?: string;
      location?: string;
    };
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    experienceLevel: string;
    jobType: string;
    skills: string[];
    status: string;
  };
  tags?: string[];
  notes?: string;
  savedAt: string;
  viewCount: number;
}

interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    company: {
      name: string;
      logo?: string;
    };
  };
  status: string;
  appliedAt: string;
}

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  interviewsScheduled: number;
  profileViews: number;
  profileCompletion: number;
  savedJobs: number;
  unreadMessages: number;
  applicationsByStatus?: {
    pending?: number;
    reviewing?: number;
    interview?: number;
    accepted?: number;
    rejected?: number;
  };
  responseRate?: number;
  averageResponseTime?: number;
}

export default function JobSeekerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    interviewsScheduled: 0,
    profileViews: 0,
    profileCompletion: 0,
    savedJobs: 0,
    unreadMessages: 0,
  });
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    // Double check authentication before making any API calls
    if (!isAuthenticated || user?.role !== 'job_seeker') {
      // User not authenticated, skipping API calls
      return;
    }
    
    try {
      // Fetching dashboard data
      
      // Fetch dashboard stats
      try {
        const statsResponse = await api.get('/analytics/job-seeker');
        // Stats response received
        if ((statsResponse.data as any).success) {
          const analyticsData = (statsResponse.data as any).data;
          setStats({
            totalApplications: analyticsData.overview?.totalApplications || 0,
            pendingApplications: analyticsData.overview?.applicationsByStatus?.pending || 0,
            interviewsScheduled: analyticsData.overview?.applicationsByStatus?.interview || 0,
            profileViews: 0, // Will be updated below
            profileCompletion: 0, // This would need to be calculated based on profile completeness
            savedJobs: 0, // This will be set from saved jobs API
            unreadMessages: 0, // This would need to be implemented
            applicationsByStatus: analyticsData.overview?.applicationsByStatus,
            responseRate: analyticsData.overview?.responseRate,
            averageResponseTime: analyticsData.overview?.averageResponseTime,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set default stats if analytics endpoint fails
        setStats({
          totalApplications: 0,
          pendingApplications: 0,
          interviewsScheduled: 0,
          profileViews: 0,
          profileCompletion: 0,
          savedJobs: 0,
          unreadMessages: 0,
        });
      }

      // Fetch job recommendations
      try {
        const recommendationsResponse = await api.get('/saved-jobs/recommendations');
        // Recommendations response received
        if ((recommendationsResponse.data as any).success) {
          setRecommendations((recommendationsResponse.data as any).data);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        // Try to get some featured jobs as fallback
        try {
          const featuredResponse = await api.get('/jobs?featured=true&limit=3');
          if ((featuredResponse.data as any).success) {
            const featuredJobs = (featuredResponse.data as any).data.map((job: any) => ({
              _id: job._id,
              title: job.title,
              company: job.company,
              location: job.location,
              salary: { min: job.salaryMin || 0, max: job.salaryMax || 0, currency: 'USD' },
              type: job.jobType,
              experience: job.experienceLevel,
              matchScore: 85
            }));
            setRecommendations(featuredJobs);
          }
        } catch (fallbackError) {
          console.error('Error fetching featured jobs:', fallbackError);
          // Final fallback: get any recent jobs
          try {
            const recentResponse = await api.get('/jobs?limit=3');
            if ((recentResponse.data as any).success) {
              const recentJobs = (recentResponse.data as any).data.map((job: any) => ({
                _id: job._id,
                title: job.title,
                company: job.company,
                location: job.location,
                salary: { min: job.salaryMin || 0, max: job.salaryMax || 0, currency: 'USD' },
                type: job.jobType,
                experience: job.experienceLevel,
                matchScore: 75
              }));
              setRecommendations(recentJobs);
            }
          } catch (finalError) {
            console.error('Error fetching recent jobs:', finalError);
          }
        }
      }

      // Fetch saved jobs
      try {
        const savedJobsResponse = await api.get('/saved-jobs?limit=4');
        // Saved jobs response received
        if ((savedJobsResponse.data as any).success) {
          setSavedJobs((savedJobsResponse.data as any).data);
          // Update saved jobs count in stats
          setStats(prevStats => ({
            ...prevStats,
            savedJobs: (savedJobsResponse.data as any).data.meta?.total || (savedJobsResponse.data as any).data.length
          }));
        }
      } catch (error) {
        console.error('Error fetching saved jobs:', error);
      }

      // Fetch recent applications
      try {
        const applicationsResponse = await api.get('/applications/my-applications');
        // Applications response received
        if ((applicationsResponse.data as any).success) {
          // Limit to 5 applications on the frontend
          setRecentApplications((applicationsResponse.data as any).data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      }

      // Fetch actual interviews
      try {
        const interviewsResponse = await api.get('/interviews');
        // Interviews response received
        if ((interviewsResponse.data as any).success) {
          const interviews = (interviewsResponse.data as any).data;
          // Count scheduled interviews for this week
          const now = new Date();
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
          
          const thisWeekInterviews = interviews.filter((interview: any) => {
            const interviewDate = new Date(interview.scheduledDate);
            return interviewDate >= startOfWeek && interviewDate <= endOfWeek && 
                   interview.status === 'scheduled' || interview.status === 'confirmed';
          }).length;

          // Update interviews count in stats
          setStats(prevStats => ({
            ...prevStats,
            interviewsScheduled: thisWeekInterviews
          }));
        }
      } catch (error) {
        console.error('Error fetching interviews:', error);
      }

      // Fetch user profile data for profile views
      if (user?.id) {
        try {
          // Fetching profile data for user
          const profileResponse = await api.get(`/users/${user.id}`);
          // Profile response received
          if ((profileResponse.data as any).success) {
            const profileData = (profileResponse.data as any).data;
            // Profile views from API
            setStats(prevStats => ({
              ...prevStats,
              profileViews: profileData.profileViews || 0
            }));
          }
        } catch (error) {
          console.error('Error fetching profile data:', error);
        }
      } else {
        console.warn('User ID is undefined, skipping profile data fetch');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

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
    
    // Only fetch data if user is properly authenticated
    if (isAuthenticated && user?.role === 'job_seeker') {
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
      case 'accepted':
        return <Badge variant="default" className="gap-1 bg-green-600 dark:bg-green-700"><CheckCircle className="h-3 w-3" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatSalary = (salary: { min: number; max: number; currency: string } | undefined) => {
    if (!salary) return 'Salary not specified';
    return `${salary.currency} ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}`;
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
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.fullName}!</h1>
          <p className="text-muted-foreground mt-2">Here&apos;s what&apos;s happening with your job search</p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/jobs">
              <Briefcase className="h-4 w-4 mr-2" />
              Browse Jobs
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/profile">
              <User className="h-4 w-4 mr-2" />
              Update Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Completion */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Complete Your Profile</h3>
              <p className="text-primary/80">A complete profile gets 3x more views from employers</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{stats.profileCompletion}%</div>
              <Progress value={stats.profileCompletion} className="w-32 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingApplications} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/interviews')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewsScheduled}</div>
            <p className="text-xs text-muted-foreground">Scheduled this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profileViews}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Jobs</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.savedJobs}</div>
            <p className="text-xs text-muted-foreground">Ready to apply</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate ? `${Math.round(stats.responseRate)}%` : '0%'}</div>
            <p className="text-xs text-muted-foreground">Employer responses</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild className="h-16 flex-col gap-2">
              <Link href="/jobs">
                <Briefcase className="h-6 w-6" />
                Browse Jobs
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-16 flex-col gap-2">
              <Link href="/jobs/saved">
                <Bookmark className="h-6 w-6" />
                Saved Jobs
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-16 flex-col gap-2">
              <Link href="/applications">
                <FileText className="h-6 w-6" />
                My Applications
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-16 flex-col gap-2">
              <Link href="/profile">
                <User className="h-6 w-6" />
                Update Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Job Recommendations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                Recommended for You
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No recommendations yet</h3>
                  <p className="text-muted-foreground mb-4">Complete your profile to get personalized job recommendations</p>
                  <Button asChild>
                    <Link href="/profile">Complete Profile</Link>
                  </Button>
                </div>
              ) : (
                recommendations.slice(0, 3).map((job) => (
                  <div key={job._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">{job.company.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.matchScore}% match
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.type}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {job.experience}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatSalary(job.salary)}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Save
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/jobs/${job._id}`}>Apply</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Applications</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/applications">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No applications yet</h3>
                  <p className="text-muted-foreground mb-4">Start applying to jobs to track your progress</p>
                  <Button asChild>
                    <Link href="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                recentApplications.map((application) => (
                  <div key={application._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{application.job?.title || 'Job Title Not Available'}</h4>
                      <p className="text-sm text-muted-foreground">{application.job?.company?.name || 'Company Not Available'}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(application.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(application.status)}
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Jobs */}
      {savedJobs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Saved Jobs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs/saved">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {savedJobs.slice(0, 4).map((savedJob) => (
                <div key={savedJob._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{savedJob.jobId.title}</h4>
                      <p className="text-sm text-muted-foreground">{savedJob.jobId.company?.name || 'Unknown Company'}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Heart className="h-4 w-4 fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {savedJob.jobId.location}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {savedJob.jobId.salaryMin && savedJob.jobId.salaryMax ? 
                        `$${savedJob.jobId.salaryMin.toLocaleString()} - $${savedJob.jobId.salaryMax.toLocaleString()}` : 
                        'Salary not specified'
                      }
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Remove
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/jobs/${savedJob.jobId._id}`}>Apply</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplications.length > 0 ? (
              recentApplications.slice(0, 3).map((application) => (
                <div key={application._id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Applied to <span className="font-semibold">{application.job?.title || 'Job'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.job?.company?.name || 'Company'} • {new Date(application.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(application.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No recent activity</h3>
                <p className="text-muted-foreground mb-4">Start applying to jobs to see your activity here</p>
                <Button asChild>
                  <Link href="/jobs">Browse Jobs</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
