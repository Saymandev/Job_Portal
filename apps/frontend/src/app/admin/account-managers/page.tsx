'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  AlertCircle,
  Building,
  CheckCircle,
  Clock,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Star,
  User,
  UserCheck,
  Users,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AccountManager {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  title: string;
  status: 'active' | 'inactive' | 'busy' | 'away';
  specializations: string[];
  bio?: string;
  profileImage?: string;
  languages: string[];
  lastActiveAt: string;
  workingHours: {
    timezone: string;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  assignedClients: Array<{
    _id: string;
    name: string;
    email: string;
    company: string;
  }>;
  createdAt: string;
}

export default function AccountManagersPage() {
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedManager, setSelectedManager] = useState<AccountManager | null>(null);
  const [showManagerDetails, setShowManagerDetails] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<Array<{_id: string, name: string, email: string, company: string}>>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalManagers, setTotalManagers] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const [managersResponse, usersResponse] = await Promise.all([
        api.get(`/admin/account-managers?${params}`),
        api.get('/admin/users?role=employer&limit=100')
      ]);

      if ((managersResponse.data as any).success) {
        const data = (managersResponse.data as any).data;
        setManagers(data.managers || []);
        setTotalManagers(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }

      if ((usersResponse.data as any).success) {
        setUsers((usersResponse.data as any).data.users || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, currentPage, statusFilter, departmentFilter, searchTerm, limit]);

  const handleAssignManager = async () => {
    if (!selectedManager || !selectedUserId) return;

    try {
      await api.post(`/admin/account-managers/${selectedManager._id}/assign`, { userId: selectedUserId });

      toast({
        title: 'Success',
        description: 'Account manager assigned successfully',
      });

      fetchData();
      setShowAssignModal(false);
      setSelectedUserId('');
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign manager',
        variant: 'destructive',
      });
    }
  };

  const openAssignModal = (manager: AccountManager) => {
    setSelectedManager(manager);
    setShowAssignModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'department') {
      setDepartmentFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'busy':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'away':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'away':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
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

        {/* Tabs Skeleton */}
        <Tabs defaultValue="managers" className="space-y-4">
          <TabsList>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </TabsList>
          
          <TabsContent value="managers" className="space-y-4">
            {/* Filters Skeleton */}
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            
            {/* Managers List Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Account Manager Management</h1>
          <p className="text-muted-foreground">
            Manage account managers and their client assignments
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers.length}</div>
            <p className="text-xs text-muted-foreground">
              {managers.filter(m => m.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(managers.map(m => m.department)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              unique departments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {managers.reduce((sum, m) => sum + (m.assignedClients?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Clients/Manager</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {managers.length > 0 ? (managers.reduce((sum, m) => sum + (m.assignedClients?.length || 0), 0) / managers.length).toFixed(1) : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search managers..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={departmentFilter} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Array.from(new Set(managers.map(m => m.department))).map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Managers List */}
        <Card>
          <CardHeader>
            <CardTitle>Account Managers ({totalManagers})</CardTitle>
            <CardDescription>
              View and manage account manager profiles and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            {managers.map((manager) => (
              <div
                key={manager._id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{manager.name}</h3>
                        <p className="text-sm text-gray-600">
                          {manager.title} • {manager.department}
                        </p>
                      </div>
                      <Badge className={getStatusColor(manager.status)}>
                        {manager.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">
                          <Mail className="h-4 w-4 inline mr-1" />
                          {manager.email}
                        </p>
                        <p className="text-sm text-gray-600">
                          <Phone className="h-4 w-4 inline mr-1" />
                          {manager.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <Users className="h-4 w-4 inline mr-1" />
                          {manager.assignedClients?.length || 0} clients assigned
                        </p>
                        <p className="text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Last active: {new Date(manager.lastActiveAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {manager.specializations?.map((spec, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedManager(manager);
                        setShowManagerDetails(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openAssignModal(manager)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Assign Client
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {managers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No account managers found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalManagers)} of {totalManagers} managers
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

      {/* Assignment Modal */}
      {showAssignModal && selectedManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-card-foreground">Assign Client</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-card-foreground">Account Manager</label>
                  <p className="text-card-foreground">{selectedManager.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedManager.title} • {selectedManager.department}</p>
                </div>
                
                <div>
                  <label className="font-semibold mb-2 block text-card-foreground">Select Client</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(user => !selectedManager.assignedClients?.some(client => client._id === user._id))
                        .map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name} ({user.email}) - {user.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleAssignManager}
                    disabled={!selectedUserId}
                    className="flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Client
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}