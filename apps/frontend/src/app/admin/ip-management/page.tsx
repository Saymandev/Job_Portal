'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { AlertTriangle, CheckCircle, Clock, Plus, Search, Shield, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BlockedIp {
  _id: string;
  ipAddress: string;
  blockType: 'manual' | 'automatic' | 'rate_limit' | 'fraud_detection';
  reason: 'spam' | 'fraud' | 'abuse' | 'suspicious_activity' | 'rate_limit_exceeded' | 'multiple_failed_logins' | 'malicious_uploads' | 'admin_decision';
  description?: string;
  blockedBy: string;
  isActive: boolean;
  expiresAt?: string;
  violationCount: number;
  metadata?: {
    userAgent?: string;
    country?: string;
    city?: string;
    isp?: string;
    lastSeen?: string;
    firstSeen?: string;
    relatedUserIds?: string[];
    suspiciousActivities?: string[];
  };
  createdAt: string;
  unblockedAt?: string;
  unblockedBy?: string;
  unblockReason?: string;
}

interface BlockStatistics {
  totalBlocks: number;
  activeBlocks: number;
  expiredBlocks: number;
  blocksByReason: Record<string, number>;
  blocksByType: Record<string, number>;
  recentBlocks: number;
}

interface UserActivity {
  _id: string;
  type: string;
  description: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
  };
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface IpGroup {
  ipAddress: string;
  users: Array<{
    _id: string;
    fullName: string;
    email: string;
    role: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    user: any;
    userAgent: string;
    createdAt: string;
  }>;
  activityCount: number;
  lastActivity: string;
}

interface UserIpData {
  ipAddress: string;
  firstSeen: string;
  lastSeen: string;
  userAgents: string[];
  activityCount: number;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
}

const blockTypeLabels = {
  manual: 'Manual',
  automatic: 'Automatic',
  rate_limit: 'Rate Limit',
  fraud_detection: 'Fraud Detection',
};

const reasonLabels = {
  spam: 'Spam',
  fraud: 'Fraud',
  abuse: 'Abuse',
  suspicious_activity: 'Suspicious Activity',
  rate_limit_exceeded: 'Rate Limit Exceeded',
  multiple_failed_logins: 'Multiple Failed Logins',
  malicious_uploads: 'Malicious Uploads',
  admin_decision: 'Admin Decision',
};

const reasonColors = {
  spam: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  fraud: 'bg-red-500/20 text-red-700 dark:text-red-300',
  abuse: 'bg-red-500/20 text-red-700 dark:text-red-300',
  suspicious_activity: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  rate_limit_exceeded: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  multiple_failed_logins: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  malicious_uploads: 'bg-red-500/20 text-red-700 dark:text-red-300',
  admin_decision: 'bg-muted text-muted-foreground',
};

export default function IpManagementPage() {
  const { user } = useAuthStore();
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [statistics, setStatistics] = useState<BlockStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedIp, setSelectedIp] = useState<BlockedIp | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // New state for user IP tracking
  const [activeTab, setActiveTab] = useState<'blocked' | 'activity' | 'users'>('blocked');
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [ipGroups, setIpGroups] = useState<IpGroup[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userIps, setUserIps] = useState<UserIpData[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Block IP form
  const [blockForm, setBlockForm] = useState({
    ipAddress: '',
    blockType: 'manual' as const,
    reason: 'admin_decision' as const,
    description: '',
    expiresAt: '',
  });

  // Unblock IP form
  const [unblockForm, setUnblockForm] = useState({
    reason: '',
  });

  // Filters
  const [filters, setFilters] = useState({
    isActive: 'all',
    blockType: 'all',
    reason: 'all',
    search: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === 'blocked') {
        fetchBlockedIps();
        fetchStatistics();
      } else if (activeTab === 'activity') {
        fetchRecentActivity();
      }
    }
  }, [user, page, filters, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlockedIps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.isActive !== 'all') {
        params.append('isActive', filters.isActive);
      }
      if (filters.blockType !== 'all') {
        params.append('blockType', filters.blockType);
      }
      if (filters.reason !== 'all') {
        params.append('reason', filters.reason);
      }

      const response = await api.get(`/admin/ip-management/blocked-ips?${params}`);
      if (response.data.success) {
        setBlockedIps(response.data.data.data);
        setTotal(response.data.data.total);
      }
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch blocked IPs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/admin/ip-management/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      console.log('Fetching recent activity...');
      const response = await api.get(`/admin/ip-management/recent-activity?page=1&limit=50`);
      console.log('Recent activity response:', response.data);
      
      if (response.data.success) {
        setRecentActivity(response.data.data.activities || []);
        setIpGroups(response.data.data.ipGroups || []);
        console.log('Recent activity loaded:', {
          activities: response.data.data.activities?.length || 0,
          ipGroups: response.data.data.ipGroups?.length || 0
        });
      } else {
        console.error('API returned unsuccessful response:', response.data);
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to fetch recent activity',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch recent activity',
        variant: 'destructive',
      });
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserIps = async (searchTerm: string) => {
    try {
      console.log('Searching for user IPs with term:', searchTerm);
      
      // First, search for users by name or email
      const usersResponse = await api.get(`/admin/ip-management/search-users?q=${encodeURIComponent(searchTerm)}`);
      console.log('Users search response:', usersResponse.data);
      
      if (!usersResponse.data.success || !usersResponse.data.data?.users?.length) {
        toast({
          title: 'No users found',
          description: 'No users found matching your search term',
          variant: 'destructive',
        });
        setUserIps([]);
        return;
      }
      
      // Use the first matching user
      const user = usersResponse.data.data.users[0];
      console.log('Found user:', user);
      
      // Now get IPs for this user
      const response = await api.get(`/admin/ip-management/user-ips/${user._id}`);
      console.log('User IPs response:', response.data);
      
      if (response.data.success) {
        setUserIps(response.data.data || []);
        console.log('User IPs loaded:', response.data.data?.length || 0);
        
        // Update the search input to show the selected user
        setSelectedUserId(`${user.fullName} (${user.email})`);
      } else {
        console.error('API returned unsuccessful response:', response.data);
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to fetch user IP addresses',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching user IPs:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch user IP addresses',
        variant: 'destructive',
      });
    }
  };

  const handleBlockIp = async () => {
    try {
      const response = await api.post('/admin/ip-management/block', {
        ...blockForm,
        expiresAt: blockForm.expiresAt ? new Date(blockForm.expiresAt).toISOString() : undefined,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setBlockDialogOpen(false);
        setBlockForm({
          ipAddress: '',
          blockType: 'manual',
          reason: 'admin_decision',
          description: '',
          expiresAt: '',
        });
        fetchBlockedIps();
        fetchStatistics();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to block IP',
        variant: 'destructive',
      });
    }
  };

  const handleUnblockIp = async () => {
    if (!selectedIp) return;

    try {
      const response = await api.post('/admin/ip-management/unblock', {
        ipAddress: selectedIp.ipAddress,
        reason: unblockForm.reason,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setUnblockDialogOpen(false);
        setUnblockForm({ reason: '' });
        setSelectedIp(null);
        fetchBlockedIps();
        fetchStatistics();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to unblock IP',
        variant: 'destructive',
      });
    }
  };

  const handleCleanupExpired = async () => {
    try {
      const response = await api.post('/admin/ip-management/cleanup-expired');
      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        fetchBlockedIps();
        fetchStatistics();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to cleanup expired blocks',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatExpiry = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    if (date <= now) return 'Expired';
    return date.toLocaleString();
  };

  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) <= new Date();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
               <p className="text-muted-foreground">You don&apos;t have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            IP Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage blocked IP addresses for fraud prevention
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCleanupExpired} variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Cleanup Expired
          </Button>
          <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Block IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block IP Address</DialogTitle>
                <DialogDescription>
                  Block an IP address to prevent access to the platform
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    value={blockForm.ipAddress}
                    onChange={(e) => setBlockForm({ ...blockForm, ipAddress: e.target.value })}
                    placeholder="192.168.1.1"
                  />
                </div>
                <div>
                  <Label htmlFor="blockType">Block Type</Label>
                  <Select
                    value={blockForm.blockType}
                    onValueChange={(value: any) => setBlockForm({ ...blockForm, blockType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="rate_limit">Rate Limit</SelectItem>
                      <SelectItem value="fraud_detection">Fraud Detection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select
                    value={blockForm.reason}
                    onValueChange={(value: any) => setBlockForm({ ...blockForm, reason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={blockForm.expiresAt}
                    onChange={(e) => setBlockForm({ ...blockForm, expiresAt: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    placeholder="Reason for blocking this IP address"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBlockIp}>Block IP</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('blocked')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'blocked'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Blocked IPs
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Activity
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User IPs
          </button>
        </nav>
      </div>

      {/* Statistics Cards - Only show for blocked tab */}
      {activeTab === 'blocked' && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalBlocks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.activeBlocks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statistics.recentBlocks}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expired Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{statistics.expiredBlocks}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search IP</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search IP address"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={filters.isActive}
                onValueChange={(value) => setFilters({ ...filters, isActive: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="blockType">Block Type</Label>
              <Select
                value={filters.blockType}
                onValueChange={(value) => setFilters({ ...filters, blockType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(blockTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={filters.reason}
                onValueChange={(value) => setFilters({ ...filters, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(reasonLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocked IPs Table */}
      {activeTab === 'blocked' && (
        <Card>
        <CardHeader>
          <CardTitle>Blocked IP Addresses</CardTitle>
          <CardDescription>
            Showing {blockedIps.length} of {total} blocked IPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading blocked IPs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIps
                    .filter(ip => 
                      !filters.search || 
                      ip.ipAddress.toLowerCase().includes(filters.search.toLowerCase())
                    )
                    .map((ip) => (
                    <TableRow key={ip._id}>
                      <TableCell className="font-mono">{ip.ipAddress}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{blockTypeLabels[ip.blockType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={reasonColors[ip.reason]}>
                          {reasonLabels[ip.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ip.isActive ? (
                          <Badge className="bg-red-500/20 text-red-700 dark:text-red-300">
                            <XCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Unblocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{ip.violationCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {ip.expiresAt ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span className={isExpired(ip.expiresAt) ? 'text-red-600' : ''}>
                                {formatExpiry(ip.expiresAt)}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">Never</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(ip.createdAt)}</TableCell>
                      <TableCell>
                        {ip.isActive && (
                           <Dialog open={unblockDialogOpen && selectedIp?._id === ip._id} onOpenChange={(open: boolean) => {
                             setUnblockDialogOpen(open);
                             if (open) setSelectedIp(ip);
                             else setSelectedIp(null);
                           }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Unblock
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Unblock IP Address</DialogTitle>
                                <DialogDescription>
                                  Unblock {ip.ipAddress} to allow access to the platform
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="unblockReason">Reason for Unblocking</Label>
                                  <Textarea
                                    id="unblockReason"
                                    value={unblockForm.reason}
                                    onChange={(e) => setUnblockForm({ reason: e.target.value })}
                                    placeholder="Explain why this IP should be unblocked"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setUnblockDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleUnblockIp}>Unblock IP</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Recent Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity with IP Addresses</CardTitle>
              <CardDescription>
                Monitor user activities and their IP addresses for security analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading recent activity...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ipGroups.map((ipGroup) => (
                    <Card key={ipGroup.ipAddress} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">
                            {ipGroup.ipAddress}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {ipGroup.activityCount} activities
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBlockForm({
                              ...blockForm,
                              ipAddress: ipGroup.ipAddress,
                            });
                            setBlockDialogOpen(true);
                          }}
                        >
                          Block IP
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Users:</strong>{' '}
                          {ipGroup.users.map((user, index) => (
                            <span key={user._id}>
                              {user.fullName} ({user.role})
                              {index < ipGroup.users.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Last Activity:</strong> {formatDate(ipGroup.lastActivity)}
                        </div>
                        <div className="text-sm">
                          <strong>Recent Activities:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {ipGroup.activities.slice(0, 3).map((activity) => (
                              <li key={activity.id} className="text-xs">
                                {activity.description} - {formatDate(activity.createdAt)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {ipGroups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* User IPs Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User IP Address Tracking</CardTitle>
              <CardDescription>
                Search for a user to view their IP address history and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Enter user email or name to search..."
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => selectedUserId && fetchUserIps(selectedUserId)}
                    disabled={!selectedUserId}
                  >
                    Search User IPs
                  </Button>
                </div>
                
                {userIps.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">IP Addresses for User</h3>
                    {userIps.map((userIp) => (
                      <Card key={userIp.ipAddress} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={userIp.isBlocked ? "destructive" : "outline"} 
                              className="font-mono"
                            >
                              {userIp.ipAddress}
                            </Badge>
                            {userIp.isBlocked && (
                              <Badge variant="destructive">
                                BLOCKED ({userIp.blockReason})
                              </Badge>
                            )}
                          </div>
                          {!userIp.isBlocked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBlockForm({
                                  ...blockForm,
                                  ipAddress: userIp.ipAddress,
                                });
                                setBlockDialogOpen(true);
                              }}
                            >
                              Block IP
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>First Seen:</strong> {formatDate(userIp.firstSeen)}
                          </div>
                          <div>
                            <strong>Last Seen:</strong> {formatDate(userIp.lastSeen)}
                          </div>
                          <div>
                            <strong>Activity Count:</strong> {userIp.activityCount}
                          </div>
                          <div>
                            <strong>User Agents:</strong> {userIp.userAgents.length}
                          </div>
                        </div>
                        {userIp.userAgents.length > 0 && (
                          <div className="mt-3">
                            <strong className="text-sm">User Agents:</strong>
                            <div className="mt-1 space-y-1">
                              {userIp.userAgents.slice(0, 2).map((agent, index) => (
                                <div key={index} className="text-xs text-muted-foreground font-mono bg-gray-50 p-2 rounded">
                                  {agent}
                                </div>
                              ))}
                              {userIp.userAgents.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{userIp.userAgents.length - 2} more...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
