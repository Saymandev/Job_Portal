'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  ArrowRight,
  BarChart3,
  Building,
  Check,
  Code,
  Crown,
  DollarSign,
  Download,
  Headphones,
  MessageSquare,
  Mic,
  Rocket,
  Search,
  Sparkles,
  Star,
  Target,
  User,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Base features that all plans include
const baseFeatures = [
  { text: 'Email support', icon: MessageSquare },
  { text: 'Job board listing', icon: null },
];

// Features for each plan tier (only unique features per plan)
const planFeatures = {
  free: [
    { text: '5 job postings per month', icon: null },
    { text: 'Basic analytics dashboard', icon: BarChart3 },
    { text: '30-day job duration', icon: null },
  ],
  basic: [
    { text: '25 job postings per month', icon: null },
    { text: '2 job boosts per month', icon: Star },
    { text: 'Enhanced analytics', icon: BarChart3 },
    { text: '60-day job duration', icon: null },
    { text: 'Featured job priority', icon: Star },
  ],
  pro: [
    { text: '100 job postings per month', icon: null },
    { text: '5 job boosts per month', icon: Star },
    { text: '90-day job duration', icon: null },
    { text: 'API access', icon: Code },
    { text: 'Custom branding', icon: Building },
    { text: 'Bulk job import', icon: Download },
    { text: 'Priority support', icon: Headphones },
    { text: 'Advanced analytics', icon: BarChart3 },
  ],
  enterprise: [
    { text: 'Unlimited job postings', icon: null },
    { text: '10 job boosts per month', icon: Star },
    { text: 'Custom job duration', icon: null },
    { text: 'Priority application processing', icon: Target },
    { text: 'Enhanced candidate matching', icon: Search },
    { text: 'Application analytics dashboard', icon: BarChart3 },
    { text: 'Unlimited resume downloads', icon: Download },
    { text: 'Featured company profile', icon: Building },
    { text: 'Salary insights & market data', icon: DollarSign },
    { text: 'Interview preparation tools', icon: Mic },
    { text: 'Dedicated account manager', icon: User },
    { text: 'White-label options', icon: Sparkles },
  ],
};

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'forever',
    icon: Zap,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    buttonStyle: 'outline',
    features: [...baseFeatures, ...planFeatures.free],
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
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    buttonStyle: 'default',
    popular: false,
    features: [...baseFeatures, ...planFeatures.basic],
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
    bgColor: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    borderColor: 'border-purple-300',
    buttonStyle: 'default',
    popular: true,
    features: [...baseFeatures, ...planFeatures.pro],
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
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
    borderColor: 'border-amber-300',
    buttonStyle: 'default',
    popular: false,
    features: [...baseFeatures, ...planFeatures.enterprise],
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your hiring needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                  plan.popular ? `border-2 ${plan.borderColor} shadow-2xl ${plan.bgColor} ring-2 ring-purple-200` : 
                  currentSubscription && currentSubscription.plan === plan.id ? 'border-2 border-green-500 dark:border-green-400 shadow-xl bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200' : 
                  `border ${plan.borderColor} ${plan.bgColor} hover:shadow-lg`
                }`}
              >
                {/* Badge Container */}
                <div className="absolute -top-3 left-0 right-0 flex justify-center items-center gap-2 z-10">
                  {plan.popular && (
                    <Badge className="px-4 py-1 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
                      Most Popular
                    </Badge>
                  )}
                  {currentSubscription && currentSubscription.plan === plan.id && (
                    <Badge className="px-4 py-1 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
                      Current Plan
                    </Badge>
                  )}
                </div>
                <CardHeader className="pt-10 pb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-xl ${plan.bgColor} shadow-sm`}>
                      <Icon className={`h-7 w-7 ${plan.color}`} />
                    </div>
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  </div>
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      <span className="text-lg text-muted-foreground">/{plan.interval}</span>
                    </div>
                    {plan.price > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Billed {plan.interval === 'month' ? 'monthly' : 'annually'}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-8">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => {
                        const FeatureIcon = feature.icon;
                        return (
                          <li key={index} className="flex items-start gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                              <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                              {FeatureIcon && (
                                <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground leading-relaxed">
                              {feature.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <Button
                    className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
                        : plan.buttonStyle === 'outline'
                          ? 'border-2 hover:bg-slate-50'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg'
                    }`}
                    variant={plan.buttonStyle === 'outline' ? 'outline' : 'default'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan === plan.id || isLoadingSubscription}
                  >
                    {loadingPlan === plan.id 
                      ? 'Loading...' 
                      : currentSubscription && currentSubscription.plan === plan.id 
                        ? 'Current Plan' 
                        : plan.price === 0
                          ? 'Get Started Free'
                          : `Get Started - $${plan.price}/${plan.interval}`
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>


        {/* FAQ or Additional Info */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about our pricing and features
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="group hover:shadow-lg transition-all duration-300 border-slate-100 hover:border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  What are job boosts?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Job boosts make your job posting appear at the top of search results for 7 days, 
                  increasing visibility and attracting more qualified candidates.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-slate-100 hover:border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-green-500" />
                  Can I cancel anytime?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can cancel your subscription at any time. You&apos;ll continue to have access 
                  until the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-slate-100 hover:border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  What happens to my jobs if I downgrade?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your existing jobs remain active. However, you&apos;ll be limited to your new plan&apos;s 
                  posting limit for new jobs.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-slate-100 hover:border-slate-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Do you offer refunds?
                </CardTitle>
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
