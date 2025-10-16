'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Edit, Eye, Plus, Trash2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function EmployerJobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [boostLoading, setBoostLoading] = useState<string | null>(null);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs/my-jobs');
      setJobs(data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    fetchJobs();
  }, [isAuthenticated, user, router, isHydrated, fetchJobs]);

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) return;

    try {
      await api.delete(`/jobs/${jobId}`);
      toast({
        title: 'Success',
        description: 'Job deleted successfully',
      });
      fetchJobs();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete job. You may not have permission to delete this job.',
        variant: 'destructive',
      });
    }
  };

  const handleBoostJob = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Boost "${jobTitle}" for 7 days? This will use one of your available boosts.`)) return;

    try {
      setBoostLoading(jobId);
      const response = await api.post(`/subscriptions/boost/${jobId}`, {
        boostDays: 7
      });
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `"${jobTitle}" has been boosted and will appear at the top of search results for 7 days!`,
        });
        fetchJobs(); // Refresh the jobs list
      }
    } catch (error: any) {
      console.error('Boost error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to boost job. You may not have available boosts.',
        variant: 'destructive',
      });
    } finally {
      setBoostLoading(null);
    }
  };

  const handleRemoveBoost = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Remove boost from "${jobTitle}"?`)) return;

    try {
      setBoostLoading(jobId);
      const response = await api.post(`/subscriptions/boost/${jobId}/remove`);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Boost removed from "${jobTitle}"`,
        });
        fetchJobs(); // Refresh the jobs list
      }
    } catch (error: any) {
      console.error('Remove boost error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove boost.',
        variant: 'destructive',
      });
    } finally {
      setBoostLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Job Listings</h1>
        <Link href="/employer/post-job">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No jobs posted yet</p>
              <Link href="/employer/post-job">
                <Button>Post Your First Job</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      {job.isFeatured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          BOOSTED
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      Posted {formatDate(job.createdAt)} • {job.applicationsCount} applications
                      {job.isFeatured && job.expiresAt && (
                        <span className="ml-2 text-yellow-600">
                          • Boost expires {formatDate(job.expiresAt)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      job.status === 'open'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {job.status.toUpperCase()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">{job.location}</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{job.jobType}</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{job.experienceLevel}</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link href={`/employer/jobs/${job._id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/employer/applicants/${job._id}`}>
                    <Button variant="outline" size="sm">
                      View Applicants ({job.applicationsCount})
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/employer/edit-job/${job._id}`)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  {/* Boost Button */}
                  {job.isFeatured ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                      onClick={() => handleRemoveBoost(job._id, job.title)}
                      disabled={boostLoading === job._id}
                    >
                      <Zap className="h-4 w-4" />
                      {boostLoading === job._id ? 'Removing...' : 'Remove Boost'}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 bg-yellow-500 hover:bg-yellow-600"
                      onClick={() => handleBoostJob(job._id, job.title)}
                      disabled={boostLoading === job._id}
                    >
                      <Zap className="h-4 w-4" />
                      {boostLoading === job._id ? 'Boosting...' : 'Boost Job'}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDelete(job._id, job.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

