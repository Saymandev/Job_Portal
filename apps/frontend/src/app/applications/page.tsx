'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Briefcase, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchApplications = useCallback(async () => {
    // Double check authentication before making any API calls
    if (!isAuthenticated) {
      
      return;
    }
    
    try {
      const { data } = await api.get('/applications/my-applications');
      setApplications((data as any).data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Only fetch data if user is properly authenticated
    if (isAuthenticated) {
      fetchApplications();
    }
  }, [isAuthenticated, router, isHydrated, fetchApplications]);

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
      reviewing: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
      shortlisted: 'bg-green-500/20 text-green-700 dark:text-green-300',
      interview_scheduled: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
      rejected: 'bg-red-500/20 text-red-700 dark:text-red-300',
      accepted: 'bg-green-600/20 text-green-700 dark:text-green-300',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Loading applications...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Applications</h1>

      <div className="grid gap-6">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start applying to jobs to see them here
              </p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{application.job?.title}</CardTitle>
                    <CardDescription className="text-base">
                      {application.company?.name}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(application.status)}>
                    {application.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Applied {formatDate(application.createdAt)}
                  </div>
                  {application.interviewDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Interview: {formatDate(application.interviewDate)}
                    </div>
                  )}
                </div>
                {application.notes && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <strong>Notes:</strong> {application.notes}
                  </p>
                )}
                {application.feedback && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong>Feedback:</strong> {application.feedback}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

