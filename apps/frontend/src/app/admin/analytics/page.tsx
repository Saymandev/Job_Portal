'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import {
  Archive,
  BarChart3,
  Database,
  Key,
  RefreshCw,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AnalyticsInsight {
  _id: string;
  userId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  summary: string;
  confidence: number;
  priority: number;
  isRead: boolean;
  createdAt: string;
  data: any;
  tags: string[];
}

interface ApiKey {
  _id: string;
  name: string;
  user: {
    name: string;
    email: string;
  };
  permissions: string[];
  isActive: boolean;
  lastUsed: string;
  createdAt: string;
  usageCount: number;
}

interface SalaryDataStatus {
  updateStatus: {
    isUpdating: boolean;
    lastUpdate: string | null;
    updateCount: number;
  };
  cacheStats: {
    size: number;
    keys: string[];
  };
}

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [salaryDataStatus, setSalaryDataStatus] = useState<SalaryDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [insightsRes, apiKeysRes, salaryStatusRes] = await Promise.all([
        api.get('/admin/analytics/insights?limit=50'),
        api.get('/admin/api-keys?limit=50'),
        api.get('/admin/salary-data/status')
      ]);

      if ((insightsRes.data as any).success) {
        setInsights((insightsRes.data as any).data.insights);
      }
      if ((apiKeysRes.data as any).success) {
        setApiKeys((apiKeysRes.data as any).data.apiKeys);
      }
      if ((salaryStatusRes.data as any).success) {
        setSalaryDataStatus((salaryStatusRes.data as any).data);
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch admin analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleArchiveInsight = async (insightId: string) => {
    try {
      await api.post(`/admin/analytics/insights/${insightId}/archive`);
      setInsights(insights.filter(insight => insight._id !== insightId));
      toast({
        title: 'Success',
        description: 'Analytics insight archived successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to archive insight',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      await api.post(`/admin/api-keys/${keyId}/revoke`);
      setApiKeys(apiKeys.map(key => 
        key._id === keyId ? { ...key, isActive: false } : key
      ));
      toast({
        title: 'Success',
        description: 'API key revoked successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const handleTriggerSalaryUpdate = async () => {
    try {
      await api.post('/admin/salary-data/update');
      toast({
        title: 'Success',
        description: 'Salary data update triggered successfully',
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to trigger salary data update',
        variant: 'destructive',
      });
    }
  };

  const handleClearSalaryCache = async () => {
    try {
      await api.post('/admin/salary-data/clear-cache');
      toast({
        title: 'Success',
        description: 'Salary data cache cleared successfully',
      });
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to clear salary data cache',
        variant: 'destructive',
      });
    }
  };

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || insight.type === filterType;
    const matchesPriority = filterPriority === 'all' || 
                           (filterPriority === 'high' && insight.priority >= 4) ||
                           (filterPriority === 'medium' && insight.priority >= 2 && insight.priority < 4) ||
                           (filterPriority === 'low' && insight.priority < 2);
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'destructive';
    if (priority >= 2) return 'default';
    return 'secondary';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return 'High';
    if (priority >= 2) return 'Medium';
    return 'Low';
  };

  if (loading) {
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

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </TabsList>
          
          <TabsContent value="insights" className="space-y-4">
            {/* Filters Skeleton */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Insights List Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-96" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Manage analytics insights, API keys, and salary data across all users
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              Analytics insights generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(key => key.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {apiKeys.length} total keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salaryDataStatus?.cacheStats.size || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Cached salary data entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salaryDataStatus?.updateStatus.updateCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total updates performed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Analytics Insights</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="salary-data">Salary Data</TabsTrigger>
        </TabsList>

        {/* Analytics Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="market_trend">Market Trend</SelectItem>
                <SelectItem value="salary_analysis">Salary Analysis</SelectItem>
                <SelectItem value="skill_demand">Skill Demand</SelectItem>
                <SelectItem value="hiring_patterns">Hiring Patterns</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredInsights.map((insight) => (
              <Card key={insight._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <CardDescription>{insight.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(insight.priority)}>
                        {getPriorityLabel(insight.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {insight.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {insight.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Type: {insight.type}</span>
                      <span>Category: {insight.category}</span>
                      <span>Created: {new Date(insight.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveInsight(insight._id)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <div className="grid gap-4">
            {apiKeys.map((key) => (
              <Card key={key._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{key.name}</CardTitle>
                      <CardDescription>
                        User: {key.user?.name || 'Unknown'} ({key.user?.email || 'No email'})
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={key.isActive ? 'default' : 'secondary'}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Permissions:</span>
                      <p className="text-muted-foreground">
                        {key.permissions.join(', ')}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Usage Count:</span>
                      <p className="text-muted-foreground">{key.usageCount}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p className="text-muted-foreground">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Last Used:</span>
                      <p className="text-muted-foreground">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  {key.isActive && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeApiKey(key._id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke Key
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Salary Data Tab */}
        <TabsContent value="salary-data" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Salary Data Management</CardTitle>
                <CardDescription>
                  Manage external salary data sources and caching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Update Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Currently Updating:</span>
                        <Badge variant={salaryDataStatus?.updateStatus.isUpdating ? 'default' : 'secondary'}>
                          {salaryDataStatus?.updateStatus.isUpdating ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Update:</span>
                        <span>
                          {salaryDataStatus?.updateStatus.lastUpdate 
                            ? new Date(salaryDataStatus.updateStatus.lastUpdate).toLocaleString()
                            : 'Never'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Updates:</span>
                        <span>{salaryDataStatus?.updateStatus.updateCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Cache Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cache Size:</span>
                        <span>{salaryDataStatus?.cacheStats.size || 0} entries</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Keys:</span>
                        <span>{salaryDataStatus?.cacheStats.keys.length || 0} keys</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleTriggerSalaryUpdate}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Trigger Update
                  </Button>
                  <Button variant="outline" onClick={handleClearSalaryCache}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}