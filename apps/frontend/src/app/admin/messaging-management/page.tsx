'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
    name: string;
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
    name?: string;
    fullName?: string;
    email: string;
    role: string;
    avatar?: string;
  };
  content: string;
  isRead: boolean;
  isAdminMessage: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  flagCategory?: string;
  flaggedAt?: string;
  flaggedBy?: string;
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
  
  // Modal state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagCategory, setFlagCategory] = useState('inappropriate');
  
  const { toast } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      console.log('🔄 Fetching conversations with params:', {
        conversationType,
        conversationStatus,
        conversationSearch,
        currentConversationPage,
        limit
      });

      const params = new URLSearchParams();
      if (conversationType !== 'all') params.append('type', conversationType);
      if (conversationStatus !== 'all') params.append('status', conversationStatus);
      if (conversationSearch) params.append('search', conversationSearch);
      params.append('page', currentConversationPage.toString());
      params.append('limit', limit.toString());

      console.log('📡 API Request URL:', `/admin/messaging/conversations?${params}`);
      
      const response = await api.get(`/admin/messaging/conversations?${params}`);
      
      console.log('📥 Conversations API Response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        const data = (response.data as any).data;
        console.log('📊 Conversations Data:', {
          conversations: data.conversations?.length || 0,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
          firstConversation: data.conversations?.[0] || null
        });
        
        setConversations(data.conversations || []);
        setTotalConversations(data.total || 0);
        setTotalConversationPages(data.totalPages || 1);
        
        console.log('✅ Conversations state updated successfully');
      } else {
        console.warn('⚠️ Conversations API returned success: false');
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: 'Failed to fetch conversations',
        variant: 'destructive',
      });
    }
  }, [conversationType, conversationStatus, conversationSearch, currentConversationPage, limit, toast]);

  const fetchMessages = useCallback(async () => {
    try {
      console.log('🔄 Fetching messages with params:', {
        currentMessagePage,
        limit,
        messageSearch,
        messageType,
        messageStatus
      });

      const params = new URLSearchParams();
      params.append('page', currentMessagePage.toString());
      params.append('limit', limit.toString());
      if (messageSearch) params.append('search', messageSearch);
      if (messageType !== 'all') params.append('type', messageType);
      if (messageStatus !== 'all') params.append('status', messageStatus);

      console.log('📡 Messages API Request URL:', `/admin/messaging/messages?${params}`);
      
      const response = await api.get(`/admin/messaging/messages?${params}`);
      
      console.log('📥 Messages API Response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        const data = (response.data as any).data;
        console.log('📊 Messages Data:', {
          messages: data.messages?.length || 0,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
          firstMessage: data.messages?.[0] || null
        });
        
        setMessages(data.messages || []);
        setTotalMessages(data.total || 0);
        setTotalMessagePages(data.totalPages || 1);
        
        console.log('✅ Messages state updated successfully');
      } else {
        console.warn('⚠️ Messages API returned success: false');
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    }
  }, [toast, currentMessagePage, limit, messageSearch, messageType, messageStatus]);

  const fetchStats = useCallback(async () => {
    try {
      console.log('🔄 Fetching messaging stats...');
      
      const response = await api.get('/admin/messaging/stats');
      
      console.log('📥 Stats API Response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        const statsData = (response.data as any).data;
        console.log('📊 Stats Data:', statsData);
        setStats(statsData);
        console.log('✅ Stats state updated successfully');
      } else {
        console.warn('⚠️ Stats API returned success: false');
      }
    } catch (error) {
     
      
      // Set default stats if API fails
      const defaultStats = {
        totalConversations: 0,
        totalMessages: 0,
        adminConversations: 0,
        unreadMessages: 0,
        flaggedMessages: 0,
        activeUsers: 0,
      };
      
      console.log('🔄 Setting default stats:', defaultStats);
      setStats(defaultStats);
    }
  }, []); // No dependencies to prevent circular re-renders

  const fetchData = useCallback(async () => {
    try {
      console.log('🚀 Starting data fetch...');
      setLoading(true);
      
      await Promise.all([fetchConversations(), fetchMessages(), fetchStats()]);
      
      console.log('✅ All data fetched successfully');
    } catch (error) {
      console.error('❌ Error in fetchData:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Data fetch completed, loading set to false');
    }
  }, [fetchConversations, fetchMessages, fetchStats]);

  // Pagination handlers
  const handleConversationPageChange = (page: number) => {
    console.log('📄 Conversation page changed:', {
      oldPage: currentConversationPage,
      newPage: page,
      totalPages: totalConversationPages
    });
    
    setCurrentConversationPage(page);
    // Data will be fetched automatically due to useEffect dependency
  };

  const handleMessagePageChange = (page: number) => {
    console.log('📄 Message page changed:', {
      oldPage: currentMessagePage,
      newPage: page,
      totalPages: totalMessagePages
    });
    
    setCurrentMessagePage(page);
    // Data will be fetched automatically due to useEffect dependency
  };

  // Manual refresh function to avoid auto-rerenders
  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // View message handler
  const handleViewMessage = useCallback(async (message: Message) => {
    try {
      console.log('👁️ Viewing message:', {
        messageId: message._id,
        sender: message.sender,
        content: message.content?.substring(0, 50) + '...',
        isFlagged: message.isFlagged
      });

      const response = await api.get(`/admin/messaging/messages/${message._id}`);
      
      console.log('📥 Message details API response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        const messageData = (response.data as any).data;
        console.log('📊 Message details data:', messageData);
        
        setSelectedMessage(messageData);
        setShowMessageModal(true);
        
        console.log('✅ Message modal opened successfully');
      } else {
        console.warn('⚠️ Message details API returned success: false');
      }
    } catch (error) {
     
      toast({
        title: 'Error',
        description: 'Failed to fetch message details',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // View conversation handler
  const handleViewConversation = useCallback((conversation: Conversation) => {
    console.log('👁️ Viewing conversation:', {
      conversationId: conversation._id,
      participants: conversation.participants,
      isAdminConversation: conversation.isAdminConversation,
      unreadCount: conversation.unreadCount,
      lastMessage: conversation.lastMessage
    });
    
    setSelectedConversation(conversation);
    setShowConversationModal(true);
    
    console.log('✅ Conversation modal opened successfully');
  }, []);

  // Flag message handler
  const handleFlagMessage = useCallback((message: Message) => {
    console.log('🚩 Flagging message:', {
      messageId: message._id,
      sender: message.sender,
      content: message.content?.substring(0, 50) + '...',
      isFlagged: message.isFlagged
    });
    
    setSelectedMessage(message);
    setShowFlagModal(true);
    
    console.log('✅ Flag modal opened successfully');
  }, []);

  // Submit flag handler
  const handleSubmitFlag = useCallback(async () => {
    if (!selectedMessage || !flagReason.trim()) {
      console.warn('⚠️ Flag submission validation failed:', {
        hasSelectedMessage: !!selectedMessage,
        hasFlagReason: !!flagReason.trim()
      });
      toast({
        title: 'Error',
        description: 'Please provide a reason for flagging',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('🚩 Submitting flag:', {
        messageId: selectedMessage._id,
        reason: flagReason,
        category: flagCategory
      });

      const response = await api.post(`/admin/messaging/messages/${selectedMessage._id}/flag`, {
        reason: flagReason,
        category: flagCategory,
      });

      console.log('📥 Flag API response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        console.log('✅ Message flagged successfully');
        toast({
          title: 'Success',
          description: 'Message has been flagged for review',
        });
        setShowFlagModal(false);
        setFlagReason('');
        setSelectedMessage(null);
        // Refresh data to show updated flag status
        console.log('🔄 Refreshing data after flagging...');
        fetchData();
      } else {
        console.warn('⚠️ Flag API returned success: false');
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: 'Failed to flag message',
        variant: 'destructive',
      });
    }
  }, [selectedMessage, flagReason, flagCategory, toast, fetchData]);

  // Unflag message handler
  const handleUnflagMessage = useCallback(async (message: Message) => {
    try {
      console.log('🚩 Unflagging message:', {
        messageId: message._id,
        sender: message.sender,
        content: message.content?.substring(0, 50) + '...',
        isFlagged: message.isFlagged
      });

      const response = await api.post(`/admin/messaging/messages/${message._id}/unflag`);
      
      console.log('📥 Unflag API response:', {
        status: response.status,
        success: (response.data as any).success,
        data: (response.data as any).data
      });

      if ((response.data as any).success) {
        console.log('✅ Message unflagged successfully');
        toast({
          title: 'Success',
          description: 'Message has been unflagged',
        });
        // Refresh data to show updated flag status
        console.log('🔄 Refreshing data after unflagging...');
        fetchData();
      } else {
        console.warn('⚠️ Unflag API returned success: false');
      }
    } catch (error: any) {
      
      toast({
        title: 'Error',
        description: 'Failed to unflag message',
        variant: 'destructive',
      });
    }
  }, [toast, fetchData]);

  // Search handlers
  const handleConversationSearch = (value: string) => {
    console.log('🔍 Conversation search changed:', {
      oldValue: conversationSearch,
      newValue: value,
      currentPage: currentConversationPage
    });
    
    setConversationSearch(value);
    setCurrentConversationPage(1);
    // Data will be fetched automatically due to useEffect dependency
  };

  const handleMessageSearch = (value: string) => {
    console.log('🔍 Message search changed:', {
      oldValue: messageSearch,
      newValue: value,
      currentPage: currentMessagePage
    });
    
    setMessageSearch(value);
    setCurrentMessagePage(1);
    // Data will be fetched automatically due to useEffect dependency
  };

  // Filter handlers
  const handleConversationFilterChange = (filterType: string, value: string) => {
    console.log('🔧 Conversation filter changed:', {
      filterType,
      oldValue: filterType === 'type' ? conversationType : conversationStatus,
      newValue: value,
      currentPage: currentConversationPage
    });
    
    if (filterType === 'type') {
      setConversationType(value);
    } else if (filterType === 'status') {
      setConversationStatus(value);
    }
    setCurrentConversationPage(1);
    // Data will be fetched automatically due to useEffect dependency
  };

  const handleMessageFilterChange = (filterType: string, value: string) => {
    console.log('🔧 Message filter changed:', {
      filterType,
      oldValue: filterType === 'type' ? messageType : messageStatus,
      newValue: value,
      currentPage: currentMessagePage
    });
    
    if (filterType === 'type') {
      setMessageType(value);
    } else if (filterType === 'status') {
      setMessageStatus(value);
    }
    setCurrentMessagePage(1);
    // Data will be fetched automatically due to useEffect dependency
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

  // Use backend pagination - no client-side filtering needed
  // The backend handles all filtering and pagination

  useEffect(() => {
    console.log('🔄 useEffect triggered - fetching data');
    console.log('📊 Current state:', {
      conversations: conversations.length,
      messages: messages.length,
      stats: stats,
      loading: loading,
      currentConversationPage,
      currentMessagePage
    });
    
    fetchData();
  }, [fetchData]);

  // Debug effect to log state changes
  useEffect(() => {
    console.log('📊 State updated:', {
      conversations: conversations.length,
      messages: messages.length,
      stats: stats,
      loading: loading,
      totalConversations,
      totalMessages,
      currentConversationPage,
      currentMessagePage
    });
  }, [conversations, messages, stats, loading, totalConversations, totalMessages, currentConversationPage, currentMessagePage]);

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
        <Tabs defaultValue="conversations" className="space-y-4">
          <TabsList>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </TabsList>
          
          <TabsContent value="conversations" className="space-y-4">
            {/* Filters Skeleton */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Conversations List Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
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
          <Button onClick={handleRefresh} variant="outline">
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
                
                {conversations.map((conversation) => (
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
                              {Array.isArray(conversation.participants) 
                                ? conversation.participants.map(p => p?.name || 'Unknown').join(' & ')
                                : 'Unknown Participants'
                              }
                            </h3>
                            <p className="text-sm text-gray-600">
                              {Array.isArray(conversation.participants)
                                ? conversation.participants.map(p => p?.email || 'No email').join(', ')
                                : 'No email information'
                              }
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewConversation(conversation)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {conversations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No conversations found matching your filters</p>
                  </div>
                )}

                {/* Conversation Pagination */}
                {totalConversationPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {((currentConversationPage - 1) * limit) + 1} to {Math.min(currentConversationPage * limit, totalConversations)} of {totalConversations} conversations
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConversationPageChange(1)}
                        disabled={currentConversationPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConversationPageChange(currentConversationPage - 1)}
                        disabled={currentConversationPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentConversationPage} of {totalConversationPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConversationPageChange(currentConversationPage + 1)}
                        disabled={currentConversationPage === totalConversationPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConversationPageChange(totalConversationPages)}
                        disabled={currentConversationPage === totalConversationPages}
                      >
                        Last
                      </Button>
                    </div>
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
                
                {messages.map((message) => (
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
                              {message.sender?.fullName || message.sender?.name || 'Unknown'}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {message.sender?.email || 'No email'} • {message.sender?.role || 'Unknown'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getRoleColor(message.sender?.role || 'user')}>
                              {message.sender?.role || 'Unknown'}
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewMessage(message)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {message.isFlagged ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUnflagMessage(message)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Unflag
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleFlagMessage(message)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Flag
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages found matching your filters</p>
                  </div>
                )}

                {/* Message Pagination */}
                {totalMessagePages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {((currentMessagePage - 1) * limit) + 1} to {Math.min(currentMessagePage * limit, totalMessages)} of {totalMessages} messages
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessagePageChange(1)}
                        disabled={currentMessagePage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessagePageChange(currentMessagePage - 1)}
                        disabled={currentMessagePage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentMessagePage} of {totalMessagePages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessagePageChange(currentMessagePage + 1)}
                        disabled={currentMessagePage === totalMessagePages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessagePageChange(totalMessagePages)}
                        disabled={currentMessagePage === totalMessagePages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Details Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Message Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMessageModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {selectedMessage.sender?.fullName || selectedMessage.sender?.name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedMessage.sender?.email || 'No email'} • {selectedMessage.sender?.role || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800">{selectedMessage.content}</p>
                </div>

                {selectedMessage.attachment && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    {getAttachmentIcon(selectedMessage.attachment.mimetype)}
                    <div>
                      <p className="font-medium">{selectedMessage.attachment.filename}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedMessage.attachment.size)} • {selectedMessage.attachment.mimetype}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Message ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedMessage._id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Conversation ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedMessage.conversation}</p>
                  </div>
                  <div>
                    <span className="font-medium">Sent:</span>
                    <p className="text-gray-600">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Read by:</span>
                    <p className="text-gray-600">{selectedMessage.readBy.length} users</p>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-gray-600">{selectedMessage.isAdminMessage ? 'Admin Message' : 'User Message'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-gray-600">{selectedMessage.isRead ? 'Read' : 'Unread'}</p>
                  </div>
                </div>

                {selectedMessage.isFlagged && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Flagged for Review</span>
                    </div>
                    <p className="text-sm text-red-700">
                      <strong>Reason:</strong> {selectedMessage.flagReason}
                    </p>
                    <p className="text-sm text-red-700">
                      <strong>Category:</strong> {selectedMessage.flagCategory}
                    </p>
                    {selectedMessage.flaggedAt && (
                      <p className="text-sm text-red-700">
                        <strong>Flagged at:</strong> {new Date(selectedMessage.flaggedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowMessageModal(false)}
                >
                  Close
                </Button>
                {!selectedMessage.isFlagged ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMessageModal(false);
                      handleFlagMessage(selectedMessage);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Flag Message
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMessageModal(false);
                      handleUnflagMessage(selectedMessage);
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Unflag Message
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag Message Modal */}
      {showFlagModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Flag Message</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFlagModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-2">Message content:</p>
                  <p className="text-sm">{selectedMessage.content}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select value={flagCategory} onValueChange={setFlagCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="violence">Violence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason</label>
                  <textarea
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                    placeholder="Please provide a detailed reason for flagging this message..."
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowFlagModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFlag}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Flag Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Details Modal */}
      {showConversationModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Conversation Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversationModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {Array.isArray(selectedConversation.participants) 
                        ? selectedConversation.participants.map(p => p?.name || 'Unknown').join(' & ')
                        : 'Unknown Participants'
                      }
                    </h3>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(selectedConversation.participants)
                        ? selectedConversation.participants.map(p => p?.email || 'No email').join(', ')
                        : 'No email information'
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Conversation ID:</span>
                    <p className="text-gray-600 font-mono text-xs">{selectedConversation._id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>
                    <p className="text-gray-600">{selectedConversation.isAdminConversation ? 'Admin Conversation' : 'User Conversation'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-gray-600">{new Date(selectedConversation.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <p className="text-gray-600">{new Date(selectedConversation.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Unread Messages:</span>
                    <p className="text-gray-600">{selectedConversation.unreadCount}</p>
                  </div>
                  <div>
                    <span className="font-medium">Participants:</span>
                    <p className="text-gray-600">{Array.isArray(selectedConversation.participants) ? selectedConversation.participants.length : 0}</p>
                  </div>
                </div>

                {selectedConversation.job && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Related Job</span>
                    </div>
                    <p className="text-sm text-blue-700">{selectedConversation.job.title}</p>
                  </div>
                )}

                {selectedConversation.lastMessage && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-800">Last Message</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{selectedConversation.lastMessage.content}</p>
                    <p className="text-xs text-gray-500">
                      {selectedConversation.lastMessage.isAdminMessage ? 'Admin' : 'User'} • {new Date(selectedConversation.lastMessage.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {Array.isArray(selectedConversation.participants) && selectedConversation.participants.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-3">Participants</h4>
                    <div className="space-y-2">
                      {selectedConversation.participants.map((participant, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {(participant?.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{participant?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{participant?.email || 'No email'}</p>
                          </div>
                          <Badge className={getRoleColor(participant?.role || 'user')}>
                            {participant?.role || 'Unknown'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowConversationModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
