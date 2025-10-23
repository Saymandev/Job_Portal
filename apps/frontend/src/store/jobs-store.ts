import api from '@/lib/api';
import { create } from 'zustand';

// Transform frontend filters to backend format
const transformFiltersForBackend = (filters: any) => {
  const transformed: any = {};
  
  // Direct mappings
  if (filters.search) transformed.search = filters.search;
  if (filters.location) transformed.location = filters.location;
  if (filters.jobType) transformed.jobType = filters.jobType;
  if (filters.experienceLevel) transformed.experienceLevel = filters.experienceLevel;
  if (filters.companySize) transformed.companySize = filters.companySize;
  if (filters.sortBy) transformed.sortBy = filters.sortBy;
  
  // Field name transformations
  if (filters.salaryMin) transformed.minSalary = Number(filters.salaryMin);
  if (filters.salaryMax) transformed.maxSalary = Number(filters.salaryMax);
  
  // Boolean transformations
  if (filters.isRemote !== '' && filters.isRemote !== undefined) {
    transformed.isRemote = filters.isRemote === 'true' || filters.isRemote === true;
  }
  
  // Array transformations
  if (filters.skills && filters.skills.trim()) {
    transformed.skills = filters.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  
  if (filters.tags && filters.tags.trim()) {
    transformed.tags = filters.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  
  return transformed;
};

interface Job {
  _id: string;
  title: string;
  description: string;
  company: any;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  createdAt: string;
}

interface JobsState {
  jobs: Job[];
  selectedJob: Job | null;
  isLoading: boolean;
  filters: {
    search?: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    company?: string;
    skills?: string;
    isRemote?: boolean;
    datePosted?: string;
    industry?: string;
    companySize?: string;
    tags?: string;
    sortBy?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchJobs: (filters?: any) => Promise<void>;
  fetchJobById: (id: string) => Promise<void>;
  setFilters: (filters: any) => void;
  setPage: (page: number) => void;
  saveSearchPreferences: (preferences: any) => void;
  loadSearchPreferences: () => any;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  selectedJob: null,
  isLoading: false,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  fetchJobs: async (customFilters = {}) => {
    try {
      set({ isLoading: true });
      const { filters, pagination } = get();
      
      // Transform custom filters if provided
      const transformedCustomFilters = customFilters && Object.keys(customFilters).length > 0 
        ? transformFiltersForBackend(customFilters) 
        : {};
      
      const params = {
        ...filters,
        ...transformedCustomFilters,
        page: pagination.page,
        limit: pagination.limit,
      };

      const { data } = await api.get('/jobs', { params });

      set({
        jobs: (data as any).data,
        pagination: (data as any).meta,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      set({ isLoading: false });
    }
  },

  fetchJobById: async (id) => {
    try {
      set({ isLoading: true });
      const { data } = await api.get(`/jobs/${id}`);
      set({ selectedJob: (data as any).data, isLoading: false });
    } catch (error) {
      console.error('Error fetching job:', error);
      set({ isLoading: false });
    }
  },

  setFilters: (newFilters) => {
    // Transform frontend filters to backend format
    const transformedFilters = transformFiltersForBackend(newFilters);
    
    set((state) => ({
      filters: Object.keys(transformedFilters).length === 0 ? {} : transformedFilters,
      pagination: { ...state.pagination, page: 1 },
    }));
    get().fetchJobs();
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
    get().fetchJobs();
  },

  saveSearchPreferences: (preferences) => {
    localStorage.setItem('jobSearchPreferences', JSON.stringify(preferences));
  },

  loadSearchPreferences: () => {
    const saved = localStorage.getItem('jobSearchPreferences');
    return saved ? JSON.parse(saved) : {};
  },
}));

