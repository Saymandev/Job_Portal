import { api } from '@/lib/api';
import { create } from 'zustand';

interface MessagingPermission {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
    role: string;
  };
  targetUser: {
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  relatedJob?: {
    _id: string;
    title: string;
    company: {
      name: string;
    };
  };
  relatedApplication?: {
    _id: string;
    status: string;
  };
  message?: string;
  responseMessage?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PermissionStats {
  pendingRequests: number;
  receivedRequests: number;
  activePermissions: number;
  blockedUsers: number;
}

interface MessagingPermissionsState {
  myRequests: MessagingPermission[];
  receivedRequests: MessagingPermission[];
  activePermissions: MessagingPermission[];
  stats: PermissionStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchMyRequests: () => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchActivePermissions: () => Promise<void>;
  fetchStats: () => Promise<void>;
  requestPermission: (data: {
    targetUser: string;
    relatedJob?: string;
    relatedApplication?: string;
    message?: string;
    expiresInDays?: number;
  }) => Promise<void>;
  respondToRequest: (permissionId: string, status: 'approved' | 'rejected' | 'blocked', responseMessage?: string) => Promise<void>;
  revokePermission: (permissionId: string) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  checkPermission: (targetUserId: string) => Promise<{ canMessage: boolean; reason?: string }>;
  clearError: () => void;
}

export const useMessagingPermissionsStore = create<MessagingPermissionsState>((set, get) => ({
  myRequests: [],
  receivedRequests: [],
  activePermissions: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchMyRequests: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.get('/messaging-permissions/my-requests');
      
      if ((response.data as any).success) {
        set({ myRequests: (response.data as any).data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch permission requests', isLoading: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch permission requests',
        isLoading: false 
      });
    }
  },

  fetchReceivedRequests: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.get('/messaging-permissions/received-requests');
      
      if ((response.data as any).success) {
        set({ receivedRequests: (response.data as any).data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch received requests', isLoading: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch received requests',
        isLoading: false 
      });
    }
  },

  fetchActivePermissions: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.get('/messaging-permissions/active');
      
      if ((response.data as any).success) {
        set({ activePermissions: (response.data as any).data, isLoading: false });
      } else {
        set({ error: 'Failed to fetch active permissions', isLoading: false });
      }
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch active permissions',
        isLoading: false 
      });
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get('/messaging-permissions/stats');
      
      if ((response.data as any).success) {
        set({ stats: (response.data as any).data });
      }
    } catch (error: any) {
      console.error('Failed to fetch permission stats:', error);
    }
  },

  requestPermission: async (data) => {
    try {
      const response = await api.post('/messaging-permissions/request', data);
      
      if ((response.data as any).success) {
        // Refresh the requests list
        get().fetchMyRequests();
        get().fetchStats();
      } else {
        set({ error: 'Failed to send permission request' });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to send permission request' });
    }
  },

  respondToRequest: async (permissionId: string, status: 'approved' | 'rejected' | 'blocked', responseMessage?: string) => {
    try {
      const response = await api.patch(`/messaging-permissions/${permissionId}/respond`, {
        status,
        responseMessage,
      });
      
      if ((response.data as any).success) {
        // Refresh the relevant lists
        get().fetchReceivedRequests();
        get().fetchActivePermissions();
        get().fetchStats();
      } else {
        set({ error: 'Failed to respond to permission request' });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to respond to permission request' });
    }
  },

  revokePermission: async (permissionId: string) => {
    try {
      const response = await api.patch(`/messaging-permissions/${permissionId}/revoke`);
      
      if ((response.data as any).success) {
        // Refresh the relevant lists
        get().fetchMyRequests();
        get().fetchActivePermissions();
        get().fetchStats();
      } else {
        set({ error: 'Failed to revoke permission' });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to revoke permission' });
    }
  },

  blockUser: async (targetUserId: string) => {
    try {
      const response = await api.post(`/messaging-permissions/block/${targetUserId}`);
      
      if ((response.data as any).success) {
        // Refresh the relevant lists
        get().fetchActivePermissions();
        get().fetchStats();
      } else {
        set({ error: 'Failed to block user' });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to block user' });
    }
  },

  unblockUser: async (targetUserId: string) => {
    try {
      const response = await api.post(`/messaging-permissions/unblock/${targetUserId}`);
      
      if ((response.data as any).success) {
        // Refresh the relevant lists
        get().fetchActivePermissions();
        get().fetchStats();
      } else {
        set({ error: 'Failed to unblock user' });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to unblock user' });
    }
  },

  checkPermission: async (targetUserId: string) => {
    try {
      const response = await api.get(`/messaging-permissions/check/${targetUserId}`);
      
      if ((response.data as any).success) {
        return (response.data as any).data; 
      } else {
        return { canMessage: false, reason: 'Failed to check permission' };
      }
    } catch (error: any) {
      return { 
        canMessage: false, 
        reason: error.response?.data?.message || 'Failed to check permission' 
      };
    }
  },

  clearError: () => set({ error: null }),
}));
