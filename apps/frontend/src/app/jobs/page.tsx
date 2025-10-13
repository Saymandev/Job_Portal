'use client';

import AdvancedSearch from '@/components/advanced-search';
import { JobCardSkeleton } from '@/components/loading-skeleton';
import { SaveJobButton } from '@/components/save-job-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useJobsStore } from '@/store/jobs-store';
import { Briefcase, Building2, Clock, DollarSign, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function JobsPage() {
  const { jobs, isLoading, fetchJobs, setFilters, pagination, setPage } = useJobsStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAdvancedSearch = (filters: any) => {
    setFilters(filters);
  };

  const handleResetSearch = () => {
    setFilters({});
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Find Your Next Opportunity</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Discover thousands of job opportunities from top companies
          </p>
          
          {/* Advanced Search */}
          <AdvancedSearch 
            onSearch={handleAdvancedSearch}
            onReset={handleResetSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {isLoading ? 'Searching...' : `${pagination.total} Jobs Found`}
            </h2>
            {pagination.total > 0 && (
              <Badge variant="outline">
                Page {pagination.page} of {pagination.totalPages}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </Button>
          </div>
        </div>

        {/* Jobs List/Grid */}
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'grid gap-6'
        }>
          {isLoading ? (
            <>
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
              {viewMode === 'grid' && (
                <>
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                  <JobCardSkeleton />
                </>
              )}
            </>
          ) : jobs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or browse all available jobs.
                </p>
                <Button onClick={handleResetSearch} variant="outline">
                  Clear Filters
                </Button>
              </div>
            </div>
          ) : (
            jobs.map((job) => (
              <Card key={job._id} className="hover:shadow-lg transition-all duration-200 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 line-clamp-2">
                        <Link href={`/jobs/${job._id}`} className="hover:text-primary transition-colors">
                          {job.title}
                        </Link>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">{job.company?.name || 'Company Name'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="secondary">
                        {job.experienceLevel || 'Any Level'}
                      </Badge>
                      <SaveJobButton 
                        jobId={job._id} 
                        jobTitle={job.title}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Job Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span className="capitalize">{job.jobType?.replace('-', ' ')}</span>
                      </div>
                      {job.salaryMin && job.salaryMax && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(job.createdAt)}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.slice(0, viewMode === 'grid' ? 3 : 5).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > (viewMode === 'grid' ? 3 : 5) && (
                          <Badge variant="outline" className="text-xs">
                            +{job.skills.length - (viewMode === 'grid' ? 3 : 5)} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Job Description Preview */}
                    {viewMode === 'list' && job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-between items-center pt-2">
                      <Link href={`/jobs/${job._id}`}>
                        <Button className="w-full">
                          View Details
                        </Button>
                      </Link>
                      {viewMode === 'list' && (
                        <Button variant="ghost" size="sm">
                          <Users className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Enhanced Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col items-center gap-4 mt-12 pt-8 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPage(pagination.page - 1)}
              >
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} jobs
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

