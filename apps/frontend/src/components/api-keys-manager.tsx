'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { Copy, Key, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ApiKey {
  _id: string;
  keyId: string;
  name: string;
  status: 'active' | 'inactive' | 'revoked';
  lastUsed?: string;
  usageCount: number;
  createdAt: string;
  permissions: string[];
  rateLimitPerHour: number;
}

export default function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<{ keyId: string; apiKey: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const availablePermissions = [
    { id: 'jobs:read', label: 'Read Jobs' },
    { id: 'jobs:write', label: 'Write Jobs' },
    { id: 'jobs:delete', label: 'Delete Jobs' },
    { id: 'applications:read', label: 'Read Applications' },
    { id: 'applications:write', label: 'Write Applications' },
    { id: 'companies:read', label: 'Read Company' },
    { id: 'companies:write', label: 'Write Company' },
    { id: 'analytics:read', label: 'Read Analytics' },
  ];

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api-keys');
      setApiKeys(response.data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch API keys',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/api-keys', {
        name: newKeyName,
        permissions: newKeyPermissions,
      });

      setCreatedKey(response.data.data);
      setNewKeyName('');
      setNewKeyPermissions([]);
      setShowCreateDialog(false);
      fetchApiKeys();

      toast({
        title: 'Success',
        description: 'API key created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create API key',
        variant: 'destructive',
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${keyId}`);
      fetchApiKeys();
      toast({
        title: 'Success',
        description: 'API key revoked successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  const togglePermission = (permissionId: string) => {
    setNewKeyPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'revoked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access to your account
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={createApiKey} className="w-full">
                Create API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {createdKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">API Key Created Successfully</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>API Key (Keep this secure and never share it publicly)</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  value={createdKey.apiKey}
                  readOnly
                  className="font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdKey.apiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
             <div className="text-sm text-amber-600">
               ⚠️ This is the only time you&apos;ll see the full API key. Make sure to copy and store it securely.
             </div>
            <Button onClick={() => setCreatedKey(null)} className="w-full">
              I&apos;ve Saved the API Key
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create your first API key to start using our API
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
            <Card key={apiKey._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{apiKey.name}</h3>
                      <Badge className={getStatusColor(apiKey.status)}>
                        {apiKey.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Key ID: {apiKey.keyId}</p>
                      <p>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                      <p>Usage: {apiKey.usageCount} requests</p>
                      <p>Rate Limit: {apiKey.rateLimitPerHour} requests/hour</p>
                      {apiKey.lastUsed && (
                        <p>Last Used: {new Date(apiKey.lastUsed).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeApiKey(apiKey.keyId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
