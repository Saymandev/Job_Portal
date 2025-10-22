'use client';

import BulkJobImport from '@/components/bulk-job-import';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BulkImportSettingsPage() {
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
            <Upload className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Bulk Job Import</h1>
          </div>
          <p className="text-muted-foreground">
            Upload multiple job postings at once using CSV files. Perfect for companies with many open positions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Jobs</CardTitle>
            <CardDescription>
              Upload a CSV file with job data to create multiple job postings at once. Download the template to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkJobImport />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
