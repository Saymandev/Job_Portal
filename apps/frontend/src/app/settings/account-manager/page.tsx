'use client';

import DedicatedAccountManager from '@/components/dedicated-account-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountManagerSettingsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Dedicated Account Manager</h1>
          </div>
          <p className="text-muted-foreground">
            Get personalized support with a dedicated account manager who understands your hiring needs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Manager</CardTitle>
            <CardDescription>
              View your assigned account manager and track your interactions and support history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DedicatedAccountManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
