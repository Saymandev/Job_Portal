'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useNotificationsStore } from '@/store/notifications-store';
import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  Heart,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Moon,
  Palette,
  Settings,
  Shield,
  Sun,
  Upload,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function NavigationHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { unreadCount: notifications, fetchUnreadCount, initSocketListeners } = useNotificationsStore();
  const { conversations, fetchConversations } = useChatStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch notification and conversation counts when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && isHydrated) {
      // Add a small delay to ensure auth state is fully loaded
      const timer = setTimeout(() => {
        fetchUnreadCount();
        fetchConversations();
        // Initialize notifications socket listeners
        initSocketListeners(user.id);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isHydrated, fetchUnreadCount, fetchConversations, initSocketListeners]);

  // Initialize theme from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = prefersDark ? 'dark' : 'light';
        setTheme(initialTheme);
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
        localStorage.setItem('theme', initialTheme);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate total unread messages from all conversations
  const unreadMessagesCount = conversations.reduce((total, conversation) => {
    return total + conversation.unreadCount;
  }, 0);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'job_seeker':
        return '/dashboard/job-seeker';
      case 'employer':
        return '/employer/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Don't show header on auth pages
  if (isAuthPage) {
    return null;
  }

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return (
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Job Portal</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Briefcase className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Job Portal</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/jobs" className="text-muted-foreground hover:text-foreground">
              Browse Jobs
            </Link>
            
            {isAuthenticated && user && (
              <>
                {user.role === 'job_seeker' && (
                  <Link href="/applications" className="text-muted-foreground hover:text-foreground">
                    My Applications
                  </Link>
                )}
                
                {user.role === 'employer' && (
                  <>
                    <Link href="/employer/jobs" className="text-muted-foreground hover:text-foreground">
                      My Jobs
                    </Link>
                    <Link href="/employer/post-job" className="text-muted-foreground hover:text-foreground">
                      Post Job
                    </Link>
                  </>
                )}
                
                
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative" asChild>
                  <Link href="/notifications">
                    <Bell className="h-5 w-5" />
                    {notifications > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
                        {notifications}
                      </Badge>
                    )}
                  </Link>
                </Button>

                {/* Messages - Hide for admin users since they have admin messages */}
                {user?.role !== 'admin' && (
                  <Button variant="ghost" size="sm" className="relative" asChild>
                    <Link href="/messages">
                      <MessageSquare className="h-5 w-5" />
                      {unreadMessagesCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
                          {unreadMessagesCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                )}

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center space-x-2"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-medium">
                        {user.fullName.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <span className="hidden sm:block">{user.fullName}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                      <div className="py-1">
                        <Link 
                          href={getDashboardPath()} 
                          className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link 
                          href="/profile" 
                          className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                        
                        {/* Job Seeker specific menu items */}
                        {user.role === 'job_seeker' && (
                          <>
                            <div className="border-t border-border my-1"></div>
                            <Link 
                              href="/jobs/saved" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Heart className="mr-2 h-4 w-4" />
                              Saved Jobs
                            </Link>
                            <Link 
                              href="/cover-letter-templates" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Cover Letter Templates
                            </Link>
                            <Link 
                              href="/interviews" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Interviews
                            </Link>
                            <Link 
                              href="/dashboard/analytics" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              My Analytics
                            </Link>
                            <Link 
                              href="/messaging-permissions" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Message Permissions
                            </Link>
                          </>
                        )}

                        {/* Employer specific menu items */}
                        {user.role === 'employer' && (
                          <>
                            <div className="border-t border-border my-1"></div>
                            <Link 
                              href="/employer/candidates" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Candidates
                            </Link>
                            <Link 
                              href="/interviews" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Interviews
                            </Link>
                            <Link 
                              href="/employer/analytics" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics
                            </Link>
                            
                            {/* Enhanced Features Section */}
                            <div className="border-t border-border my-1"></div>
                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Enhanced Features
                            </div>
                            <Link 
                              href="/settings/api-keys" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              API Keys
                            </Link>
                            <Link 
                              href="/settings/branding" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Palette className="mr-2 h-4 w-4" />
                              Custom Branding
                            </Link>
                            <Link 
                              href="/settings/bulk-import" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Bulk Job Import
                            </Link>
                            <Link 
                              href="/settings/account-manager" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Account Manager
                            </Link>
                            <Link 
                              href="/settings/priority-support" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Priority Support
                            </Link>
                            <Link 
                              href="/settings/advanced-analytics" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Advanced Analytics
                            </Link>
                            
                            {/* Account & Billing Section */}
                            <div className="border-t border-border my-1"></div>
                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Account & Billing
                            </div>
                            <Link 
                              href="/messaging-permissions" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Message Permissions
                            </Link>
                            <Link 
                              href="/employer/subscription" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Subscription
                            </Link>
                            <Link 
                              href="/pricing" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Briefcase className="mr-2 h-4 w-4" />
                              Pricing
                            </Link>
                            <Link 
                              href="/settings" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </Link>
                          </>
                        )}

                        {/* Admin specific menu items */}
                        {user.role === 'admin' && (
                          <>
                            <div className="border-t border-border my-1"></div>
                            
                            <Link 
                              href="/admin/users" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Manage Users
                            </Link>
                            <Link 
                              href="/admin/jobs" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Briefcase className="mr-2 h-4 w-4" />
                              Manage Jobs
                            </Link>
                            <Link 
                              href="/admin/subscriptions" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Subscriptions
                            </Link>
                            <Link 
                              href="/admin/messages" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Messages
                            </Link>
                            <Link 
                              href="/admin/analytics" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Platform Analytics
                            </Link>
                            <Link 
                              href="/admin/ip-management" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              IP Management
                            </Link>
                            <Link 
                              href="/admin/settings" 
                              className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Platform Settings
                            </Link>
                          </>
                        )}
                        
                        <div className="border-t border-border my-1"></div>
                        
                        {/* Settings Section */}
                        <Link 
                          href="/settings/notifications" 
                          className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          Notifications
                        </Link>
                        <Link 
                          href="/settings/integrations" 
                          className="flex items-center px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Integrations
                        </Link>
                        
                        <div className="border-t border-border my-1"></div>
                        <button 
                          onClick={toggleTheme}
                          className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                        >
                          {theme === 'light' ? (
                            <>
                              <Moon className="mr-2 h-4 w-4" />
                              Dark Mode
                            </>
                          ) : (
                            <>
                              <Sun className="mr-2 h-4 w-4" />
                              Light Mode
                            </>
                          )}
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-4">
              <Link href="/jobs" className="text-muted-foreground hover:text-foreground">
                Browse Jobs
              </Link>
              
              {isAuthenticated && user && (
                <>
                  {user.role === 'job_seeker' && (
                    <>
                      <Link href="/applications" className="text-muted-foreground hover:text-foreground">
                        My Applications
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'employer' && (
                    <>
                      <Link href="/employer/jobs" className="text-muted-foreground hover:text-foreground">
                        My Jobs
                      </Link>
                      <Link href="/employer/post-job" className="text-muted-foreground hover:text-foreground">
                        Post Job
                      </Link>
                    </>
                  )}
                </>
              )}
              
              {!isAuthenticated && (
                <>
                  <Link href="/login" className="text-muted-foreground hover:text-foreground">
                    Login
                  </Link>
                  <Link href="/register" className="text-muted-foreground hover:text-foreground">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
