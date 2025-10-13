'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { Check, FileText, Loader2, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  onApplicationSubmit?: () => void;
}

interface CoverLetterTemplate {
  _id: string;
  name: string;
  content: string;
  isDefault: boolean;
  tags?: string[];
  usageCount: number;
}

export function QuickApplyModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  onApplicationSubmit,
}: QuickApplyModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState<'resume' | 'coverLetter' | 'review'>('resume');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resume state
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [resumeUrl, setResumeUrl] = useState<string>('');

  // Cover letter state
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<CoverLetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserResume();
      fetchCoverLetterTemplates();
    }
  }, [isOpen]);

  const fetchUserResume = async () => {
    try {
      const response = await api.get('/users/cv');
      if (response.data.success && response.data.data.resume) {
        const resume = response.data.data.resume;
        setResumeUrl(resume.url || resume);
        setSelectedResume(resume.url || resume);
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    }
  };

  const fetchCoverLetterTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/cover-letter-templates');
      if (response.data.success) {
        setCoverLetterTemplates(response.data.data);
        // Auto-select default template
        const defaultTemplate = response.data.data.find((t: CoverLetterTemplate) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate._id);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    try {
      setIsGenerating(true);
      const response = await api.post('/cover-letter-templates/generate', {
        jobTitle,
        companyName,
        templateId: selectedTemplate || undefined,
      });

      if (response.data.success) {
        setCoverLetter(response.data.data.coverLetter);
        toast({
          title: 'Cover Letter Generated',
          description: 'You can edit it before submitting',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate cover letter',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setIsSubmitting(true);
      onApplicationSubmit?.(); // Call the callback to set isApplying state
      
      const response = await api.post('/applications', {
        jobId,
        resume: selectedResume,
        coverLetter: coverLetter || undefined,
      });

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: 'Your application has been submitted',
        });
        onClose();
        router.push('/dashboard/job-seeker');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 'resume') {
      if (!selectedResume) {
        toast({
          title: 'Resume Required',
          description: 'Please upload a resume to continue',
          variant: 'destructive',
        });
        return;
      }
      setStep('coverLetter');
    } else if (step === 'coverLetter') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'coverLetter') {
      setStep('resume');
    } else if (step === 'review') {
      setStep('coverLetter');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Quick Apply</CardTitle>
                <CardDescription className="mt-1">
                  Apply to {jobTitle} at {companyName}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-6">
              {['resume', 'coverLetter', 'review'].map((s, index) => (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        s === step
                          ? 'bg-primary text-primary-foreground'
                          : index < ['resume', 'coverLetter', 'review'].indexOf(step)
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index < ['resume', 'coverLetter', 'review'].indexOf(step) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-sm font-medium capitalize hidden sm:inline">{s}</span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`h-[2px] flex-1 ${
                        index < ['resume', 'coverLetter', 'review'].indexOf(step)
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Resume Selection */}
            {step === 'resume' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Your Resume</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which resume to submit with your application
                  </p>
                </div>

                {resumeUrl ? (
                  <Card className="border-2 border-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <FileText className="h-10 w-10 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Your Resume</p>
                          <p className="text-sm text-muted-foreground">
                            {resumeUrl.split('/').pop()}
                          </p>
                        </div>
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No resume found. Please upload a resume in your profile.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => router.push('/profile')}
                        >
                          Go to Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Cover Letter */}
            {step === 'coverLetter' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cover Letter (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate from a template or write your own
                  </p>
                </div>

                {coverLetterTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Choose a Template</Label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">No Template</option>
                      {coverLetterTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name} {template.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCoverLetter}
                      disabled={isGenerating}
                      className="w-full sm:w-auto"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate Cover Letter
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="coverLetter">Cover Letter Content</Label>
                  <Textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Write your cover letter here or generate one from a template..."
                    className="min-h-[300px]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Review Your Application</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review your application before submitting
                  </p>
                </div>

                <div className="space-y-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{resumeUrl.split('/').pop()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {coverLetter && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Cover Letter</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {coverLetter.substring(0, 200)}
                          {coverLetter.length > 200 ? '...' : ''}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={step === 'resume' ? onClose : handleBack}>
                {step === 'resume' ? 'Cancel' : 'Back'}
              </Button>

              <Button
                onClick={step === 'review' ? handleSubmitApplication : handleNext}
                disabled={isSubmitting || (step === 'resume' && !selectedResume)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : step === 'review' ? (
                  'Submit Application'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
