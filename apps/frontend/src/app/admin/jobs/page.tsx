'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Briefcase, CheckCircle, Edit, Eye, Filter, MoreVertical, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  status: 'open' | 'closed' | 'paused';
  salaryMin: number;
  salaryMax: number;
  currency: string;
  postedBy: string;
  postedAt: string;
  expiresAt: string;
  applicationCount: number;
  isRemote: boolean;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock jobs - in real app, fetch from API
    const mockJobs: Job[] = [
      {
        id: '1',
        title: 'Senior Full Stack Developer',
        company: 'TechCorp Solutions',
        location: 'San Francisco, CA',
        jobType: 'full-time',
        experienceLevel: 'senior',
        status: 'open',
        salaryMin: 120000,
        salaryMax: 180000,
        currency: 'USD',
        postedBy: 'Sarah Williams',
        postedAt: '2024-01-10T00:00:00Z',
        expiresAt: '2024-02-10T00:00:00Z',
        applicationCount: 25,
        isRemote: true
      },
      {
        id: '2',
        title: 'Frontend Developer (React)',
        company: 'StartupXYZ Inc',
        location: 'New York, NY',
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'open',
        salaryMin: 90000,
        salaryMax: 130000,
        currency: 'USD',
        postedBy: 'David Brown',
        postedAt: '2024-01-12T00:00:00Z',
        expiresAt: '2024-02-12T00:00:00Z',
        applicationCount: 18,
        isRemote: false
      },
      {
        id: '3',
        title: 'UI/UX Designer',
        company: 'Creative Design Studio',
        location: 'Los Angeles, CA',
        jobType: 'full-time',
        experienceLevel: 'mid',
        status: 'paused',
        salaryMin: 80000,
        salaryMax: 110000,
        currency: 'USD',
        postedBy: 'Emily Davis',
        postedAt: '2024-01-08T00:00:00Z',
        expiresAt: '2024-02-08T00:00:00Z',
        applicationCount: 12,
        isRemote: true
      },
      {
        id: '4',
        title: 'Backend Engineer (Node.js)',
        company: 'TechCorp Solutions',
        location: 'San Francisco, CA',
        jobType: 'contract',
        experienceLevel: 'senior',
        status: 'closed',
        salaryMin: 130000,
        salaryMax: 170000,
        currency: 'USD',
        postedBy: 'Sarah Williams',
        postedAt: '2024-01-05T00:00:00Z',
        expiresAt: '2024-02-05T00:00:00Z',
        applicationCount: 32,
        isRemote: true
      },
      {
        id: '5',
        title: 'Product Manager',
        company: 'StartupXYZ Inc',
        location: 'New York, NY',
        jobType: 'full-time',
        experienceLevel: 'senior',
        status: 'open',
        salaryMin: 110000,
        salaryMax: 150000,
        currency: 'USD',
        postedBy: 'David Brown',
        postedAt: '2024-01-14T00:00:00Z',
        expiresAt: '2024-02-14T00:00:00Z',
        applicationCount: 8,
        isRemote: false
      }
    ];

    setTimeout(() => {
      setJobs(mockJobs);
      setFilteredJobs(mockJobs);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = jobs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(job => job.jobType === typeFilter);
    }

    setFilteredJobs(filtered);
  }, [jobs, searchTerm, statusFilter, typeFilter]);

  const toggleJobStatus = (jobId: string) => {
    setJobs(prev => 
      prev.map(job => {
        if (job.id === jobId) {
          let newStatus: Job['status'];
          if (job.status === 'open') {
            newStatus = 'paused';
          } else if (job.status === 'paused') {
            newStatus = 'open';
          } else {
            newStatus = 'open';
          }
          return { ...job, status: newStatus };
        }
        return job;
      })
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Open</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
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
          Total: {jobs.length}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id}>
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
                          <strong>Company:</strong> {job.company}
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
                          <strong>Applications:</strong> {job.applicationCount}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Posted by:</strong> {job.postedBy}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Posted: {new Date(job.postedAt).toLocaleDateString()}</span>
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
                      onClick={() => toggleJobStatus(job.id)}
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
    </div>
  );
}
