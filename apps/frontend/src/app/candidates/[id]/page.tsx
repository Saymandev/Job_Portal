'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import {
  Award,
  Briefcase,
  Download,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User
} from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Candidate {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  skills?: string[];
  experience?: string; // Simple text field in backend
  education?: string; // Simple text field in backend
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  professionalTitle?: string;
  resumeFile?: {
    filename: string;
    url: string;
    uploadedAt: string;
  };
  cvSkills?: Array<{
    id: string;
    name: string;
    level: string;
    category: string;
  }>;
  cvExperience?: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;
  cvEducation?: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: string;
    description?: string;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  createdAt: string;
}

export default function CandidateProfilePage() {
  const { user } = useAuthStore();
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/users/${candidateId}`);
      setCandidate(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch candidate profile');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (candidateId && user?.id && user?.role === 'employer') {
      // Track profile view for employers
      
      api.post(`/users/${candidateId}/view`)
        .then(response => {
          
        })
        .catch(error => {
          console.error('Error tracking profile view:', error);
        });
    }
  }, [candidateId, user?.id, user?.role]);

  useEffect(() => {
    if (candidateId && user) {
      fetchCandidate();
    }
  }, [candidateId, user, fetchCandidate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const handleDownloadResume = () => {
    if (candidate?.resumeFile?.url) {
      window.open(candidate.resumeFile.url, '_blank');
    }
  };

  const handleMessage = () => {
    router.push(`/messages?user=${candidateId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Candidate Not Found</h2>
              <p className="text-gray-600 mb-4">The candidate profile you&apos;re looking for doesn&apos;t exist.</p>
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEmployer = user?.role === 'employer';

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            ← Back
          </Button>
          {isEmployer && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={handleMessage} variant="outline" size="sm" className="w-full sm:w-auto">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              {candidate.resumeFile && (
                <Button onClick={handleDownloadResume} size="sm" className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download Resume
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    {candidate.avatar ? (
                      <Image 
                        src={candidate.avatar} 
                        alt={candidate.fullName}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{candidate.fullName}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                      {candidate.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {candidate.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                    {candidate.bio && (
                      <p className="text-gray-700 leading-relaxed">{candidate.bio}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {((candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0) || 
              (candidate.cvSkills && Array.isArray(candidate.cvSkills) && candidate.cvSkills.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.cvSkills && Array.isArray(candidate.cvSkills) && candidate.cvSkills.length > 0 ? (
                      candidate.cvSkills.map((skill) => (
                        <Badge key={skill.id} variant="secondary" className="px-2 py-1 text-xs">
                          {skill.name}
                        </Badge>
                      ))
                    ) : candidate.skills && Array.isArray(candidate.skills) ? (
                      candidate.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-2 py-1 text-xs">
                          {skill}
                        </Badge>
                      ))
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {((candidate.cvExperience && Array.isArray(candidate.cvExperience) && candidate.cvExperience.length > 0) || 
              (candidate.experience && typeof candidate.experience === 'string' && candidate.experience.trim())) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.cvExperience && Array.isArray(candidate.cvExperience) && candidate.cvExperience.length > 0 ? (
                    <div className="space-y-4">
                      {candidate.cvExperience.map((exp, index) => (
                        <div key={exp.id} className="relative">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                              <p className="text-gray-600">{exp.company}</p>
                              {exp.location && <p className="text-sm text-gray-500">{exp.location}</p>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(exp.startDate)} - {exp.current ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'Present'}
                            </div>
                          </div>
                          {exp.description && (
                            <p className="text-gray-700 text-sm leading-relaxed mb-2">{exp.description}</p>
                          )}
                          {exp.achievements && exp.achievements.length > 0 && (
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {exp.achievements.map((achievement, idx) => (
                                <li key={idx}>{achievement}</li>
                              ))}
                            </ul>
                          )}
                          {index < (candidate.cvExperience?.length || 0) - 1 && <div className="border-t border-gray-200 mt-3"></div>}
                        </div>
                      ))}
                    </div>
                  ) : candidate.experience && typeof candidate.experience === 'string' ? (
                    <p className="text-gray-700 leading-relaxed">{candidate.experience}</p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {((candidate.cvEducation && Array.isArray(candidate.cvEducation) && candidate.cvEducation.length > 0) || 
              (candidate.education && typeof candidate.education === 'string' && candidate.education.trim())) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.cvEducation && Array.isArray(candidate.cvEducation) && candidate.cvEducation.length > 0 ? (
                    <div className="space-y-4">
                      {candidate.cvEducation.map((edu, index) => (
                        <div key={edu.id}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                              <p className="text-gray-600">{edu.institution}</p>
                              {edu.location && <p className="text-sm text-gray-500">{edu.location}</p>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(edu.startDate)} - {edu.current ? 'Present' : edu.endDate ? formatDate(edu.endDate) : 'Present'}
                            </div>
                          </div>
                          {edu.gpa && (
                            <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                          )}
                          {edu.description && (
                            <p className="text-sm text-gray-700 mt-2">{edu.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : candidate.education && typeof candidate.education === 'string' ? (
                    <p className="text-gray-700 leading-relaxed">{candidate.education}</p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {candidate.certifications && Array.isArray(candidate.certifications) && candidate.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {candidate.certifications.map((cert) => (
                      <div key={cert.id}>
                        <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                        <p className="text-gray-600">{cert.issuer}</p>
                        <p className="text-sm text-gray-500">{formatDate(cert.date)}</p>
                        {cert.credentialId && (
                          <p className="text-sm text-gray-500">Credential ID: {cert.credentialId}</p>
                        )}
                        {cert.expiryDate && (
                          <p className="text-sm text-gray-500">Expires: {formatDate(cert.expiryDate)}</p>
                        )}
                        {cert.url && (
                          <a href={cert.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            View Certificate
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact & Links */}
            <Card>
              <CardHeader>
                <CardTitle>Contact & Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{candidate.location}</span>
                  </div>
                )}
                {candidate.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={candidate.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Website
                    </a>
                  </div>
                )}
                {(candidate.linkedinUrl || candidate.linkedin) && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={candidate.linkedinUrl || candidate.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      LinkedIn
                    </a>
                  </div>
                )}
                {(candidate.githubUrl || candidate.github) && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={candidate.githubUrl || candidate.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      GitHub
                    </a>
                  </div>
                )}
                {candidate.portfolioUrl && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a 
                      href={candidate.portfolioUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Portfolio
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Member since</span>
                    <span className="text-sm font-medium">{formatDate(candidate.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Skills</span>
                    <span className="text-sm font-medium">
                      {candidate.cvSkills?.length || candidate.skills?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Experience</span>
                    <span className="text-sm font-medium">
                      {candidate.cvExperience?.length || (candidate.experience ? 1 : 0)} {candidate.cvExperience?.length ? 'positions' : 'entry'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Education</span>
                    <span className="text-sm font-medium">
                      {candidate.cvEducation?.length || (candidate.education ? 1 : 0)} {candidate.cvEducation?.length ? 'entries' : 'entry'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
