'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJobsStore } from '@/store/jobs-store';
import {
    Briefcase,
    Calendar,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Filter,
    MapPin,
    Search,
    Star,
    TrendingUp,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdvancedSearchProps {
  onSearch: (filters: any) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export default function AdvancedSearch({ onSearch, onReset, isLoading }: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { saveSearchPreferences, loadSearchPreferences } = useJobsStore();
  
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    experienceLevel: '',
    salaryMin: '',
    salaryMax: '',
    company: '',
    skills: '',
    isRemote: '',
    datePosted: '',
    industry: '',
    companySize: '',
    tags: '',
    sortBy: 'relevance'
  });

  // Load saved preferences on mount
  useEffect(() => {
    const savedPreferences = loadSearchPreferences();
    if (savedPreferences && Object.keys(savedPreferences).length > 0) {
      setFilters(prev => ({ ...prev, ...savedPreferences }));
    }
  }, [loadSearchPreferences]);

  const jobTypes = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' }
  ];

  const experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' }
  ];

  const datePostedOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: '3months', label: 'Last 3 Months' }
  ];

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Marketing',
    'Design',
    'Consulting',
    'Non-profit',
    'Real Estate',
    'Transportation',
    'Energy',
    'Media',
    'Sports',
    'Government',
    'Legal',
    'Agriculture'
  ];

  const companySizes = [
    { value: 'startup', label: 'Startup (1-10)' },
    { value: 'small', label: 'Small (11-50)' },
    { value: 'medium', label: 'Medium (51-200)' },
    { value: 'large', label: 'Large (201-1000)' },
    { value: 'enterprise', label: 'Enterprise (1000+)' }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'date', label: 'Most Recent' },
    { value: 'salary', label: 'Highest Salary' },
    { value: 'company', label: 'Company Name' },
    { value: 'title', label: 'Job Title' }
  ];

  const popularTags = [
    'Remote',
    'Startup',
    'High Salary',
    'Equity',
    'Benefits',
    'Flexible Hours',
    'Learning',
    'Growth',
    'Innovation',
    'Diversity',
    'Work-Life Balance',
    'Career Growth'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    );
    
    // Save search preferences
    saveSearchPreferences(cleanFilters);
    
    onSearch(cleanFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      location: '',
      jobType: '',
      experienceLevel: '',
      salaryMin: '',
      salaryMax: '',
      company: '',
      skills: '',
      isRemote: '',
      datePosted: '',
      industry: '',
      companySize: '',
      tags: '',
      sortBy: 'relevance'
    };
    
    setFilters(resetFilters);
    saveSearchPreferences(resetFilters); // Clear saved preferences
    onReset();
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {activeFiltersCount} filters
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
          {/* Quick Filter Buttons */}
          <div className="space-y-2">
            <Label>Quick Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(prev => ({ ...prev, isRemote: 'true', jobType: 'full-time' }));
                }}
              >
                <Star className="h-4 w-4 mr-1" />
                Remote Full-Time
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(prev => ({ ...prev, experienceLevel: 'entry', companySize: 'startup' }));
                }}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Entry Level Startup
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(prev => ({ ...prev, experienceLevel: 'senior', salaryMin: '100000' }));
                }}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                High Salary Senior
              </Button>
            </div>
          </div>

          {/* Basic Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Keywords</Label>
              <Input
                id="search"
                placeholder="Job title, skills, or keywords"
                value={filters.search}
                onChange={(e) => handleInputChange('search', e.target.value)}
                suppressHydrationWarning
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="City, state, or remote"
                  value={filters.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="pl-10"
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>

          {/* Expanded Filters */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Job Type */}
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type</Label>
                  <select
                    id="jobType"
                    value={filters.jobType}
                    onChange={(e) => handleInputChange('jobType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Type</option>
                    {jobTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Level */}
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <select
                    id="experienceLevel"
                    value={filters.experienceLevel}
                    onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Level</option>
                    {experienceLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remote Work */}
                <div className="space-y-2">
                  <Label htmlFor="isRemote">Remote Work</Label>
                  <select
                    id="isRemote"
                    value={filters.isRemote}
                    onChange={(e) => handleInputChange('isRemote', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any</option>
                    <option value="true">Remote Only</option>
                    <option value="false">On-site Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Salary Range */}
                <div className="space-y-2">
                  <Label>Salary Range</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Min salary"
                        value={filters.salaryMin}
                        onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                        className="pl-10"
                        type="number"
                        suppressHydrationWarning
                      />
                    </div>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Max salary"
                        value={filters.salaryMax}
                        onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                        className="pl-10"
                        type="number"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Company name"
                      value={filters.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="pl-10"
                      suppressHydrationWarning
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Skills */}
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., React, Python, AWS"
                    value={filters.skills}
                    onChange={(e) => handleInputChange('skills', e.target.value)}
                    suppressHydrationWarning
                  />
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={filters.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Size */}
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <select
                    id="companySize"
                    value={filters.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any Size</option>
                    {companySizes.map(size => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Popular Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(tag => (
                    <Button
                      key={tag}
                      type="button"
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const currentTags = filters.tags ? filters.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag];
                        handleInputChange('tags', newTags.join(', '));
                      }}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
                {filters.tags && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {filters.tags}
                  </div>
                )}
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <Label htmlFor="sortBy">Sort By</Label>
                <select
                  id="sortBy"
                  value={filters.sortBy}
                  onChange={(e) => handleInputChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Posted */}
              <div className="space-y-2">
                <Label htmlFor="datePosted">Date Posted</Label>
                <div className="flex gap-2">
                  {datePostedOptions.map(option => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={filters.datePosted === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange('datePosted', 
                        filters.datePosted === option.value ? '' : option.value
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search Jobs'}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {activeFiltersCount > 0 && (
                <span>{activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied</span>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
