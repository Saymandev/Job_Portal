'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CheckCircle, Download, Mail, Phone, User, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function ApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  const fetchApplicants = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/job/${params.jobId}`);
      setApplicants((data as any).data);
      if ((data as any).data.length > 0) {
        setJobTitle((data as any).data[0].job?.title || 'Job');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load applicants',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.jobId, toast]);

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await api.put(`/applications/${applicationId}/status`, { status });
      toast({
        title: 'Success',
        description: 'Application status updated',
      });
      fetchApplicants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Applicants for {jobTitle}</h1>
        <p className="text-muted-foreground">{applicants.length} total applicants</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applicants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No applications yet</p>
            </CardContent>
          </Card>
        ) : (
          applicants.map((application) => (
            <Card key={application._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{application.applicant?.fullName}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {application.applicant?.email}
                      </span>
                      {application.applicant?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {application.applicant.phone}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge>{application.status.replace('_', ' ').toUpperCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.applicant?.skills && (
                  <div>
                    <h4 className="font-semibold mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {application.applicant.skills.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {application.coverLetter && (
                  <div>
                    <h4 className="font-semibold mb-2">Cover Letter</h4>
                    <p className="text-sm text-muted-foreground">{application.coverLetter}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push(`/candidates/${application.applicant._id}`)}
                  >
                    <User className="h-4 w-4" />
                    View Profile
                  </Button>
                  {application.resume && (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => updateStatus(application._id, 'shortlisted')}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Shortlist
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => updateStatus(application._id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
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

