'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Home, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['job_seeker', 'employer']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register: registerUser, user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'job_seeker' | 'employer'>('job_seeker');
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand store to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated && user) {
      // Redirect to role-specific dashboard
      if (user.role === 'job_seeker') {
        router.push('/dashboard/job-seeker');
      } else if (user.role === 'employer') {
        router.push('/employer/dashboard');
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router, isHydrated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'job_seeker',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      await registerUser(data);
      toast({
        title: 'Success!',
        description: 'Account created successfully. Please verify your email.',
      });
      // The useEffect above will handle the redirect based on user role
      // No need to manually redirect here as the store update will trigger it
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Registration failed',
        variant: 'destructive',
      });
      setIsLoading(false); // Only reset loading on error, success will redirect
    }
  };

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Don't render register form if already authenticated (while redirecting)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Sign up to get started with Job Portal</CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>I want to</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={selectedRole === 'job_seeker' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setSelectedRole('job_seeker')}
                >
                  Find Jobs
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === 'employer' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setSelectedRole('employer')}
                >
                  Hire Talent
                </Button>
              </div>
              <input type="hidden" value={selectedRole} {...register('role')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                {...register('fullName')}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

