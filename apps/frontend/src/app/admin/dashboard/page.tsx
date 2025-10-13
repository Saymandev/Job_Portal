'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  FileText,
  MessageSquare,
  Shield,
  UserCheck,
  Users,
  UserX
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// Progress component
const Progress = ({ value = 0, className = "" }: { value?: number; className?: string }) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Job {
  _id: string;
  title: string;
  company: {
    name: string;
  };
  status: string;
  applicationsCount: number;
  postedAt: string;
  createdBy: {
    fullName: string;
  };
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  pendingJobs: number;
  totalApplications: number;
  totalCompanies: number;
  revenue: number;
  subscriptions: number;
}

interface SystemHealth {
  databaseStatus: 'healthy' | 'warning' | 'error';
  serverStatus: 'healthy' | 'warning' | 'error';
  emailStatus: 'healthy' | 'warning' | 'error';
  storageUsage: number;
  apiResponseTime: number;
}

interface RecentActivity {
  _id: string;
  type: string;
  description: string;
  user: {
    fullName: string;
    role: string;
  };
  timestamp: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalJobs: 0,
    pendingJobs: 0,
    totalApplications: 0,
    totalCompanies: 0,
    revenue: 0,
    subscriptions: 0,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    databaseStatus: 'healthy',
    serverStatus: 'healthy',
    emailStatus: 'healthy',
    storageUsage: 0,
    apiResponseTime: 0,
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    
    // Only fetch data if user is properly authenticated
    if (isAuthenticated && user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [isAuthenticated, user, router, isHydrated]);

  const fetchDashboardData = async () => {
    // Double check authentication before making any API calls
    if (!isAuthenticated || user?.role !== 'admin') {
      console.log('User not authenticated, skipping API calls');
      return;
    }
    
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get('/admin/dashboard/stats');
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Fetch system health
      const healthResponse = await api.get('/admin/system/health');
      if (healthResponse.data.success) {
        setSystemHealth(healthResponse.data.data);
      }

      // Fetch recent users
      const usersResponse = await api.get('/admin/users/recent?limit=5');
      if (usersResponse.data.success) {
        setRecentUsers(usersResponse.data.data);
      }

      // Fetch pending jobs
      const jobsResponse = await api.get('/admin/jobs/pending?limit=5');
      if (jobsResponse.data.success) {
        setPendingJobs(jobsResponse.data.data);
      }

      // Fetch recent activity
      const activityResponse = await api.get('/admin/activity/recent?limit=10');
      if (activityResponse.data.success) {
        setRecentActivity(activityResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Warning</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Badge variant="default" className="gap-1 bg-purple-600"><Shield className="h-3 w-3" />Admin</Badge>;
      case 'employer':
        return <Badge variant="default" className="gap-1 bg-blue-600"><Briefcase className="h-3 w-3" />Employer</Badge>;
      case 'job_seeker':
        return <Badge variant="default" className="gap-1 bg-green-600"><Users className="h-3 w-3" />Job Seeker</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'user_registration':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'job_posted':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'application_submitted':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'user_blocked':
        return <UserX className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System overview and management</p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/admin/users">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/jobs">
              <Briefcase className="h-4 w-4 mr-2" />
              Manage Jobs
            </Link>
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Shield className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 mb-1">Database</div>
              {getStatusBadge(systemHealth.databaseStatus)}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 mb-1">Server</div>
              {getStatusBadge(systemHealth.serverStatus)}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 mb-1">Email</div>
              {getStatusBadge(systemHealth.emailStatus)}
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 mb-1">Storage</div>
              <div className="text-lg font-bold text-blue-900">{systemHealth.storageUsage}%</div>
              <Progress value={systemHealth.storageUsage} className="w-16 mx-auto mt-1" />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-blue-900 mb-1">API Response</div>
              <div className="text-lg font-bold text-blue-900">{systemHealth.apiResponseTime}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingJobs} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.subscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/users">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No users yet</h3>
                  <p className="text-gray-500">Users will appear here as they register</p>
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.fullName.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{user.fullName}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRoleBadge(user.role)}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user._id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Job Approvals</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/jobs">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-500">No jobs pending approval</p>
                </div>
              ) : (
                pendingJobs.map((job) => (
                  <div key={job._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{job.title}</h4>
                        <p className="text-sm text-gray-600">{job.company.name}</p>
                        <p className="text-xs text-gray-500">
                          Posted by {job.createdBy.fullName} • {new Date(job.postedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {job.applicationsCount} applications
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/jobs/${job._id}/review`}>Review</Link>
                        </Button>
                        <Button size="sm" variant="default" asChild>
                          <Link href={`/admin/jobs/${job._id}/approve`}>Approve</Link>
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

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-500">Activity will appear here as users interact with the platform</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {activity.user.fullName} ({activity.user.role}) • {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/admin/users">
                <Users className="h-6 w-6 mb-2" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/admin/jobs">
                <Briefcase className="h-6 w-6 mb-2" />
                Manage Jobs
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/admin/analytics">
                <BarChart3 className="h-6 w-6 mb-2" />
                View Analytics
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/admin/settings">
                <Shield className="h-6 w-6 mb-2" />
                System Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}