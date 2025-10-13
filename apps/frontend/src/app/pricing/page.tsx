'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Check, Crown, Rocket, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'forever',
    icon: Zap,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    features: [
      '5 job postings per month',
      'Basic analytics dashboard',
      'Email support',
      'Job board listing',
      '30-day job duration',
    ],
    limits: {
      jobPosts: 5,
      boosts: 0,
      featuredJobs: false,
      advancedAnalytics: false,
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 49,
    interval: 'month',
    icon: Rocket,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    popular: false,
    features: [
      '25 job postings per month',
      '3 job boosts per month',
      'Enhanced analytics',
      'Email support',
      '60-day job duration',
      'Featured job priority',
    ],
    limits: {
      jobPosts: 25,
      boosts: 3,
      featuredJobs: false,
      advancedAnalytics: true,
    },
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 149,
    interval: 'month',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    popular: true,
    features: [
      '100 job postings per month',
      '10 job boosts per month',
      'Featured job listings',
      'Enhanced analytics & insights',
      'Email support',
      '90-day job duration',
      'Priority job visibility',
    ],
    limits: {
      jobPosts: 100,
      boosts: 10,
      featuredJobs: true,
      advancedAnalytics: true,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    interval: 'month',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    popular: false,
    features: [
      '1000 job postings per month',
      '50 job boosts per month',
      'Always featured listings',
      'Enhanced analytics & insights',
      'Email support',
      '90-day job duration',
      'Priority job visibility',
      'Custom job duration',
    ],
    limits: {
      jobPosts: 1000,
      boosts: 50,
      featuredJobs: true,
      advancedAnalytics: true,
    },
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  // Fetch current subscription when component loads
  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      if (!isAuthenticated || user?.role !== 'employer') {
        return;
      }

      try {
        setIsLoadingSubscription(true);
        const response = await api.get('/subscriptions/current');
        
        if (response.data.success) {
          setCurrentSubscription(response.data.data);
        }
      } catch (error: any) {
        // If no subscription found (404), user is on free plan
        if (error.response?.status === 404) {
          setCurrentSubscription({ plan: 'free' });
        }
        console.error('Error fetching subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchCurrentSubscription();
  }, [isAuthenticated, user]);

  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (user?.role !== 'employer') {
      toast({
        title: 'Employer Only',
        description: 'Subscription plans are only available for employers',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is already on this plan
    if (currentSubscription && currentSubscription.plan === planId) {
      const planName = plans.find(p => p.id === planId)?.name || 'this plan';
      toast({
        title: `Already on ${planName}`,
        description: `You are currently on the ${planName.toLowerCase()} plan`,
      });
      return;
    }

    try {
      setLoadingPlan(planId);
      const response = await api.post('/subscriptions/checkout', { plan: planId });
      
      if (response.data.success && response.data.data.url) {
        window.location.href = response.data.data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your hiring needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-2 border-primary shadow-xl' : 
                  currentSubscription && currentSubscription.plan === plan.id ? 'border-2 border-green-500 shadow-lg bg-green-50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="px-4 py-1 text-sm">Most Popular</Badge>
                  </div>
                )}
                {currentSubscription && currentSubscription.plan === plan.id && (
                  <div className="absolute -top-4 right-4">
                    <Badge className="px-4 py-1 text-sm bg-green-500 text-white">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                      <Icon className={`h-6 w-6 ${plan.color}`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan === plan.id || isLoadingSubscription}
                  >
                    {loadingPlan === plan.id 
                      ? 'Loading...' 
                      : currentSubscription && currentSubscription.plan === plan.id 
                        ? 'Current Plan' 
                        : 'Get Started'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coming Soon Features */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">🚀 Coming Soon</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  REST API for integrating with your existing HR systems and workflows.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Branding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Custom logos, colors, and branding on your job listings and company page.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Job Import</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Upload multiple job postings via CSV file for faster hiring processes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Priority Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dedicated support channels with faster response times for premium users.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI-powered insights, market trends, and candidate demographic analytics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">White-label Options</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Fully customizable job board with your domain and branding for Enterprise clients.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are job boosts?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Job boosts make your job posting appear at the top of search results for 7 days, 
                  increasing visibility and attracting more qualified candidates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time. You&apos;ll continue to have access 
                  until the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens to my jobs if I downgrade?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your existing jobs remain active. However, you&apos;ll be limited to your new plan&apos;s 
                  posting limit for new jobs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We offer a 14-day money-back guarantee for all paid plans. Contact our support 
                  team for assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
