'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Calendar, Clock, MapPin, MessageSquare, User, Video } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Interview {
  _id: string;
  candidate: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  interviewer: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  company: {
    _id: string;
    name: string;
    logo?: string;
  };
  job: {
    _id: string;
    title: string;
    company: string;
    location: string;
  };
  application?: {
    _id: string;
    status: string;
  };
  scheduledDate: string;
  duration: number;
  type: 'video' | 'phone' | 'in-person' | 'technical' | 'behavioral';
  location?: string;
  meetingLink?: string;
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  feedback?: string;
  cancelReason?: string;
  attendees?: string[];
  reminderSent?: boolean;
  rescheduleRequested?: boolean;
  rescheduleReason?: string;
  requestedNewDate?: string;
  rescheduleRequestCount?: number;
  rescheduleRequestedAt?: string;
  rescheduleApproved?: boolean;
  rescheduleApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InterviewDetailPage() {
  const { user } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    requestedNewDate: '',
    rescheduleReason: '',
  });

  const fetchInterview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/interviews/${interviewId}`);
      setInterview(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch interview details');
    } finally {
      setLoading(false);
    }
  }, [interviewId]);

  const handleRescheduleRequest = async () => {
    if (!rescheduleData.requestedNewDate || !rescheduleData.rescheduleReason) {
      alert('Please fill in all fields');
      return;
    }

    

    try {
      const response = await api.post(`/interviews/${interviewId}/request-reschedule`, {
        requestedNewDate: rescheduleData.requestedNewDate,
        rescheduleReason: rescheduleData.rescheduleReason,
      });

      if (response.data.success) {
        alert('Reschedule request submitted successfully');
        setShowRescheduleModal(false);
        setRescheduleData({ requestedNewDate: '', rescheduleReason: '' });
        fetchInterview(); // Refresh interview data
      }
    } catch (error: any) {
      console.error('Error requesting reschedule:', error);
      alert(error.response?.data?.message || 'Failed to submit reschedule request');
    }
  };

  const handleApproveReschedule = async (approved: boolean, newDate?: string) => {
    try {
      const response = await api.put(`/interviews/${interviewId}/approve-reschedule`, {
        approved,
        newDate: newDate,
        notes: approved ? 'Reschedule approved' : 'Reschedule rejected',
      });

      if (response.data.success) {
        alert(approved ? 'Reschedule request approved' : 'Reschedule request rejected');
        fetchInterview(); // Refresh interview data
      }
    } catch (error: any) {
      console.error('Error approving reschedule:', error);
      alert(error.response?.data?.message || 'Failed to process reschedule request');
    }
  };

  useEffect(() => {
    if (interviewId && user) {
      fetchInterview();
    }
  }, [interviewId, user, fetchInterview]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <MessageSquare className="h-4 w-4" />;
      case 'in-person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Interview Not Found</h2>
              <p className="text-gray-600 mb-4">The interview you&apos;re looking for doesn&apos;t exist.</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEmployer = user?.role === 'employer';
  const isCandidate = user?.role === 'job_seeker';
  const isInterviewer = user?.id === interview?.interviewer?._id;
  const canManage = isEmployer || isInterviewer || (isCandidate && interview.status === 'scheduled');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Interview Details</h1>
            <p className="text-gray-600 mt-1">
              {interview.job.title} at {interview.job.company}
            </p>
          </div>
          <Badge className={`${getStatusColor(interview.status)} px-3 py-1`}>
            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Interview Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-gray-600">{formatDate(interview.scheduledDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-gray-600">{formatTime(interview.scheduledDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getTypeIcon(interview.type)}
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-gray-600 capitalize">{interview.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-gray-600">{interview.duration} minutes</p>
                    </div>
                  </div>
                </div>

                {interview.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-gray-600">{interview.location}</p>
                    </div>
                  </div>
                )}

                {interview.meetingLink && (
                  <div className="flex items-center gap-3">
                    <Video className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Meeting Link</p>
                      <a 
                        href={interview.meetingLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  </div>
                )}

                {interview.notes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Notes</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {interview.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback */}
            {interview.feedback && (
              <Card>
                <CardHeader>
                  <CardTitle>Interview Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-md">
                    {interview.feedback}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Cancel Reason */}
            {interview.cancelReason && (
              <Card>
                <CardHeader>
                  <CardTitle>Cancelation Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 bg-red-50 p-4 rounded-md">
                    {interview.cancelReason}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Candidate */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{interview.candidate.fullName}</p>
                    <p className="text-sm text-gray-500">Candidate</p>
                  </div>
                </div>

                <div className="border-t border-gray-200"></div>

                {/* Interviewer */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{interview.interviewer?.fullName || 'Interviewer'}</p>
                    <p className="text-sm text-gray-500">Interviewer</p>
                  </div>
                </div>

                {interview.company && (
                  <>
                    <div className="border-t border-gray-200"></div>
                    
                    {/* Company */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{interview.company.name}</p>
                        <p className="text-sm text-gray-500">Company</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{interview.job.title}</p>
                  <p className="text-sm text-gray-600">{interview.job.company}</p>
                  <p className="text-sm text-gray-500">{interview.job.location}</p>
                  <Link 
                    href={`/jobs/${interview.job._id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Job Details
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {canManage && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Reschedule Request Section */}
                  {interview.rescheduleRequested && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2">Reschedule Request Pending</h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        <strong>Requested Date:</strong> {new Date(interview.requestedNewDate!).toLocaleString()}
                      </p>
                      <p className="text-sm text-yellow-700 mb-3">
                        <strong>Reason:</strong> {interview.rescheduleReason}
                      </p>
                      {isEmployer && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveReschedule(true, interview.requestedNewDate)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleApproveReschedule(false)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {interview.status === 'scheduled' && !interview.rescheduleRequested && (
                    <>
                      {!isEmployer && interview.rescheduleRequestCount === 0 && (
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => setShowRescheduleModal(true)}
                        >
                          Request Reschedule
                        </Button>
                      )}
                      {isEmployer && (
                        <Button className="w-full" variant="outline">
                          Reschedule
                        </Button>
                      )}
                      {isEmployer && (
                        <Button className="w-full" variant="destructive">
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                  
                  <Link href={`/messages?user=${isEmployer ? interview.candidate._id : interview.interviewer?._id}&job=${interview.job._id}`}>
                    <Button className="w-full" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Request Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Interview Reschedule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred New Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleData.requestedNewDate}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, requestedNewDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Reschedule
                </label>
                <textarea
                  value={rescheduleData.rescheduleReason}
                  onChange={(e) => setRescheduleData(prev => ({ ...prev, rescheduleReason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Please explain why you need to reschedule..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleRescheduleRequest}
                className="flex-1"
                disabled={!rescheduleData.requestedNewDate || !rescheduleData.rescheduleReason}
              >
                Submit Request
              </Button>
              <Button
                onClick={() => setShowRescheduleModal(false)}
                variant="outline"
                className="flex-1"
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
