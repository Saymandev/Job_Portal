'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { constructFileUrl, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  Calendar,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Search,
  User,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Application {
  _id: string;
  status: string;
  createdAt: string;
  resume: string;
  coverLetter?: string;
  notes?: string;
  interviewDate?: string;
  applicant: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    skills?: string[];
  };
  job: {
    _id: string;
    title: string;
    location: string;
  };
}

interface Column {
  id: string;
  title: string;
  status: string;
  color: string;
  applications: Application[];
}

const PIPELINE_STAGES = [
  { id: 'pending', title: 'New Applications', status: 'pending', color: 'bg-blue-500/20 border-blue-300 dark:border-blue-700' },
  { id: 'reviewing', title: 'Under Review', status: 'reviewing', color: 'bg-yellow-500/20 border-yellow-300 dark:border-yellow-700' },
  { id: 'shortlisted', title: 'Shortlisted', status: 'shortlisted', color: 'bg-purple-500/20 border-purple-300 dark:border-purple-700' },
  { id: 'interview_scheduled', title: 'Interview Scheduled', status: 'interview_scheduled', color: 'bg-indigo-500/20 border-indigo-300 dark:border-indigo-700' },
  { id: 'interviewed', title: 'Interviewed', status: 'interviewed', color: 'bg-orange-500/20 border-orange-300 dark:border-orange-700' },
  { id: 'accepted', title: 'Accepted', status: 'accepted', color: 'bg-green-500/20 border-green-300 dark:border-green-700' },
  { id: 'rejected', title: 'Rejected', status: 'rejected', color: 'bg-red-500/20 border-red-300 dark:border-red-700' },
];

export default function CandidatePipelinePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [columns, setColumns] = useState<Column[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [draggedApplication, setDraggedApplication] = useState<Application | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    duration: '60',
    type: 'phone',
    location: '',
    meetingLink: '',
    notes: ''
  });
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.get('/jobs/my-jobs');
      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/applications/employer');
      if (response.data.success) {
        setApplications(response.data.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    fetchJobs();
    fetchApplications();
  }, [isAuthenticated, user, router, isHydrated, fetchJobs, fetchApplications]);

  // Organize applications into columns whenever applications, searchQuery, or selectedJob changes
  useEffect(() => {
    if (applications.length > 0) {
      const organized = PIPELINE_STAGES.map(stage => ({
        ...stage,
        applications: applications.filter(app => {
          const statusMatch = app.status === stage.status;
          const jobMatch = selectedJob === 'all' || app.job._id === selectedJob;
          const searchMatch = searchQuery === '' || 
            app.applicant.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.applicant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.job.title.toLowerCase().includes(searchQuery.toLowerCase());
          return statusMatch && jobMatch && searchMatch;
        }),
      }));
      setColumns(organized);
    }
  }, [applications, selectedJob, searchQuery]);

  const handleDragStart = (e: React.DragEvent, application: Application) => {
    setDraggedApplication(application);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (!draggedApplication || draggedApplication.status === targetStatus) {
      setDraggedApplication(null);
      return;
    }

    try {
      await api.put(`/applications/${draggedApplication._id}/status`, {
        status: targetStatus,
      });

      toast({
        title: 'Status Updated',
        description: `Application moved to ${PIPELINE_STAGES.find(s => s.status === targetStatus)?.title}`,
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setDraggedApplication(null);
    }
  };

  const openApplicationDetail = (application: Application) => {
    setSelectedApplication(application);
    setIsDetailModalOpen(true);
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedApplication) return;

    try {
      await api.put(`/applications/${selectedApplication._id}/status`, {
        status: selectedApplication.status,
        notes,
      });

      toast({
        title: 'Notes Updated',
        description: 'Application notes have been saved',
      });

      fetchApplications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notes',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplication) return;

    setIsScheduling(true);
    try {
      const response = await api.post('/interviews', {
        applicationId: selectedApplication._id,
        scheduledDate: new Date(scheduleData.scheduledDate),
        duration: parseInt(scheduleData.duration),
        type: scheduleData.type,
        location: scheduleData.location || undefined,
        meetingLink: scheduleData.meetingLink || undefined,
        notes: scheduleData.notes || undefined,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Interview scheduled successfully',
        });
        
        // Update local state
        setSelectedApplication(prev => prev ? { 
          ...prev, 
          status: 'interview_scheduled',
          interviewDate: scheduleData.scheduledDate
        } : null);
        
        // Refresh applications to update the pipeline
        fetchApplications();
        
        setShowScheduleModal(false);
        setScheduleData({
          scheduledDate: '',
          duration: '60',
          type: 'phone',
          location: '',
          meetingLink: '',
          notes: ''
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to schedule interview',
        variant: 'destructive',
      });
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Candidate Pipeline</h1>
          <p className="text-lg text-muted-foreground">
            Manage your job applications with drag-and-drop
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-4 py-2 border rounded-md min-w-[200px]"
          >
            <option value="all">All Jobs</option>
            {jobs.map(job => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="text-center py-12">Loading applications...</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                <Card className={`${column.color} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        {column.title}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {column.applications.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {column.applications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No applications
                      </div>
                    ) : (
                      column.applications.map((application) => (
                        <Card
                          key={application._id}
                          className="cursor-move hover:shadow-md transition-shadow bg-white"
                          draggable
                          onDragStart={(e) => handleDragStart(e, application)}
                          onClick={() => openApplicationDetail(application)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">
                                    {application.applicant.fullName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {application.job.title}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {application.applicant.skills?.slice(0, 3).map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{application.applicant.location || 'Not specified'}</span>
                              </div>

                              <div className="text-xs text-muted-foreground">
                                Applied {formatDate(application.createdAt)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {isDetailModalOpen && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Application Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Candidate Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Candidate Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{selectedApplication.applicant.fullName}</p>
                        <p className="text-xs text-muted-foreground">Name</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{selectedApplication.applicant.email}</p>
                        <p className="text-xs text-muted-foreground">Email</p>
                      </div>
                    </div>
                    {selectedApplication.applicant.phone && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{selectedApplication.applicant.phone}</p>
                          <p className="text-xs text-muted-foreground">Phone</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {selectedApplication.applicant.location || 'Not specified'}
                        </p>
                        <p className="text-xs text-muted-foreground">Location</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                {selectedApplication.applicant.skills && selectedApplication.applicant.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.applicant.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Applied For */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Applied For</h3>
                  <p className="text-sm">{selectedApplication.job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied on {formatDate(selectedApplication.createdAt)}
                  </p>
                </div>

                {/* Resume & Cover Letter */}
                <div className="flex gap-3">
                  {selectedApplication.resume && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={constructFileUrl(selectedApplication.resume)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Resume
                      </a>
                    </Button>
                  )}
                  {selectedApplication.coverLetter && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={constructFileUrl(selectedApplication.coverLetter)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Cover Letter
                      </a>
                    </Button>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    defaultValue={selectedApplication.notes || ''}
                    placeholder="Add notes about this candidate..."
                    className="mt-2"
                    onBlur={(e) => handleUpdateNotes(e.target.value)}
                  />
                </div>

                {/* Interview Date */}
                {selectedApplication.interviewDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Interview scheduled: {formatDate(selectedApplication.interviewDate)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/messages?user=${selectedApplication.applicant._id}&job=${selectedApplication.job._id}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Candidate
                    </Link>
                  </Button>
                  
                  {['shortlisted', 'reviewing', 'pending', 'interview_scheduled'].includes(selectedApplication.status) && (
                    <Button 
                      onClick={() => setShowScheduleModal(true)}
                      className="gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      {selectedApplication.status === 'interview_scheduled' ? 'Reschedule Interview' : 'Schedule Interview'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="scheduledDate">Date & Time</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={scheduleData.scheduledDate}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select value={scheduleData.duration} onValueChange={(value: string) => setScheduleData(prev => ({ ...prev, duration: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Interview Type</Label>
                <Select value={scheduleData.type} onValueChange={(value: string) => setScheduleData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleData.type === 'in_person' && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Office address or meeting location"
                  />
                </div>
              )}

              {scheduleData.type === 'video' && (
                <div>
                  <Label htmlFor="meetingLink">Meeting Link</Label>
                  <Input
                    id="meetingLink"
                    value={scheduleData.meetingLink}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, meetingLink: e.target.value }))}
                    placeholder="Zoom, Google Meet, or Teams link"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes for the candidate"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleScheduleInterview}
                disabled={!scheduleData.scheduledDate || isScheduling}
                className="flex-1"
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
                disabled={isScheduling}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
