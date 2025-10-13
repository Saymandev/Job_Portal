'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only check authentication after the store has hydrated
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect to role-specific dashboard
    if (user?.role === 'job_seeker') {
      router.push('/dashboard/job-seeker');
    } else if (user?.role === 'employer') {
      router.push('/employer/dashboard');
    } else if (user?.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, user, router, isHydrated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Redirecting to your dashboard...</div>
    </div>
  );
}

