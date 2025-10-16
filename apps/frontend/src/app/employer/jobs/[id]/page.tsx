'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ArrowLeft, Building, Calendar, Clock, DollarSign, MapPin, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

interface Job {
  _id: string;
  title: string;
  description: string;
  requirements: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  skills: string[];
  status: string;
  createdAt: string;
  applicationsCount: number;
  views: number;
  viewsCount: number;
  isFeatured?: boolean;
  expiresAt?: string;
  company: {
    name: string;
    logo?: string;
    website?: string;
  };
}

export default function EmployerJobViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${resolvedParams.id}`);
      setJob(data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load job details',
        variant: 'destructive',
      });
      router.push('/employer/jobs');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id, toast, router]);

  const handleBoostJob = async () => {
    if (!job) return;
    
    if (!confirm(`Boost "${job.title}" for 7 days? This will use one of your available boosts.`)) return;

    try {
      setBoostLoading(true);
      const response = await api.post(`/subscriptions/boost/${job._id}`, {
        boostDays: 7
      });
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `"${job.title}" has been boosted and will appear at the top of search results for 7 days!`,
        });
        fetchJob(); // Refresh the job data
      }
    } catch (error: any) {
      console.error('Boost error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to boost job. You may not have available boosts.',
        variant: 'destructive',
      });
    } finally {
      setBoostLoading(false);
    }
  };

  const handleRemoveBoost = async () => {
    if (!job) return;
    
    if (!confirm(`Remove boost from "${job.title}"?`)) return;

    try {
      setBoostLoading(true);
      const response = await api.post(`/subscriptions/boost/${job._id}/remove`);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Boost removed from "${job.title}"`,
        });
        fetchJob(); // Refresh the job data
      }
    } catch (error: any) {
      console.error('Remove boost error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove boost.',
        variant: 'destructive',
      });
    } finally {
      setBoostLoading(false);
    }
  };

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    fetchJob();
  }, [isAuthenticated, user, router, resolvedParams.id, fetchJob, isHydrated]);

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-4">The job you&apos;re looking for doesnt exist.</p>
          <Link href="/employer/jobs">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/employer/jobs">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to My Jobs
            </Button>
          </Link>
          <div className="flex gap-3">
            <Link href={`/employer/edit-job/${job._id}`}>
              <Button variant="outline">Edit Job</Button>
            </Link>
            <Link href={`/employer/applicants/${job._id}`}>
              <Button>View Applicants ({job.applicationsCount})</Button>
            </Link>
          </div>
        </div>

        {/* Job Details */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-3xl">{job.title}</CardTitle>
                      {job.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          BOOSTED
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span>{job.company.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      {job.isFeatured && job.expiresAt && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Zap className="h-4 w-4" />
                          <span>Boost expires {new Date(job.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={job.status === 'open' ? 'default' : 'secondary'}
                    className="text-sm"
                  >
                    {job.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Job Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{job.applicationsCount}</div>
                    <div className="text-sm text-muted-foreground">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{job.viewsCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {job.applicationsCount > 0 && job.viewsCount > 0 
                        ? Math.round((job.applicationsCount / job.viewsCount) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Conversion</div>
                  </div>
                </div>

                {/* Job Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Job Type</div>
                      <div className="text-sm text-muted-foreground capitalize">{job.jobType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Experience Level</div>
                      <div className="text-sm text-muted-foreground capitalize">{job.experienceLevel}</div>
                    </div>
                  </div>
                  {(job.salaryMin || job.salaryMax) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Salary</div>
                        <div className="text-sm text-muted-foreground">
                          {job.salaryMin && job.salaryMax
                            ? `${job.currency || '$'}${job.salaryMin.toLocaleString()} - ${job.currency || '$'}${job.salaryMax.toLocaleString()}`
                            : job.salaryMin
                            ? `From ${job.currency || '$'}${job.salaryMin.toLocaleString()}`
                            : job.salaryMax
                            ? `Up to ${job.currency || '$'}${job.salaryMax.toLocaleString()}`
                            : 'Not specified'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Posted</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Job Description</h3>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{job.description}</p>
                  </div>
                </div>

                {/* Requirements */}
                {job.requirements && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/employer/applicants/${job._id}`} className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    View All Applicants ({job.applicationsCount})
                  </Button>
                </Link>
                <Link href={`/employer/edit-job/${job._id}`} className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Edit Job Details
                  </Button>
                </Link>
                <Link href={`/jobs/${job._id}`} className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    View Public Job Page
                  </Button>
                </Link>
                {/* Boost Button */}
                {job.isFeatured ? (
                  <Button 
                    className="w-full justify-start bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    variant="outline"
                    onClick={handleRemoveBoost}
                    disabled={boostLoading}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {boostLoading ? 'Removing...' : 'Remove Boost'}
                  </Button>
                ) : (
                  <Button 
                    className="w-full justify-start bg-yellow-500 hover:bg-yellow-600"
                    onClick={handleBoostJob}
                    disabled={boostLoading}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {boostLoading ? 'Boosting...' : 'Boost Job'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Job Performance */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Job Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Applications</span>
                      <span className="font-medium">{job.applicationsCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.min((job.applicationsCount / 50) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Views</span>
                      <span className="font-medium">{job.viewsCount || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(((job.viewsCount || 0) / 200) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
