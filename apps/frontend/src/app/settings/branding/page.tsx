'use client';

import BrandingManager from '@/components/branding-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BrandingSettingsPage() {
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
            <Palette className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Custom Branding</h1>
          </div>
          <p className="text-muted-foreground">
            Customize your company&apos;s appearance on job listings and create a unique brand experience.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branding Settings</CardTitle>
            <CardDescription>
              Upload your logo, set brand colors, and customize the appearance of your job postings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandingManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
