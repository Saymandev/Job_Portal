'use client';

import { Skeleton } from '@/components/ui/skeleton';
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
      // AuthProvider: initializeAuth
      
      // If we already have a user and are authenticated, don't do anything
      if (user && isAuthenticated) {
        // AuthProvider: Already authenticated, skipping validation
        setIsInitialized(true);
        return;
      }
      
      // Only validate token if we have a token but no user data
      if (token && !user) {
        try {
          // AuthProvider: Attempting to fetch user
          await fetchUser();
          // AuthProvider: fetchUser successful
        } catch (error) {
          // AuthProvider: fetchUser failed
          // Token is invalid, clear auth state
          clearAuthData();
          // The store will be updated by the fetchUser error handler
        }
      } else if (!token) {
        // AuthProvider: No token - normal unauthenticated state
      }
    } catch (error) {
      // AuthProvider: initializeAuth error
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
      // AuthProvider: Already authenticated, skipping initialization
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
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
