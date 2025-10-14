import api from '@/lib/api';
import { clearAuthData, safeSetItem } from '@/lib/auth-utils';
import { disconnectSocket, initNotificationsSocket, initSocket } from '@/lib/socket';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNotificationsStore } from './notifications-store';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          const { data }: any = await api.post('/auth/login', { email, password });

          safeSetItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            safeSetItem('refreshToken', data.data.refreshToken);
          }

          // Ensure user object has 'id' field (fallback from '_id' if needed)
          const normalizedUserData = {
            ...data.data.user,
            id: data.data.user.id || data.data.user._id
          };

          set({
            user: normalizedUserData,
            isAuthenticated: true,
            isLoading: false,
          });

          // Initialize socket connection
          const userId = normalizedUserData.id;
          console.log('Auth Store login: Initializing socket with userId:', userId);
          initSocket(userId);
          initNotificationsSocket(userId);
          
          // Initialize notifications socket listeners
          setTimeout(() => {
            useNotificationsStore.getState().initSocketListeners(userId);
          }, 1000);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          const { data }: any = await api.post('/auth/register', userData);

          safeSetItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            safeSetItem('refreshToken', data.data.refreshToken);
          }

          // Ensure user object has 'id' field (fallback from '_id' if needed)
          const normalizedUserData = {
            ...data.data.user,
            id: data.data.user.id || data.data.user._id
          };

          set({
            user: normalizedUserData,
            isAuthenticated: true,
            isLoading: false,
          });

          const userId = normalizedUserData.id;
          console.log('Auth Store register: Initializing socket with userId:', userId);
          initSocket(userId);
          initNotificationsSocket(userId);
          
          // Initialize notifications socket listeners
          setTimeout(() => {
            useNotificationsStore.getState().initSocketListeners(userId);
          }, 1000);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          clearAuthData();
          disconnectSocket();
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        try {
          const { data }: any = await api.get('/auth/me');
          
          // Ensure user object has 'id' field (fallback from '_id' if needed)
          const normalizedUserData = {
            ...data.data,
            id: data.data.id || data.data._id
          };
          
          set({
            user: normalizedUserData,
            isAuthenticated: true,
          });
          
          const userId = normalizedUserData.id;
          console.log('Auth Store fetchUser: Initializing socket with userId:', userId);
          initSocket(userId);
          initNotificationsSocket(userId);
          
          // Initialize notifications socket listeners
          setTimeout(() => {
            useNotificationsStore.getState().initSocketListeners(userId);
          }, 1000);
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Auth store rehydration error:', error);
          // Clear corrupted data
          clearAuthData();
        }
      },
    }
  )
);

