'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Mic,
  Play,
  RefreshCw,
  Star,
  Target,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface InterviewQuestion {
  _id?: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer: string;
  tips: string[];
  followUpQuestions: string[];
  industry: string;
  role: string;
}

interface InterviewTemplate {
  _id?: string;
  name: string;
  description: string;
  questions: InterviewQuestion[];
  duration: number;
  industry: string;
  role: string;
  difficulty: string;
}

interface InterviewSession {
  _id?: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  questions: InterviewQuestion[];
  answers: Array<{
    questionId: string;
    answer: string;
    rating: number;
    notes: string;
  }>;
  overallRating: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function InterviewToolsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [tips, setTips] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    industry: '',
    role: '',
  });

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews/prep/questions', {
        params: filters,
      });
      setQuestions(response.data.data);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch interview questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/interviews/prep/templates');
      setTemplates(response.data.data);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get('/interviews/prep/sessions');
      setSessions(response.data.data);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
    }
  }, []);

  const fetchInterviewTips = useCallback(async () => {
    try {
      const response = await api.get('/interviews/prep/tips', {
        params: {
          industry: filters.industry || 'Technology',
          role: filters.role || 'Software Engineer',
          difficulty: filters.difficulty || 'medium',
        },
      });
      setTips(response.data.data);
    } catch (error: any) {
      console.error('Error fetching tips:', error);
    }
  }, [filters]);

  useEffect(() => {
    fetchQuestions();
    fetchTemplates();
    fetchSessions();
    fetchInterviewTips();
  }, [fetchQuestions, fetchTemplates, fetchSessions, fetchInterviewTips]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return <Target className="h-4 w-4" />;
      case 'behavioral':
        return <Users className="h-4 w-4" />;
      case 'situational':
        return <BookOpen className="h-4 w-4" />;
      case 'company-specific':
        return <Star className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUseTemplate = (template: InterviewTemplate) => {
    toast({
      title: "Template Selected",
      description: `"${template.name}" template has been selected. You can now use these ${template.questions.length} questions for your interview.`,
    });
    
    // In a real app, this would:
    // 1. Create a new interview session
    // 2. Navigate to interview setup page
    // 3. Or open a modal to configure the interview
    console.log('Using template:', template);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading interview tools...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Preparation Tools</h1>
            <p className="text-muted-foreground">
              Comprehensive tools for conducting effective interviews and candidate preparation
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Enterprise Feature
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filter Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Categories</option>
                <option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option>
                <option value="situational">Situational</option>
                <option value="company-specific">Company Specific</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <input
                type="text"
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Technology"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <input
                type="text"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Software Engineer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="tips">Tips & Resources</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <div className="grid gap-6">
            {questions.map((question, index) => (
              <Card key={question._id || index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(question.category)}
                      <h3 className="text-lg font-semibold">{question.question}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline">{question.category}</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Expected Answer:</h4>
                      <p className="text-sm text-muted-foreground">{question.expectedAnswer}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Tips:</h4>
                      <ul className="text-sm space-y-1">
                        {question.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {question.followUpQuestions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Follow-up Questions:</h4>
                        <ul className="text-sm space-y-1">
                          {question.followUpQuestions.map((followUp, followUpIndex) => (
                            <li key={followUpIndex} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{followUp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Industry: {question.industry}</span>
                      <span>Role: {question.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {questions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters to find relevant interview questions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <Card key={template._id || index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.questions.length} questions</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{template.duration} minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4" />
                      <span>{template.industry} - {template.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      <span>Difficulty: {template.difficulty}</span>
                    </div>
                    <Button 
                      className="w-full mt-4"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
                  <p className="text-muted-foreground">
                    Interview templates will appear here once they&apos;re created.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <div className="space-y-6">
            {sessions.map((session, index) => (
              <Card key={session._id || index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{session.candidateName}</h3>
                      <p className="text-sm text-muted-foreground">{session.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                      {session.overallRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">{session.overallRating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="ml-2 font-medium">{session.questions.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span className="ml-2 font-medium">
                        {new Date(session.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="ml-2 font-medium">
                        {session.questions.length * 5} minutes
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {session.status === 'scheduled' && (
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Start Interview
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {sessions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Interview Sessions</h3>
                  <p className="text-muted-foreground">
                    Interview sessions will appear here once they&apos;re scheduled.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tips Tab */}
        <TabsContent value="tips">
          {tips && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tips.generalTips.map((tip: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tips.technicalTips.map((tip: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-1" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Behavioral Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tips.behavioralTips.map((tip: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-500 mt-1" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Questions to Ask</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tips.questionsToAsk.map((question: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-orange-500 mt-1" />
                        <span className="text-sm">{question}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {!tips && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tips Not Available</h3>
                <p className="text-muted-foreground">
                  Interview tips will be loaded based on your selected criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
