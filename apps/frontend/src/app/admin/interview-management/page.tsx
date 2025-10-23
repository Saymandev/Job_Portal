'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
    Calendar,
    Clock,
    Eye,
    FileText,
    RefreshCw,
    Search,
    Star,
    TrendingUp,
    Users,
    Video
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface InterviewTemplate {
  _id: string;
  name: string;
  description: string;
  questions: Array<{
    question: string;
    type: string;
    difficulty: string;
    expectedAnswer?: string;
  }>;
  duration: number;
  industry: string;
  role: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPublic: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  usageCount: number;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

interface InterviewSession {
  _id: string;
  title: string;
  description: string;
  interviewerId: {
    _id: string;
    name: string;
    email: string;
  };
  candidateId: {
    _id: string;
    name: string;
    email: string;
  };
  jobId: {
    _id: string;
    title: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  duration: number;
  type: 'video' | 'phone' | 'in-person' | 'technical' | 'behavioral';
  location?: string;
  meetingLink?: string;
  totalScore?: number;
  maxScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface InterviewStats {
  totalTemplates: number;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  popularTemplates: number;
}

export default function InterviewManagementPage() {
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Template filters
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateIndustry, setTemplateIndustry] = useState('all');
  const [templateDifficulty, setTemplateDifficulty] = useState('all');
  const [templatePublic, setTemplatePublic] = useState('all');
  
  // Session filters
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatus, setSessionStatus] = useState('all');
  const [sessionType, setSessionType] = useState('all');
  
  // Pagination state
  const [currentTemplatePage, setCurrentTemplatePage] = useState(1);
  const [currentSessionPage, setCurrentSessionPage] = useState(1);
  const [totalTemplatePages, setTotalTemplatePages] = useState(1);
  const [totalSessionPages, setTotalSessionPages] = useState(1);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentTemplatePage.toString(),
        limit: limit.toString(),
        ...(templateIndustry !== 'all' && { industry: templateIndustry }),
        ...(templateDifficulty !== 'all' && { difficulty: templateDifficulty }),
        ...(templatePublic !== 'all' && { isPublic: templatePublic }),
        ...(templateSearch && { search: templateSearch }),
      });

      const response = await api.get(`/admin/interviews/templates?${params}`);

      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setTemplates(data.templates || []);
        setTotalTemplates(data.total || 0);
        setTotalTemplatePages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch interview templates',
        variant: 'destructive',
      });
    }
  }, [toast, currentTemplatePage, templateIndustry, templateDifficulty, templatePublic, templateSearch, limit]);

  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentSessionPage.toString(),
        limit: limit.toString(),
        ...(sessionStatus !== 'all' && { status: sessionStatus }),
        ...(sessionType !== 'all' && { type: sessionType }),
        ...(sessionSearch && { search: sessionSearch }),
      });

      const response = await api.get(`/admin/interviews/sessions?${params}`);

      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setSessions(data.sessions || []);
        setTotalSessions(data.total || 0);
        setTotalSessionPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch interview sessions',
        variant: 'destructive',
      });
    }
  }, [toast, currentSessionPage, sessionStatus, sessionType, sessionSearch, limit]);

  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from templates and sessions data
      const totalTemplates = templates.length;
      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;
      const averageRating = templates.length > 0 
        ? templates.reduce((sum, t) => sum + (t.averageRating || 0), 0) / templates.length 
        : 0;
      const popularTemplates = templates.filter(t => t.usageCount > 5).length;

      setStats({
        totalTemplates,
        totalSessions,
        completedSessions,
        averageRating,
        popularTemplates,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [templates, sessions]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchSessions()]);
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates, fetchSessions]);

  // Pagination handlers
  const handleTemplatePageChange = (page: number) => {
    setCurrentTemplatePage(page);
  };

  const handleSessionPageChange = (page: number) => {
    setCurrentSessionPage(page);
  };

  // Search handlers
  const handleTemplateSearch = (value: string) => {
    setTemplateSearch(value);
    setCurrentTemplatePage(1);
  };

  const handleSessionSearch = (value: string) => {
    setSessionSearch(value);
    setCurrentSessionPage(1);
  };

  // Filter handlers
  const handleTemplateFilterChange = (filterType: string, value: string) => {
    if (filterType === 'industry') {
      setTemplateIndustry(value);
    } else if (filterType === 'difficulty') {
      setTemplateDifficulty(value);
    } else if (filterType === 'public') {
      setTemplatePublic(value);
    }
    setCurrentTemplatePage(1);
  };

  const handleSessionFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setSessionStatus(value);
    } else if (filterType === 'type') {
      setSessionType(value);
    }
    setCurrentSessionPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interview Management</h1>
          <p className="text-muted-foreground">
            Manage interview templates and monitor interview sessions
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">
                {stats.popularTemplates} popular
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedSessions} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                out of 5.0
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalSessions > 0 ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set([...templates.map(t => t.createdBy._id), ...sessions.map(s => s.interviewerId._id)]).size}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates ({totalTemplates})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({totalSessions})</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Template Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => handleTemplateSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Industry</label>
                  <Select value={templateIndustry} onValueChange={(value) => handleTemplateFilterChange('industry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select value={templateDifficulty} onValueChange={(value) => handleTemplateFilterChange('difficulty', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Visibility</label>
                  <Select value={templatePublic} onValueChange={(value) => handleTemplateFilterChange('public', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Templates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="true">Public</SelectItem>
                      <SelectItem value="false">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Templates</CardTitle>
              <CardDescription>
                Manage and view all interview templates across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{template.name}</h3>
                            <p className="text-sm text-gray-600">
                              {template.role} • {template.industry}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getDifficultyColor(template.difficulty)}>
                              {template.difficulty}
                            </Badge>
                            {template.isPublic && (
                              <Badge variant="secondary">Public</Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{template.duration} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{template.questions.length} questions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{template.usageCount} uses</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {template.averageRating.toFixed(1)} ({template.totalRatings} ratings)
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Created by {template.createdBy.name} • {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No interview templates found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Pagination */}
          {totalTemplatePages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentTemplatePage - 1) * limit) + 1} to {Math.min(currentTemplatePage * limit, totalTemplates)} of {totalTemplates} templates
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplatePageChange(currentTemplatePage - 1)}
                  disabled={currentTemplatePage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalTemplatePages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentTemplatePage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTemplatePageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplatePageChange(currentTemplatePage + 1)}
                  disabled={currentTemplatePage === totalTemplatePages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Session Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sessions..."
                      value={sessionSearch}
                      onChange={(e) => handleSessionSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={sessionStatus} onValueChange={(value) => handleSessionFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={sessionType} onValueChange={(value) => handleSessionFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions List */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Sessions</CardTitle>
              <CardDescription>
                Monitor and track all interview sessions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Video className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{session.title}</h3>
                            <p className="text-sm text-gray-600">
                              {session.jobId.title} • {session.type}
                            </p>
                          </div>
                          <Badge className={getStatusColor(session.status)}>
                            {session.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{session.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {session.interviewerId.name} → {session.candidateId.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {new Date(session.scheduledDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{session.duration} min</span>
                          </div>
                          {session.totalScore && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {session.totalScore}/{session.maxScore}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Created {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No interview sessions found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Pagination */}
          {totalSessionPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentSessionPage - 1) * limit) + 1} to {Math.min(currentSessionPage * limit, totalSessions)} of {totalSessions} sessions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSessionPageChange(currentSessionPage - 1)}
                  disabled={currentSessionPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalSessionPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentSessionPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSessionPageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSessionPageChange(currentSessionPage + 1)}
                  disabled={currentSessionPage === totalSessionPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
