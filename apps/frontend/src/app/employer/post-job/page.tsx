'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  Save,
  Sparkles,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'text' | 'yes_no' | 'multiple_choice';
  required: boolean;
  options?: string[];
}

interface JobFormData {
  title: string;
  description: string;
  requirements: string;
  location: string;
  isRemote: boolean;
  jobType: string;
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  skills: string[];
  benefits: string[];
  applicationDeadline: string;
  status: string;
  screeningQuestions: ScreeningQuestion[];
}

export default function PostJobPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    requirements: '',
    location: '',
    isRemote: false,
    jobType: 'full-time',
    experienceLevel: 'mid',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    skills: [],
    benefits: [],
    applicationDeadline: '',
    status: 'open',
    screeningQuestions: [],
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentBenefit, setCurrentBenefit] = useState('');
  const [newQuestion, setNewQuestion] = useState<{
    question: string;
    type: 'text' | 'yes_no' | 'multiple_choice';
    required: boolean;
    options: string[];
  }>({
    question: '',
    type: 'text',
    required: false,
    options: [''],
  });

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Details', icon: Briefcase },
    { number: 3, title: 'Compensation', icon: DollarSign },
    { number: 4, title: 'Skills & Benefits', icon: Sparkles },
    { number: 5, title: 'Screening', icon: Check },
  ];

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'employer') {
      router.push('/login');
      return;
    }
    fetchCompanies();
  }, [isAuthenticated, user, router]);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/my-company');
      if (response.data.success && response.data.data) {
        // Backend returns a single company, wrap it in an array for frontend compatibility
        setCompanies([response.data.data]);
        setSelectedCompany(response.data.data._id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  const handleAddBenefit = () => {
    if (currentBenefit.trim() && !formData.benefits.includes(currentBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, currentBenefit.trim()],
      }));
      setCurrentBenefit('');
    }
  };

  const handleRemoveBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit),
    }));
  };

  const handleAddQuestion = () => {
    if (newQuestion.question.trim()) {
      const question: ScreeningQuestion = {
        id: Date.now().toString(),
        question: newQuestion.question,
        type: newQuestion.type,
        required: newQuestion.required,
        options: newQuestion.type === 'multiple_choice' ? newQuestion.options.filter(o => o.trim()) : undefined,
      };

      setFormData(prev => ({
        ...prev,
        screeningQuestions: [...prev.screeningQuestions, question],
      }));

      setNewQuestion({
        question: '',
        type: 'text',
        required: false,
        options: [''],
      });
    }
  };

  const handleRemoveQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      screeningQuestions: prev.screeningQuestions.filter(q => q.id !== id),
    }));
  };

  const handleAddOption = () => {
    setNewQuestion(prev => ({
      ...prev,
      options: [...(prev.options || ['']), ''],
    }));
  };

  const handleUpdateOption = (index: number, value: string) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || [],
    }));
  };

  const handleRemoveOption = (index: number) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || [],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Job title is required',
            variant: 'destructive',
          });
          return false;
        }
        if (!formData.location.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Location is required',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.description.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Job description is required',
            variant: 'destructive',
          });
          return false;
        }
        if (!formData.requirements.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Job requirements are required',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateStep(currentStep)) {
      return;
    }

    if (!selectedCompany) {
      toast({
        title: 'Error',
        description: 'Please select a company',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const jobData = {
        ...formData,
        company: selectedCompany,
        status: isDraft ? 'draft' : formData.status,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
        applicationDeadline: formData.applicationDeadline || undefined,
      };

      const response = await api.post('/jobs', jobData);

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: isDraft ? 'Job saved as draft' : 'Job posted successfully',
        });
        router.push('/employer/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to post job',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'employer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Post a New Job</h1>
          <p className="text-lg text-muted-foreground">
            Fill in the details to create your job posting
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      currentStep >= step.number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 font-medium hidden sm:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Company Selection */}
        {companies.length > 0 && (
          <Card className="max-w-4xl mx-auto mb-6">
            <CardContent className="pt-6">
              <Label>Select Company</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border rounded-md mt-2"
              >
                {companies.map(company => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Step {currentStep}: {steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Enter the basic information about the job position'}
              {currentStep === 2 && 'Provide detailed description and requirements'}
              {currentStep === 3 && 'Set the compensation and benefits'}
              {currentStep === 4 && 'Add required skills and benefits'}
              {currentStep === 5 && 'Add screening questions (optional)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="e.g., San Francisco, CA"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Remote Work</Label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!formData.isRemote}
                          onChange={() => handleInputChange('isRemote', false)}
                          className="h-4 w-4"
                        />
                        <span>On-site</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.isRemote}
                          onChange={() => handleInputChange('isRemote', true)}
                          className="h-4 w-4"
                        />
                        <span>Remote</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <select
                      id="jobType"
                      value={formData.jobType}
                      onChange={(e) => handleInputChange('jobType', e.target.value)}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <select
                      id="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="lead">Lead</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements *</Label>
                  <Textarea
                    id="requirements"
                    placeholder="List the qualifications, experience, and skills required for this position..."
                    value={formData.requirements}
                    onChange={(e) => handleInputChange('requirements', e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Compensation */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Min Salary</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="salaryMin"
                        type="number"
                        placeholder="50000"
                        value={formData.salaryMin}
                        onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Max Salary</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="salaryMax"
                        type="number"
                        placeholder="100000"
                        value={formData.salaryMax}
                        onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-4 py-2 border rounded-md"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationDeadline">Application Deadline (Optional)</Label>
                  <Input
                    id="applicationDeadline"
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => handleInputChange('applicationDeadline', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Skills & Benefits */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Required Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., React, Node.js, TypeScript"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    />
                    <Button type="button" onClick={handleAddSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {skill}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Benefits</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Health Insurance, 401k, Remote Work"
                      value={currentBenefit}
                      onChange={(e) => setCurrentBenefit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                    />
                    <Button type="button" onClick={handleAddBenefit}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {benefit}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveBenefit(benefit)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Screening Questions */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Add Screening Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      These questions will be asked to applicants when they apply
                    </p>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Input
                        placeholder="e.g., How many years of experience do you have with React?"
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <select
                          value={newQuestion.type}
                          onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                          className="w-full px-4 py-2 border rounded-md"
                        >
                          <option value="text">Text Answer</option>
                          <option value="yes_no">Yes/No</option>
                          <option value="multiple_choice">Multiple Choice</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Required</Label>
                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newQuestion.required}
                              onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <span>Required question</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {newQuestion.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {newQuestion.options?.map((option, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => handleUpdateOption(index, e.target.value)}
                            />
                            {newQuestion.options!.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveOption(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    <Button type="button" onClick={handleAddQuestion} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {/* Display Added Questions */}
                  {formData.screeningQuestions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Added Questions ({formData.screeningQuestions.length})</h4>
                      {formData.screeningQuestions.map((question, index) => (
                        <Card key={question.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">Q{index + 1}.</span>
                                  <span>{question.question}</span>
                                  {question.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {question.type === 'text' && 'Text Answer'}
                                    {question.type === 'yes_no' && 'Yes/No'}
                                    {question.type === 'multiple_choice' && 'Multiple Choice'}
                                  </Badge>
                                  {question.options && question.options.length > 0 && (
                                    <span>({question.options.length} options)</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveQuestion(question.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button variant="outline" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                {currentStep < steps.length ? (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}