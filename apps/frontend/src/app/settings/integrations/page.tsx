'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Briefcase,
  Calendar,
  Check,
  Linkedin,
  MessageSquare,
  RefreshCw,
  X,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Integration {
  _id: string;
  type: string;
  status: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  settings?: any;
}

interface AvailableIntegration {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requiresAuth: boolean;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [userIntegrations, setUserIntegrations] = useState<Integration[]>([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<AvailableIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchIntegrations();
  }, [isAuthenticated, router]);

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const [userResp, availableResp] = await Promise.all([
        api.get('/integrations'),
        api.get('/integrations/available'),
      ]);

      if (userResp.data.success) {
        setUserIntegrations(userResp.data.data);
      }
      if (availableResp.data.success) {
        setAvailableIntegrations(availableResp.data.data);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      calendar: Calendar,
      linkedin: Linkedin,
      slack: MessageSquare,
      briefcase: Briefcase,
      zap: Zap,
    };
    return icons[iconName] || Briefcase;
  };

  const isIntegrationConnected = (type: string) => {
    return userIntegrations.some(
      (int) => int.type === type && int.status === 'active'
    );
  };

  const getIntegrationStatus = (type: string) => {
    return userIntegrations.find((int) => int.type === type);
  };

  const handleConnect = async (type: string) => {
    setConnectingType(type);

    try {
      // For demo purposes, connect with empty credentials
      // In production, this would open OAuth flow or API key input
      const response = await api.post('/integrations/connect', {
        type,
        credentials: {
          apiKey: 'demo_key_' + Date.now(),
        },
        settings: {
          syncCalendar: type === 'google_calendar',
          notifyOnSlack: type === 'slack',
          autoPostJobs: type === 'linkedin',
        },
      });

      if (response.data.success) {
        toast({
          title: 'Connected',
          description: `${type.replace('_', ' ')} integration connected successfully`,
        });
        fetchIntegrations();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to connect integration',
        variant: 'destructive',
      });
    } finally {
      setConnectingType(null);
    }
  };

  const handleDisconnect = async (integrationId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) {
      return;
    }

    try {
      await api.delete(`/integrations/${integrationId}`);
      toast({
        title: 'Disconnected',
        description: `${name} integration has been disconnected`,
      });
      fetchIntegrations();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async (integrationId: string, name: string) => {
    try {
      const response = await api.post(`/integrations/${integrationId}/sync`);
      if (response.data.success) {
        toast({
          title: 'Synced',
          description: `${name} synced successfully`,
        });
        fetchIntegrations();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync integration',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Integrations</h1>
          <p className="text-lg text-muted-foreground">
            Connect your favorite tools and services
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading integrations...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableIntegrations.map((integration) => {
              const Icon = getIcon(integration.icon);
              const connected = isIntegrationConnected(integration.type);
              const status = getIntegrationStatus(integration.type);

              return (
                <Card key={integration.type} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription className="capitalize text-xs">
                            {integration.category.replace('_', ' ')}
                          </CardDescription>
                        </div>
                      </div>
                      {connected && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                      {status?.status === 'error' && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <X className="h-3 w-3" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {integration.description}
                    </p>

                    {status?.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                      </p>
                    )}

                    {status?.errorMessage && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-4">
                        <p className="text-xs text-destructive">{status.errorMessage}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {connected ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSync(status!._id, integration.name)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDisconnect(status!._id, integration.name)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => handleConnect(integration.type)}
                          disabled={connectingType === integration.type}
                        >
                          {connectingType === integration.type ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Integration Benefits */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Integration Benefits</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Google Calendar</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync interview schedules with your Google Calendar. Never miss an interview again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Linkedin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">LinkedIn</h3>
                    <p className="text-sm text-muted-foreground">
                      Post jobs directly to LinkedIn and import candidate profiles seamlessly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Slack</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time notifications about applications, interviews, and candidate activity in Slack.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">ATS Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync candidates with popular ATS systems like Greenhouse and Lever.
                    </p>
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
