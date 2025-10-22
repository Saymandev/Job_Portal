'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Trash2,
    Upload,
    XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface BulkImport {
  _id: string;
  fileName: string;
  originalFileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';
  totalJobs: number;
  processedJobs: number;
  successfulJobs: number;
  failedJobs: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;
  successfulJobIds: string[];
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export default function BulkJobImport() {
  const [imports, setImports] = useState<BulkImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const fetchImports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bulk-import');
      setImports(response.data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch imports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/bulk-import/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast({
        title: 'Success',
        description: 'File uploaded successfully. Processing started.',
      });

      setSelectedFile(null);
      fetchImports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/bulk-import/template/download', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'job-import-template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Template downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  const deleteImport = async (importId: string) => {
    if (!confirm('Are you sure you want to delete this import? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/bulk-import/${importId}`);
      fetchImports();
      toast({
        title: 'Success',
        description: 'Import deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete import',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partially_completed':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partially_completed':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bulk Job Import</h2>
          <p className="text-muted-foreground">
            Upload multiple job postings at once using a CSV file
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-green-500" />
                <p className="text-lg font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-green-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <p className="text-lg font-medium">Drop your CSV file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• Maximum file size: 5MB</p>
            <p>• Only CSV files are supported</p>
            <p>• Download the template to see the required format</p>
          </div>

          {selectedFile && (
            <Button onClick={handleFileUpload} disabled={uploading} className="w-full">
              {uploading ? 'Uploading...' : 'Upload and Process'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Imports Yet</h3>
              <p className="text-muted-foreground">
                Upload your first CSV file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {imports.map((importItem) => (
                <div
                  key={importItem._id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(importItem.status)}
                      <div>
                        <p className="font-medium">{importItem.originalFileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(importItem.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(importItem.status)}>
                        {importItem.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteImport(importItem._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {importItem.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing...</span>
                        <span>
                          {importItem.processedJobs} / {importItem.totalJobs}
                        </span>
                      </div>
                      <Progress
                        value={(importItem.processedJobs / importItem.totalJobs) * 100}
                        className="h-2"
                      />
                    </div>
                  )}

                  {importItem.status === 'completed' && (
                    <div className="text-sm text-green-600">
                      ✅ Successfully imported {importItem.successfulJobs} jobs
                    </div>
                  )}

                  {importItem.status === 'partially_completed' && (
                    <div className="text-sm text-yellow-600">
                      ⚠️ Imported {importItem.successfulJobs} jobs, {importItem.failedJobs} failed
                    </div>
                  )}

                  {importItem.status === 'failed' && (
                    <div className="text-sm text-red-600">
                      ❌ Import failed: {importItem.errorMessage || 'Unknown error'}
                    </div>
                  )}

                  {importItem.errors.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View {importItem.errors.length} error(s)
                      </summary>
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {importItem.errors.map((error, index) => (
                          <div key={index} className="text-red-600">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
