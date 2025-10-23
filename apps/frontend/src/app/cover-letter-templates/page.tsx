'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Check, Edit2, FileText, Plus, Star, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CoverLetterTemplate {
  _id: string;
  name: string;
  content: string;
  isDefault: boolean;
  tags?: string[];
  usageCount: number;
}

export default function CoverLetterTemplatesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isDefault: false,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/cover-letter-templates');
      if ((response.data as any).success) {
        setTemplates((response.data as any).data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'job_seeker') {
      router.push('/login');
      return;
    }
    fetchTemplates();
  }, [isAuthenticated, user, router, fetchTemplates]);

  const handleCreate = async () => {
    if (!formData.name || !formData.content) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/cover-letter-templates', formData);
      if ((response.data as any).success) {
        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
        setFormData({ name: '', content: '', isDefault: false });
        setIsCreating(false);
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (templateId: string) => {
    try {
      const response = await api.put(`/cover-letter-templates/${templateId}`, formData);
      if ((response.data as any).success) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setFormData({ name: '', content: '', isDefault: false });
        setEditingId(null);
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await api.delete(`/cover-letter-templates/${templateId}`);
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (template: CoverLetterTemplate) => {
    setFormData({
      name: template.name,
      content: template.content,
      isDefault: template.isDefault,
    });
    setEditingId(template._id);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setFormData({ name: '', content: '', isDefault: false });
    setEditingId(null);
    setIsCreating(false);
  };

  if (!isAuthenticated || user?.role !== 'job_seeker') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cover Letter Templates</h1>
          <p className="text-lg text-muted-foreground">
            Create and manage reusable cover letter templates
          </p>
        </div>

        {/* Create New Template Button */}
        {!isCreating && !editingId && (
          <Button onClick={() => setIsCreating(true)} className="mb-6">
            <Plus className="h-4 w-4 mr-2" />
            Create New Template
          </Button>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Template' : 'New Template'}</CardTitle>
              <CardDescription>
                {editingId ? 'Update your template' : 'Create a new cover letter template'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Software Engineer Template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Use placeholders like {job_title}, {company_name}, {date}, {year}"
                  className="min-h-[300px]"
                />
                <p className="text-sm text-muted-foreground">
                  Available placeholders: {'{job_title}'}, {'{company_name}'}, {'{date}'}, {'{year}'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Set as default template
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={editingId ? () => handleUpdate(editingId) : handleCreate}>
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">Loading templates...</div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first cover letter template to speed up your job applications
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isDefault && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500" />
                        )}
                      </div>
                      <CardDescription>
                        Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {template.content.substring(0, 300)}
                    {template.content.length > 300 ? '...' : ''}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
