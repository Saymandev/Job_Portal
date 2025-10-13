import { api } from '@/lib/api';
import { getNotificationsSocket, initNotificationsSocket } from '@/lib/socket';
import { create } from 'zustand';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'application' | 'interview' | 'message' | 'system';
  isRead: boolean;
  job?: {
    _id: string;
    title: string;
    company: {
      name: string;
    };
  };
  application?: {
    _id: string;
    status: string;
  };
  conversation?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (page?: number, limit?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearError: () => void;
  initSocketListeners: (userId: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(unreadOnly && { unreadOnly: 'true' }),
      });

      const response = await api.get(`/notifications?${params}`);
      
      if (response.data.success) {
        set({ 
          notifications: response.data.data,
          isLoading: false 
        });
      } else {
        set({ error: 'Failed to fetch notifications', isLoading: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch notifications',
        isLoading: false 
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      // Check if user is authenticated before making the API call
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('⚠️ No access token found, skipping unread count fetch');
        set({ unreadCount: 0 });
        return;
      }

      console.log('📡 Fetching unread notification count...');
      const response = await api.get('/notifications/unread-count');
      
      if (response.data.success) {
        set({ unreadCount: response.data.data.count });
        console.log(`✅ Unread count fetched: ${response.data.data.count}`);
      } else {
        console.warn('⚠️ API returned success: false');
        set({ unreadCount: 0 });
      }
    } catch (error: any) {
      // More detailed error logging
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        hasToken: !!localStorage.getItem('accessToken')
      };
      
      console.error('❌ Failed to fetch unread count:', errorDetails);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.log('🔐 Authentication error - user may not be logged in');
      } else if (error.response?.status === 404) {
        console.log('🔍 Endpoint not found - backend may not be running');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.log('🌐 Network error - backend server may be down');
      }
      
      // Set unread count to 0 if there's an error
      set({ unreadCount: 0 });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
    
      const response = await api.patch(`/notifications/${notificationId}/read`);
      
      
      if (response.data.success) {
        set(state => ({
          notifications: state.notifications.map(notification =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
       
      }
    } catch (error: any) {
      console.error('❌ Failed to mark notification as read:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        notificationId
      });
      set({ error: error.response?.data?.message || 'Failed to mark notification as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.patch('/notifications/mark-all-read');
      
      if (response.data.success) {
        set(state => ({
          notifications: state.notifications.map(notification => ({
            ...notification,
            isRead: true,
          })),
          unreadCount: 0,
        }));
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to mark all notifications as read' });
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      
      if (response.data.success) {
        set(state => {
          const notification = state.notifications.find(n => n._id === notificationId);
          return {
            notifications: state.notifications.filter(n => n._id !== notificationId),
            unreadCount: notification && !notification.isRead 
              ? Math.max(0, state.unreadCount - 1) 
              : state.unreadCount,
          };
        });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete notification' });
    }
  },

  clearError: () => set({ error: null }),

  initSocketListeners: (userId: string) => {
    
    let socket = getNotificationsSocket();
    if (!socket) {
      
      socket = initNotificationsSocket(userId);
    }

    if (socket) {
      
      
      // Remove existing listeners to prevent duplicates
      socket.off('newNotification');
      socket.off('unreadCountUpdate');
      
      // Listen for new notifications
      socket.on('newNotification', (notification: Notification) => {
       
        set(state => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      });

      // Listen for unread count updates
      socket.on('unreadCountUpdate', ({ count }: { count: number }) => {
        
        set({ unreadCount: count });
      });
      
      
    } else {
      console.error('🔔 Failed to initialize notifications socket');
    }
  },
}));
