'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Crown,
  TrendingUp,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string;
  cancelAtPeriodEnd: boolean;
  boostsAvailable: number;
  boostsUsed: number;
  featuredJobsEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  prioritySupportEnabled: boolean;
}

interface BoostStats {
  boostsAvailable: number;
  boostsUsed: number;
  boostsRemaining: number;
  activeBoostedJobs: number;
  boostedJobs: Array<{
    jobId: string;
    title: string;
    expiresAt: string;
  }>;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [boostStats, setBoostStats] = useState<BoostStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    if (user?.role !== 'employer') {
      router.push('/');
      return;
    }
    fetchSubscriptionData();
  }, [isAuthenticated, user, router, isHydrated]);

  const fetchSubscriptionData = async () => {
    try {
      setIsLoading(true);
      const [subResp, boostResp] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/boost-stats'),
      ]);

      if (subResp.data.success) {
        setSubscription(subResp.data.data);
      }
      if (boostResp.data.success) {
        setBoostStats(boostResp.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      if (error.response?.status === 404) {
        // No subscription found - user is on free plan
        setSubscription(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Subscription cancellation removed - users must contact admin

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Professional',
    enterprise: 'Enterprise',
  };

  const currentPlan = subscription?.plan || 'free';
  const boostsUsedPercentage = boostStats 
    ? (boostStats.boostsUsed / boostStats.boostsAvailable) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Subscription</h1>
          <p className="text-lg text-muted-foreground">
            Manage your subscription and view usage details
          </p>
        </div>

        {/* Current Plan */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${currentPlan === 'free' ? 'bg-muted' : 'bg-primary/10'}`}>
                    <Crown className={`h-6 w-6 ${currentPlan === 'free' ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{planNames[currentPlan]} Plan</CardTitle>
                    <CardDescription>
                      {subscription ? (
                        subscription.status === 'active' ? (
                          <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="h-4 w-4" />
                            {subscription.status}
                          </span>
                        )
                      ) : (
                        'No active subscription'
                      )}
                    </CardDescription>
                  </div>
                </div>
                {currentPlan !== 'free' && subscription && (
                  <Badge variant="default" className="text-sm">
                    Premium
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                      <p className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {subscription.endDate && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {subscription.cancelAtPeriodEnd ? 'Ends On' : 'Renews On'}
                        </p>
                        <p className="font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>

                  {subscription.cancelAtPeriodEnd && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="inline h-4 w-4 mr-2" />
                        Your subscription is set to cancel at the end of the billing period.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" asChild>
                      <Link href="/pricing">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Change Plan
                      </Link>
                    </Button>
                  </div>

                  {/* Contact Admin for Cancellation */}
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-medium text-primary">Need to Cancel Your Subscription?</h4>
                        <p className="text-sm text-primary/80 mt-1">
                          To cancel your subscription, please contact our support team. We&apos;ll help you through the process and ensure a smooth transition.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Youre currently on the free plan. Upgrade to unlock premium features!
                  </p>
                  <Button asChild>
                    <Link href="/pricing">
                      View Plans
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Job Boosts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {boostStats?.boostsRemaining || 0}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {boostStats?.boostsUsed || 0} of {boostStats?.boostsAvailable || 0} used
                </p>
                <Progress value={boostsUsedPercentage} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Boosts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {boostStats?.activeBoostedJobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently boosted jobs
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Plan Features</CardTitle>
            <CardDescription>Whats included in your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className={`h-5 w-5 mt-0.5 ${subscription?.featuredJobsEnabled ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-semibold">Featured Job Listings</p>
                  <p className="text-sm text-muted-foreground">
                    Your jobs appear at the top of search results
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className={`h-5 w-5 mt-0.5 ${subscription?.advancedAnalyticsEnabled ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-semibold">Advanced Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Deep insights into job performance and candidates
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className={`h-5 w-5 mt-0.5 ${subscription?.prioritySupportEnabled ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-semibold">Priority Support</p>
                  <p className="text-sm text-muted-foreground">
                    Get help faster with priority customer support
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className={`h-5 w-5 mt-0.5 ${(boostStats?.boostsAvailable || 0) > 0 ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-semibold">Job Boosts ({boostStats?.boostsAvailable || 0}/month)</p>
                  <p className="text-sm text-muted-foreground">
                    Boost your jobs for increased visibility
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Boosted Jobs */}
        {boostStats && boostStats.boostedJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Boosted Jobs</CardTitle>
              <CardDescription>Jobs currently receiving priority placement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {boostStats.boostedJobs.map((job) => (
                  <div key={job.jobId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(job.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/employer/jobs/${job.jobId}`}>
                        View Job
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

