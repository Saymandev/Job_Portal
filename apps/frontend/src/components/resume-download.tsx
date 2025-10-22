'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { AlertCircle, CheckCircle, Download, ExternalLink, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ResumeDownloadProps {
  applicationId: string;
  candidateName: string;
  isEnabled: boolean;
  downloadCount?: number;
  downloadLimit?: number;
}

export default function ResumeDownload({ 
  applicationId, 
  candidateName, 
  isEnabled,
  downloadCount = 0,
  downloadLimit = 5
}: ResumeDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!isEnabled) return;
    
    setIsDownloading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await api.get(`/applications/${applicationId}/download-resume`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${candidateName.replace(/\s+/g, '_')}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      toast({
        title: "Download Started",
        description: "Resume download has started successfully!",
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to download resume');
      toast({
        title: "Download Failed",
        description: error.response?.data?.message || 'Failed to download resume',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpgradePlan = () => {
    router.push('/pricing');
    toast({
      title: "Upgrade Required",
      description: "Redirecting to pricing page...",
    });
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Resume Download
            <Badge variant="secondary">Premium Feature</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 mb-4">
            Upgrade your plan to download candidate resumes.
          </p>
          <Button onClick={handleUpgradePlan} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const remainingDownloads = downloadLimit - downloadCount;
  const canDownload = remainingDownloads > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Resume Download
          <Badge variant="default">Active</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download {candidateName}&apos;s resume
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resume downloaded successfully!
          </div>
        )}

        <div className="space-y-4">
          {/* Download Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Downloads remaining</span>
            </div>
            <Badge variant={canDownload ? "default" : "destructive"}>
              {remainingDownloads} / {downloadLimit}
            </Badge>
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            disabled={!canDownload || isDownloading}
            className="w-full"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Resume
              </>
            )}
          </Button>

          {!canDownload && (
            <p className="text-sm text-muted-foreground text-center">
              Download limit reached. Upgrade your plan for unlimited downloads.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
