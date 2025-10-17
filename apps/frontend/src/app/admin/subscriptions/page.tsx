'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Calendar,
  CreditCard,
  Crown,
  DollarSign,
  Edit,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Subscription {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  plan: string;
  status: string;
  jobPostsLimit: number;
  jobPostsUsed: number;
  boostsAvailable: number;
  boostsUsed: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  autoRenew: boolean;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  planBreakdown: {
    free: number;
    basic: number;
    pro: number;
    enterprise: number;
  };
}

export default function AdminSubscriptionManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    planBreakdown: { free: 0, basic: 0, pro: 0, enterprise: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingSubscription, setEditingSubscription] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [subscriptionsResponse, statsResponse] = await Promise.all([
        api.get('/admin/subscriptions/management'),
        api.get('/admin/subscriptions/stats'),
      ]);

      if (subscriptionsResponse.data.success) {
        setSubscriptions(subscriptionsResponse.data.data);
      }
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subscription data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchSubscriptionData();
  }, [isAuthenticated, user, router, fetchSubscriptionData]);

  const updateSubscriptionStatus = async (subscriptionId: string, status: string) => {
    try {
      const response = await api.put(`/admin/subscriptions/${subscriptionId}/status`, { status });
      if (response.data.success) {
        await fetchSubscriptionData();
        toast({
          title: 'Success',
          description: 'Subscription status updated',
        });
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription status',
        variant: 'destructive',
      });
    }
  };

  const updateSubscriptionPlan = async (subscriptionId: string, plan: string) => {
    try {
      const response = await api.put(`/admin/subscriptions/${subscriptionId}/plan`, { plan });
      if (response.data.success) {
        await fetchSubscriptionData();
        toast({
          title: 'Success',
          description: 'Subscription plan updated',
        });
      }
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription plan',
        variant: 'destructive',
      });
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await api.post(`/admin/subscriptions/${subscriptionId}/cancel`);
      if (response.data.success) {
        await fetchSubscriptionData();
        toast({
          title: 'Success',
          description: 'Subscription cancelled',
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free':
        return <Package className="h-4 w-4" />;
      case 'basic':
        return <CreditCard className="h-4 w-4" />;
      case 'pro':
        return <Crown className="h-4 w-4" />;
      case 'enterprise':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-muted text-muted-foreground';
      case 'basic':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'pro':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      case 'enterprise':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'past_due':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Loading subscription data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Subscription Management</h1>
        <p className="text-lg text-muted-foreground">
          Manage user subscriptions and billing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                <p className="text-2xl font-bold">{stats.totalSubscriptions}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelledSubscriptions}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue (Est.)</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(stats.planBreakdown.basic * 29 + stats.planBreakdown.pro * 99 + stats.planBreakdown.enterprise * 299).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Free</p>
                <p className="text-xl font-bold">{stats.planBreakdown.free}</p>
              </div>
              <Package className="h-6 w-6 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Basic</p>
                <p className="text-xl font-bold">{stats.planBreakdown.basic}</p>
              </div>
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pro</p>
                <p className="text-xl font-bold">{stats.planBreakdown.pro}</p>
              </div>
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                <p className="text-xl font-bold">{stats.planBreakdown.enterprise}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-gold-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="plan-filter">Filter by Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions ({filteredSubscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubscriptions.map((subscription) => (
              <div key={subscription._id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold">{subscription.user.fullName}</h3>
                        <p className="text-sm text-muted-foreground">{subscription.user.email}</p>
                      </div>
                      <Badge className={`${getPlanColor(subscription.plan)} flex items-center gap-1`}>
                        {getPlanIcon(subscription.plan)}
                        {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                      </Badge>
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Job Posts</p>
                        <p>{subscription.jobPostsUsed}/{subscription.jobPostsLimit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Boosts</p>
                        <p>{subscription.boostsUsed}/{subscription.boostsAvailable}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto Renew</p>
                        <p>{subscription.autoRenew ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{new Date(subscription.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {subscription.currentPeriodEnd && (
                      <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingSubscription === subscription._id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={subscription.status}
                          onValueChange={(value) => updateSubscriptionStatus(subscription._id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="past_due">Past Due</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={subscription.plan}
                          onValueChange={(value) => updateSubscriptionPlan(subscription._id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSubscription(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSubscription(subscription._id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelSubscription(subscription._id)}
                          disabled={subscription.status === 'cancelled'}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No subscriptions found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
