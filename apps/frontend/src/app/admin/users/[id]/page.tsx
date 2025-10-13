'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
    ArrowLeft,
    Ban,
    CheckCircle,
    Copy,
    Edit,
    ExternalLink,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    ShieldCheck,
    ShieldX,
    Trash2,
    User,
    UserCheck,
    UserX,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

interface UserDetail {
  _id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'job_seeker' | 'employer';
  isActive: boolean;
  isEmailVerified: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
  company?: {
    _id: string;
    name: string;
  };
}

interface UserActivity {
  _id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserDetail>>({});

  const fetchUserDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/users/${resolvedParams.id}`);
      setUser(data.data);
      setEditedUser(data.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id, toast]);

  const fetchUserActivities = useCallback(async () => {
    try {
      const { data } = await api.get(`/admin/users/${resolvedParams.id}/activities`);
      setUserActivities(data.data || []);
    } catch (error) {
      console.error('Error fetching user activities:', error);
      // Don't show error toast for activities as it's not critical
    }
  }, [resolvedParams.id]);

  const updateUser = async () => {
    try {
      const { data } = await api.put(`/users/${resolvedParams.id}`, editedUser);
      setUser(data.data);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const toggleUserStatus = async () => {
    if (!user) return;
    
    try {
      const { data } = await api.put(`/users/${user._id}`, {
        isActive: !user.isActive
      });
      setUser(data.data);
      toast({
        title: 'Success',
        description: `User ${user.isActive ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(`Message from Job Portal Admin`);
    const body = encodeURIComponent(`Hello ${user?.fullName},\n\nThis is a message from the Job Portal administration team.\n\nBest regards,\nAdmin Team`);
    window.open(`mailto:${user?.email}?subject=${subject}&body=${body}`);
  };

  const viewPublicProfile = () => {
    window.open(`/candidates/${user?._id}`, '_blank');
  };

  const copyUserInfo = () => {
    const userInfo = `Name: ${user?.fullName}\nEmail: ${user?.email}\nPhone: ${user?.phone || 'N/A'}\nRole: ${user?.role}\nStatus: ${user?.isActive ? 'Active' : 'Inactive'}`;
    navigator.clipboard.writeText(userInfo);
    toast({
      title: 'Copied',
      description: 'User information copied to clipboard',
    });
  };

  const deleteUser = async () => {
    if (!user || !confirm(`Are you sure you want to delete ${user.fullName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/users/${user._id}`);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const toggleEmailVerification = async () => {
    if (!user) return;
    
    try {
      const { data } = await api.put(`/users/${user._id}`, {
        isEmailVerified: !user.isEmailVerified
      });
      setUser(data.data);
      toast({
        title: 'Success',
        description: `Email verification ${user.isEmailVerified ? 'removed' : 'added'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling email verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email verification status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/login');
      return;
    }
    
    fetchUserDetails();
    fetchUserActivities();
  }, [resolvedParams.id, isAuthenticated, currentUser, router, fetchUserDetails, fetchUserActivities]);

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'destructive',
      employer: 'default',
      job_seeker: 'secondary',
    } as const;
    
    return (
      <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
        {role.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <User className="h-4 w-4 text-green-600" />;
      case 'user_login':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'job_posted':
        return <Edit className="h-4 w-4 text-purple-600" />;
      case 'application_submitted':
        return <CheckCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{user.fullName}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getRoleBadge(user.role)}
          {user.isActive ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <UserCheck className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive">
              <UserX className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
          {user.isEmailVerified ? (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline">
              <ShieldX className="h-3 w-3 mr-1" />
              Unverified
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={editedUser.fullName || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedUser.email || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editedUser.phone || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editedUser.location || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editedUser.bio || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={editedUser.role || user.role}
                      onValueChange={(value) => setEditedUser({ ...editedUser, role: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="job_seeker">Job Seeker</SelectItem>
                        <SelectItem value="employer">Employer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={updateUser}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{user.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{user.phone}</p>
                        </div>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium">{user.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {user.bio && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Bio</p>
                      <p className="text-gray-800">{user.bio}</p>
                    </div>
                  )}
                  {user.company && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Company</p>
                      <p className="font-medium">{user.company.name}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {userActivities.length > 0 ? (
                <div className="space-y-3">
                  {userActivities.slice(0, 10).map((activity) => (
                    <div key={activity._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Status</span>
                <Button
                  variant={user.isActive ? 'destructive' : 'default'}
                  size="sm"
                  onClick={toggleUserStatus}
                >
                  {user.isActive ? (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Verified</span>
                <Badge variant={user.isEmailVerified ? 'default' : 'outline'}>
                  {user.isEmailVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Member Since</span>
                <span className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.lastLoginAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Login</span>
                  <span className="text-sm text-gray-600">
                    {new Date(user.lastLoginAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

           {/* Quick Actions */}
           <Card>
             <CardHeader>
               <CardTitle>Quick Actions</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               <Button variant="outline" className="w-full justify-start" onClick={sendEmail}>
                 <Mail className="h-4 w-4 mr-2" />
                 Send Email
               </Button>
               <Button variant="outline" className="w-full justify-start" onClick={viewPublicProfile}>
                 <ExternalLink className="h-4 w-4 mr-2" />
                 View Public Profile
               </Button>
               <Button variant="outline" className="w-full justify-start" onClick={copyUserInfo}>
                 <Copy className="h-4 w-4 mr-2" />
                 Copy User Info
               </Button>
               <Button 
                 variant="outline" 
                 className="w-full justify-start" 
                 onClick={toggleEmailVerification}
               >
                 {user.isEmailVerified ? (
                   <>
                     <ShieldX className="h-4 w-4 mr-2" />
                     Remove Verification
                   </>
                 ) : (
                   <>
                     <ShieldCheck className="h-4 w-4 mr-2" />
                     Verify Email
                   </>
                 )}
               </Button>
               <Button 
                 variant="destructive" 
                 className="w-full justify-start" 
                 onClick={deleteUser}
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Delete User
               </Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
