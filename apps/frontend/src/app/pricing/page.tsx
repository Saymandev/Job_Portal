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

// Additional features for each plan tier
const planFeatures = {
  free: [
    { text: '5 job postings per month', icon: null },
    { text: 'Basic analytics dashboard', icon: BarChart3 },
    { text: '30-day job duration', icon: null },
  ],
  basic: [
    { text: '25 job postings per month', icon: null },
    { text: '3 job boosts per month', icon: Star },
    { text: 'Enhanced analytics', icon: BarChart3 },
    { text: '60-day job duration', icon: null },
    { text: 'Featured job priority', icon: Star },
    { text: 'Priority application processing', icon: Target },
    { text: 'Enhanced candidate matching', icon: Search },
    { text: 'Application analytics dashboard', icon: BarChart3 },
    { text: 'Unlimited resume downloads', icon: Download },
  ],
  pro: [
    { text: '100 job postings per month', icon: null },
    { text: '10 job boosts per month', icon: Star },
    { text: 'Featured job listings', icon: Star },
    { text: '90-day job duration', icon: null },
    { text: 'Priority job visibility', icon: Star },
    { text: 'Direct candidate messaging', icon: MessageSquare },
    { text: 'Featured company profile', icon: Building },
    { text: 'Salary insights & market data', icon: DollarSign },
    { text: 'Interview preparation tools', icon: Mic },
  ],
  enterprise: [
    { text: 'Unlimited job postings', icon: null },
    { text: 'Unlimited job boosts', icon: Star },
    { text: 'Always featured listings', icon: Star },
    { text: 'Custom job duration', icon: null },
    { text: 'Custom branding (Coming Soon)', icon: Building, comingSoon: true },
    { text: 'API access (Coming Soon)', icon: Code, comingSoon: true },
    { text: 'Dedicated account manager (Coming Soon)', icon: User, comingSoon: true },
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
    features: [...baseFeatures, ...planFeatures.basic, ...planFeatures.pro],
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
    features: [...baseFeatures, ...planFeatures.basic, ...planFeatures.pro, ...planFeatures.enterprise],
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  plan.popular ? `border-2 ${plan.borderColor} shadow-xl ${plan.bgColor}` : 
                  currentSubscription && currentSubscription.plan === plan.id ? 'border-2 border-green-500 dark:border-green-400 shadow-lg bg-green-50 dark:bg-green-900/20' : 
                  `border ${plan.borderColor} ${plan.bgColor}`
                }`}
              >
                {/* Badge Container */}
                <div className="absolute -top-4 left-0 right-0 flex justify-center items-center gap-2">
                  {plan.popular && (
                    <Badge className="px-4 py-1 text-sm bg-purple-500 dark:bg-purple-600 text-white">Most Popular</Badge>
                  )}
                  {currentSubscription && currentSubscription.plan === plan.id && (
                    <Badge className="px-4 py-1 text-sm bg-green-50 dark:bg-green-900/200 text-white">Current Plan</Badge>
                  )}
                </div>
                <CardHeader className="pt-8">
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
                  <div className="space-y-4 mb-6">
                    {/* Base Features */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Core Features
                      </h4>
                      <ul className="space-y-2">
                        {baseFeatures.map((feature, index) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <li key={index} className="flex items-start gap-3">
                              <div className="flex items-center gap-2 shrink-0">
                                <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                                {FeatureIcon && (
                                  <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">{feature.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Plan-specific features */}
                    {plan.id === 'free' && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Free Plan
                        </h4>
                        <ul className="space-y-2">
                          {planFeatures.free.map((feature, index) => {
                            const FeatureIcon = feature.icon;
                            return (
                              <li key={index} className="flex items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                                  {FeatureIcon && (
                                    <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{feature.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {plan.id === 'basic' && (
                      <div>
                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                          Basic Plan
                        </h4>
                        <ul className="space-y-2">
                          {planFeatures.basic.map((feature, index) => {
                            const FeatureIcon = feature.icon;
                            return (
                              <li key={index} className="flex items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                                  {FeatureIcon && (
                                    <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{feature.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {plan.id === 'pro' && (
                      <div>
                        <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                          + Professional Features
                        </h4>
                        <ul className="space-y-2">
                          {planFeatures.pro.map((feature, index) => {
                            const FeatureIcon = feature.icon;
                            return (
                              <li key={index} className="flex items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                                  {FeatureIcon && (
                                    <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{feature.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {plan.id === 'enterprise' && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                          + Enterprise Features
                        </h4>
                        <ul className="space-y-2">
                          {planFeatures.enterprise.map((feature, index) => {
                            const FeatureIcon = feature.icon;
                            return (
                              <li key={index} className="flex items-start gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  {feature.comingSoon ? (
                                    <div className="h-4 w-4 rounded-full bg-orange-100 flex items-center justify-center">
                                      <span className="text-xs text-orange-600 font-bold">!</span>
                                    </div>
                                  ) : (
                                    <Check className="h-4 w-4 text-green-500 dark:text-green-400 mt-0.5" />
                                  )}
                                  {FeatureIcon && (
                                    <FeatureIcon className={`h-4 w-4 ${feature.comingSoon ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                  )}
                                </div>
                                <span className={`text-sm ${feature.comingSoon ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                  {feature.text}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    className={`w-full ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' : ''}`}
                    variant={plan.buttonStyle === 'outline' ? 'outline' : 'default'}
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
        <div className="mt-20 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Rocket className="h-8 w-8 text-purple-600" />
              <h2 className="text-4xl font-bold">Coming Soon</h2>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Exciting new features in development to enhance your hiring experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="group hover:shadow-lg transition-all duration-300 border-purple-100 hover:border-purple-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Code className="h-5 w-5 text-purple-600" />
                  </div>
                <CardTitle className="text-lg">API Access</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  REST API for integrating with your existing HR systems and workflows.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-blue-100 hover:border-blue-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                <CardTitle className="text-lg">Company Branding</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Custom logos, colors, and branding on your job listings and company page.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-green-100 hover:border-green-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <Download className="h-5 w-5 text-green-600" />
                  </div>
                <CardTitle className="text-lg">Bulk Job Import</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Upload multiple job postings via CSV file for faster hiring processes.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-orange-100 hover:border-orange-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <MessageSquare className="h-5 w-5 text-orange-600" />
                  </div>
                <CardTitle className="text-lg">Priority Support</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dedicated support channels with faster response times for premium users.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-indigo-100 hover:border-indigo-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                <CardTitle className="text-lg">Advanced Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI-powered insights, market trends, and candidate demographic analytics.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-amber-100 hover:border-amber-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                <CardTitle className="text-lg">White-label Options</CardTitle>
                </div>
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
