'use client';

import { clearAuthData, safeGetItem } from '@/lib/auth-utils';
import { useAuthStore } from '@/store/auth-store';
import { useCallback, useEffect, useState } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, isAuthenticated, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const token = safeGetItem('accessToken');
      console.log('AuthProvider: initializeAuth', { token: !!token, user: !!user, isAuthenticated });
      
      // If we already have a user and are authenticated, don't do anything
      if (user && isAuthenticated) {
        console.log('AuthProvider: Already authenticated, skipping validation');
        setIsInitialized(true);
        return;
      }
      
      // Only validate token if we have a token but no user data
      if (token && !user) {
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
      } else if (!token) {
        // No token - this is normal for unauthenticated state
        console.log('AuthProvider: No token - normal unauthenticated state');
      }
    } catch (error) {
      console.log('AuthProvider: initializeAuth error', error);
      // Clear potentially corrupted localStorage data
      clearAuthData();
    } finally {
      setIsInitialized(true);
    }
  }, [fetchUser, user, isAuthenticated]);

  useEffect(() => {
    // Only run auth initialization after hydration
    if (!isHydrated) return;

    // If we're already authenticated, don't run initialization
    if (isAuthenticated && user) {
      console.log('AuthProvider: Already authenticated, skipping initialization');
      setIsInitialized(true);
      return;
    }

    initializeAuth();
  }, [isHydrated, initializeAuth, isAuthenticated, user]);

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
