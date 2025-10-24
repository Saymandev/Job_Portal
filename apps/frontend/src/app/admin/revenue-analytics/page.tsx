'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { getPlanPrice } from '@/lib/pricing.config';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RevenueStats {
  totalRevenue: number;
  byPlan: Array<{
    _id: string;
    count: number;
  }>;
  activeSubscriptions: number;
}

interface Subscription {
  _id: string;
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

interface RevenueData {
  monthly: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
  yearly: Array<{
    year: string;
    revenue: number;
    subscriptions: number;
  }>;
}

export default function RevenueAnalyticsPage() {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [timeRange, setTimeRange] = useState('monthly');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchRevenueStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/revenue');
      if ((response.data as any).success) {
        setRevenueStats((response.data as any).data);
      }
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch revenue statistics',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(planFilter !== 'all' && { plan: planFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await api.get(`/admin/subscriptions?${params}`);
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setSubscriptions(data.subscriptions || []);
        setTotalSubscriptions(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subscriptions',
        variant: 'destructive',
      });
    }
  }, [toast, currentPage, planFilter, statusFilter, searchTerm, limit]);

  const fetchRevenueData = useCallback(async () => {
    try {
      const response = await api.get('/admin/revenue/charts');
      
      if ((response.data as any).success) {
        setRevenueData((response.data as any).data);
      }
    } catch (error) {
     
      // Set empty data on error
      setRevenueData({ monthly: [], yearly: [] });
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRevenueStats(),
        fetchSubscriptions(),
        fetchRevenueData()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchRevenueStats, fetchSubscriptions, fetchRevenueData]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'plan') {
      setPlanFilter(value);
    } else if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'timeRange') {
      setTimeRange(value);
    }
    setCurrentPage(1);
  };

  const handleViewDetails = (subscription: any) => {
    // Create a modal or navigate to subscription details
    toast({
      title: 'Subscription Details',
      description: `Viewing details for ${subscription.user?.fullName || 'Unknown User'}'s ${subscription.plan} subscription`,
    });
    
    // You can implement a modal here or navigate to a details page
    console.log('Subscription details:', subscription);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pro':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'enterprise':
        return 'bg-gold-100 text-gold-800 border-gold-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Revenue Analytics</h1>
            <p className="text-muted-foreground">Track revenue, subscriptions, and financial performance</p>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Revenue Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan Breakdown Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Subscriptions Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentData = timeRange === 'monthly' ? revenueData?.monthly : revenueData?.yearly;
  
  // Debug logging
  console.log('Revenue data:', revenueData);
  console.log('Current data:', currentData);
  console.log('Time range:', timeRange);
  console.log('Chart condition check:', {
    hasRevenueData: !!revenueData,
    hasCurrentData: !!currentData,
    currentDataLength: currentData?.length || 0,
    shouldRenderChart: !!(revenueData && currentData && currentData.length > 0)
  });
  const previousPeriod = currentData && currentData.length > 1 ? currentData[currentData.length - 2] : null;
  const currentPeriod = currentData && currentData.length > 0 ? currentData[currentData.length - 1] : null;
  const revenueGrowth = previousPeriod && currentPeriod 
    ? calculateGrowthRate(currentPeriod.revenue, previousPeriod.revenue) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">
            Track revenue, subscriptions, and financial performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      {revenueStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueStats.totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {revenueGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(revenueGrowth).toFixed(1)}% from last period
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueStats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {revenueStats.byPlan.reduce((sum, plan) => sum + plan.count, 0)} total across all plans
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(revenueStats.activeSubscriptions > 0 
                  ? revenueStats.totalRevenue / revenueStats.activeSubscriptions 
                  : 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                per active subscription
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueStats.byPlan.length > 0 
                  ? Math.round((revenueStats.byPlan.find(p => p._id === 'pro')?.count || 0) / 
                    revenueStats.byPlan.reduce((sum, plan) => sum + plan.count, 0) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                to Pro/Enterprise plans
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan Distribution */}
      {revenueStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {revenueStats.byPlan.map((plan) => {
            const planRevenue = plan.count * getPlanPrice(plan._id);
            const percentage = revenueStats.byPlan.reduce((sum, p) => sum + p.count, 0) > 0 
              ? (plan.count / revenueStats.byPlan.reduce((sum, p) => sum + p.count, 0)) * 100 
              : 0;

            return (
              <Card key={plan._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">{plan._id} Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{plan.count}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(planRevenue)} revenue
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {percentage.toFixed(1)}% of total
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Revenue and subscription growth over time
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {revenueData && currentData && currentData.length > 0 ? (
              <Bar
                data={{
                  labels: currentData.map(item => 
                    timeRange === 'monthly' 
                      ? (item as any).month?.split(' ')[0] 
                      : (item as any).year
                  ),
                  datasets: [
                    {
                      label: 'Revenue',
                      data: currentData.map(item => item.revenue),
                      backgroundColor: currentData.map(item => 
                        item.revenue > 0 
                          ? 'rgba(59, 130, 246, 0.8)' 
                          : 'rgba(156, 163, 175, 0.3)'
                      ),
                      borderColor: currentData.map(item => 
                        item.revenue > 0 
                          ? 'rgba(59, 130, 246, 1)' 
                          : 'rgba(156, 163, 175, 0.5)'
                      ),
                      borderWidth: 1,
                      borderRadius: 4,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: 'rgba(59, 130, 246, 0.8)',
                      borderWidth: 1,
                      cornerRadius: 8,
                      displayColors: false,
                      callbacks: {
                        title: (context) => {
                          const index = context[0].dataIndex;
                          return timeRange === 'monthly' 
                            ? (currentData[index] as any).month 
                            : (currentData[index] as any).year;
                        },
                        label: (context) => {
                          const index = context.dataIndex;
                          const item = currentData[index];
                          return [
                            `Revenue: $${item.revenue}`,
                            `Subscriptions: ${item.subscriptions}`
                          ];
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        color: '#6b7280',
                        font: {
                          size: 12,
                        },
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                      },
                      ticks: {
                        color: '#6b7280',
                        font: {
                          size: 12,
                        },
                        callback: function(value) {
                          return '$' + value;
                        },
                      },
                    },
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground w-full">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No revenue data available</p>
                  <p className="text-sm mt-2">Revenue data will appear here once subscriptions are created</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            View and manage all subscription details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Plan</label>
              <Select value={planFilter} onValueChange={(value) => handleFilterChange('plan', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={(value) => handleFilterChange('timeRange', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div
                key={subscription._id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {subscription.user?.fullName || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {subscription.user?.email || 'No email'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPlanColor(subscription.plan)}>
                          {subscription.plan}
                        </Badge>
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-medium">
                          {formatCurrency(getPlanPrice(subscription.plan))}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Billing Cycle</p>
                        <p className="font-medium capitalize">Monthly</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="font-medium">
                          {subscription.currentPeriodStart 
                            ? new Date(subscription.currentPeriodStart).toLocaleDateString()
                            : subscription.createdAt 
                            ? new Date(subscription.createdAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">End Date</p>
                        <p className="font-medium">
                          {subscription.currentPeriodEnd 
                            ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(subscription)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {subscriptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No subscriptions found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalSubscriptions)} of {totalSubscriptions} subscriptions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
