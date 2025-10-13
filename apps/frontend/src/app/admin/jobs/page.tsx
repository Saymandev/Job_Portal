'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Briefcase, CheckCircle, ChevronLeft, ChevronRight, Edit, Eye, Filter, MoreVertical, Search, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Job {
  _id: string;
  title: string;
  company: {
    name: string;
  };
  location: string;
  jobType: string;
  experienceLevel: string;
  status: 'open' | 'closed' | 'paused';
  salaryMin: number;
  salaryMax: number;
  currency: string;
  postedBy: {
    fullName: string;
  };
  createdAt: string;
  expiresAt: string;
  applicationsCount: number;
  isRemote: boolean;
}

export default function AdminJobsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [limit] = useState(10);

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { jobType: typeFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await api.get(`/admin/jobs?${params}`);
      
      if (response.data.success) {
        setJobs(response.data.data.jobs);
        setTotalJobs(response.data.data.total);
        setTotalPages(Math.ceil(response.data.data.total / limit));
      }
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter, searchTerm, limit, toast]);

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
      fetchJobs();
    }
  }, [isAuthenticated, user, router, isHydrated, fetchJobs]);

  const toggleJobStatus = async (jobId: string) => {
    try {
      const job = jobs.find(j => j._id === jobId);
      if (!job) return;

      const newStatus = job.status === 'open' ? 'paused' : 'open';
      
      const response = await api.put(`/admin/jobs/${jobId}`, { status: newStatus });
      
      if (response.data.success) {
        setJobs(prev => 
          prev.map(j => j._id === jobId ? { ...j, status: newStatus } : j)
        );
        toast({
          title: 'Success',
          description: `Job ${newStatus === 'open' ? 'activated' : 'paused'} successfully`,
        });
      }
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update job status',
        variant: 'destructive',
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'type') {
      setTypeFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-100 text-green-800">Open</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'closed':
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExperienceBadge = (level: string) => {
    switch (level) {
      case 'entry':
        return <Badge variant="secondary">Entry Level</Badge>;
      case 'mid':
        return <Badge variant="default">Mid Level</Badge>;
      case 'senior':
        return <Badge variant="destructive">Senior Level</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Jobs</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Briefcase className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Jobs Management</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          Total: {totalJobs}
        </Badge>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{job.title}</h3>
                      {getStatusBadge(job.status)}
                      {getExperienceBadge(job.experienceLevel)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <strong>Company:</strong> {job.company.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Location:</strong> {job.location} {job.isRemote && '(Remote)'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Type:</strong> {job.jobType.replace('-', ' ')}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <strong>Salary:</strong> {job.currency} {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Applications:</strong> {job.applicationsCount}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Posted by:</strong> {job.postedBy.fullName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                      <span>Expires: {new Date(job.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      variant={job.status === 'open' ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleJobStatus(job._id)}
                    >
                      {job.status === 'open' ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalJobs)} of {totalJobs} jobs
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
