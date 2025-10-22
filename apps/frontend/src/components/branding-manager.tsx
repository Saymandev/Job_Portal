'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  Building2,
  Eye,
  Palette,
  Save,
  Sparkles,
  Upload
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
// Simple tabs implementation
const Tabs = ({ children, defaultValue, className }: { children: React.ReactNode; defaultValue: string; className?: string }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return <div className={`tabs ${className || ''}`}>{children}</div>;
};

const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex space-x-1 rounded-lg bg-muted p-1 ${className || ''}`}>{children}</div>
);

const TabsTrigger = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className || ''}`}
    onClick={() => {
      const tabs = document.querySelectorAll('[data-tab-trigger]');
      tabs.forEach(tab => tab.setAttribute('data-state', 'inactive'));
      const currentTab = document.querySelector(`[data-tab-trigger="${value}"]`);
      if (currentTab) currentTab.setAttribute('data-state', 'active');
      
      const contents = document.querySelectorAll('[data-tab-content]');
      contents.forEach(content => content.classList.add('hidden'));
      const currentContent = document.querySelector(`[data-tab-content="${value}"]`);
      if (currentContent) currentContent.classList.remove('hidden');
    }}
    data-tab-trigger={value}
    data-state={value === 'general' ? 'active' : 'inactive'}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => (
  <div 
    data-tab-content={value} 
    className={`${value === 'general' ? '' : 'hidden'} ${className || ''}`}
  >
    {children}
  </div>
);

interface Branding {
  _id?: string;
  logo?: string;
  logoDark?: string;
  primaryColor: string;
  primaryColorDark: string;
  secondaryColor: string;
  secondaryColorDark: string;
  backgroundColor: string;
  backgroundColorDark: string;
  textColor: string;
  textColorDark: string;
  customCss?: string;
  favicon?: string;
  isActive: boolean;
  customDomain?: string;
  whiteLabelEnabled: boolean;
  companyName?: string;
  tagline?: string;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  removeJobPortalBranding?: boolean;
  customFooterText?: string;
  customHeaderText?: string;
  whiteLabelSettings?: {
    hidePoweredBy?: boolean;
    customFavicon?: string;
    customMetaTitle?: string;
    customMetaDescription?: string;
    customKeywords?: string[];
    customRobotsTxt?: string;
    customSitemap?: string;
    customErrorPages?: {
      '404'?: string;
      '500'?: string;
    };
    customEmailTemplates?: {
      fromName?: string;
      fromEmail?: string;
      replyTo?: string;
    };
    customLegalPages?: {
      privacyPolicy?: string;
      termsOfService?: string;
      cookiePolicy?: string;
    };
  };
}

export default function BrandingManager() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [domainCheck, setDomainCheck] = useState<{ available?: boolean; checking?: boolean }>({});
  const { toast } = useToast();

  const defaultBranding: Branding = {
    primaryColor: '#3B82F6',
    primaryColorDark: '#1E40AF',
    secondaryColor: '#F3F4F6',
    secondaryColorDark: '#374151',
    backgroundColor: '#FFFFFF',
    backgroundColorDark: '#111827',
    textColor: '#6B7280',
    textColorDark: '#F9FAFB',
    isActive: false,
    whiteLabelEnabled: false,
  };

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/branding');
      setBranding(response.data.data || defaultBranding);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setBranding(defaultBranding);
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to fetch branding',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const saveBranding = async () => {
    try {
      setSaving(true);
      const response = await api.post('/branding', branding);
      setBranding(response.data.data);
      toast({
        title: 'Success',
        description: 'Branding saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save branding',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const checkDomainAvailability = async (domain: string) => {
    if (!domain) {
      setDomainCheck({});
      return;
    }

    try {
      setDomainCheck({ checking: true });
      const response = await api.get(`/branding/domain/check?domain=${domain}`);
      setDomainCheck({ available: response.data.data.available });
    } catch (error: any) {
      setDomainCheck({ available: false });
    }
  };

  const updateBranding = (updates: Partial<Branding>) => {
    setBranding(prev => prev ? { ...prev, ...updates } : { ...defaultBranding, ...updates });
  };

  const updateSocialLink = (platform: string, value: string) => {
    updateBranding({
      socialLinks: {
        ...branding?.socialLinks,
        [platform]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const currentBranding = branding || defaultBranding;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Custom Branding</h2>
          <p className="text-muted-foreground">
            Customize your job listings and company page with your brand colors and logo
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          <Button onClick={saveBranding} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="logo">Logo & Images</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="whitelabel">White Label</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Light Mode</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={currentBranding.primaryColor}
                          onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.primaryColor}
                          onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={currentBranding.secondaryColor}
                          onChange={(e) => updateBranding({ secondaryColor: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.secondaryColor}
                          onChange={(e) => updateBranding({ secondaryColor: e.target.value })}
                          placeholder="#F3F4F6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={currentBranding.backgroundColor}
                          onChange={(e) => updateBranding({ backgroundColor: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.backgroundColor}
                          onChange={(e) => updateBranding({ backgroundColor: e.target.value })}
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={currentBranding.textColor}
                          onChange={(e) => updateBranding({ textColor: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.textColor}
                          onChange={(e) => updateBranding({ textColor: e.target.value })}
                          placeholder="#6B7280"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Dark Mode</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="primaryColorDark">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="primaryColorDark"
                          type="color"
                          value={currentBranding.primaryColorDark}
                          onChange={(e) => updateBranding({ primaryColorDark: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.primaryColorDark}
                          onChange={(e) => updateBranding({ primaryColorDark: e.target.value })}
                          placeholder="#1E40AF"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondaryColorDark">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="secondaryColorDark"
                          type="color"
                          value={currentBranding.secondaryColorDark}
                          onChange={(e) => updateBranding({ secondaryColorDark: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.secondaryColorDark}
                          onChange={(e) => updateBranding({ secondaryColorDark: e.target.value })}
                          placeholder="#374151"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="backgroundColorDark">Background Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="backgroundColorDark"
                          type="color"
                          value={currentBranding.backgroundColorDark}
                          onChange={(e) => updateBranding({ backgroundColorDark: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.backgroundColorDark}
                          onChange={(e) => updateBranding({ backgroundColorDark: e.target.value })}
                          placeholder="#111827"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="textColorDark">Text Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="textColorDark"
                          type="color"
                          value={currentBranding.textColorDark}
                          onChange={(e) => updateBranding({ textColorDark: e.target.value })}
                          className="w-16 h-10"
                        />
                        <Input
                          value={currentBranding.textColorDark}
                          onChange={(e) => updateBranding({ textColorDark: e.target.value })}
                          placeholder="#F9FAFB"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Logo & Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="logo">Company Logo (Light Mode)</Label>
                  <Input
                    id="logo"
                    value={currentBranding.logo || ''}
                    onChange={(e) => updateBranding({ logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="mt-1"
                  />
                  {currentBranding.logo && (
                    <div className="mt-2">
                      <img
                        src={currentBranding.logo}
                        alt="Logo preview"
                        className="h-16 w-auto object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="logoDark">Company Logo (Dark Mode)</Label>
                  <Input
                    id="logoDark"
                    value={currentBranding.logoDark || ''}
                    onChange={(e) => updateBranding({ logoDark: e.target.value })}
                    placeholder="https://example.com/logo-dark.png"
                    className="mt-1"
                  />
                  {currentBranding.logoDark && (
                    <div className="mt-2">
                      <img
                        src={currentBranding.logoDark}
                        alt="Dark logo preview"
                        className="h-16 w-auto object-contain border rounded bg-gray-800"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="favicon">Favicon</Label>
                <Input
                  id="favicon"
                  value={currentBranding.favicon || ''}
                  onChange={(e) => updateBranding({ favicon: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={currentBranding.companyName || ''}
                  onChange={(e) => updateBranding({ companyName: e.target.value })}
                  placeholder="Your Company Name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={currentBranding.tagline || ''}
                  onChange={(e) => updateBranding({ tagline: e.target.value })}
                  placeholder="Your company tagline"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Social Links</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="website" className="text-sm">Website</Label>
                    <Input
                      id="website"
                      value={currentBranding.socialLinks?.website || ''}
                      onChange={(e) => updateSocialLink('website', e.target.value)}
                      placeholder="https://yourcompany.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin" className="text-sm">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={currentBranding.socialLinks?.linkedin || ''}
                      onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                      placeholder="https://linkedin.com/company/yourcompany"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter" className="text-sm">Twitter</Label>
                    <Input
                      id="twitter"
                      value={currentBranding.socialLinks?.twitter || ''}
                      onChange={(e) => updateSocialLink('twitter', e.target.value)}
                      placeholder="https://twitter.com/yourcompany"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook" className="text-sm">Facebook</Label>
                    <Input
                      id="facebook"
                      value={currentBranding.socialLinks?.facebook || ''}
                      onChange={(e) => updateSocialLink('facebook', e.target.value)}
                      placeholder="https://facebook.com/yourcompany"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="customCss">Custom CSS (Advanced)</Label>
              <Textarea
                id="customCss"
                value={currentBranding.customCss || ''}
                onChange={(e) => updateBranding({ customCss: e.target.value })}
                placeholder="/* Add your custom CSS here */"
                className="mt-1 font-mono text-sm"
                rows={8}
              />
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="whitelabel" className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Sparkles className="h-5 w-5" />
                 White Label Options
                 <Badge variant="outline">Enterprise Only</Badge>
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
               <div>
                 <Label htmlFor="customDomain">Custom Domain</Label>
                 <div className="flex items-center space-x-2 mt-1">
                   <Input
                     id="customDomain"
                     value={currentBranding.customDomain || ''}
                     onChange={(e) => {
                       updateBranding({ customDomain: e.target.value });
                       checkDomainAvailability(e.target.value);
                     }}
                     placeholder="jobs.yourcompany.com"
                   />
                   {domainCheck.checking && (
                     <div className="text-sm text-muted-foreground">Checking...</div>
                   )}
                   {domainCheck.available === true && (
                     <Badge className="bg-green-100 text-green-800">Available</Badge>
                   )}
                   {domainCheck.available === false && (
                     <Badge variant="destructive">Not Available</Badge>
                   )}
                 </div>
                 <p className="text-sm text-muted-foreground mt-1">
                   Set up a custom subdomain for your job board
                 </p>
               </div>

               <div className="space-y-4">
                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="whiteLabelEnabled"
                     checked={currentBranding.whiteLabelEnabled}
                     onChange={(e) => updateBranding({ whiteLabelEnabled: e.target.checked })}
                     className="rounded"
                   />
                   <Label htmlFor="whiteLabelEnabled">Enable White Label Mode</Label>
                 </div>

                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="removeJobPortalBranding"
                     checked={currentBranding.removeJobPortalBranding || false}
                     onChange={(e) => updateBranding({ removeJobPortalBranding: e.target.checked })}
                     className="rounded"
                   />
                   <Label htmlFor="removeJobPortalBranding">Remove JobPortal Branding</Label>
                 </div>

                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="hidePoweredBy"
                     checked={currentBranding.whiteLabelSettings?.hidePoweredBy || false}
                     onChange={(e) => updateBranding({ 
                       whiteLabelSettings: {
                         ...currentBranding.whiteLabelSettings,
                         hidePoweredBy: e.target.checked
                       }
                     })}
                     className="rounded"
                   />
                   <Label htmlFor="hidePoweredBy">Hide &quot;Powered by JobPortal&quot;</Label>
                 </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <Label htmlFor="customHeaderText">Custom Header Text</Label>
                   <Input
                     id="customHeaderText"
                     value={currentBranding.customHeaderText || ''}
                     onChange={(e) => updateBranding({ customHeaderText: e.target.value })}
                     placeholder="Your custom header text"
                     className="mt-1"
                   />
                 </div>

                 <div>
                   <Label htmlFor="customFooterText">Custom Footer Text</Label>
                   <Input
                     id="customFooterText"
                     value={currentBranding.customFooterText || ''}
                     onChange={(e) => updateBranding({ customFooterText: e.target.value })}
                     placeholder="Your custom footer text"
                     className="mt-1"
                   />
                 </div>
               </div>

               <div className="space-y-4">
                 <h4 className="font-medium">SEO & Meta Tags</h4>
                 <div>
                   <Label htmlFor="customMetaTitle">Custom Meta Title</Label>
                   <Input
                     id="customMetaTitle"
                     value={currentBranding.whiteLabelSettings?.customMetaTitle || ''}
                     onChange={(e) => updateBranding({ 
                       whiteLabelSettings: {
                         ...currentBranding.whiteLabelSettings,
                         customMetaTitle: e.target.value
                       }
                     })}
                     placeholder="Your Job Board - Find Your Next Career"
                     className="mt-1"
                   />
                 </div>

                 <div>
                   <Label htmlFor="customMetaDescription">Custom Meta Description</Label>
                   <Textarea
                     id="customMetaDescription"
                     value={currentBranding.whiteLabelSettings?.customMetaDescription || ''}
                     onChange={(e) => updateBranding({ 
                       whiteLabelSettings: {
                         ...currentBranding.whiteLabelSettings,
                         customMetaDescription: e.target.value
                       }
                     })}
                     placeholder="Discover amazing career opportunities at our company..."
                     className="mt-1"
                     rows={3}
                   />
                 </div>

                 <div>
                   <Label htmlFor="customKeywords">Custom Keywords (comma-separated)</Label>
                   <Input
                     id="customKeywords"
                     value={currentBranding.whiteLabelSettings?.customKeywords?.join(', ') || ''}
                     onChange={(e) => updateBranding({ 
                       whiteLabelSettings: {
                         ...currentBranding.whiteLabelSettings,
                         customKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                       }
                     })}
                     placeholder="jobs, careers, employment, hiring"
                     className="mt-1"
                   />
                 </div>
               </div>

               <div className="space-y-4">
                 <h4 className="font-medium">Email Templates</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="fromName">From Name</Label>
                     <Input
                       id="fromName"
                       value={currentBranding.whiteLabelSettings?.customEmailTemplates?.fromName || ''}
                       onChange={(e) => updateBranding({ 
                         whiteLabelSettings: {
                           ...currentBranding.whiteLabelSettings,
                           customEmailTemplates: {
                             ...currentBranding.whiteLabelSettings?.customEmailTemplates,
                             fromName: e.target.value
                           }
                         }
                       })}
                       placeholder="Your Company"
                       className="mt-1"
                     />
                   </div>
                   <div>
                     <Label htmlFor="fromEmail">From Email</Label>
                     <Input
                       id="fromEmail"
                       value={currentBranding.whiteLabelSettings?.customEmailTemplates?.fromEmail || ''}
                       onChange={(e) => updateBranding({ 
                         whiteLabelSettings: {
                           ...currentBranding.whiteLabelSettings,
                           customEmailTemplates: {
                             ...currentBranding.whiteLabelSettings?.customEmailTemplates,
                             fromEmail: e.target.value
                           }
                         }
                       })}
                       placeholder="noreply@yourcompany.com"
                       className="mt-1"
                     />
                   </div>
                 </div>
               </div>

               <p className="text-sm text-muted-foreground">
                 White label mode removes all JobPortal branding and shows only your company branding
               </p>
             </CardContent>
           </Card>
         </TabsContent>
      </Tabs>

      {previewMode && (
        <Card className="border-2 border-dashed border-blue-300">
          <CardHeader>
            <CardTitle>Brand Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="branded-job-listing p-6 rounded-lg"
              style={{
                '--brand-primary': currentBranding.primaryColor,
                '--brand-secondary': currentBranding.secondaryColor,
                '--brand-background': currentBranding.backgroundColor,
                '--brand-text': currentBranding.textColor,
              } as React.CSSProperties}
            >
              <div className="flex items-center space-x-4 mb-4">
                {currentBranding.logo && (
                  <img
                    src={currentBranding.logo}
                    alt="Company Logo"
                    className="h-12 w-auto object-contain"
                  />
                )}
                <div>
                  <h3 className="text-xl font-bold job-title">
                    {currentBranding.companyName || 'Your Company'}
                  </h3>
                  <p className="text-sm company-name">
                    {currentBranding.tagline || 'Your company tagline'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold job-title">Senior Software Engineer</h4>
                <p className="text-sm company-name">Full-time • Remote • $80,000 - $120,000</p>
                <p className="text-sm" style={{ color: 'var(--brand-text)' }}>
                  We are looking for a talented software engineer to join our team...
                </p>
                <Button className="apply-button mt-4">
                  Apply Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
