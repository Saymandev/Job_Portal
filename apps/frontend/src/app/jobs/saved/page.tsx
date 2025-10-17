'use client';

import { SaveJobButton } from '@/components/save-job-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSavedJobs } from '@/hooks/use-saved-jobs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import {
  Briefcase,
  Building2,
  Clock,
  DollarSign,
  Filter,
  Heart,
  MapPin,
  Search,
  SortAsc,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SavedJobsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { savedJobs, isLoading, fetchSavedJobs } = useSavedJobs();
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'company'>('recent');
  const [filterBy, setFilterBy] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'job_seeker') {
      router.push('/login');
      return;
    }
    fetchSavedJobs();
  }, [isAuthenticated, user, router, fetchSavedJobs]);

  const sortedAndFilteredJobs = savedJobs
    .filter(job => {
      if (filterBy === 'all') return true;
      if (filterBy === 'remote') return job.jobId.location.toLowerCase().includes('remote');
      if (filterBy === 'full-time') return job.jobId.jobType === 'full-time';
      if (filterBy === 'high-salary') return (job.jobId.salaryMin || 0) > 80000;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        case 'title':
          return a.jobId.title.localeCompare(b.jobId.title);
        case 'company':
          return a.jobId.company.name.localeCompare(b.jobId.company.name);
        default:
          return 0;
      }
    });

  if (!isAuthenticated || user?.role !== 'job_seeker') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Saved Jobs</h1>
          <p className="text-lg text-muted-foreground">
            {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {/* Filters and Sort */}
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter:</span>
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'remote', label: 'Remote' },
                      { value: 'full-time', label: 'Full-time' },
                      { value: 'high-salary', label: 'High Salary' },
                    ].map(filter => (
                      <Button
                        key={filter.value}
                        variant={filterBy === filter.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterBy(filter.value)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="title">Job Title</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Jobs List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-muted rounded w-20"></div>
                      <div className="h-6 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedAndFilteredJobs.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No saved jobs yet</h3>
              <p className="text-muted-foreground mb-6">
                Start saving jobs you&apos;re interested in to keep track of them here.
              </p>
              <Button asChild>
                <Link href="/jobs">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedAndFilteredJobs.map((savedJob) => {
              // Skip saved jobs where the job data is missing (deleted jobs)
              if (!savedJob.jobId || typeof savedJob.jobId === 'string') {
                return (
                  <Card key={savedJob._id} className="opacity-50">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 text-muted-foreground">
                            Job No Longer Available
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            This job has been removed or is no longer available.
                          </p>
                        </div>
                        <SaveJobButton jobId={savedJob.jobId} jobTitle="Deleted Job" />
                      </div>
                    </CardHeader>
                  </Card>
                );
              }

              return (
                <Card key={savedJob._id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          <Link 
                            href={`/jobs/${savedJob.jobId._id}`} 
                            className="hover:text-primary transition-colors"
                          >
                            {savedJob.jobId.title}
                          </Link>
                        </CardTitle>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{savedJob.jobId.company?.name || 'Unknown Company'}</span>
                        </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Saved {formatDate(savedJob.savedAt)}
                        </div>
                        {savedJob.viewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Viewed {savedJob.viewCount} time{savedJob.viewCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="secondary">
                        {savedJob.jobId.experienceLevel}
                      </Badge>
                      <SaveJobButton 
                        jobId={savedJob.jobId._id} 
                        jobTitle={savedJob.jobId.title}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{savedJob.jobId.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{savedJob.jobId.jobType}</span>
                    </div>
                    {savedJob.jobId.salaryMin && savedJob.jobId.salaryMax && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatCurrency(savedJob.jobId.salaryMin)} - {formatCurrency(savedJob.jobId.salaryMax)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {savedJob.jobId.skills && savedJob.jobId.skills.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {savedJob.jobId.skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {savedJob.jobId.skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{savedJob.jobId.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <Button asChild variant="outline">
                      <Link href={`/jobs/${savedJob.jobId._id}`}>
                        View Details
                      </Link>
                    </Button>
                    
                    {savedJob.tags && savedJob.tags.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Tags:</span>
                        <div className="flex gap-1">
                          {savedJob.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
