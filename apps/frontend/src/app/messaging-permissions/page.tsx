'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMessagingPermissionsStore } from '@/store/messaging-permissions-store';
import {
  Check,
  Clock,
  MessageSquare,
  Plus,
  Shield,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MessagingPermissionsPage() {
  const {
    myRequests,
    receivedRequests,
    activePermissions,
    stats,
    isLoading,
    error,
    fetchMyRequests,
    fetchReceivedRequests,
    fetchActivePermissions,
    fetchStats,
    requestPermission,
    respondToRequest,
    revokePermission,
    blockUser,
    unblockUser,
    clearError,
  } = useMessagingPermissionsStore();

  const [activeTab, setActiveTab] = useState<'requests' | 'received' | 'active'>('requests');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    targetUser: '',
    message: '',
    expiresInDays: 7,
  });

  useEffect(() => {
    fetchMyRequests();
    fetchReceivedRequests();
    fetchActivePermissions();
    fetchStats();
  }, [fetchMyRequests, fetchReceivedRequests, fetchActivePermissions, fetchStats]);

  const handleRequestPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.targetUser.trim()) return;

    await requestPermission({
      targetUser: requestForm.targetUser.trim(),
      message: requestForm.message.trim() || undefined,
      expiresInDays: requestForm.expiresInDays,
    });

    if (!error) {
      setRequestForm({ targetUser: '', message: '', expiresInDays: 7 });
      setShowRequestForm(false);
    }
  };

  const handleRespondToRequest = async (
    permissionId: string,
    status: 'approved' | 'rejected' | 'blocked',
    responseMessage?: string,
  ) => {
    await respondToRequest(permissionId, status, responseMessage);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Rejected</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" />Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Messaging Permissions</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Messaging Permissions</h1>
        </div>
        <Button onClick={() => setShowRequestForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Permission
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Received Requests</p>
                  <p className="text-2xl font-bold">{stats.receivedRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Permissions</p>
                  <p className="text-2xl font-bold">{stats.activePermissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Blocked Users</p>
                  <p className="text-2xl font-bold">{stats.blockedUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Permission Form */}
      {showRequestForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Request Messaging Permission</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestPermission} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetUser">User Email or ID</Label>
                <Input
                  id="targetUser"
                  placeholder="Enter user email or ID"
                  value={requestForm.targetUser}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, targetUser: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Explain why you want to message this user..."
                  value={requestForm.message}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresInDays">Expires In (Days)</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  min="1"
                  max="30"
                  value={requestForm.expiresInDays}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) }))}
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={!requestForm.targetUser.trim()}>
                  Send Request
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowRequestForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'requests' ? 'default' : 'outline'}
          onClick={() => setActiveTab('requests')}
        >
          My Requests ({myRequests.length})
        </Button>
        <Button
          variant={activeTab === 'received' ? 'default' : 'outline'}
          onClick={() => setActiveTab('received')}
        >
          Received ({receivedRequests.length})
        </Button>
        <Button
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
        >
          Active ({activePermissions.length})
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'requests' && (
          <>
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No permission requests</h3>
                  <p className="text-gray-500">You haven&apos;t sent any messaging permission requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request._id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.targetUser.avatar} />
                          <AvatarFallback>
                            {request.targetUser.fullName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.targetUser.fullName}</h3>
                          <p className="text-sm text-gray-600">{request.targetUser.email}</p>
                          <p className="text-xs text-gray-500 capitalize">{request.targetUser.role.replace('_', ' ')}</p>
                          {request.message && (
                            <p className="text-sm text-gray-700 mt-1">&ldquo;{request.message}&rdquo;</p>
                          )}
                          {request.responseMessage && (
                            <p className="text-sm text-blue-700 mt-1 italic">Response: &ldquo;{request.responseMessage}&rdquo;</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'approved' && request.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokePermission(request._id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Requested: {formatDate(request.createdAt)}
                      {request.expiresAt && (
                        <span className="ml-4">Expires: {formatDate(request.expiresAt)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === 'received' && (
          <>
            {receivedRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No received requests</h3>
                  <p className="text-gray-500">You haven&apos;t received any messaging permission requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              receivedRequests.map((request) => (
                <Card key={request._id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user.avatar} />
                          <AvatarFallback>
                            {request.user.fullName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.user.fullName}</h3>
                          <p className="text-sm text-gray-600">{request.user.email}</p>
                          <p className="text-xs text-gray-500 capitalize">{request.user.role.replace('_', ' ')}</p>
                          {request.message && (
                            <p className="text-sm text-gray-700 mt-1">&ldquo;{request.message}&rdquo;</p>
                          )}
                          {request.relatedJob && (
                            <p className="text-xs text-blue-600 mt-1">
                              Related to: {request.relatedJob.title} at {request.relatedJob.company.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRespondToRequest(request._id, 'approved')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRespondToRequest(request._id, 'rejected')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondToRequest(request._id, 'blocked')}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Block
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Received: {formatDate(request.createdAt)}
                      {request.expiresAt && (
                        <span className="ml-4">Expires: {formatDate(request.expiresAt)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === 'active' && (
          <>
            {activePermissions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No active permissions</h3>
                  <p className="text-gray-500">You don&apos;t have any active messaging permissions yet.</p>
                </CardContent>
              </Card>
            ) : (
              activePermissions.map((permission) => {
                const otherUser = permission.user._id !== permission.targetUser._id 
                  ? permission.targetUser 
                  : permission.user;
                
                return (
                  <Card key={permission._id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherUser.avatar} />
                            <AvatarFallback>
                              {otherUser.fullName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{otherUser.fullName}</h3>
                            <p className="text-sm text-gray-600">{otherUser.email}</p>
                            <p className="text-xs text-gray-500 capitalize">{otherUser.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Active
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokePermission(permission._id)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Permission granted: {formatDate(permission.updatedAt)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
