'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { ExternalLink, MapPin, MessageSquare, Search, Star, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface EnhancedMatch {
  candidate: {
    _id: string;
    fullName: string;
    email: string;
    skills: string[];
    location: string;
    experience: any[];
  };
  matchScore: number;
  reasons: string[];
  applicationId: string;
}

interface EnhancedMatchingProps {
  jobId: string;
  employerId: string;
  isEnabled: boolean;
}

export default function EnhancedMatching({ jobId, employerId, isEnabled }: EnhancedMatchingProps) {
  const [matches, setMatches] = useState<EnhancedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchEnhancedMatches = useCallback(async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/jobs/${jobId}/enhanced-matches`);
      if ((response.data as any).success) {
        setMatches((response.data as any).data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch enhanced matches');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, jobId]);

  useEffect(() => {
    if (isEnabled && jobId) {
      fetchEnhancedMatches();
    }
  }, [isEnabled, jobId, fetchEnhancedMatches]);

  const handleViewProfile = (candidateId: string) => {
    router.push(`/candidates/${candidateId}`);
    toast({
      title: "Opening Profile",
      description: "Redirecting to candidate profile...",
    });
  };

  const handleContactCandidate = (candidateId: string, applicationId: string) => {
    router.push(`/messages?user=${candidateId}&job=${jobId}`);
    toast({
      title: "Opening Messages",
      description: "Redirecting to messaging...",
    });
  };

  const handleUpgradePlan = () => {
    router.push('/pricing');
    toast({
      title: "Upgrade Required",
      description: "Redirecting to pricing page...",
    });
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enhanced Candidate Matching
            <Badge variant="secondary">Premium Feature</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 mb-4">
            Upgrade your plan to access enhanced candidate matching with advanced algorithms.
          </p>
          <Button onClick={handleUpgradePlan} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Enhanced Candidate Matching
          <Badge variant="default">Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No enhanced matches found for this job.
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match, index) => (
              <div key={match.applicationId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{match.candidate.fullName}</h4>
                      <p className="text-sm text-muted-foreground">{match.candidate.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-lg font-bold">
                      {match.matchScore}%
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Match Score</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{match.candidate.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{match.candidate.experience?.length || 0} years experience</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {match.candidate.skills?.slice(0, 5).map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {match.candidate.skills?.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{match.candidate.skills.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <h5 className="text-sm font-medium mb-2">Why this candidate matches:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {match.reasons.map((reason, reasonIndex) => (
                      <li key={reasonIndex} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                 <div className="flex gap-2">
                   <Button 
                     size="sm" 
                     variant="outline"
                     onClick={() => handleViewProfile(match.candidate._id)}
                   >
                     <ExternalLink className="h-4 w-4 mr-1" />
                     View Profile
                   </Button>
                   <Button 
                     size="sm"
                     onClick={() => handleContactCandidate(match.candidate._id, match.applicationId)}
                   >
                     <MessageSquare className="h-4 w-4 mr-1" />
                     Contact Candidate
                   </Button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
