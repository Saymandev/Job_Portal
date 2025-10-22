'use client';

import ApiKeysManager from '@/components/api-keys-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ApiKeysSettingsPage() {
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">API Keys Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your API keys for integrating with external systems and automating job postings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Create and manage API keys to access our REST API. Use these keys to integrate with your existing HR systems.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeysManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
