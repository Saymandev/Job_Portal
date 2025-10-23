'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  Phone,
  Users,
  Video,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Interview {
  _id: string;
  scheduledDate: string;
  duration: number;
  type: string;
  status: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
  job: {
    _id: string;
    title: string;
  };
  candidate: {
    _id: string;
    fullName: string;
    email: string;
  };
  interviewer?: {
    _id: string;
    fullName: string;
    email: string;
  };
  company: {
    _id: string;
    name: string;
  };
}

export default function InterviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const fetchInterviews = useCallback(async () => {
    // Double check authentication before making any API calls
    if (!isAuthenticated) {
      // User not authenticated, skipping API calls
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await api.get('/interviews');
      if ((response.data as any).success) {
        setInterviews((response.data as any).data);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Only fetch data if user is properly authenticated
    if (isAuthenticated) {
      fetchInterviews();
    }
  }, [isAuthenticated, router, isHydrated, fetchInterviews]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      scheduled: { variant: 'default', icon: Clock, label: 'Scheduled' },
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
      rescheduled: { variant: 'secondary', icon: AlertCircle, label: 'Rescheduled' },
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
      no_show: { variant: 'destructive', icon: XCircle, label: 'No Show' },
    };

    const config = statusConfig[status] || { variant: 'default', icon: Clock, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'in_person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const interviewDate = new Date(interview.scheduledDate);
    const now = new Date();

    if (filter === 'upcoming') {
      return interviewDate >= now && ['scheduled', 'confirmed', 'rescheduled'].includes(interview.status);
    } else if (filter === 'past') {
      return interviewDate < now || ['completed', 'cancelled', 'no_show'].includes(interview.status);
    }
    return true;
  });

  // Show loading while store is hydrating or data is loading
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">Loading interviews...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Interview Calendar</h1>
          <p className="text-lg text-muted-foreground">
            Manage your upcoming and past interviews
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Interviews
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            onClick={() => setFilter('past')}
          >
            Past
          </Button>
        </div>

        {/* Interviews List */}
        {isLoading ? (
          <div className="text-center py-12">Loading interviews...</div>
        ) : filteredInterviews.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No interviews scheduled</h3>
              <p className="text-muted-foreground">
                {filter === 'upcoming' ? 'You have no upcoming interviews' : 'No interviews found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <Card key={interview._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {interview.job.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{interview.company.name}</span>
                      </div>
                      {user?.role === 'employer' && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Candidate:</span>
                          <span>{interview.candidate.fullName}</span>
                        </div>
                      )}
                      {user?.role === 'job_seeker' && interview.interviewer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Interviewer:</span>
                          <span>{interview.interviewer.fullName}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(interview.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(interview.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{interview.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getTypeIcon(interview.type)}
                      <span className="capitalize">{interview.type.replace('_', ' ')}</span>
                    </div>
                    {interview.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{interview.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/interviews/${interview._id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {interview.meetingLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-2" />
                          Join Meeting
                        </a>
                      </Button>
                    )}
                  </div>

                  {interview.notes && (
                    <div className="mt-4 p-3 bg-background rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {interview.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
