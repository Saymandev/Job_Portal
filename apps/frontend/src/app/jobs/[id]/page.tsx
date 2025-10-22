'use client';

import { QuickApplyModal } from '@/components/quick-apply-modal';
import { SaveJobButton } from '@/components/save-job-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Briefcase, Building, Check, Clock, DollarSign, MapPin, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuickApplyOpen, setIsQuickApplyOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${params.id}`);
      setJob(data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load job details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.id, toast]);

  const checkApplicationStatus = useCallback(async () => {
    if (!isAuthenticated || !user || user.role !== 'job_seeker') {
      return;
    }

    try {
      
      const { data } = await api.get(`/applications/my-applications`);
      
      
      if (data.success) {
        const userApplications = data.data;
        
        
        
        const jobApplication = userApplications.find((app: any) => app.job._id === params.id);
        
        
        if (jobApplication) {
          
          setHasApplied(true);
          setApplicationStatus(jobApplication.status);
        } else {
          
          setHasApplied(false);
          setApplicationStatus(null);
        }
      }
    } catch (error: any) {
      console.error('Error checking application status:', error);
      console.error('Error response:', error.response?.data);
    }
  }, [isAuthenticated, user, params.id]);

  useEffect(() => {
    fetchJob();
    if (isAuthenticated && user?.role === 'job_seeker') {
      checkApplicationStatus();
    }
  }, [fetchJob, checkApplicationStatus, isAuthenticated, user]);

  const handleApply = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/jobs/${params.id}`);
      return;
    }
    setIsQuickApplyOpen(true);
  };

  const handleApplicationSubmit = () => {
    setIsApplying(true);
    // The QuickApplyModal will handle the actual submission
    // and call onClose when done
  };

  const handleApplicationComplete = () => {
    setIsApplying(false);
    setIsQuickApplyOpen(false);
    // Refresh application status after successful application
    checkApplicationStatus();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Job not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl">{job.title}</CardTitle>
                  <CardDescription className="text-lg">
                    {job.company?.name || 'Company'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <SaveJobButton 
                    jobId={job._id} 
                    jobTitle={job.title}
                    variant="outline"
                    size="default"
                    showText={true}
                  />
                  {isAuthenticated && user?.role === 'job_seeker' && (
                    <Button 
                      onClick={handleApply}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Apply Now
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Job Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.location}</span>
                  {job.isRemote && <span className="text-primary">(Remote)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{job.jobType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.experienceLevel} level</span>
                </div>
                {job.salaryMin && job.salaryMax && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Posted {formatDate(job.createdAt)}</span>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills?.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Job Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-semibold mb-2">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
              </div>

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Benefits</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {job.benefits.map((benefit: string, index: number) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Company Info */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-4">
                  <Building className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold">{job.company?.name}</h3>
                    <p className="text-sm text-muted-foreground">{job.company?.location}</p>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex gap-4">
                {hasApplied ? (
                  <div className="flex-1 flex items-center justify-center gap-3 p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <Check className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Application Submitted!</p>
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <span>Status:</span>
                        <Badge variant="secondary" className="capitalize">{applicationStatus}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={handleApply}
                    disabled={isApplying}
                  >
                    {isApplying ? 'Applying...' : 'Apply Now'}
                  </Button>
                )}
                <SaveJobButton jobId={job._id} jobTitle={job.title} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Apply Modal */}
      {job && (
        <QuickApplyModal
          isOpen={isQuickApplyOpen}
          onClose={handleApplicationComplete}
          jobId={job._id}
          jobTitle={job.title}
          companyName={job.company?.name || 'Company'}
          onApplicationSubmit={handleApplicationSubmit}
        />
      )}
    </div>
  );
}

