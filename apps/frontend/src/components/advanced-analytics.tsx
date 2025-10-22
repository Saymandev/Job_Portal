'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
    AlertCircle,
    BarChart3,
    Brain,
    CheckCircle,
    Clock,
    DollarSign,
    Eye,
    Lightbulb,
    RefreshCw,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AnalyticsInsight {
  _id: string;
  type: 'market_trend' | 'candidate_demographics' | 'salary_analysis' | 'skill_demand' | 'hiring_patterns' | 'performance_metrics' | 'predictive_insights';
  category: 'general' | 'industry_specific' | 'company_specific' | 'role_specific';
  title: string;
  description: string;
  summary: string;
  data: {
    metrics: Array<{
      name: string;
      value: number | string;
      change?: number;
      changeType?: 'increase' | 'decrease' | 'stable';
      unit?: string;
    }>;
    charts: Array<{
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
      title: string;
      data: any[];
      xAxis?: string;
      yAxis?: string;
    }>;
    insights: Array<{
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      actionable: boolean;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      effort: 'low' | 'medium' | 'high';
      impact: 'high' | 'medium' | 'low';
    }>;
  };
  confidence: number;
  isAI_Generated: boolean;
  isActionable: boolean;
  priority: number;
  tags: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface AnalyticsDashboard {
  totalInsights: number;
  unreadCount: number;
  insightsByType: Array<{ _id: string; count: number }>;
  recentInsights: AnalyticsInsight[];
  subscription: {
    plan: string;
    features: any;
  };
}

export default function AdvancedAnalytics() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<AnalyticsInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    isRead: undefined as boolean | undefined,
  });
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/advanced-analytics/dashboard');
      setDashboard(response.data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch analytics dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchInsights = useCallback(async () => {
    try {
      const response = await api.get('/advanced-analytics/insights', { params: filters });
      setInsights(response.data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch insights',
        variant: 'destructive',
      });
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const generateInsights = async () => {
    try {
      setGenerating(true);
      await api.post('/advanced-analytics/generate', {});
      
      toast({
        title: 'Success',
        description: 'New insights generated successfully',
      });
      
      fetchDashboard();
      fetchInsights();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate insights',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      await api.put(`/advanced-analytics/insights/${insightId}/read`);
      
      setInsights(prev => prev.map(insight => 
        insight._id === insightId ? { ...insight, isRead: true, readAt: new Date().toISOString() } : insight
      ));
      
      if (dashboard) {
        setDashboard(prev => prev ? { ...prev, unreadCount: prev.unreadCount - 1 } : null);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to mark insight as read',
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'market_trend':
        return <TrendingUp className="h-5 w-5" />;
      case 'candidate_demographics':
        return <Users className="h-5 w-5" />;
      case 'salary_analysis':
        return <DollarSign className="h-5 w-5" />;
      case 'skill_demand':
        return <Target className="h-5 w-5" />;
      case 'hiring_patterns':
        return <BarChart3 className="h-5 w-5" />;
      case 'performance_metrics':
        return <BarChart3 className="h-5 w-5" />;
      case 'predictive_insights':
        return <Brain className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'market_trend':
        return 'bg-blue-100 text-blue-800';
      case 'candidate_demographics':
        return 'bg-green-100 text-green-800';
      case 'salary_analysis':
        return 'bg-yellow-100 text-yellow-800';
      case 'skill_demand':
        return 'bg-purple-100 text-purple-800';
      case 'hiring_patterns':
        return 'bg-orange-100 text-orange-800';
      case 'performance_metrics':
        return 'bg-pink-100 text-pink-800';
      case 'predictive_insights':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-100 text-red-800';
    if (priority >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!dashboard?.subscription.features) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Advanced Analytics</h2>
          <p className="text-muted-foreground mb-6">
            Advanced analytics is available for Pro and Enterprise subscribers
          </p>
          <Button size="lg">
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            AI-powered insights, market trends, and candidate demographics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generateInsights} disabled={generating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Insights'}
          </Button>
        </div>
      </div>

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Total Insights</h3>
                <p className="text-2xl font-bold">{dashboard?.totalInsights || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Unread</h3>
                <p className="text-2xl font-bold">{dashboard?.unreadCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">AI Generated</h3>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.isAI_Generated).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="font-semibold">Actionable</h3>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.isActionable).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="market_trend">Market Trends</SelectItem>
                  <SelectItem value="candidate_demographics">Candidate Demographics</SelectItem>
                  <SelectItem value="salary_analysis">Salary Analysis</SelectItem>
                  <SelectItem value="skill_demand">Skill Demand</SelectItem>
                  <SelectItem value="hiring_patterns">Hiring Patterns</SelectItem>
                  <SelectItem value="performance_metrics">Performance Metrics</SelectItem>
                  <SelectItem value="predictive_insights">Predictive Insights</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="industry_specific">Industry Specific</SelectItem>
                  <SelectItem value="company_specific">Company Specific</SelectItem>
                  <SelectItem value="role_specific">Role Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.isRead?.toString() || ''} onValueChange={(value) => setFilters({...filters, isRead: value === '' ? undefined : value === 'true'})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="false">Unread</SelectItem>
                  <SelectItem value="true">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                <p className="text-muted-foreground">
                  Generate your first analytics insights to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedInsight?._id === insight._id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                    } ${!insight.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
                    onClick={() => {
                      setSelectedInsight(insight);
                      if (!insight.isRead) {
                        markAsRead(insight._id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(insight.type)}
                        <h4 className="font-medium">{insight.title}</h4>
                        {!insight.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(insight.type)}>
                          {insight.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(insight.priority)}>
                          Priority {insight.priority}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="capitalize">{insight.category.replace('_', ' ')}</span>
                        <span>Confidence: {insight.confidence}%</span>
                        {insight.isAI_Generated && (
                          <Badge variant="outline" className="text-xs">
                            <Brain className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insight Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedInsight ? selectedInsight.title : 'Select an Insight'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedInsight ? (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedInsight.description}
                  </p>
                </div>

                {/* Metrics */}
                <div>
                  <h4 className="font-medium mb-3">Key Metrics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedInsight.data.metrics.map((metric, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{metric.name}</span>
                          {metric.change && (
                            <span className={`text-xs ${
                              metric.changeType === 'increase' ? 'text-green-600' : 
                              metric.changeType === 'decrease' ? 'text-red-600' : 
                              'text-gray-600'
                            }`}>
                              {metric.changeType === 'increase' ? '+' : ''}{metric.change}{metric.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-bold">
                          {metric.value}{metric.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h4 className="font-medium mb-3">Key Insights</h4>
                  <div className="space-y-3">
                    {selectedInsight.data.insights.map((insight, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start gap-2">
                          {getImpactIcon(insight.impact)}
                          <div>
                            <h5 className="font-medium text-sm">{insight.title}</h5>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {insight.impact} impact
                              </Badge>
                              {insight.actionable && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Actionable
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <div className="space-y-3">
                    {selectedInsight.data.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-sm">{rec.title}</h5>
                          <div className="flex items-center gap-1">
                            <Badge className={getPriorityColor(rec.priority === 'high' ? 4 : rec.priority === 'medium' ? 3 : 2)}>
                              {rec.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span>Effort: {rec.effort}</span>
                          <span>•</span>
                          <span>Impact: {rec.impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInsight.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select an insight to view detailed analysis and recommendations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
