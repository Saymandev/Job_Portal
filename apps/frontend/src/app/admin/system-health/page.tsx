'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  MemoryStick,
  RefreshCw,
  Server,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number[];
  };
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    responseTime: number;
    connections: number;
  };
  services: {
    name: string;
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    lastCheck: string;
  }[];
  errors: {
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    service: string;
  }[];
}

export default function SystemHealthPage() {
  const { toast } = useToast();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/system/health');
      
      if ((response.data as any).success) {
        setHealth((response.data as any).data);
      }
    } catch (error: any) {
      console.error('Error fetching system health:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch system health data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
        return 'default';
      case 'warning':
      case 'slow':
        return 'secondary';
      case 'critical':
      case 'stopped':
      case 'error':
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
      case 'stopped':
      case 'error':
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !health) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Status Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Metrics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Status Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system performance and services
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </Button>
          <Button onClick={fetchHealthData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(health?.status || 'unknown')}
                <span>System Status</span>
              </CardTitle>
              <CardDescription>
                Overall system health and performance
              </CardDescription>
            </div>
            <Badge variant={getStatusColor(health?.status || 'unknown')}>
              {health?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatUptime(health?.uptime || 0)}
              </div>
              <p className="text-sm text-muted-foreground">System Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {health?.memory?.percentage || 0}%
              </div>
              <p className="text-sm text-muted-foreground">Memory Usage</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {health?.cpu.usage || 0}%
              </div>
              <p className="text-sm text-muted-foreground">CPU Usage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memory Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Used Memory</span>
                  <span>
                    {Math.round((health?.memory.used || 0) / 1024 / 1024)} MB / {Math.round((health?.memory.total || 0) / 1024 / 1024)} MB
                  </span>
                </div>
                <Progress value={health?.memory.percentage || 0} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {health?.memory?.percentage || 0}% of total memory in use
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5" />
              <span>CPU Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Current Usage</span>
                  <span>{health?.cpu.usage || 0}%</span>
                </div>
                <Progress value={health?.cpu.usage || 0} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                Load Average: {health?.cpu.load?.map(l => l.toFixed(2)).join(', ') || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Database Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(health?.database.status || 'unknown')}
              <div>
                <div className="font-medium">Connection Status</div>
                <div className="text-sm text-muted-foreground">
                  {health?.database.status || 'Unknown'}
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium">Response Time</div>
              <div className="text-sm text-muted-foreground">
                {health?.database.responseTime || 0}ms
              </div>
            </div>
            <div>
              <div className="font-medium">Active Connections</div>
              <div className="text-sm text-muted-foreground">
                {health?.database.connections || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Services Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {health?.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Uptime: {formatUptime(service.uptime)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(service.status)}>
                    {service.status.toUpperCase()}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      {health?.errors && health.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Recent Errors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getStatusIcon(error.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{error.service}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {error.message}
                    </div>
                    <Badge variant={getStatusColor(error.level)} className="mt-2">
                      {error.level.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
