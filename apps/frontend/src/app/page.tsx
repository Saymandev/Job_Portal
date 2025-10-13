import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
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
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <Briefcase className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">10,000+</h3>
              <p className="text-muted-foreground">Active Jobs</p>
            </div>
            <div className="space-y-2">
              <Users className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">50,000+</h3>
              <p className="text-muted-foreground">Job Seekers</p>
            </div>
            <div className="space-y-2">
              <TrendingUp className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-4xl font-bold">5,000+</h3>
              <p className="text-muted-foreground">Companies</p>
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

      {/* Pricing CTA Section */}
      <section className="bg-primary/5 border-y py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">For Employers: Supercharge Your Hiring</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get access to premium features, job boosts, and advanced analytics to find the best candidates faster
          </p>
          <Link href="/pricing">
            <Button size="lg" className="gap-2">
              View Pricing Plans <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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

