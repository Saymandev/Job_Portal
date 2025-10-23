import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { create } from 'zustand';

interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    fullName: string;
    avatar?: string;
  };
  content: string;
  attachment?: {
    filename: string;
    url: string;
    mimetype: string;
    size: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
    role: string;
  }>;
  job?: {
    _id: string;
    title: string;
    company: {
      name: string;
    };
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender: {
      fullName: string;
    };
    createdAt: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Pagination state
  currentPage: number;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  
  // Actions
  initSocketListeners: () => void;
  fetchConversations: () => Promise<void>;
  createConversation: (participants: string[], jobId?: string) => Promise<Conversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  fetchMessages: (conversationId: string, page?: number, reset?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, attachment?: File) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  clearError: () => void;
  scrollToBottom: () => void;
}

let socketListenersInitialized = false;

// Reset socket listeners flag when socket is recreated
export const resetSocketListeners = () => {
  socketListenersInitialized = false;
};

// Utility function to deduplicate conversations by _id
const deduplicateConversations = (conversations: Conversation[]): Conversation[] => {
  return conversations.filter((conv, index, self) => 
    index === self.findIndex(c => c._id === conv._id)
  );
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  
  // Pagination state
  currentPage: 1,
  hasMoreMessages: true,
  isLoadingMore: false,

  // Initialize socket listeners
  initSocketListeners: () => {
    
    if (socketListenersInitialized) {
      
      return;
    }
    
    const socket = getSocket();
    if (socket) {
      
      socketListenersInitialized = true;
      
      // Remove any existing listeners to prevent duplicates
      socket.off('newMessage');
      socket.off('joinedConversation');
      
      socket.on('joinedConversation', () => {
        // Conversation joined successfully
      });
      
      socket.on('newMessage', (message) => {
        try {
          
          
          const state = get();
          
          // Always update conversation's last message for real-time preview
          set(state => ({
            conversations: state.conversations.map(conv => 
              conv._id === message.conversation 
                ? { 
                    ...conv, 
                    lastMessage: {
                      _id: message._id,
                      content: message.content || '[File Attachment]',
                      sender: { fullName: message.sender.fullName },
                      createdAt: message.createdAt,
                    }
                  }
                : conv
            ),
          }));
          
          // Add message to messages array if not duplicate
          set(state => {
            const messageExists = state.messages.some(m => m._id === message._id);
            
            
            if (messageExists) {
             
              return state;
            }
            
            
            return {
              messages: [...state.messages, message],
            };
          });
        } catch (error) {
          console.error('Error processing socket message:', error);
        }
      });
    }
  },

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.get('/chat/conversations');
      
      if (response.data.success) {
        // Deduplicate conversations by _id
        const conversations = response.data.data;
        const uniqueConversations = deduplicateConversations(conversations);
        
        
        
        set({ conversations: uniqueConversations, isLoading: false });
      } else {
        set({ error: 'Failed to fetch conversations', isLoading: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch conversations',
        isLoading: false 
      });
    }
  },

  createConversation: async (participants: string[], jobId?: string) => {
    try {
      const response = await api.post('/chat/conversations', {
        participants,
        jobId,
      });
      
      if (response.data.success) {
        const newConversation = response.data.data;
        set(state => {
          // Check if conversation already exists to prevent duplicates
          const conversationExists = state.conversations.some(conv => conv._id === newConversation._id);
          if (conversationExists) {
            
            return {
              currentConversation: newConversation,
            };
          }
          
          
          const updatedConversations = [newConversation, ...state.conversations];
          return {
            conversations: deduplicateConversations(updatedConversations),
            currentConversation: newConversation,
          };
        });
        return newConversation;
      } else {
        set({ error: 'Failed to create conversation' });
        throw new Error('Failed to create conversation');
      }
    } catch (error: any) {
      console.error('ChatStore: Error creating conversation:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create conversation';
      
      // Check if it's a subscription-related error
      if (error.response?.status === 403 && errorMessage.includes('Direct messaging requires')) {
        set({ error: 'UPGRADE_REQUIRED' });
      } else {
        set({ error: errorMessage });
      }
      throw error;
    }
  },

  selectConversation: async (conversationId: string) => {
    const conversation = get().conversations.find(c => c._id === conversationId);
    if (!conversation) return;
    
    // Check if participants are populated (have fullName) or just IDs
    const hasPopulatedParticipants = conversation.participants.some(p => p && typeof p === 'object' && p.fullName);
    
    if (hasPopulatedParticipants) {
      set({ currentConversation: conversation });
    } else {
      try {
        // Fetch fresh conversation data with populated participants
        const response = await api.get(`/chat/conversations/${conversationId}`);
        if (response.data.success) {
          const freshConversation = response.data.data;
          set({ currentConversation: freshConversation });
          
          // Update the conversation in the conversations array as well
          set(state => ({
            conversations: state.conversations.map(conv => 
              conv._id === conversationId ? freshConversation : conv
            )
          }));
        } else {
          set({ currentConversation: conversation });
        }
      } catch (error) {
        set({ currentConversation: conversation });
      }
    }
    
    // Join socket room for real-time messaging
    const socket = getSocket();
    if (socket) {
      socket.emit('joinConversation', conversationId);
    }
    
    await get().fetchMessages(conversationId, 1, true);
    await get().markConversationAsRead(conversationId);
  },

  fetchMessages: async (conversationId: string, page = 1, reset = true) => {
    
    
    if (reset) {
      set({ isLoading: true, error: null, isLoadingMore: false, currentPage: 1, hasMoreMessages: true });
    } else {
      set({ isLoadingMore: true });
    }
    
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages?page=${page}&limit=50`);
      
      if (response.data.success) {
        const fetchedMessages = response.data.data;
        
        
        // Sort messages by creation date to ensure proper order (oldest first)
        const sortedMessages = fetchedMessages.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        if (reset) {
          // Replace all messages (first load)
          set({ 
            messages: sortedMessages, 
            isLoading: false,
            currentPage: 2, // Next page to load
            hasMoreMessages: fetchedMessages.length >= 50
          });
        } else {
          // Prepend older messages (pagination)
          set(state => ({
            messages: [...sortedMessages, ...state.messages],
            isLoadingMore: false,
            currentPage: state.currentPage + 1,
            hasMoreMessages: fetchedMessages.length >= 50
          }));
        }
        
        
      } else {
        set({ error: 'Failed to fetch messages', isLoading: false, isLoadingMore: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch messages',
        isLoading: false,
        isLoadingMore: false
      });
    }
  },

  loadMoreMessages: async () => {
    const state = get();
    if (state.currentConversation && state.hasMoreMessages && !state.isLoadingMore) {
      
      await get().fetchMessages(state.currentConversation._id, state.currentPage, false);
    }
  },

  scrollToBottom: () => {
    // This will be implemented in the component using a ref
    
  },

  sendMessage: async (conversationId: string, content: string, attachment?: File) => {
    if (!content.trim() && !attachment) return;

    set({ isSending: true, error: null });

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await api.post(`/chat/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const newMessage = response.data.data;
        
        // Don't add to local state immediately - let socket listener handle it
        // This prevents duplicate messages
        set({ isSending: false });

        // Emit message via socket for real-time delivery
        const socket = getSocket();
        if (socket) {
          socket.emit('sendMessage', {
            conversationId: conversationId,
            senderId: newMessage.sender._id,
            content: newMessage.content
          });
          
          // Fallback: Add message to local state after 2 seconds if not received via socket
          setTimeout(() => {
            set(state => {
              const messageExists = state.messages.some(m => m._id === newMessage._id);
              if (!messageExists) {
                
                return {
                  messages: [...state.messages, newMessage]
                };
              }
              return state;
            });
          }, 2000);
        }

        // Update conversation's last message
        set(state => ({
          conversations: state.conversations.map(conv => 
            conv._id === conversationId 
              ? { 
                  ...conv, 
                  lastMessage: {
                    _id: newMessage._id,
                    content: newMessage.content,
                    sender: { fullName: newMessage.sender.fullName },
                    createdAt: newMessage.createdAt,
                  }
                }
              : conv
          ),
        }));
      } else {
        set({ error: 'Failed to send message', isSending: false });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      
      // Check if it's a subscription-related error
      if (error.response?.status === 403 && errorMessage.includes('Direct messaging requires')) {
        set({ 
          isSending: false, 
          error: 'UPGRADE_REQUIRED' // Special error type for upgrade prompts
        });
      } else {
        set({ 
          isSending: false, 
          error: errorMessage 
        });
      }
    }
  },

  markConversationAsRead: async (conversationId: string) => {
    try {
      await api.patch(`/chat/conversations/${conversationId}/read`);
      
      // Update local state
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        ),
      }));
    } catch (error: any) {
      console.error('Failed to mark conversation as read:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
