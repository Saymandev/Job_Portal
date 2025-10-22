'use client';

import { clearAuthData, safeGetItem } from '@/lib/auth-utils';
import { useAuthStore } from '@/store/auth-store';
import { useEffect, useState } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, isAuthenticated, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only run auth initialization after hydration
    if (!isHydrated) return;

    const initializeAuth = async () => {
      try {
        const token = safeGetItem('accessToken');
        console.log('AuthProvider: initializeAuth', { token: !!token, user: !!user, isAuthenticated });
        
        // Only validate token if we have a token but no user data AND we're not already authenticated
        // This prevents unnecessary validation after successful login
        if (token && !user && !isAuthenticated) {
          try {
            console.log('AuthProvider: Attempting to fetch user...');
            await fetchUser();
            console.log('AuthProvider: fetchUser successful');
          } catch (error) {
            console.log('AuthProvider: fetchUser failed', error);
            // Token is invalid, clear auth state
            clearAuthData();
            // The store will be updated by the fetchUser error handler
          }
        }
      } catch (error) {
        console.log('AuthProvider: initializeAuth error', error);
        // Clear potentially corrupted localStorage data
        clearAuthData();
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [fetchUser, user, isAuthenticated, isHydrated]);

  // Prevent hydration mismatch by not rendering anything until client-side hydration is complete
  if (!isHydrated) {
    return null;
  }

  // Show loading state during auth initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
