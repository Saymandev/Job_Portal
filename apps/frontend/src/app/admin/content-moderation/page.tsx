'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  AlertTriangle,
  Ban,
  Briefcase,
  CheckCircle,
  CheckSquare,
  Download,
  Eye,
  Flag,
  RefreshCw,
  Search,
  Shield,
  User,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface JobPosting {
  _id: string;
  title: string;
  description: string;
  company: {
    _id: string;
    name: string;
    logo?: string;
  };
  postedBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'active' | 'paused' | 'closed' | 'flagged' | 'under_review';
  workType: 'full-time' | 'part-time' | 'contract' | 'internship';
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  requirements: string[];
  benefits: string[];
  tags: string[];
  flaggedReason?: string;
  flaggedBy?: string;
  flaggedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin';
  company?: string;
  avatar?: string;
  status: 'active' | 'suspended' | 'flagged' | 'under_review';
  flaggedReason?: string;
  flaggedBy?: string;
  flaggedAt?: string;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentFlag {
  _id: string;
  type: 'job' | 'profile' | 'message' | 'company';
  targetId: string;
  targetTitle: string;
  reporter: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

interface ModerationStats {
  totalJobs: number;
  flaggedJobs: number;
  totalUsers: number;
  flaggedUsers: number;
  pendingFlags: number;
  resolvedFlags: number;
  activeModerators: number;
}

export default function ContentModerationPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Job filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatus, setJobStatus] = useState('all');
  const [jobType, setJobType] = useState('all');
  
  // User filters
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('all');
  const [userRole, setUserRole] = useState('all');
  
  // Flag filters
  const [flagSearch, setFlagSearch] = useState('');
  const [flagStatus, setFlagStatus] = useState('all');
  const [flagPriority, setFlagPriority] = useState('all');
  const [flagType, setFlagType] = useState('all');
  
  // Pagination state
  const [currentJobPage, setCurrentJobPage] = useState(1);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentFlagPage, setCurrentFlagPage] = useState(1);
  const [totalJobPages, setTotalJobPages] = useState(1);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const [totalFlagPages, setTotalFlagPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalFlags, setTotalFlags] = useState(0);
  const [limit] = useState(10);
  
  // View modal states
  const [showJobModal, setShowJobModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentJobPage.toString(),
        limit: limit.toString(),
        ...(jobStatus !== 'all' && { status: jobStatus }),
        ...(jobType !== 'all' && { workType: jobType }),
        ...(jobSearch && { search: jobSearch }),
      });

      const response = await api.get(`/admin/moderation/jobs?${params}`);
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setJobs(data.jobs || []);
        setTotalJobs(data.total || 0);
        setTotalJobPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        variant: 'destructive',
      });
    }
  }, [toast, currentJobPage, jobStatus, jobType, jobSearch, limit]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentUserPage.toString(),
        limit: limit.toString(),
        ...(userStatus !== 'all' && { status: userStatus }),
        ...(userRole !== 'all' && { role: userRole }),
        ...(userSearch && { search: userSearch }),
      });

      const response = await api.get(`/admin/moderation/users?${params}`);
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
        setTotalUserPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    }
  }, [toast, currentUserPage, userStatus, userRole, userSearch, limit]);

  const fetchFlags = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (flagStatus !== 'all') params.append('status', flagStatus);
      if (flagPriority !== 'all') params.append('priority', flagPriority);
      if (flagType !== 'all') params.append('type', flagType);
      if (flagSearch) params.append('search', flagSearch);
      params.append('page', currentFlagPage.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/moderation/flags?${params}`);
      
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setFlags(data.flags || []);
        setTotalFlags(data.total || 0);
        setTotalFlagPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch content flags',
        variant: 'destructive',
      });
    }
  }, [flagStatus, flagPriority, flagType, flagSearch, currentFlagPage, limit, toast]);

  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from data
      const totalJobs = jobs.length;
      const flaggedJobs = jobs.filter(j => j.status === 'flagged' || j.status === 'under_review').length;
      const totalUsers = users.length;
      const flaggedUsers = users.filter(u => u.status === 'flagged' || u.status === 'under_review').length;
      const pendingFlags = flags.filter(f => f.status === 'pending').length;
      const resolvedFlags = flags.filter(f => f.status === 'resolved').length;
      const activeModerators = 1; // This would come from actual data

      setStats({
        totalJobs,
        flaggedJobs,
        totalUsers,
        flaggedUsers,
        pendingFlags,
        resolvedFlags,
        activeModerators,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [jobs, users, flags]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchUsers(), fetchFlags()]);
    } finally {
      setLoading(false);
    }
  }, [fetchJobs, fetchUsers, fetchFlags]);

  // Pagination handlers
  const handleJobPageChange = (page: number) => {
    setCurrentJobPage(page);
  };

  const handleUserPageChange = (page: number) => {
    setCurrentUserPage(page);
  };

  const handleFlagPageChange = (page: number) => {
    setCurrentFlagPage(page);
  };

  // Search handlers
  const handleJobSearch = (value: string) => {
    setJobSearch(value);
    setCurrentJobPage(1);
  };

  const handleUserSearch = (value: string) => {
    setUserSearch(value);
    setCurrentUserPage(1);
  };

  const handleFlagSearch = (value: string) => {
    setFlagSearch(value);
    setCurrentFlagPage(1);
  };

  // Filter handlers
  const handleJobFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setJobStatus(value);
    } else if (filterType === 'type') {
      setJobType(value);
    }
    setCurrentJobPage(1);
  };

  const handleUserFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setUserStatus(value);
    } else if (filterType === 'role') {
      setUserRole(value);
    }
    setCurrentUserPage(1);
  };

  const handleFlagFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setFlagStatus(value);
    } else if (filterType === 'priority') {
      setFlagPriority(value);
    } else if (filterType === 'type') {
      setFlagType(value);
    }
    setCurrentFlagPage(1);
  };

  const handleJobAction = async (jobId: string, action: string) => {
    try {
      await api.post(`/admin/moderation/jobs/${jobId}/action`, { action });
      
      toast({
        title: 'Success',
        description: `Job ${action}ed successfully`,
      });
      
      fetchJobs();
    } catch (error) {
      console.error('Error performing job action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      await api.post(`/admin/moderation/users/${userId}/action`, { action });
      
      toast({
        title: 'Success',
        description: `User ${action}ed successfully`,
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error performing user action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  const handleFlagAction = async (flagId: string, action: string) => {
    try {
      await api.post(`/admin/moderation/flags/${flagId}/action`, { action });
      
      toast({
        title: 'Success',
        description: `Flag ${action}ed successfully`,
      });
      
      fetchFlags();
    } catch (error) {
      console.error('Error performing flag action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  // View handlers
  const handleViewJob = (job: JobPosting) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleViewFlag = (flag: ContentFlag) => {
    setSelectedFlag(flag);
    setShowFlagModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'flagged':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'employer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'candidate':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </TabsList>
          
          <TabsContent value="jobs" className="space-y-4">
            {/* Filters Skeleton */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Jobs List Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground">
            Moderate job postings, review user profiles, and manage content policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.flaggedJobs} flagged
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.flaggedUsers} flagged
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Flags</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingFlags}</div>
              <p className="text-xs text-muted-foreground">
                need review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Flags</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolvedFlags}</div>
              <p className="text-xs text-muted-foreground">
                this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Moderators</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeModerators}</div>
              <p className="text-xs text-muted-foreground">
                online now
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flag Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalJobs > 0 ? Math.round((stats.flaggedJobs / stats.totalJobs) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                of jobs flagged
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pendingFlags + stats.resolvedFlags > 0 
                  ? Math.round((stats.resolvedFlags / (stats.pendingFlags + stats.resolvedFlags)) * 100) 
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                flags resolved
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Jobs ({totalJobs})</TabsTrigger>
          <TabsTrigger value="users">Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="flags">Flags ({totalFlags})</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Job Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={jobSearch}
                      onChange={(e) => handleJobSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={jobStatus} onValueChange={(value) => handleJobFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={jobType} onValueChange={(value) => handleJobFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle>Job Postings</CardTitle>
              <CardDescription>
                Review and moderate job postings across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <p className="text-sm text-gray-600">
                              {job.company.name} • {job.location} • {job.workType}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(job.status)}>
                              {(job.status || '').replace('_', ' ')}
                            </Badge>
                            {job.salary && (
                              <Badge variant="secondary">
                                {job.salary.currency} {job.salary.min}-{job.salary.max}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {job.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>Posted by: {job.postedBy.name}</span>
                          <span>Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(job.updatedAt).toLocaleDateString()}</span>
                        </div>
                        
                        {job.flaggedReason && (
                          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Flag className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">Flagged Reason:</span>
                            </div>
                            <p className="text-sm text-red-700">{job.flaggedReason}</p>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {job.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewJob(job)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {job.status === 'flagged' || job.status === 'under_review' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleJobAction(job._id, 'approve')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleJobAction(job._id, 'reject')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleJobAction(job._id, 'flag')}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <Flag className="h-4 w-4 mr-1" />
                            Flag
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {jobs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No jobs found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* User Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={userStatus} onValueChange={(value) => handleUserFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Role</label>
                  <Select value={userRole} onValueChange={(value) => handleUserFilterChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="candidate">Candidate</SelectItem>
                      <SelectItem value="employer">Employer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>User Profiles</CardTitle>
              <CardDescription>
                Review and moderate user profiles across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{user.name}</h3>
                            <p className="text-sm text-gray-600">
                              {user.email} • {user.company || 'No company'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(user.status)}>
                              {(user.status || '').replace('_', ' ')}
                            </Badge>
                            <Badge className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>Last Active: {new Date(user.lastActive).toLocaleDateString()}</span>
                          <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {user.flaggedReason && (
                          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Flag className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">Flagged Reason:</span>
                            </div>
                            <p className="text-sm text-red-700">{user.flaggedReason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {user.status === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUserAction(user._id, 'suspend')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUserAction(user._id, 'activate')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No users found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flags Tab */}
        <TabsContent value="flags" className="space-y-4">
          {/* Flag Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search flags..."
                      value={flagSearch}
                      onChange={(e) => handleFlagSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={flagStatus} onValueChange={(value) => handleFlagFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={flagPriority} onValueChange={(value) => handleFlagFilterChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={flagType} onValueChange={(value) => handleFlagFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="profile">Profile</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flags List */}
          <Card>
            <CardHeader>
              <CardTitle>Content Flags</CardTitle>
              <CardDescription>
                Review and manage content flags reported by users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flags.map((flag) => (
                  <div
                    key={flag._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Flag className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{flag.targetTitle}</h3>
                            <p className="text-sm text-gray-600">
                              {flag.type} • Reported by {flag.reporter.name}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(flag.status)}>
                              {flag.status}
                            </Badge>
                            <Badge className={getPriorityColor(flag.priority)}>
                              {flag.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-800">Reason: {flag.reason}</span>
                          </div>
                          <p className="text-sm text-gray-700">{flag.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created: {new Date(flag.createdAt).toLocaleDateString()}</span>
                          {flag.reviewedAt && (
                            <span>Reviewed: {new Date(flag.reviewedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        
                        {flag.resolution && (
                          <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">Resolution:</span>
                            </div>
                            <p className="text-sm text-green-700">{flag.resolution}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewFlag(flag)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {flag.status === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleFlagAction(flag._id, 'resolve')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleFlagAction(flag._id, 'dismiss')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {flags.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Flag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No content flags found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job View Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Job Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJobModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{selectedJob.title}</h3>
                    <p className="text-lg text-gray-600">{selectedJob.company.name}</p>
                    <p className="text-sm text-gray-500">{selectedJob.location} • {selectedJob.workType}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(selectedJob.status)}>
                      {(selectedJob.status || '').replace('_', ' ')}
                    </Badge>
                    {selectedJob.salary && (
                      <Badge variant="secondary">
                        {selectedJob.salary.currency} {selectedJob.salary.min}-{selectedJob.salary.max}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Job ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedJob._id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Posted By:</span>
                    <p className="text-gray-600">{selectedJob.postedBy.name} ({selectedJob.postedBy.email})</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-gray-600">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <p className="text-gray-600">{new Date(selectedJob.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedJob.description}</p>
                  </div>
                </div>

                {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Requirements</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedJob.requirements.map((req, index) => (
                        <li key={index} className="text-gray-700">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Benefits</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedJob.benefits.map((benefit, index) => (
                        <li key={index} className="text-gray-700">{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.tags && selectedJob.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.flaggedReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Flagged Reason:</span>
                    </div>
                    <p className="text-red-700">{selectedJob.flaggedReason}</p>
                    {selectedJob.flaggedBy && (
                      <p className="text-sm text-red-600 mt-1">Flagged by: {selectedJob.flaggedBy}</p>
                    )}
                    {selectedJob.flaggedAt && (
                      <p className="text-sm text-red-600">Flagged at: {new Date(selectedJob.flaggedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowJobModal(false)}
                >
                  Close
                </Button>
                {selectedJob.status === 'flagged' || selectedJob.status === 'under_review' ? (
                  <>
                    <Button 
                      onClick={() => {
                        handleJobAction(selectedJob._id, 'approve');
                        setShowJobModal(false);
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => {
                        handleJobAction(selectedJob._id, 'reject');
                        setShowJobModal(false);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      handleJobAction(selectedJob._id, 'flag');
                      setShowJobModal(false);
                    }}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    Flag
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User View Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">User Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{selectedUser.name}</h3>
                    <p className="text-lg text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500">{selectedUser.company || 'No company'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {(selectedUser.status || '').replace('_', ' ')}
                    </Badge>
                    <Badge className={getRoleColor(selectedUser.role)}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">User ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedUser._id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <p className="text-gray-600 capitalize">{selectedUser.role}</p>
                  </div>
                  <div>
                    <span className="font-medium">Last Active:</span>
                    <p className="text-gray-600">{new Date(selectedUser.lastActive).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-gray-600">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedUser.flaggedReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Flagged Reason:</span>
                    </div>
                    <p className="text-red-700">{selectedUser.flaggedReason}</p>
                    {selectedUser.flaggedBy && (
                      <p className="text-sm text-red-600 mt-1">Flagged by: {selectedUser.flaggedBy}</p>
                    )}
                    {selectedUser.flaggedAt && (
                      <p className="text-sm text-red-600">Flagged at: {new Date(selectedUser.flaggedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowUserModal(false)}
                >
                  Close
                </Button>
                {selectedUser.status === 'active' ? (
                  <Button 
                    onClick={() => {
                      handleUserAction(selectedUser._id, 'suspend');
                      setShowUserModal(false);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Suspend
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      handleUserAction(selectedUser._id, 'activate');
                      setShowUserModal(false);
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag View Modal */}
      {showFlagModal && selectedFlag && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Flag Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFlagModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flag className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{selectedFlag.targetTitle}</h3>
                    <p className="text-lg text-gray-600 capitalize">{selectedFlag.type}</p>
                    <p className="text-sm text-gray-500">Reported by {selectedFlag.reporter.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(selectedFlag.status)}>
                      {selectedFlag.status}
                    </Badge>
                    <Badge className={getPriorityColor(selectedFlag.priority)}>
                      {selectedFlag.priority}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Flag ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedFlag._id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Target ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedFlag.targetId}</p>
                  </div>
                  <div>
                    <span className="font-medium">Reporter:</span>
                    <p className="text-gray-600">{selectedFlag.reporter.name} ({selectedFlag.reporter.email})</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-gray-600">{new Date(selectedFlag.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Reason</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800">{selectedFlag.reason}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800">{selectedFlag.description}</p>
                  </div>
                </div>

                {selectedFlag.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Resolution:</span>
                    </div>
                    <p className="text-green-700">{selectedFlag.resolution}</p>
                    {selectedFlag.reviewedBy && (
                      <p className="text-sm text-green-600 mt-1">Reviewed by: {selectedFlag.reviewedBy}</p>
                    )}
                    {selectedFlag.reviewedAt && (
                      <p className="text-sm text-green-600">Reviewed at: {new Date(selectedFlag.reviewedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowFlagModal(false)}
                >
                  Close
                </Button>
                {selectedFlag.status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => {
                        handleFlagAction(selectedFlag._id, 'resolve');
                        setShowFlagModal(false);
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                    <Button 
                      onClick={() => {
                        handleFlagAction(selectedFlag._id, 'dismiss');
                        setShowFlagModal(false);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
