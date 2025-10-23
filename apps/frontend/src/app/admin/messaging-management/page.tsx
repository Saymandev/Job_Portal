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
    AlertTriangle,
    Clock,
    Download,
    Eye,
    FileImage,
    FileText,
    MessageSquare,
    RefreshCw,
    Search,
    Shield,
    Users,
    Video
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    fullName: string;
    email: string;
    role: string;
    avatar?: string;
  }>;
  job?: {
    _id: string;
    title: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
    isAdminMessage: boolean;
  };
  unreadCount: number;
  isAdminConversation: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  content: string;
  isRead: boolean;
  isAdminMessage: boolean;
  attachment?: {
    filename: string;
    url: string;
    mimetype: string;
    size: number;
  };
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

interface MessagingStats {
  totalConversations: number;
  totalMessages: number;
  adminConversations: number;
  unreadMessages: number;
  flaggedMessages: number;
  activeUsers: number;
}

export default function MessagingManagementPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Conversation filters
  const [conversationSearch, setConversationSearch] = useState('');
  const [conversationType, setConversationType] = useState('all');
  const [conversationStatus, setConversationStatus] = useState('all');
  
  // Message filters
  const [messageSearch, setMessageSearch] = useState('');
  const [messageType, setMessageType] = useState('all');
  const [messageStatus, setMessageStatus] = useState('all');
  
  // Pagination state
  const [currentConversationPage, setCurrentConversationPage] = useState(1);
  const [currentMessagePage, setCurrentMessagePage] = useState(1);
  const [totalConversationPages, setTotalConversationPages] = useState(1);
  const [totalMessagePages, setTotalMessagePages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (conversationType !== 'all') params.append('type', conversationType);
      if (conversationStatus !== 'all') params.append('status', conversationStatus);
      if (conversationSearch) params.append('search', conversationSearch);
      params.append('page', currentConversationPage.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/messaging/conversations?${params}`);
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setConversations(data.conversations || []);
        setTotalConversations(data.total || 0);
        setTotalConversationPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch conversations',
        variant: 'destructive',
      });
    }
  }, [conversationType, conversationStatus, conversationSearch, currentConversationPage, limit, toast]);

  const fetchMessages = useCallback(async () => {
    try {
      // For now, we'll fetch messages from the first conversation
      // In a real implementation, you'd want to fetch all messages across conversations
      if (conversations.length > 0) {
        const response = await api.get(`/admin/messaging/conversations/${conversations[0]._id}/messages?page=${currentMessagePage}&limit=${limit}`);
        if ((response.data as any).success) {
          const data = (response.data as any).data;
          setMessages(data.messages || []);
          setTotalMessages(data.total || 0);
          setTotalMessagePages(data.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    }
  }, [toast, conversations, currentMessagePage, limit]);

  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from conversations and messages data
      const totalConversations = conversations.length;
      const totalMessages = messages.length;
      const adminConversations = conversations.filter(c => c.isAdminConversation).length;
      const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      const flaggedMessages = 0; // This would need to be implemented
      const activeUsers = new Set([...conversations.flatMap(c => c.participants.map(p => p._id))]).size;

      setStats({
        totalConversations,
        totalMessages,
        adminConversations,
        unreadMessages,
        flaggedMessages,
        activeUsers,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [conversations, messages]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchMessages()]);
    } finally {
      setLoading(false);
    }
  }, [fetchConversations, fetchMessages]);

  // Pagination handlers
  const handleConversationPageChange = (page: number) => {
    setCurrentConversationPage(page);
  };

  const handleMessagePageChange = (page: number) => {
    setCurrentMessagePage(page);
  };

  // Search handlers
  const handleConversationSearch = (value: string) => {
    setConversationSearch(value);
    setCurrentConversationPage(1);
  };

  const handleMessageSearch = (value: string) => {
    setMessageSearch(value);
    setCurrentMessagePage(1);
  };

  // Filter handlers
  const handleConversationFilterChange = (filterType: string, value: string) => {
    if (filterType === 'type') {
      setConversationType(value);
    } else if (filterType === 'status') {
      setConversationStatus(value);
    }
    setCurrentConversationPage(1);
  };

  const handleMessageFilterChange = (filterType: string, value: string) => {
    if (filterType === 'type') {
      setMessageType(value);
    } else if (filterType === 'status') {
      setMessageStatus(value);
    }
    setCurrentMessagePage(1);
  };

  const getAttachmentIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (mimetype.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'employer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'candidate':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter conversations based on search and filters
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = !conversationSearch || 
      conversation.participants.some(p => 
        p.fullName.toLowerCase().includes(conversationSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(conversationSearch.toLowerCase())
      );
    
    const matchesType = conversationType === 'all' || 
      (conversationType === 'admin' && conversation.isAdminConversation) ||
      (conversationType === 'user' && !conversation.isAdminConversation);
    
    const matchesStatus = conversationStatus === 'all' ||
      (conversationStatus === 'unread' && conversation.unreadCount > 0) ||
      (conversationStatus === 'read' && conversation.unreadCount === 0);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter messages based on search and filters
  const filteredMessages = messages.filter(message => {
    const matchesSearch = !messageSearch || 
      message.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
      message.sender.fullName.toLowerCase().includes(messageSearch.toLowerCase());
    
    const matchesType = messageType === 'all' ||
      (messageType === 'admin' && message.isAdminMessage) ||
      (messageType === 'user' && !message.isAdminMessage);
    
    const matchesStatus = messageStatus === 'all' ||
      (messageStatus === 'read' && message.isRead) ||
      (messageStatus === 'unread' && !message.isRead);
    
    return matchesSearch && matchesType && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold">Messaging Management</h1>
          <p className="text-muted-foreground">
            Monitor conversations, moderate content, and manage messaging across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.adminConversations} admin conversations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unreadMessages} unread
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                in messaging
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">
                require attention
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged Messages</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flaggedMessages}</div>
              <p className="text-xs text-muted-foreground">
                need moderation
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Conversations</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.adminConversations}</div>
              <p className="text-xs text-muted-foreground">
                with support
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="conversations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversations">Conversations ({totalConversations})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({totalMessages})</TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="space-y-4">
          {/* Conversation Filters */}
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
                      placeholder="Search conversations..."
                      value={conversationSearch}
                      onChange={(e) => handleConversationSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={conversationType} onValueChange={(value) => handleConversationFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="admin">Admin Conversations</SelectItem>
                      <SelectItem value="user">User Conversations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={conversationStatus} onValueChange={(value) => handleConversationFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversations List */}
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                Monitor and manage all conversations across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {conversation.participants.map(p => p.fullName).join(' & ')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {conversation.participants.map(p => p.email).join(', ')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {conversation.isAdminConversation && (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                Admin
                              </Badge>
                            )}
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                {conversation.unreadCount} unread
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {conversation.job && (
                          <p className="text-sm text-gray-600 mb-2">
                            Related to: {conversation.job.title}
                          </p>
                        )}
                        
                        {conversation.lastMessage && (
                          <div className="bg-gray-50 rounded p-2 mb-2">
                            <p className="text-sm text-gray-700">
                              {conversation.lastMessage.content}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {conversation.lastMessage.isAdminMessage ? 'Admin' : 'User'} • {new Date(conversation.lastMessage.createdAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created: {new Date(conversation.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(conversation.updatedAt).toLocaleDateString()}</span>
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
                
                {filteredConversations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No conversations found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {/* Message Filters */}
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
                      placeholder="Search messages..."
                      value={messageSearch}
                      onChange={(e) => handleMessageSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={messageType} onValueChange={(value) => handleMessageFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="admin">Admin Messages</SelectItem>
                      <SelectItem value="user">User Messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={messageStatus} onValueChange={(value) => handleMessageFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Monitor and moderate all messages across conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMessages.map((message) => (
                  <div
                    key={message._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {message.sender.fullName}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {message.sender.email} • {message.sender.role}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getRoleColor(message.sender.role)}>
                              {message.sender.role}
                            </Badge>
                            {message.isAdminMessage && (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                Admin
                              </Badge>
                            )}
                            {!message.isRead && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                Unread
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-3 mb-2">
                          <p className="text-sm text-gray-700">{message.content}</p>
                        </div>
                        
                        {message.attachment && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded mb-2">
                            {getAttachmentIcon(message.attachment.mimetype)}
                            <div>
                              <p className="text-sm font-medium">{message.attachment.filename}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(message.attachment.size)} • {message.attachment.mimetype}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Sent: {new Date(message.createdAt).toLocaleString()}</span>
                          <span>Read by: {message.readBy.length} users</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Flag
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
