'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const employerSettings = [
    {
      title: 'API Keys',
      description: 'Manage your API keys for system integration',
      href: '/settings/api-keys',
      icon: '🔑'
    },
    {
      title: 'Custom Branding',
      description: 'Customize your company branding and appearance',
      href: '/settings/branding',
      icon: '🎨'
    },
    {
      title: 'Bulk Job Import',
      description: 'Upload multiple jobs via CSV files',
      href: '/settings/bulk-import',
      icon: '📤'
    },
    {
      title: 'Account Manager',
      description: 'View your dedicated account manager',
      href: '/settings/account-manager',
      icon: '👤'
    },
    {
      title: 'Priority Support',
      description: 'Access priority support and create tickets',
      href: '/settings/priority-support',
      icon: '🛡️'
    },
    {
      title: 'Advanced Analytics',
      description: 'AI-powered insights and market trends',
      href: '/settings/advanced-analytics',
      icon: '📊'
    }
  ];

  const generalSettings = [
    {
      title: 'Notifications',
      description: 'Manage your notification preferences',
      href: '/settings/notifications',
      icon: '🔔'
    },
    {
      title: 'Integrations',
      description: 'Connect with external services',
      href: '/settings/integrations',
      icon: '🔗'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        {user?.role === 'employer' && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Enhanced Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {employerSettings.map((setting) => (
                <Card key={setting.href} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{setting.icon}</span>
                      {setting.title}
                    </CardTitle>
                    <CardDescription>{setting.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href={setting.href}
                      className="text-primary hover:underline font-medium"
                    >
                      Open Settings →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {generalSettings.map((setting) => (
              <Card key={setting.href} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{setting.icon}</span>
                    {setting.title}
                  </CardTitle>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={setting.href}
                    className="text-primary hover:underline font-medium"
                  >
                    Open Settings →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
