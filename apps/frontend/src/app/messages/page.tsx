'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getSocket, initSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import {
  Download,
  ExternalLink,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  X
} from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Avatar components
const Avatar = ({ className = "", children, ...props }: any) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "", ...props }: any) => {
  if (!src) return null;
  return (
    <Image src={src} alt={alt || ''} width={40} height={40} className={`aspect-square h-full w-full object-cover ${className}`} {...props} />
  );
};

const AvatarFallback = ({ className = "", children, ...props }: any) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium ${className}`} {...props}>
    {children}
  </div>
);

export default function MessagesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user');
  const jobId = searchParams.get('job');
  
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    error,
    currentPage,
    hasMoreMessages,
    isLoadingMore,
    initSocketListeners,
    fetchConversations,
    createConversation,
    selectConversation,
    sendMessage,
    loadMoreMessages,
    clearError,
  } = useChatStore();
  
  // Get setState function for error handling
  const setState = useChatStore.setState;
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const processedConversationRef = useRef<string | null>(null);

  // Memoize user ID to prevent unnecessary recalculations
  const userId = useMemo(() => user?.id || (user as any)?._id, [user]);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll handler to detect when user scrolls to top (for pagination)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    console.log('📜 User scroll event:', {
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

  // Main initialization useEffect - runs only once when user changes
  useEffect(() => {
    if (user && userId) {
      // Initialize socket first
      let socket = getSocket();
      if (!socket) {
        socket = initSocket(userId);
      }
      
      if (socket) {
        // Set up socket event listeners
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('newMessage');
        
        socket.on('connect', () => {
          socket?.emit('join', userId);
        });
        
        // Handle new messages
        socket.on('newMessage', (message) => {
          // Update the messages in the store
          const { messages } = useChatStore.getState();
          const messageExists = messages.some(m => m._id === message._id);
          if (!messageExists) {
            useChatStore.setState(state => ({
              messages: [...state.messages, message]
            }));
            
            // Auto-scroll to bottom when new message is added
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        });
        
        // Initialize socket listeners from store
        initSocketListeners();
      }
      
      // Fetch conversations
      fetchConversations();
    }
  }, [user, userId, initSocketListeners, fetchConversations, scrollToBottom]);

  // Conversation selection useEffect - runs when conversations change
  useEffect(() => {
    if (!targetUserId && conversations.length > 0 && !currentConversation) {
      selectConversation(conversations[0]._id);
    }
  }, [conversations, targetUserId, currentConversation, selectConversation]);

  // Handle user parameter to create or find conversation
  useEffect(() => {
    if (!user || !userId || !targetUserId) {
      return;
    }

    // Check if we've already processed this conversation request
    const conversationKey = `${userId}-${targetUserId}-${jobId || 'no-job'}`;
    if (processedConversationRef.current === conversationKey) {
      return;
    }
    
    // Prevent creating conversation with yourself
    if (userId === targetUserId) {
      setState({ error: 'Cannot start a conversation with yourself. Please log in as a different user to test messaging between two people.' });
      return;
    }
    
    // Check if conversation already exists with this user
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p._id === targetUserId)
    );
    
    if (existingConversation) {
      // Check if participants are populated (have fullName) or just IDs
      const hasPopulatedParticipants = existingConversation.participants.some(p => p && typeof p === 'object' && p.fullName);
      
      if (hasPopulatedParticipants) {
        processedConversationRef.current = conversationKey;
        selectConversation(existingConversation._id);
      } else {
        // Fetch fresh conversation data with populated participants
        processedConversationRef.current = conversationKey;
        createConversation([userId, targetUserId], jobId || undefined)
          .then((newConv) => {
            selectConversation(newConv._id);
          })
          .catch(() => {
            processedConversationRef.current = null;
          });
      }
    } else {
      // Create new conversation
      processedConversationRef.current = conversationKey;
      
      createConversation([userId, targetUserId], jobId || undefined)
        .then((newConv) => {
          selectConversation(newConv._id);
        })
        .catch(() => {
          processedConversationRef.current = null;
        });
    }
  }, [user, userId, targetUserId, jobId, conversations, createConversation, selectConversation, setState]);

  // Auto-scroll to bottom when messages are loaded or updated
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length, isLoading, scrollToBottom]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only images (JPEG, PNG, GIF), PDF, and Word documents are allowed');
        return;
      }
      
      setSelectedFile(file);
      setShowFilePreview(true);
    }
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setShowFilePreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!currentConversation) return;

    await sendMessage(currentConversation._id, newMessage, selectedFile || undefined);
    
    setNewMessage('');
    removeSelectedFile();
  }, [newMessage, selectedFile, currentConversation, sendMessage, removeSelectedFile]);


  // Memoize filtered conversations to prevent unnecessary filtering
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const participantNames = conv.participants
        .filter(p => p && p._id !== userId && p.fullName) // Filter out undefined/incomplete participants
        .map(p => p.fullName.toLowerCase());
      return participantNames.some(name => name.includes(searchTerm.toLowerCase()));
    });
  }, [conversations, userId, searchTerm]);

  // Memoize getOtherParticipant function
  const getOtherParticipant = useCallback((conversation: any) => {
    if (!conversation || !conversation.participants) {
      return null;
    }
    
    const otherParticipant = conversation.participants.find((p: any) => p && p._id && p._id !== userId);
    return otherParticipant;
  }, [userId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewFile = (url: string) => {
    window.open(url, '_blank');
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📈';
    return '📎';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-1">
            <Card className="h-full animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                        <div className="h-2 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-destructive/20 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No conversations</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No conversations match your search.' : 'Start a conversation to begin messaging.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[450px] overflow-y-auto">
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    if (!otherParticipant) return null; // Skip if participant not found
                    return (
                      <div
                        key={conversation._id}
                        className={`p-4 cursor-pointer hover:bg-accent border-l-4 transition-colors ${
                          currentConversation?._id === conversation._id 
                            ? 'bg-primary/5 border-l-primary' 
                            : 'border-l-transparent'
                        }`}
                        onClick={() => selectConversation(conversation._id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={otherParticipant?.avatar} />
                              <AvatarFallback>
                                {otherParticipant?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {/* TODO: Add online status when available */}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium truncate ${
                                conversation.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {otherParticipant?.fullName || 'Unknown User'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate capitalize">
                              {otherParticipant?.role?.replace('_', ' ') || 'Unknown'}
                            </p>
                            <p className={`text-xs truncate ${
                              conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                            }`}>
                              {conversation.lastMessage ? conversation.lastMessage.content : 'No messages yet'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {currentConversation ? (
              <>
                <CardHeader className="pb-3">
                  {(() => {
                    const otherParticipant = getOtherParticipant(currentConversation);
                    if (!otherParticipant) {
                      return <div className="text-sm text-muted-foreground">Unable to load participant information</div>;
                    }
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={otherParticipant?.avatar} />
                            <AvatarFallback>
                              {otherParticipant?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{otherParticipant?.fullName || 'Unknown User'}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {otherParticipant?.role?.replace('_', ' ') || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })()}
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0">
                  <div 
                    className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[450px]"
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                  >
                    {/* Loading indicator for pagination */}
                    {isLoadingMore && (
                      <div className="text-center py-4">
                        <div className="text-sm text-muted-foreground">Loading more messages...</div>
                      </div>
                    )}
                    
                    {messages.map((message, index) => {
                      const isOwnMessage = message.sender._id === userId
                      
                      return (
                      <div
                        key={`${message._id}-${index}`}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-primary text-white'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.attachment && (
                            <div className="mb-2">
                              {message.attachment.mimetype.startsWith('image/') ? (
                                <div className="relative">
                                  <Image 
                                    src={message.attachment.url} 
                                    alt={message.attachment.filename}
                                    width={300}
                                    height={200}
                                    className="max-w-full h-auto rounded cursor-pointer"
                                    onClick={() => message.attachment && handleViewFile(message.attachment.url)}
                                  />
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                                      onClick={() => message.attachment && handleViewFile(message.attachment.url)}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                                      onClick={() => message.attachment && handleDownloadFile(message.attachment.url, message.attachment.filename)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <span className="text-lg">{getFileIcon(message.attachment.mimetype)}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{message.attachment.filename}</p>
                                      <p className="text-xs opacity-75">
                                        {formatFileSize(message.attachment.size)} • {message.attachment.mimetype}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-white/20"
                                      onClick={() => message.attachment && handleViewFile(message.attachment.url)}
                                      title="View file"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 hover:bg-white/20"
                                      onClick={() => message.attachment && handleDownloadFile(message.attachment.url, message.attachment.filename)}
                                      title="Download file"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      );
                    })}
                    
                    {/* Scroll anchor for auto-scroll to bottom */}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* File Preview */}
                  {showFilePreview && selectedFile && (
                    <div className="border-t p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getFileIcon(selectedFile.type)}</span>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(selectedFile.size)} • {selectedFile.type}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeSelectedFile}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t p-4">
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={(!newMessage.trim() && !selectedFile) || isSending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to start messaging.</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
