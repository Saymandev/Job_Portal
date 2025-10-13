import AuthProvider from '@/components/auth-provider';
import NavigationHeader from '@/components/navigation-header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Job Portal - Find Your Dream Job',
  description: 'Modern job portal platform connecting job seekers with employers',
  keywords: ['jobs', 'careers', 'employment', 'recruitment'],
  authors: [{ name: 'Job Portal' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://jobportal.com',
    title: 'Job Portal - Find Your Dream Job',
    description: 'Modern job portal platform connecting job seekers with employers',
    siteName: 'Job Portal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Portal - Find Your Dream Job',
    description: 'Modern job portal platform connecting job seekers with employers',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NavigationHeader />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

