'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  CheckCircle,
  DollarSign,
  Download,
  ExternalLink,
  MessageSquare,
  Mic,
  Search,
  Star,
  Target,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EnhancedFeaturesProps {
  subscription?: {
    plan?: string;
    priorityApplicationsEnabled?: boolean;
    enhancedMatchingEnabled?: boolean;
    applicationAnalyticsEnabled?: boolean;
    unlimitedResumeDownloadsEnabled?: boolean;
    directMessagingEnabled?: boolean;
    featuredProfileEnabled?: boolean;
    salaryInsightsEnabled?: boolean;
    interviewPrepEnabled?: boolean;
  };
}

const features = [
  {
    id: 'priorityApplications',
    name: 'Priority Applications',
    description: 'Applications appear at top of list',
    icon: Target,
    enabled: false,
  },
  {
    id: 'enhancedMatching',
    name: 'Enhanced Matching',
    description: 'Better candidate algorithm',
    icon: Search,
    enabled: false,
  },
  {
    id: 'applicationAnalytics',
    name: 'Application Analytics',
    description: 'Detailed application insights',
    icon: BarChart3,
    enabled: false,
  },
  {
    id: 'unlimitedResumeDownloads',
    name: 'Unlimited Downloads',
    description: 'Download resumes without limits',
    icon: Download,
    enabled: false,
  },
  {
    id: 'directMessaging',
    name: 'Direct Messaging',
    description: 'Message candidates directly',
    icon: MessageSquare,
    enabled: false,
  },
  {
    id: 'featuredProfile',
    name: 'Featured Profile',
    description: 'Company in featured section',
    icon: Star,
    enabled: false,
  },
  {
    id: 'salaryInsights',
    name: 'Salary Insights',
    description: 'Market salary data',
    icon: DollarSign,
    enabled: false,
  },
  {
    id: 'interviewPrep',
    name: 'Interview Tools',
    description: 'Interview preparation tools',
    icon: Mic,
    enabled: false,
  },
];

export default function EnhancedFeatures({ subscription }: EnhancedFeaturesProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const enabledFeatures = features.map(feature => {
    const fieldName = `${feature.id}Enabled` as keyof typeof subscription;
    const isEnabled = subscription?.[fieldName] || false;
    return {
      ...feature,
      enabled: isEnabled,
    };
  });

  const enabledCount = enabledFeatures.filter(f => f.enabled).length;
  const totalCount = enabledFeatures.length;

  const handleUpgradePlan = () => {
    router.push('/pricing');
    toast({
      title: "Upgrade Required",
      description: "Redirecting to pricing page...",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Enhanced Features
          <Badge variant="secondary" className="ml-auto">
            {enabledCount}/{totalCount} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {enabledFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                  feature.enabled
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : 'bg-muted border-muted-foreground/20'
                }`}
              >
                <div className={`p-2 rounded-full mb-2 ${
                  feature.enabled
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${
                    feature.enabled
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium ${
                    feature.enabled
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-muted-foreground'
                  }`}>
                    {feature.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
                {feature.enabled ? (
                  <CheckCircle className="h-3 w-3 text-green-500 mt-1" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground mt-1" />
                )}
              </div>
            );
          })}
        </div>
        
            {enabledCount === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade your plan to unlock enhanced features
                </p>
                <Button onClick={handleUpgradePlan} size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
