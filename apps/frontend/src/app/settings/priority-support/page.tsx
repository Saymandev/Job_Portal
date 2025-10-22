'use client';

import PrioritySupport from '@/components/priority-support';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PrioritySupportSettingsPage() {
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
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Priority Support</h1>
          </div>
          <p className="text-muted-foreground">
            Get fast, dedicated support with priority response times and direct access to our support team.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Support Center</CardTitle>
            <CardDescription>
              Create support tickets, view your support history, and get help with your account and features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrioritySupport />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
