'use client';

import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ArrowRight, Briefcase, Building2, Clock, MapPin, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PlatformStats {
  totalUsers: number;
  activeJobs: number;
  totalApplications: number;
  totalCompanies: number;
  jobSeekers: number;
  employers: number;
}

interface RecentJob {
  _id: string;
  title: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  company: {
    name: string;
  };
  createdAt: string;
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch platform stats
        const statsResponse = await api.get('/public/stats');
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }

        // Fetch recent jobs
        const jobsResponse = await api.get('/jobs?limit=6');
        if (jobsResponse.data.success) {
          setRecentJobs(jobsResponse.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to default stats if API fails
        setStats({
          totalUsers: 0,
          activeJobs: 0,
          totalApplications: 0,
          totalCompanies: 0,
          jobSeekers: 0,
          employers: 0,
        });
        setRecentJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <div className="min-h-screen">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Find Your <span className="text-primary">Dream Job</span> Today
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect with top employers and discover opportunities that match your skills and
            aspirations
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/jobs">
              <Button size="lg" className="gap-2">
                Browse Jobs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <Briefcase className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">
                {isLoading ? '...' : stats?.activeJobs?.toLocaleString() || '0'}
              </h3>
              <p className="text-muted-foreground">Active Jobs</p>
            </div>
            <div className="space-y-2">
              <Users className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">
                {isLoading ? '...' : stats?.jobSeekers?.toLocaleString() || '0'}
              </h3>
              <p className="text-muted-foreground">Job Seekers</p>
            </div>
            <div className="space-y-2">
              <Building2 className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">
                {isLoading ? '...' : stats?.totalCompanies?.toLocaleString() || '0'}
              </h3>
              <p className="text-muted-foreground">Companies</p>
            </div>
            <div className="space-y-2">
              <TrendingUp className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">
                {isLoading ? '...' : stats?.totalApplications?.toLocaleString() || '0'}
              </h3>
              <p className="text-muted-foreground">Applications</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Job Portal?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Easy Job Search</h3>
            <p className="text-muted-foreground">
              Find jobs that match your skills with our advanced search and filtering system
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Direct Communication</h3>
            <p className="text-muted-foreground">
              Chat directly with employers and get real-time updates on your applications
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Track Applications</h3>
            <p className="text-muted-foreground">
              Monitor your application status and never miss an opportunity
            </p>
          </div>
        </div>
      </section>

      {/* Recent Jobs Section */}
      {recentJobs.length > 0 && (
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Latest Job Opportunities</h2>
            <p className="text-muted-foreground">Discover the newest positions from top companies</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {recentJobs.slice(0, 6).map((job) => (
              <div key={job._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{job.title}</h3>
                    <p className="text-primary font-medium">{job.company.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {job.jobType} • {job.experienceLevel}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/jobs/${job._id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/jobs">
              <Button size="lg" className="gap-2">
                View All Jobs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Pricing CTA Section - Only for Employers */}
      <section className="bg-primary/5 border-y py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">For Employers: Supercharge Your Hiring</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get access to premium features, job boosts, and advanced analytics to find the best candidates faster
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Link href="/register?role=employer">
                  <Button size="lg" className="gap-2">
                    Sign Up as Employer <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="gap-2">
                    View Pricing Plans <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : user?.role === 'employer' ? (
              <>
                <Link href="/pricing">
                  <Button size="lg" className="gap-2">
                    View Pricing Plans <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/employer/dashboard">
                  <Button size="lg" variant="outline" className="gap-2">
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Subscriptions are available for employers only. Job seekers can browse and apply to jobs for free!
                </p>
                <Link href="/jobs">
                  <Button size="lg" className="gap-2">
                    Browse Available Jobs <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Job Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

