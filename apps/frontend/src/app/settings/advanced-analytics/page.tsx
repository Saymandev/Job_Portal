'use client';

import AdvancedAnalytics from '@/components/advanced-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdvancedAnalyticsSettingsPage() {
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
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Get AI-powered insights, market trends, and predictive analytics to optimize your hiring process.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
            <CardDescription>
              View comprehensive analytics, AI insights, and market trends to make data-driven hiring decisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdvancedAnalytics />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
