'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Star,
  User,
  Users
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

interface AccountManager {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  title: string;
  status: 'active' | 'inactive' | 'busy' | 'away';
  specializations: string[];
  bio?: string;
  profileImage?: string;
  languages: string[];
  lastActiveAt: string;
  workingHours: {
    timezone: string;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
}

interface ClientAssignment {
  _id: string;
  clientId: string;
  accountManagerId: AccountManager;
  status: 'active' | 'inactive' | 'transferred' | 'completed';
  assignedAt: string;
  notes: string;
  tags: string[];
  priority: number;
  preferences: {
    communicationMethod: 'email' | 'phone' | 'video' | 'chat';
    preferredTime: string;
    timezone: string;
    language: string;
  };
  interactions: Array<{
    date: string;
    type: 'call' | 'email' | 'meeting' | 'chat' | 'note';
    summary: string;
    duration?: number;
    outcome: string;
  }>;
  totalInteractions: number;
  lastInteractionAt: string;
  clientSatisfactionScore: number;
}

export default function DedicatedAccountManager() {
  const [assignment, setAssignment] = useState<ClientAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();

  const fetchAssignment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/account-managers/client/me');
      setAssignment(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setAssignment(null);
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to fetch assignment',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssignment();
  }, [fetchAssignment]);

  const requestAccountManager = async () => {
    try {
      setRequesting(true);
      
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return;
      }
      
      await api.post('/account-managers/auto-assign', { clientId: user.id });
      
      toast({
        title: 'Success',
        description: 'Account manager request submitted. You will be assigned shortly.',
      });
      
      fetchAssignment();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to request account manager',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'away':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'away':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getCommunicationIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'video':
        return <Calendar className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatLastActive = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dedicated Account Manager</h2>
          <p className="text-muted-foreground">
            Your personal account manager for priority support and guidance
          </p>
        </div>
        {!assignment && (
          <Button onClick={requestAccountManager} disabled={requesting}>
            <User className="h-4 w-4 mr-2" />
            {requesting ? 'Requesting...' : 'Request Account Manager'}
          </Button>
        )}
      </div>

      {!assignment ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <User className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">No Account Manager Assigned</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                You don&apos;t have a dedicated account manager yet. Request one to get priority support 
                and personalized guidance for your hiring needs.
              </p>
              <div className="flex justify-center">
                <Button onClick={requestAccountManager} disabled={requesting} size="lg">
                  <User className="h-4 w-4 mr-2" />
                  {requesting ? 'Requesting...' : 'Request Account Manager'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Manager Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="relative">
                      {assignment.accountManagerId.profileImage ? (
                        <Image
                          src={assignment.accountManagerId.profileImage}
                          alt={assignment.accountManagerId.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(assignment.accountManagerId.status)}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{assignment.accountManagerId.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.accountManagerId.title} • {assignment.accountManagerId.department}
                      </p>
                    </div>
                  </CardTitle>
                  <Badge className={getStatusColor(assignment.accountManagerId.status)}>
                    {assignment.accountManagerId.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assignment.accountManagerId.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assignment.accountManagerId.phone}</span>
                  </div>
                </div>

                {assignment.accountManagerId.bio && (
                  <div>
                    <h4 className="font-medium mb-2">About</h4>
                    <p className="text-sm text-muted-foreground">{assignment.accountManagerId.bio}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignment.accountManagerId.specializations.map((spec, index) => (
                      <Badge key={index} variant="outline">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignment.accountManagerId.languages.map((lang, index) => (
                      <Badge key={index} variant="secondary">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last active: {formatLastActive(assignment.accountManagerId.lastActiveAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Interactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Interactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignment.interactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No interactions yet. Reach out to your account manager to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assignment.interactions.slice(0, 5).map((interaction, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {getCommunicationIcon(interaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{interaction.type}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(interaction.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {interaction.summary}
                          </p>
                          {interaction.duration && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Duration: {interaction.duration} minutes
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule Call
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Meeting
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assigned Since</span>
                  <span className="text-sm font-medium">
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Interactions</span>
                  <span className="text-sm font-medium">{assignment.totalInteractions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Badge variant="outline">
                    {assignment.priority}/5
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Satisfaction Score</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < assignment.clientSatisfactionScore
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {getCommunicationIcon(assignment.preferences.communicationMethod)}
                  <span className="text-sm capitalize">
                    {assignment.preferences.communicationMethod}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{assignment.preferences.preferredTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{assignment.preferences.language}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
