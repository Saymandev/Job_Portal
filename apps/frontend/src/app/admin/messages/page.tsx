'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { getSocket, initSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import {
  CheckCheck,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  User,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface User {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: {
    _id: string;
    content: string;
    sender: User;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  _id: string;
  content: string;
  sender: User;
  createdAt: string;
  isAdminMessage: boolean;
  attachment?: {
    filename: string;
    url: string;
    mimetype: string;
    size: number;
  };
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Use ref to track selected conversation for socket listeners
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update ref whenever selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    console.log('📜 Attempting to scroll to bottom...');
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      console.log('📜 Scrolled to bottom successfully');
    } else {
      console.log('📜 messagesEndRef is null, cannot scroll');
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Debug: Check current user and authentication
      console.log('Admin Messages - Current user:', {
        user: user,
        isAuthenticated: isAuthenticated,
        userRole: user?.role,
        userId: user?.id
      });
      
      // Check if user is admin
      if (user?.role !== 'admin') {
        console.error('User is not an admin:', user?.role);
        toast({
          title: 'Access Denied',
          description: 'Only admin users can access this page.',
          variant: 'destructive',
        });
        return;
      }
      
      const [usersResponse, conversationsResponse] = await Promise.all([
        api.get('/chat/admin/users'),
        api.get('/chat/admin/conversations'),
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.data);
      }
      if (conversationsResponse.data.success) {
        console.log('Fetched conversations:', conversationsResponse.data.data);
        conversationsResponse.data.data.forEach((conv: any) => {
          console.log('Conversation participants:', conv.participants);
        });
        const fetchedConversations = conversationsResponse.data.data;
        setConversations(fetchedConversations);
        
        // Auto-select the first conversation if none is selected and there are conversations
        if (fetchedConversations.length > 0 && !selectedConversationRef.current) {
          console.log('🔄 Auto-selecting first conversation after page load:', fetchedConversations[0]._id);
          console.log('🔄 First conversation details:', {
            id: fetchedConversations[0]._id,
            participants: fetchedConversations[0].participants.map((p: any) => ({ id: p._id, name: p.fullName })),
            lastMessage: fetchedConversations[0].lastMessage
          });
          setSelectedConversation(fetchedConversations[0]);
          // Messages will be fetched by the useEffect that watches selectedConversation
        }
      }
    } catch (error: any) {
      console.error('Error fetching admin messaging data:', error);
      
      // Show more detailed error message
      let errorMessage = 'Failed to fetch messaging data';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied. Please ensure you are logged in as an admin user.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isAuthenticated, user]);

  // Monitor user object changes for debugging
  useEffect(() => {
    console.log('User object changed:', {
      userId: user?.id,
      userRole: user?.role,
      userFullName: user?.fullName,
      userEmail: user?.email,
      hasId: !!user?.id,
      hasRole: !!user?.role
    });
  }, [user]);

  // Socket initialization - run once when user changes
  useEffect(() => {
    console.log('Admin messages page - Auth check:', {
      isAuthenticated,
      userRole: user?.role,
      userId: user?.id,
      userEmail: user?.email,
      userFullName: user?.fullName,
      userObject: user
    });

    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }

    // Force refresh user data if user.id is undefined
    if (user && !user.id && user.fullName) {
      console.log('User ID is undefined, forcing user data refresh...');
      useAuthStore.getState().fetchUser();
    }

    fetchData();

    // Initialize socket for real-time messaging
    if (user?.id || user?.email || user?.role === 'admin') {
      const userId = user?.id || user?.email || '68ebabe6199695f6bf0fdf33'; // Fallback to known admin ID
      console.log('Admin initializing socket with user ID:', userId);
      const socket = initSocket(userId);
      console.log('Admin socket initialized:', socket);
      
      // Add socket connection debugging
      socket.on('connect', () => {
        console.log('🔌 Admin socket connected:', socket.id);
        // Rejoin all conversation rooms when reconnecting
        if (selectedConversationRef.current) {
          console.log('🔌 Rejoining conversation room on connect:', selectedConversationRef.current._id);
          socket.emit('joinConversation', selectedConversationRef.current._id);
        }
      });
      
      socket.on('disconnect', (reason) => {
        console.log('🔌 Admin socket disconnected:', reason);
      });
      
      socket.on('connect_error', (error) => {
        console.error('🔌 Admin socket connection error:', error);
      });
      
      // Debug: Log all socket events for admin
      const originalEmit = socket.emit;
      socket.emit = function(event: string, ...args: any[]) {
        console.log('📤 Admin socket emitting:', { event, args });
        return originalEmit.apply(this, [event, ...args]);
      };
      
      // Listen for new messages - use ref to access current selected conversation
      socket.off('newMessage'); // Remove any existing listeners
      socket.on('newMessage', (message) => {
        console.log('🔵 Admin received new message:', {
          messageId: message._id,
          messageContent: message.content,
          messageSender: message.sender?.fullName,
          messageSenderId: message.sender?._id,
          messageSenderRole: message.sender?.role,
          messageConversationId: message.conversation,
          currentConversationId: selectedConversationRef.current?._id,
          isForCurrentConversation: selectedConversationRef.current?._id === message.conversation,
          timestamp: new Date().toISOString(),
          fullMessage: message
        });
        
        // Update messages if it's for the currently selected conversation
        const currentConversation = selectedConversationRef.current;
        if (currentConversation && currentConversation._id === message.conversation) {
          console.log('🟢 Message is for current conversation, adding to messages');
          setMessages(prev => {
            console.log('🟡 Current messages count before adding:', prev.length);
            
            // Check for duplicates
            const messageExists = prev.some(m => m._id === message._id);
            if (messageExists) {
              console.log('🔴 Message already exists, not adding duplicate');
              return prev;
            }
            
            console.log('✅ Adding new message to admin messages');
            const newMessages = [...prev, message];
            console.log('🟡 New messages count after adding:', newMessages.length);
            
            // Auto-scroll to bottom when new message is added
            setTimeout(() => {
              scrollToBottom();
            }, 200);
            
            return newMessages;
          });
        } else {
          console.log('🟡 Message is NOT for current conversation:', {
            selectedConversationId: currentConversation?._id,
            messageConversationId: message.conversation,
            hasSelectedConversation: !!currentConversation
          });
        }
        
        // Update conversation list with new last message
        setConversations(prev => {
          console.log('🔄 Updating conversation list with new last message');
          const updated = prev.map(conv => 
            conv._id === message.conversation 
              ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
              : conv
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          console.log('🔄 Conversation list updated');
          return updated;
        });
      });

      // Note: All messages (admin and user) are handled by the 'newMessage' listener above

      // Listen for typing indicators
      socket.off('userTyping'); // Remove any existing listeners
      socket.on('userTyping', (data) => {
        console.log('User typing:', data);
        // You can implement typing indicators here if needed
      });

      return () => {
        socket.off('newMessage');
        socket.off('userTyping');
      };
    }
  }, [isAuthenticated, user, router, fetchData, scrollToBottom]);

  const cleanupOldConversations = async () => {
    try {
      const response = await api.post('/chat/admin/conversations/cleanup');
      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        await fetchData(); // Refresh conversations
      }
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to cleanup conversations',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = useCallback(async (conversationId: string, page = 1, reset = true) => {
    console.log('📥 fetchMessages called for conversation:', conversationId, 'page:', page, 'reset:', reset);
    
    if (reset) {
      setIsLoadingMore(false);
      setCurrentPage(1);
      setHasMoreMessages(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // Fetch recent messages first (latest 50 messages)
      // For pagination, we'll fetch in reverse order and then reverse on frontend
      const response = await api.get(`/chat/admin/conversations/${conversationId}/messages?page=${page}&limit=50`);
      console.log('📥 fetchMessages API response:', {
        success: response.data.success,
        messageCount: response.data.data?.length,
        conversationId: conversationId,
        page: page
      });
      
      if (response.data.success) {
        const fetchedMessages = response.data.data;
        console.log('📥 Admin messages fetched successfully:', {
          messageCount: fetchedMessages.length,
          conversationId: conversationId,
          page: page,
          firstMessageTime: fetchedMessages[0]?.createdAt,
          lastMessageTime: fetchedMessages[fetchedMessages.length - 1]?.createdAt
        });
        
        // Backend returns newest first, so reverse to get oldest first for display
        const sortedMessages = fetchedMessages.reverse();
        
        if (reset) {
          // Replace all messages (first load)
          setMessages(sortedMessages);
          setCurrentPage(2); // Next page to load
        } else {
          // Prepend older messages (pagination)
          setMessages(prevMessages => [...sortedMessages, ...prevMessages]);
          setCurrentPage(prevPage => prevPage + 1);
        }
        
        // Check if we have more messages to load
        if (fetchedMessages.length < 50) {
          setHasMoreMessages(false);
        }
        
        console.log('📥 Messages state updated, total count:', reset ? sortedMessages.length : 'prepended');
        
        // Auto-scroll to bottom on first load
        if (reset) {
          setTimeout(() => {
            scrollToBottom();
          }, 200);
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching messages:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast({
        title: 'Error',
        description: 'Failed to fetch messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [toast, scrollToBottom]);

  // Function to load more messages when scrolling up
  const loadMoreMessages = useCallback(() => {
    if (selectedConversation && hasMoreMessages && !isLoadingMore) {
      console.log('📥 Loading more messages, current page:', currentPage);
      fetchMessages(selectedConversation._id, currentPage, false);
    }
  }, [selectedConversation, hasMoreMessages, isLoadingMore, currentPage, fetchMessages]);

  // Scroll handler to detect when user scrolls to top (for pagination)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    console.log('📜 Admin scroll event:', {
      scrollTop,
      scrollHeight,
      clientHeight,
      nearTop: scrollTop < 50,
      hasMoreMessages,
      isLoadingMore
    });
    
    // If scrolled near the top (within 50px), load more messages
    if (scrollTop < 50 && hasMoreMessages && !isLoadingMore) {
      console.log('📥 Loading more messages due to scroll');
      loadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

  // Re-join conversation room and fetch messages when selected conversation changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for selectedConversation:', selectedConversation?._id);
    if (selectedConversation) {
      console.log('🔄 Selected conversation changed, fetching messages and joining room:', selectedConversation._id);
      console.log('🔄 Conversation details:', {
        id: selectedConversation._id,
        participants: selectedConversation.participants.map(p => ({ id: p._id, name: p.fullName })),
        lastMessage: selectedConversation.lastMessage
      });
      
      // Fetch messages for the selected conversation (reset pagination)
      fetchMessages(selectedConversation._id, 1, true);
      
      // Join conversation room for real-time updates
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log('🔌 Admin joining conversation room:', selectedConversation._id);
        socket.emit('joinConversation', selectedConversation._id);
        console.log('✅ Admin joined conversation room');
      }
    } else {
      console.log('🔄 No conversation selected, clearing messages');
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  const sendMessage = async () => {
    console.log('🚀 Admin sendMessage called:', {
      hasMessage: !!newMessage.trim(),
      hasFile: !!selectedFile,
      selectedConversationId: selectedConversation?._id,
      currentUserId: user?.id
    });

    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) {
      console.log('🔴 Cannot send message:', {
        hasMessage: !!newMessage.trim(),
        hasFile: !!selectedFile,
        hasConversation: !!selectedConversation
      });
      return;
    }

    try {
      console.log('📤 Preparing to send admin message...');
      const formData = new FormData();
      formData.append('content', newMessage);
      if (selectedFile) {
        formData.append('attachment', selectedFile);
        console.log('📎 File attached:', selectedFile.name, selectedFile.size);
      }

      console.log('🌐 Sending POST request to admin messages endpoint...');
      console.log('🌐 API Request details:', {
        url: `/chat/admin/conversations/${selectedConversation._id}/messages`,
        content: newMessage,
        hasFile: !!selectedFile,
        conversationId: selectedConversation._id,
        userId: user?.id
      });
      
      const response = await api.post(`/chat/admin/conversations/${selectedConversation._id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ Admin message API response:', {
        success: response.data.success,
        messageId: response.data.data?._id,
        messageContent: response.data.data?.content,
        senderId: response.data.data?.sender?._id,
        conversationId: response.data.data?.conversation,
        fullResponse: response.data,
        status: response.status,
        statusText: response.statusText
      });

      if (response.data.success) {
        const newMessage = response.data.data;
        console.log('🎉 Admin message sent successfully via API');
        
        // Real-time delivery is handled by the backend API endpoint
        // Backend will emit the message via socket, so let socket listener handle it
        
        // Clear input fields
        console.log('🧹 Clearing input fields...');
        setNewMessage('');
        setSelectedFile(null);
        // Clear file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        console.log('✅ Input fields cleared');
        
        // Update conversation in list immediately
        console.log('🔄 Updating conversation list with new last message...');
        setConversations(prev => {
          const updated = prev.map(conv => 
            conv._id === selectedConversation._id 
              ? { ...conv, lastMessage: newMessage, updatedAt: new Date().toISOString() }
              : conv
          ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          console.log('✅ Conversation list updated');
          return updated;
        });
        
        console.log('⏳ Waiting for backend to emit newMessage event via socket...');
        
        // Fallback: Add message to local state after 3 seconds if not received via socket
        setTimeout(() => {
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === newMessage._id);
            if (!messageExists) {
              console.log('🔄 Fallback: Adding admin message to local state');
              return [...prev, newMessage];
            }
            return prev;
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Error sending admin message:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const startNewConversation = async () => {
    if (!selectedUser) return;

    try {
      console.log('Starting conversation with:', {
        selectedUser: selectedUser,
        targetUserId: selectedUser._id,
        adminUserId: user?.id
      });
      
      const response = await api.post('/chat/admin/conversations', {
        targetUserId: selectedUser._id,
        initialMessage: newMessage || undefined,
      });

      if (response.data.success) {
        await fetchData(); // Refresh conversations
        setSelectedConversation(response.data.data);
        setShowUserList(false);
        setSelectedUser(null);
        setNewMessage('');
        
        if (newMessage) {
          await fetchMessages(response.data.data._id, 1, true);
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('🎯 Admin selecting conversation:', {
      conversationId: conversation._id,
      otherParticipant: getOtherParticipant(conversation),
      participants: conversation.participants.map(p => ({
        id: p._id,
        name: p.fullName,
        role: p.role
      }))
    });
    
    setSelectedConversation(conversation);
    
    // Note: Fetching messages and joining conversation room is now handled by the useEffect that watches selectedConversation
  };

  const getOtherParticipant = (conversation: Conversation) => {
    console.log('Getting other participant for conversation:', {
      conversationId: conversation._id,
      participants: conversation.participants,
      currentUserId: user?.id,
      adminUserId: user?.id,
      userObject: user
    });
    
    // If user?.id is undefined, try to find the admin user by role or known ID
    let currentUserId = user?.id;
    if (!currentUserId && user?.role === 'admin') {
      // Find admin user in participants by role or known admin ID
      const adminParticipant = conversation.participants.find(p => 
        p.role === 'admin' || 
        p._id === '68ebabe6199695f6bf0fdf33' || // Known admin ID from logs
        p.fullName === 'Admin User'
      );
      currentUserId = adminParticipant?._id;
    }
    
    const otherUser = conversation.participants.find(p => p._id !== currentUserId);
    console.log('Found other user:', otherUser, 'currentUserId:', currentUserId);
    return otherUser;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Loading messaging data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Messages</h1>
        <p className="text-lg text-muted-foreground">
          Send messages to any user without permission restrictions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversations
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={cleanupOldConversations}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    Cleanup
                  </Button>
                  <Button
                    onClick={() => setShowUserList(true)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-4">
                  {conversations.map((conversation) => {
                    const otherUser = getOtherParticipant(conversation);
                    return (
                      <div
                        key={conversation._id}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?._id === conversation._id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {otherUser?.avatar ? (
                              <Image
                                src={otherUser.avatar}
                                alt={otherUser.fullName}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{otherUser?.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(conversation.updatedAt)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage?.content || 'No messages yet'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {conversations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversations yet</p>
                      <p className="text-sm">Start a new conversation with any user</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const otherUser = getOtherParticipant(selectedConversation);
                      return otherUser?.avatar ? (
                        <Image
                          src={otherUser.avatar}
                          alt={otherUser.fullName}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      );
                    })()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {getOtherParticipant(selectedConversation)?.fullName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getOtherParticipant(selectedConversation)?.email}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={scrollToBottom}
                      className="h-8 w-8 p-0"
                      title="Scroll to bottom"
                    >
                      ↓
                    </Button>
                    <Badge variant="outline">
                      {getOtherParticipant(selectedConversation)?.role}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea 
                  className="h-[400px] p-4" 
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                >
                  <div className="space-y-4">
                    {/* Loading indicator for pagination */}
                    {isLoadingMore && (
                      <div className="text-center py-4">
                        <div className="text-sm text-muted-foreground">Loading more messages...</div>
                      </div>
                    )}
                    
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages in this conversation</p>
                        <p className="text-sm">Start the conversation below</p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        console.log(`📝 Rendering message ${index + 1}/${messages.length}:`, {
                          messageId: message._id,
                          content: message.content,
                          sender: message.sender?.fullName,
                          senderId: message.sender?._id,
                          createdAt: message.createdAt
                        });
                        // Try multiple ways to identify admin messages
                        // Since user?.id might be undefined, use multiple fallback checks
                        const isOwnMessage = message.sender._id === user?.id || 
                                           message.sender._id === '68ebabe6199695f6bf0fdf33' || // Known admin ID from logs
                                           (user?.role === 'admin' && message.sender.role === 'admin') ||
                                           (user?.fullName === 'Admin User' && message.sender.fullName === 'Admin User') ||
                                           (user?.email && message.sender.email === user.email) ||
                                           // Additional fallback: if current user is admin and message sender is admin
                                           (user?.role === 'admin' && message.sender.fullName === 'Admin User');
                        
                        console.log('Message separation debug:', {
                          messageId: message._id,
                          senderId: message.sender._id,
                          senderName: message.sender.fullName,
                          currentUserId: user?.id,
                          currentUserName: user?.fullName,
                          currentUserRole: user?.role,
                          isOwnMessage,
                          senderRole: message.sender.role,
                          comparison1: message.sender._id === user?.id,
                          comparison2: message.sender.role === 'admin',
                          comparison3: message.sender.fullName === 'Admin User'
                        });
                        
                        return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {!isOwnMessage && message.sender.role !== 'admin' && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.sender.fullName} ({message.sender.role})
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            {message.attachment && (
                              <div className="mt-2 p-2 bg-black/10 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4" />
                                  <a
                                    href={message.attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {message.attachment.filename}
                                  </a>
                                  <span className="text-xs text-muted-foreground">
                                    ({(message.attachment.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs opacity-70">
                                {formatTime(message.createdAt)}
                              </p>
                              {isOwnMessage && (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })
                    )}
                    
                    {/* Scroll anchor for auto-scroll to bottom */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-4">
                  {/* File attachment display */}
                  {selectedFile && (
                    <div className="mb-3 p-2 bg-muted rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="file-input"
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <Button variant="outline" size="sm" className="h-10">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </label>
                    
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[40px] max-h-32 resize-none flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() && !selectedFile}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list or start a new one
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* User Selection Modal */}
      {showUserList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select User to Message
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div className="flex flex-col space-y-4 flex-1 min-h-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-2 pr-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUser?._id === user._id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {user.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.fullName}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.fullName}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">{user.role}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedUser && (
                  <div className="border-t pt-4 flex-shrink-0">
                    <label className="text-sm font-medium mb-2 block">
                      Initial Message (Optional)
                    </label>
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your initial message..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUserList(false);
                      setSelectedUser(null);
                      setNewMessage('');
                      setSearchTerm('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={startNewConversation}
                    disabled={!selectedUser}
                  >
                    Start Conversation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
