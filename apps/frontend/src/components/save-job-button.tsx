'use client';

import { Button } from '@/components/ui/button';
import { useSavedJobs } from '@/hooks/use-saved-jobs';
import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SaveJobButtonProps {
  jobId: string;
  jobTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
  className?: string;
}

export function SaveJobButton({ 
  jobId, 
  jobTitle, 
  variant = 'outline', 
  size = 'sm',
  showText = false,
  className = ''
}: SaveJobButtonProps) {
  const { isJobSaved, saveJob, unsaveJob } = useSavedJobs();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleSave = async () => {
    setIsLoading(true);
    
    try {
      if (isJobSaved(jobId)) {
        await unsaveJob(jobId);
      } else {
        await saveJob(jobId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSaved = isJobSaved(jobId);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleSave}
      disabled={isLoading}
      className={`${className} ${isSaved ? 'text-red-500 hover:text-red-600' : ''}`}
      title={isSaved ? 'Remove from saved jobs' : 'Save this job'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart 
          className={`h-4 w-4 ${isSaved ? 'fill-red-500' : ''}`} 
        />
      )}
      {showText && (
        <span className="ml-2">
          {isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </Button>
  );
}
