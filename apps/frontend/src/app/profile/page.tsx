'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Award,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Link,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Enhanced schema for comprehensive CV builder
const cvSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    professionalTitle: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    linkedinUrl: z.string().url().optional().or(z.literal('')),
    githubUrl: z.string().url().optional().or(z.literal('')),
  }),
  skills: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    category: z.string(),
  })),
  experience: z.array(z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean(),
    description: z.string(),
    achievements: z.array(z.string()),
  })),
  education: z.array(z.object({
    id: z.string(),
    degree: z.string(),
    institution: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean(),
    gpa: z.string().optional(),
    description: z.string().optional(),
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    expiryDate: z.string().optional(),
    credentialId: z.string().optional(),
    url: z.string().url().optional().or(z.literal('')),
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().url().optional().or(z.literal('')),
    githubUrl: z.string().url().optional().or(z.literal('')),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })),
  languages: z.array(z.object({
    id: z.string(),
    language: z.string(),
    proficiency: z.enum(['basic', 'conversational', 'professional', 'native']),
  })),
});

type CVFormData = z.infer<typeof cvSchema>;

interface CVData extends CVFormData {
  resume?: {
    filename: string;
    url: string;
    uploadedAt: string;
  };
}

export default function CVBuilderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, updateUser, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeSection, setActiveSection] = useState('personal');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    skills: false,
    experience: false,
    education: false,
    certifications: false,
    projects: false,
    languages: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CVFormData>({
    resolver: zodResolver(cvSchema),
    defaultValues: {
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        bio: '',
        professionalTitle: '',
        website: '',
        linkedinUrl: '',
        githubUrl: '',
      },
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      languages: [],
    },
  });

  const fetchCVData = useCallback(async () => {
    try {
      console.log('Attempting to fetch CV data from API...');
      const response = await api.get('/users/cv');
      if (response.data.success) {
        const data = response.data.data;
        console.log('CV data fetched successfully from API:', data);
        setCvData(data);
        reset(data);
        return; // Success, exit early
      }
    } catch (error: any) {
      console.error('Error fetching CV data from API:', error);
      console.log('Falling back to user data...');
    }
    
    // Fallback to user data if API fails
    if (user) {
      console.log('Using fallback user data:', user);
      const userData: CVFormData = {
        personalInfo: {
          fullName: user.fullName || '',
          email: user.email || '',
          phone: (user as any)?.phone || '',
          location: (user as any)?.location || '',
          bio: (user as any)?.bio || '',
          professionalTitle: (user as any)?.professionalTitle || '',
          website: (user as any)?.website || '',
          linkedinUrl: (user as any)?.linkedinUrl || '',
          githubUrl: (user as any)?.githubUrl || '',
        },
        skills: Array.isArray((user as any)?.skills) ? (user as any).skills.map((skill: string, index: number) => ({
          id: `skill-${index}`,
          name: skill,
          level: 'intermediate' as const,
          category: 'Technical',
        })) : [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        languages: [],
      };
      
      // Try to get resume data from user object - check multiple possible fields
      const resumeData = (user as any)?.resumeFile || (user as any)?.resume;
      console.log('Resume data found in user:', resumeData);
      
      if (resumeData) {
        if (typeof resumeData === 'string') {
          // Old format - just a URL string
          const resumeInfo = {
            filename: resumeData.split('/').pop() || 'resume.pdf',
            url: resumeData,
            uploadedAt: new Date().toISOString(),
          };
          console.log('Using string resume data:', resumeInfo);
          setCvData({ ...userData, resume: resumeInfo });
        } else {
          // New format - object with filename, url, uploadedAt
          console.log('Using object resume data:', resumeData);
          setCvData({ ...userData, resume: resumeData });
        }
      } else {
        console.log('No resume data found in user object');
        setCvData(userData);
      }
      
      reset(userData);
      
      toast({
        title: 'Profile Loaded',
        description: 'Loaded profile data from user information.',
        variant: 'default',
      });
    }
  }, [user, reset, toast]);

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      console.log('Auth initialization:', { token: !!token, isAuthenticated, user: !!user });
      
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      // If we have a token but no user data, try to fetch user
      if (!user && token) {
        try {
          console.log('Fetching user data...');
          await fetchUser();
        } catch (error) {
          console.error('Failed to fetch user:', error);
          router.push('/login');
          return;
        }
      }

      setIsInitializing(false);
    };

    initializeAuth();
  }, [router, user, fetchUser]);

  // Load CV data once authenticated
  useEffect(() => {
    if (!isInitializing && isAuthenticated && user) {
      fetchCVData();
    }
  }, [isInitializing, isAuthenticated, user, fetchCVData]);

  const onSubmit = async (data: CVFormData) => {
    try {
      setIsLoading(true);
      const response = await api.put('/users/cv', data);
      setCvData(response.data.data);
      updateUser(response.data.data);
      
      toast({
        title: 'Success!',
        description: 'CV updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update CV',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, DOC, or DOCX file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploadingResume(true);
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const response = await api.post('/users/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      console.log('Upload response:', response.data);
      
      // Update CV data with the new resume
      const newResumeData = response.data.data;
      setCvData(prev => prev ? { ...prev, resume: newResumeData } : { 
        personalInfo: { fullName: '', email: '', phone: '', location: '', bio: '', professionalTitle: '', website: '', linkedinUrl: '', githubUrl: '' },
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        languages: [],
        resume: newResumeData 
      });
      
      toast({
        title: 'Success!',
        description: 'Resume uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload resume',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addArrayItem = (field: keyof CVFormData, item: any) => {
    const currentItems = (watch(field) as any[]) || [];
    setValue(field, [...currentItems, item] as any);
  };

  const removeArrayItem = (field: keyof CVFormData, index: number) => {
    const currentItems = (watch(field) as any[]) || [];
    setValue(field, currentItems.filter((_: any, i: number) => i !== index) as any);
  };

  const updateArrayItem = (field: keyof CVFormData, index: number, updates: any) => {
    const currentItems = (watch(field) as any[]) || [];
    const updatedItems = currentItems.map((item: any, i: number) => 
      i === index ? { ...item, ...updates } : item
    );
    setValue(field, updatedItems as any);
  };

  const calculateProfileCompletion = () => {
    if (!cvData || !cvData.personalInfo) return 0;
    
    let completed = 0;
    let total = 0;

    // Personal info (weight: 20%)
    const personalFields = ['fullName', 'email', 'phone', 'location', 'bio', 'professionalTitle'];
    personalFields.forEach(field => {
      total += 1;
      if (cvData.personalInfo[field as keyof typeof cvData.personalInfo]) completed += 1;
    });

    // Skills (weight: 15%)
    total += 1;
    if (cvData.skills && Array.isArray(cvData.skills) && cvData.skills.length > 0) completed += 1;

    // Experience (weight: 25%)
    total += 1;
    if (cvData.experience && Array.isArray(cvData.experience) && cvData.experience.length > 0) completed += 1;

    // Education (weight: 15%)
    total += 1;
    if (cvData.education && Array.isArray(cvData.education) && cvData.education.length > 0) completed += 1;

    // Resume (weight: 25%)
    total += 1;
    if (cvData.resume) completed += 1;

    return Math.round((completed / total) * 100);
  };

  if (isInitializing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>

          {/* Resume Upload Card Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full max-w-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Completion Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Form Sections Skeleton */}
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">CV Builder</h1>
            <p className="text-gray-600 mt-2">Create a professional profile that stands out</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600">Profile Completion</div>
              <div className="text-2xl font-bold text-blue-600">{profileCompletion}%</div>
            </div>
            <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save CV
            </Button>
          </div>
        </div>

        {/* Profile Completion Bar */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Complete Your Profile</h3>
                <p className="text-blue-700">A complete profile gets 3x more views from employers</p>
              </div>
              <div className="w-64">
                <div className="flex justify-between text-sm text-blue-900 mb-1">
                  <span>Progress</span>
                  <span>{profileCompletion}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload Card - Always Visible */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Resume/CV</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload your latest resume (PDF, DOC, or DOCX format, max 10MB). This helps employers see your complete professional profile.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <Input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      className="cursor-pointer"
                    />
                  </div>
                  {isUploadingResume && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  )}
                </div>
                {cvData?.resume && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{cvData.resume.filename}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(cvData.resume.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const resumeUrl = cvData.resume?.url?.startsWith('http') 
                            ? cvData.resume.url 
                            : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${cvData.resume?.url}`;
                          window.open(resumeUrl, '_blank');
                        }}
                        type="button"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const resumeUrl = cvData.resume?.url?.startsWith('http') 
                            ? cvData.resume.url 
                            : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${cvData.resume?.url}`;
                          const link = document.createElement('a');
                          link.href = resumeUrl;
                          link.download = cvData.resume?.filename || 'resume';
                          link.click();
                        }}
                        type="button"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('personal')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                {expandedSections.personal ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            {expandedSections.personal && (
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.fullName">Full Name *</Label>
                    <Input 
                      id="personalInfo.fullName" 
                      {...register('personalInfo.fullName')}
                      placeholder="John Doe"
                    />
                    {errors.personalInfo?.fullName && (
                      <p className="text-sm text-red-500">{errors.personalInfo.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.email">Email *</Label>
                    <Input 
                      id="personalInfo.email" 
                      type="email"
                      {...register('personalInfo.email')}
                      placeholder="john@example.com"
                    />
                    {errors.personalInfo?.email && (
                      <p className="text-sm text-red-500">{errors.personalInfo.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.phone">Phone</Label>
                    <Input 
                      id="personalInfo.phone" 
                      {...register('personalInfo.phone')}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.location">Location</Label>
                    <Input 
                      id="personalInfo.location" 
                      {...register('personalInfo.location')}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="personalInfo.professionalTitle">Professional Title</Label>
                    <Input 
                      id="personalInfo.professionalTitle" 
                      {...register('personalInfo.professionalTitle')}
                      placeholder="Senior Software Engineer"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="personalInfo.bio">Professional Summary</Label>
                    <Textarea 
                      id="personalInfo.bio" 
                      {...register('personalInfo.bio')}
                      placeholder="Brief description of your professional background and goals..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.website">Website</Label>
                    <Input 
                      id="personalInfo.website" 
                      {...register('personalInfo.website')}
                      placeholder="https://johndoe.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.linkedinUrl">LinkedIn</Label>
                    <Input 
                      id="personalInfo.linkedinUrl" 
                      {...register('personalInfo.linkedinUrl')}
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personalInfo.githubUrl">GitHub</Label>
                    <Input 
                      id="personalInfo.githubUrl" 
                      {...register('personalInfo.githubUrl')}
                      placeholder="https://github.com/johndoe"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Resume Upload</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    Your resume can be uploaded in the prominent card above for better visibility to employers.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('skills')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Skills
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('skills')?.length || 0}</Badge>
                  {expandedSections.skills ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.skills && (
              <CardContent>
                <SkillsSection 
                  skills={watch('skills') || []}
                  onAdd={(skill) => addArrayItem('skills', skill)}
                  onRemove={(index) => removeArrayItem('skills', index)}
                  onUpdate={(index, updates) => updateArrayItem('skills', index, updates)}
                />
              </CardContent>
            )}
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('experience')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Work Experience
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('experience')?.length || 0}</Badge>
                  {expandedSections.experience ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.experience && (
              <CardContent>
                <ExperienceSection 
                  experience={watch('experience') || []}
                  onAdd={(exp) => addArrayItem('experience', exp)}
                  onRemove={(index) => removeArrayItem('experience', index)}
                  onUpdate={(index, updates) => updateArrayItem('experience', index, updates)}
                />
              </CardContent>
            )}
          </Card>

          {/* Education */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('education')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('education')?.length || 0}</Badge>
                  {expandedSections.education ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.education && (
              <CardContent>
                <EducationSection 
                  education={watch('education') || []}
                  onAdd={(edu) => addArrayItem('education', edu)}
                  onRemove={(index) => removeArrayItem('education', index)}
                  onUpdate={(index, updates) => updateArrayItem('education', index, updates)}
                />
              </CardContent>
            )}
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('certifications')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certifications
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('certifications')?.length || 0}</Badge>
                  {expandedSections.certifications ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.certifications && (
              <CardContent>
                <CertificationsSection 
                  certifications={watch('certifications') || []}
                  onAdd={(cert) => addArrayItem('certifications', cert)}
                  onRemove={(index) => removeArrayItem('certifications', index)}
                  onUpdate={(index, updates) => updateArrayItem('certifications', index, updates)}
                />
              </CardContent>
            )}
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('projects')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Projects
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('projects')?.length || 0}</Badge>
                  {expandedSections.projects ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.projects && (
              <CardContent>
                <ProjectsSection 
                  projects={watch('projects') || []}
                  onAdd={(project) => addArrayItem('projects', project)}
                  onRemove={(index) => removeArrayItem('projects', index)}
                  onUpdate={(index, updates) => updateArrayItem('projects', index, updates)}
                />
              </CardContent>
            )}
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleSection('languages')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Languages
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{watch('languages')?.length || 0}</Badge>
                  {expandedSections.languages ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CardHeader>
            {expandedSections.languages && (
              <CardContent>
                <LanguagesSection 
                  languages={watch('languages') || []}
                  onAdd={(language) => addArrayItem('languages', language)}
                  onRemove={(index) => removeArrayItem('languages', index)}
                  onUpdate={(index, updates) => updateArrayItem('languages', index, updates)}
                />
              </CardContent>
            )}
          </Card>
        </form>
      </div>
    </div>
  );
}

// Skills Section Component
function SkillsSection({ skills, onAdd, onRemove, onUpdate }: {
  skills: CVFormData['skills'];
  onAdd: (skill: CVFormData['skills'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['skills'][0]>) => void;
}) {
  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate' as const, category: 'Technical' });

  const handleAdd = () => {
    if (newSkill.name.trim()) {
      onAdd({ ...newSkill, id: Date.now().toString() });
      setNewSkill({ name: '', level: 'intermediate', category: 'Technical' });
    }
  };

  const skillCategories = ['Technical', 'Soft Skills', 'Languages', 'Tools', 'Frameworks', 'Other'];

  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{skill.name}</div>
            <div className="text-sm text-gray-600">{skill.category} • {skill.level}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Input
            placeholder="Skill name"
            value={newSkill.name}
            onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1"
          />
          <select
            value={newSkill.category}
            onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border rounded-md"
          >
            {skillCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={newSkill.level}
            onChange={(e) => setNewSkill(prev => ({ ...prev, level: e.target.value as any }))}
            className="px-3 py-2 border rounded-md"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          <Button type="button" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Experience Section Component
function ExperienceSection({ experience, onAdd, onRemove, onUpdate }: {
  experience: CVFormData['experience'];
  onAdd: (exp: CVFormData['experience'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['experience'][0]>) => void;
}) {
  const [newExp, setNewExp] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [] as string[],
  });

  const handleAdd = () => {
    if (newExp.title.trim() && newExp.company.trim()) {
      onAdd({ ...newExp, id: Date.now().toString(), achievements: newExp.achievements });
      setNewExp({
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: [],
      });
    }
  };

  return (
    <div className="space-y-4">
      {experience.map((exp, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold">{exp.title}</h4>
              <p className="text-gray-600">{exp.company} • {exp.location}</p>
              <p className="text-sm text-gray-500">
                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-700 mb-2">{exp.description}</p>
          {exp.achievements.length > 0 && (
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {exp.achievements.map((achievement, i) => (
                <li key={i}>{achievement}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      
      <div className="border-t pt-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Job Title"
            value={newExp.title}
            onChange={(e) => setNewExp(prev => ({ ...prev, title: e.target.value }))}
          />
          <Input
            placeholder="Company"
            value={newExp.company}
            onChange={(e) => setNewExp(prev => ({ ...prev, company: e.target.value }))}
          />
          <Input
            placeholder="Location"
            value={newExp.location}
            onChange={(e) => setNewExp(prev => ({ ...prev, location: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={newExp.startDate}
              onChange={(e) => setNewExp(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={newExp.endDate}
              onChange={(e) => setNewExp(prev => ({ ...prev, endDate: e.target.value }))}
              disabled={newExp.current}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newExp.current}
                onChange={(e) => setNewExp(prev => ({ ...prev, current: e.target.checked }))}
              />
              Current
            </label>
          </div>
        </div>
        <Textarea
          placeholder="Job description and responsibilities..."
          value={newExp.description}
          onChange={(e) => setNewExp(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </div>
    </div>
  );
}

// Education Section Component
function EducationSection({ education, onAdd, onRemove, onUpdate }: {
  education: CVFormData['education'];
  onAdd: (edu: CVFormData['education'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['education'][0]>) => void;
}) {
  const [newEdu, setNewEdu] = useState({
    degree: '',
    institution: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    gpa: '',
    description: '',
  });

  const handleAdd = () => {
    if (newEdu.degree.trim() && newEdu.institution.trim()) {
      onAdd({ ...newEdu, id: Date.now().toString() });
      setNewEdu({
        degree: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        gpa: '',
        description: '',
      });
    }
  };

  return (
    <div className="space-y-4">
      {education.map((edu, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold">{edu.degree}</h4>
              <p className="text-gray-600">{edu.institution} • {edu.location}</p>
              <p className="text-sm text-gray-500">
                {edu.startDate} - {edu.current ? 'Present' : edu.endDate}
                {edu.gpa && ` • GPA: ${edu.gpa}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {edu.description && (
            <p className="text-sm text-gray-700">{edu.description}</p>
          )}
        </div>
      ))}
      
      <div className="border-t pt-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Degree"
            value={newEdu.degree}
            onChange={(e) => setNewEdu(prev => ({ ...prev, degree: e.target.value }))}
          />
          <Input
            placeholder="Institution"
            value={newEdu.institution}
            onChange={(e) => setNewEdu(prev => ({ ...prev, institution: e.target.value }))}
          />
          <Input
            placeholder="Location"
            value={newEdu.location}
            onChange={(e) => setNewEdu(prev => ({ ...prev, location: e.target.value }))}
          />
          <Input
            placeholder="GPA (optional)"
            value={newEdu.gpa}
            onChange={(e) => setNewEdu(prev => ({ ...prev, gpa: e.target.value }))}
          />
          <Input
            type="date"
            placeholder="Start Date"
            value={newEdu.startDate}
            onChange={(e) => setNewEdu(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              placeholder="End Date"
              value={newEdu.endDate}
              onChange={(e) => setNewEdu(prev => ({ ...prev, endDate: e.target.value }))}
              disabled={newEdu.current}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newEdu.current}
                onChange={(e) => setNewEdu(prev => ({ ...prev, current: e.target.checked }))}
              />
              Current
            </label>
          </div>
        </div>
        <Textarea
          placeholder="Additional details (honors, relevant coursework, etc.)"
          value={newEdu.description}
          onChange={(e) => setNewEdu(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>
    </div>
  );
}

// Certifications Section Component
function CertificationsSection({ certifications, onAdd, onRemove, onUpdate }: {
  certifications: CVFormData['certifications'];
  onAdd: (cert: CVFormData['certifications'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['certifications'][0]>) => void;
}) {
  const [newCert, setNewCert] = useState({
    name: '',
    issuer: '',
    date: '',
    expiryDate: '',
    credentialId: '',
    url: '',
  });

  const handleAdd = () => {
    if (newCert.name.trim() && newCert.issuer.trim()) {
      onAdd({ ...newCert, id: Date.now().toString() });
      setNewCert({
        name: '',
        issuer: '',
        date: '',
        expiryDate: '',
        credentialId: '',
        url: '',
      });
    }
  };

  return (
    <div className="space-y-4">
      {certifications.map((cert, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold">{cert.name}</h4>
              <p className="text-gray-600">{cert.issuer}</p>
              <p className="text-sm text-gray-500">
                Issued: {cert.date}
                {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                {cert.credentialId && ` • ID: ${cert.credentialId}`}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <div className="border-t pt-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Certification Name"
            value={newCert.name}
            onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="Issuing Organization"
            value={newCert.issuer}
            onChange={(e) => setNewCert(prev => ({ ...prev, issuer: e.target.value }))}
          />
          <Input
            type="date"
            placeholder="Issue Date"
            value={newCert.date}
            onChange={(e) => setNewCert(prev => ({ ...prev, date: e.target.value }))}
          />
          <Input
            type="date"
            placeholder="Expiry Date (optional)"
            value={newCert.expiryDate}
            onChange={(e) => setNewCert(prev => ({ ...prev, expiryDate: e.target.value }))}
          />
          <Input
            placeholder="Credential ID (optional)"
            value={newCert.credentialId}
            onChange={(e) => setNewCert(prev => ({ ...prev, credentialId: e.target.value }))}
          />
          <Input
            placeholder="Certificate URL (optional)"
            value={newCert.url}
            onChange={(e) => setNewCert(prev => ({ ...prev, url: e.target.value }))}
          />
        </div>
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>
    </div>
  );
}

// Projects Section Component
function ProjectsSection({ projects, onAdd, onRemove, onUpdate }: {
  projects: CVFormData['projects'];
  onAdd: (project: CVFormData['projects'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['projects'][0]>) => void;
}) {
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    technologies: [] as string[],
    url: '',
    githubUrl: '',
    startDate: '',
    endDate: '',
  });

  const handleAdd = () => {
    if (newProject.name.trim()) {
      onAdd({ ...newProject, id: Date.now().toString(), technologies: newProject.technologies });
      setNewProject({
        name: '',
        description: '',
        technologies: [],
        url: '',
        githubUrl: '',
        startDate: '',
        endDate: '',
      });
    }
  };

  const addTechnology = (tech: string) => {
    if (tech.trim() && !newProject.technologies.includes(tech.trim())) {
      setNewProject(prev => ({
        ...prev,
        technologies: [...prev.technologies, tech.trim()]
      }));
    }
  };

  const removeTechnology = (tech: string) => {
    setNewProject(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== tech)
    }));
  };

  return (
    <div className="space-y-4">
      {projects.map((project, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold">{project.name}</h4>
              <p className="text-sm text-gray-700 mb-2">{project.description}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {project.technologies.map((tech, i) => (
                  <Badge key={i} variant="secondary">{tech}</Badge>
                ))}
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                {project.startDate && <span>{project.startDate} - {project.endDate || 'Present'}</span>}
                {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Live Demo</a>}
                {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline">GitHub</a>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      
      <div className="border-t pt-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            placeholder="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Technologies (comma separated)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const techs = (e.target as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean);
                  techs.forEach(addTechnology);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
          <Input
            placeholder="Project URL"
            value={newProject.url}
            onChange={(e) => setNewProject(prev => ({ ...prev, url: e.target.value }))}
          />
          <Input
            placeholder="GitHub URL"
            value={newProject.githubUrl}
            onChange={(e) => setNewProject(prev => ({ ...prev, githubUrl: e.target.value }))}
          />
        </div>
        <Textarea
          placeholder="Project description..."
          value={newProject.description}
          onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
        {newProject.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {newProject.technologies.map((tech, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {tech}
                <button onClick={() => removeTechnology(tech)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>
    </div>
  );
}

// Languages Section Component
function LanguagesSection({ languages, onAdd, onRemove, onUpdate }: {
  languages: CVFormData['languages'];
  onAdd: (language: CVFormData['languages'][0]) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<CVFormData['languages'][0]>) => void;
}) {
  const [newLanguage, setNewLanguage] = useState({
    language: '',
    proficiency: 'conversational' as const,
  });

  const handleAdd = () => {
    if (newLanguage.language.trim()) {
      onAdd({ ...newLanguage, id: Date.now().toString() });
      setNewLanguage({
        language: '',
        proficiency: 'conversational',
      });
    }
  };

  return (
    <div className="space-y-4">
      {languages.map((lang, index) => (
        <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{lang.language}</div>
            <div className="text-sm text-gray-600 capitalize">{lang.proficiency}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Input
            placeholder="Language"
            value={newLanguage.language}
            onChange={(e) => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
            className="flex-1"
          />
          <select
            value={newLanguage.proficiency}
            onChange={(e) => setNewLanguage(prev => ({ ...prev, proficiency: e.target.value as any }))}
            className="px-3 py-2 border rounded-md"
          >
            <option value="basic">Basic</option>
            <option value="conversational">Conversational</option>
            <option value="professional">Professional</option>
            <option value="native">Native</option>
          </select>
          <Button type="button" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}