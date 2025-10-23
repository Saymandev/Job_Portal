'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ArrowRight, CheckCircle, Home } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handleSuccess = async () => {
      if (!sessionId) {
        toast({
          title: 'Error',
          description: 'No session ID found',
          variant: 'destructive',
        });
        router.push('/pricing');
        return;
      }

      try {
        setLoading(true);
        
        // First, ensure user is authenticated
        if (!isAuthenticated) {
          await fetchUser();
        }
        
        // Wait a bit for authentication to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify the session with the backend
        const response = await api.post('/subscriptions/verify-session', {
          sessionId,
        });

        if ((response.data as any).success) {
          setSubscriptionData((response.data as any).data);
          toast({
            title: 'Success!',
            description: 'Your subscription has been activated successfully',
          });
        }
      } catch (error: any) {
        console.error('Session verification error:', error);
        toast({
          title: 'Verification Error',
          description: error.response?.data?.message || 'Failed to verify subscription',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    handleSuccess();
  }, [sessionId, router, toast, isAuthenticated, fetchUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Subscription Activated!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Thank you for subscribing! Your account has been upgraded successfully.
            </p>
            
            {subscriptionData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Subscription Details:</h3>
                <p className="text-sm text-gray-600">
                  Plan: <span className="font-medium">{subscriptionData.plan}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Status: <span className="font-medium text-green-600">Active</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/pricing')}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Pricing
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can manage your subscription in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
