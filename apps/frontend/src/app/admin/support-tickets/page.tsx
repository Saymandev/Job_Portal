'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Tag,
  User,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SupportTicket {
  _id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  userId: string;
  userEmail: string;
  userName: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  lastResponseAt?: string;
  responseCount: number;
  tags: string[];
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    source?: string;
  };
}

interface SupportTicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportTicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [admins, setAdmins] = useState<Array<{_id: string, name: string, email: string}>>([]);
  const [replyMessage, setReplyMessage] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm }),
      });
      
      const [ticketsResponse, adminsResponse] = await Promise.all([
        api.get(`/admin/support/tickets?${params.toString()}`),
        api.get('/admin/users?role=admin&limit=50')
      ]);

      if ((ticketsResponse.data as any).success) {
        const data = (ticketsResponse.data as any).data;
        setTickets(data.tickets || []);
        setTotalTickets(data.total || 0);
        setTotalPages(data.totalPages || 1);
        
        // Calculate stats from tickets data
        const ticketsData = data.tickets || [];
        setStats({
          total: data.total || 0,
          open: ticketsData.filter((t: any) => t.status === 'open').length,
          inProgress: ticketsData.filter((t: any) => t.status === 'in_progress').length,
          resolved: ticketsData.filter((t: any) => t.status === 'resolved').length,
          closed: ticketsData.filter((t: any) => t.status === 'closed').length,
          avgResponseTime: 0, // Calculate if needed
          avgResolutionTime: 0, // Calculate if needed
        });
      }

      if ((adminsResponse.data as any).success) {
        setAdmins((adminsResponse.data as any).data.users || []);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, currentPage, statusFilter, priorityFilter, categoryFilter, searchTerm, limit]);

  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedAdminId) return;

    try {
      await api.post(`/admin/support/tickets/${selectedTicket._id}/assign`, { adminId: selectedAdminId });

      toast({
        title: 'Success',
        description: 'Ticket assigned successfully',
      });

      fetchTickets();
      setShowAssignModal(false);
      setSelectedAdminId('');
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      await api.post(`/admin/support/tickets/${selectedTicket._id}/reply`, { 
        message: replyMessage,
        isInternal: false 
      });

      toast({
        title: 'Success',
        description: 'Reply sent successfully',
      });

      fetchTickets();
      setShowReplyModal(false);
      setReplyMessage('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    }
  };

  const openAssignModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowAssignModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'priority') {
      setPriorityFilter(value);
    } else if (filterType === 'category') {
      setCategoryFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      await api.patch(`/admin/support/tickets/${ticketId}/status`, { status });

      toast({
        title: 'Success',
        description: 'Ticket status updated successfully',
      });

      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Tickets List Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all support tickets across the platform
          </p>
        </div>
        <Button onClick={fetchTickets} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
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
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select value={priorityFilter} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets ({totalTickets})</CardTitle>
          <CardDescription>
            Manage and respond to support tickets from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(ticket.status)}
                      <h3 className="font-semibold text-lg">{ticket.title}</h3>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {ticket.userName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {ticket.category}
                      </div>
                      {ticket.assignedToName && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Assigned to: {ticket.assignedToName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {!ticket.assignedTo && (
                      <Button
                        size="sm"
                        onClick={() => openAssignModal(ticket)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    )}
                    
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => handleUpdateStatus(ticket._id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            
            {tickets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No support tickets found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalTickets)} of {totalTickets} tickets
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showDetails && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-card-foreground">{selectedTicket.title}</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-card-foreground">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedTicket.status)}
                      <Badge className={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-card-foreground">Priority</label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="font-semibold text-card-foreground">Description</label>
                  <p className="mt-1 text-card-foreground">{selectedTicket.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-card-foreground">User</label>
                    <p className="mt-1 text-card-foreground">{selectedTicket.userName} ({selectedTicket.userEmail})</p>
                  </div>
                  <div>
                    <label className="font-semibold text-card-foreground">Category</label>
                    <p className="mt-1 text-card-foreground">{selectedTicket.category}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-card-foreground">Created</label>
                    <p className="mt-1 text-card-foreground">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="font-semibold text-card-foreground">Last Updated</label>
                    <p className="mt-1 text-card-foreground">{new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {selectedTicket.tags.length > 0 && (
                  <div>
                    <label className="font-semibold text-card-foreground">Tags</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedTicket.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      // Open reply modal or navigate to reply page
                      setShowReplyModal(true);
                    }}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-card-foreground">Assign Ticket</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-card-foreground">Ticket</label>
                  <p className="text-card-foreground">{selectedTicket.title}</p>
                  <p className="text-sm text-muted-foreground">#{selectedTicket._id.slice(-8)}</p>
                </div>
                
                <div>
                  <label className="font-semibold mb-2 block text-card-foreground">Assign to Admin</label>
                  <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an admin to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin._id} value={admin._id}>
                          {admin.name} ({admin.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleAssignTicket}
                    disabled={!selectedAdminId}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Assign Ticket
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-card-foreground">Reply to Ticket</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowReplyModal(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-card-foreground">Ticket</label>
                  <p className="text-card-foreground">{selectedTicket.title}</p>
                  <p className="text-sm text-muted-foreground">#{selectedTicket._id.slice(-8)}</p>
                </div>
                
                <div>
                  <label className="font-semibold mb-2 block text-card-foreground">Your Reply</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full p-3 border rounded-md resize-none"
                    rows={4}
                    placeholder="Type your reply here..."
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleReply}
                    disabled={!replyMessage.trim()}
                    className="flex-1"
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowReplyModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
