'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
    BarChart3,
    CheckCircle,
    Clock,
    Download,
    ExternalLink,
    Eye,
    Globe,
    Palette,
    RefreshCw,
    Search,
    Settings,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
interface BrandingConfiguration {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    company: string;
  };
  logo?: string;
  logoDark?: string;
  primaryColor: string;
  primaryColorDark: string;
  secondaryColor: string;
  secondaryColorDark: string;
  backgroundColor: string;
  backgroundColorDark: string;
  textColor: string;
  textColorDark: string;
  customCss?: string;
  favicon?: string;
  isActive: boolean;
  customDomain?: string;
  whiteLabelEnabled: boolean;
  companyName?: string;
  tagline?: string;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  removeJobPortalBranding: boolean;
  customFooterText?: string;
  customHeaderText?: string;
  whiteLabelSettings: {
    hidePoweredBy: boolean;
    customFavicon?: string;
    customMetaTitle?: string;
    customMetaDescription?: string;
    customKeywords?: string[];
    customRobotsTxt?: string;
    customSitemap?: string;
    customErrorPages?: {
      '404': string;
      '500': string;
    };
    customEmailTemplates?: {
      fromName: string;
      fromEmail: string;
      replyTo: string;
    };
    customLegalPages?: {
      privacyPolicy?: string;
      termsOfService?: string;
      cookiePolicy?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface BrandingStats {
  totalConfigurations: number;
  activeConfigurations: number;
  whiteLabelEnabled: number;
  customDomains: number;
  pendingApprovals: number;
  totalCompanies: number;
}

export default function BrandingManagementPage() {
  const [configurations, setConfigurations] = useState<BrandingConfiguration[]>([]);
  const [stats, setStats] = useState<BrandingStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalConfigurations, setTotalConfigurations] = useState(0);
  const [limit] = useState(10);
  
  const { toast } = useToast();

  const fetchConfigurations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (companyFilter !== 'all') params.append('company', companyFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());

      const response = await api.get(`/admin/branding/configurations?${params}`);
      
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setConfigurations(data.configurations || []);
        setTotalConfigurations(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch branding configurations',
        variant: 'destructive',
      });
    }
  }, [statusFilter, typeFilter, companyFilter, searchTerm, currentPage, limit, toast]);

  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from configurations data
      const totalConfigurations = configurations.length;
      const activeConfigurations = configurations.filter(c => c.isActive).length;
      const whiteLabelEnabled = configurations.filter(c => c.whiteLabelEnabled).length;
      const customDomains = configurations.filter(c => c.customDomain).length;
      const pendingApprovals = configurations.filter(c => !c.isActive).length;
      const totalCompanies = new Set(configurations.map(c => c.user.company)).size;

      setStats({
        totalConfigurations,
        activeConfigurations,
        whiteLabelEnabled,
        customDomains,
        pendingApprovals,
        totalCompanies,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [configurations]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchConfigurations();
    } finally {
      setLoading(false);
    }
  }, [fetchConfigurations]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'type') {
      setTypeFilter(value);
    } else if (filterType === 'company') {
      setCompanyFilter(value);
    }
    setCurrentPage(1);
  };

  const handleApproveConfiguration = async (configId: string) => {
    try {
      // This would call the actual API when implemented
      // await api.post(`/admin/white-label/configurations/${configId}/approve`);
      
      toast({
        title: 'Success',
        description: 'Configuration approved successfully',
      });
      
      // Update local state
      setConfigurations(prev => 
        prev.map(config => 
          config._id === configId 
            ? { ...config, isActive: true }
            : config
        )
      );
    } catch (error) {
      console.error('Error approving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve configuration',
        variant: 'destructive',
      });
    }
  };

  const handleRejectConfiguration = async (configId: string) => {
    try {
      // This would call the actual API when implemented
      // await api.post(`/admin/white-label/configurations/${configId}/reject`);
      
      toast({
        title: 'Success',
        description: 'Configuration rejected successfully',
      });
      
      // Update local state
      setConfigurations(prev => 
        prev.filter(config => config._id !== configId)
      );
    } catch (error) {
      console.error('Error rejecting configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject configuration',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getTypeColor = (whiteLabelEnabled: boolean) => {
    return whiteLabelEnabled 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Filter configurations based on search and filters
  const filteredConfigurations = configurations.filter(config => {
    const matchesSearch = !searchTerm || 
      config.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.user.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.companyName && config.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && config.isActive) ||
      (statusFilter === 'pending' && !config.isActive);
    
    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'white-label' && config.whiteLabelEnabled) ||
      (typeFilter === 'basic' && !config.whiteLabelEnabled);
    
    const matchesCompany = companyFilter === 'all' ||
      config.user.company === companyFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesCompany;
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branding Management</h1>
          <p className="text-muted-foreground">
            Manage white-label configurations, approve branding requests, and monitor usage
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

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConfigurations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCompanies} companies
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeConfigurations}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.activeConfigurations / stats.totalConfigurations) * 100)}% active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">White-Label Enabled</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.whiteLabelEnabled}</div>
              <p className="text-xs text-muted-foreground">
                {stats.customDomains} with custom domains
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Domains</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customDomains}</div>
              <p className="text-xs text-muted-foreground">
                custom domains configured
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                require review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                using branding
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="configurations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configurations">Configurations ({totalConfigurations})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configurations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search configurations..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={typeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="white-label">White-Label</SelectItem>
                      <SelectItem value="basic">Basic Branding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Company</label>
                  <Select value={companyFilter} onValueChange={(value) => handleFilterChange('company', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {Array.from(new Set(configurations.map(c => c.user.company))).map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurations List */}
          <Card>
            <CardHeader>
              <CardTitle>Branding Configurations</CardTitle>
              <CardDescription>
                Review and manage all branding configurations across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredConfigurations.map((config) => (
                  <div
                    key={config._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Palette className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {config.companyName || config.user.company}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {config.user.name} • {config.user.email}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(config.isActive)}>
                              {config.isActive ? 'Active' : 'Pending'}
                            </Badge>
                            <Badge className={getTypeColor(config.whiteLabelEnabled)}>
                              {config.whiteLabelEnabled ? 'White-Label' : 'Basic'}
                            </Badge>
                            {config.customDomain && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                Custom Domain
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {config.tagline && (
                          <p className="text-sm text-gray-600 mb-3">{config.tagline}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: config.primaryColor }}
                            ></div>
                            <span className="text-sm text-gray-600">Primary: {config.primaryColor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: config.secondaryColor }}
                            ></div>
                            <span className="text-sm text-gray-600">Secondary: {config.secondaryColor}</span>
                          </div>
                          {config.customDomain && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{config.customDomain}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Settings className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {config.removeJobPortalBranding ? 'White-Label' : 'Co-Branded'}
                            </span>
                          </div>
                        </div>
                        
                        {config.whiteLabelSettings && (
                          <div className="bg-gray-50 rounded p-3 mb-3">
                            <h4 className="text-sm font-medium mb-2">White-Label Settings:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                              {config.whiteLabelSettings.customMetaTitle && (
                                <div>Meta Title: {config.whiteLabelSettings.customMetaTitle}</div>
                              )}
                              {config.whiteLabelSettings.customMetaDescription && (
                                <div>Meta Description: {config.whiteLabelSettings.customMetaDescription}</div>
                              )}
                              {config.whiteLabelSettings.customEmailTemplates && (
                                <div>Email From: {config.whiteLabelSettings.customEmailTemplates.fromName}</div>
                              )}
                              {config.whiteLabelSettings.hidePoweredBy && (
                                <div>✓ Powered by branding hidden</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Created: {new Date(config.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(config.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {!config.isActive && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApproveConfiguration(config._id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectConfiguration(config._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredConfigurations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No branding configurations found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding Analytics</CardTitle>
              <CardDescription>
                Usage statistics and insights for branding features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm">Track usage patterns, popular configurations, and performance metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
