import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useCallback, useEffect, useState } from 'react';

export interface SavedJob {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    company: {
      name: string;
      logo?: string;
      location?: string;
    };
    location: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    experienceLevel: string;
    jobType: string;
    skills: string[];
    status: string;
  };
  tags?: string[];
  notes?: string;
  savedAt: string;
  viewCount: number;
}

export const useSavedJobs = () => {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const fetchSavedJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await api.get('/saved-jobs?limit=100'); // Get all saved jobs
      
      
      if ((response.data as any).success) {
        const jobs = (response.data as any).data;
        
        setSavedJobIds(new Set(jobs.map((sj: SavedJob) => sj.jobId._id)));
      } else {
        console.error('API returned success: false', response.data);
      }
    } catch (error: any) {
      console.error('Error fetching saved jobs:', error);
      console.error('Error response:', error?.response?.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load saved jobs on mount
  useEffect(() => {
    if (isAuthenticated && user?.role === 'job_seeker') {
      fetchSavedJobs();
    }
  }, [isAuthenticated, user, fetchSavedJobs]);

  const saveJob = async (jobId: string, tags?: string[], notes?: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please log in to save jobs',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const payload: any = { jobId };
      if (tags && tags.length > 0) {
        payload.tags = tags;
      }
      if (notes && notes.trim()) {
        payload.notes = notes;
      }
      
      
      const response = await api.post('/saved-jobs', payload);

      if ((response.data as any).success) {
        setSavedJobIds(prev => new Set([...prev, jobId]));
        toast({
          title: 'Job Saved',
          description: 'Job has been saved to your list',
        });
        return true;
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast({
          title: 'Already Saved',
          description: 'This job is already in your saved list',
          variant: 'destructive',
        });
      } else {
        console.error('Save job error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        toast({
          title: 'Error',
          description: error.response?.data?.message || `Failed to save job (${error.response?.status})`,
          variant: 'destructive',
        });
      }
      return false;
    }
    return false;
  };

  const unsaveJob = async (jobId: string) => {
    try {
      await api.delete(`/saved-jobs/${jobId}`);
      setSavedJobIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
      setSavedJobs(prev => prev.filter(sj => sj.jobId._id !== jobId));
      toast({
        title: 'Job Removed',
        description: 'Job has been removed from your saved list',
      });
      return true;
    } catch (error: any) {
      console.error('Unsave job error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove job',
        variant: 'destructive',
      });
      return false;
    }
  };

  const isJobSaved = (jobId: string): boolean => {
    return savedJobIds.has(jobId);
  };

  const getSavedJobStats = async () => {
    try {
      const response = await api.get('/saved-jobs/stats');
      if ((response.data as any).success) {
        return (response.data as any).data;
      }
    } catch (error) {
      console.error('Error fetching saved job stats:', error);
    }
    return null;
  };

  const getRecommendations = async (limit: number = 10) => {
    try {
      const response = await api.get(`/saved-jobs/recommendations?limit=${limit}`);
      if ((response.data as any).success) {
        return (response.data as any).data;
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
    return [];
  };

  return {
    savedJobs,
    isLoading,
    isJobSaved,
    saveJob,
    unsaveJob,
    fetchSavedJobs,
    getSavedJobStats,
    getRecommendations,
  };
};
