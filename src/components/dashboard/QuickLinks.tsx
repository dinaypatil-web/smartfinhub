import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone, Building2 } from 'lucide-react';
import { getPaymentAppsForCountry, getBankAppLink, type PaymentApp, type BankAppLink } from '@/config/paymentApps';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/types/types';
import { useMemo, useState, useEffect } from 'react';
import { SelectBankAppDialog } from './SelectBankAppDialog';
import { customBankLinkApi } from '@/db/api';
import { useHybridAuth } from '@/contexts/HybridAuthContext';

interface QuickLinksProps {
  countryCode: string;
  accounts?: Account[];
}

interface BankQuickLink {
  accountId: string;
  name: string;
  logo: string | null;
  link: BankAppLink | null;
  customLink?: {
    app_name: string;
    app_url: string;
  } | null;
}

export default function QuickLinks({ countryCode, accounts = [] }: QuickLinksProps) {
  const { toast } = useToast();
  const { profile } = useHybridAuth();
  const paymentApps = getPaymentAppsForCountry(countryCode);
  const [customLinks, setCustomLinks] = useState<Map<string, { app_name: string; app_url: string }>>(new Map());
  const [selectedBank, setSelectedBank] = useState<BankQuickLink | null>(null);
  const [showSelectDialog, setShowSelectDialog] = useState(false);

  // Load custom links for user's accounts
  useEffect(() => {
    if (!profile?.id) return;

    const loadCustomLinks = async () => {
      try {
        const links = await customBankLinkApi.getAllCustomLinks(profile.id);
        const linksMap = new Map();
        links.forEach(link => {
          linksMap.set(link.account_id, {
            app_name: link.app_name,
            app_url: link.app_url
          });
        });
        setCustomLinks(linksMap);
      } catch (error) {
        console.error('Error loading custom links:', error);
      }
    };

    loadCustomLinks();
  }, [profile?.id]);

  // Extract unique banks from user's accounts
  const userBanks = useMemo(() => {
    const banksMap = new Map<string, BankQuickLink>();
    
    accounts.forEach(account => {
      if (account.account_type !== 'cash' && account.institution_name) {
        if (!banksMap.has(account.institution_name)) {
          const bankLink = getBankAppLink(account.institution_name);
          const customLink = customLinks.get(account.id);
          
          banksMap.set(account.institution_name, {
            accountId: account.id,
            name: account.institution_name,
            logo: account.institution_logo || bankLink?.logoUrl || null,
            link: bankLink,
            customLink: customLink || null,
          });
        }
      }
    });
    
    return Array.from(banksMap.values());
  }, [accounts, customLinks]);

  const handleOpenApp = (app: PaymentApp) => {
    try {
      // Try deep link first, fallback to web
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, try deep link
        window.location.href = app.deepLink;
        
        // Fallback to web URL after delay
        setTimeout(() => {
          if (document.hidden) {
            // App opened successfully
            return;
          }
          // App didn't open, go to web URL
          window.open(app.webUrl, '_blank');
        }, 1500);
      } else {
        // On desktop, open web URL directly
        window.open(app.webUrl, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to open ${app.name}`,
        variant: 'destructive',
      });
    }
  };

  const handleOpenBank = (bank: BankQuickLink) => {
    // Check if user has a custom link preference
    if (bank.customLink) {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
          // Try to open the custom app link
          window.location.href = bank.customLink.app_url;
          
          // Fallback message after delay
          setTimeout(() => {
            if (!document.hidden) {
              toast({
                title: 'App Not Installed',
                description: `${bank.customLink?.app_name} may not be installed on your device.`,
                variant: 'default',
              });
            }
          }, 1500);
        } else {
          // On desktop, show message
          toast({
            title: 'Mobile App',
            description: `${bank.customLink.app_name} is configured for ${bank.name}. This works best on mobile devices.`,
            variant: 'default',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to open ${bank.customLink.app_name}`,
          variant: 'destructive',
        });
      }
      return;
    }

    // If no custom link and no default link, show selection dialog
    if (!bank.link || (!bank.link.webUrl && !bank.link.urlScheme)) {
      setSelectedBank(bank);
      setShowSelectDialog(true);
      return;
    }

    // Use default bank link
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile && bank.link.urlScheme) {
        // On mobile, try deep link
        window.location.href = bank.link.urlScheme;
        
        // Fallback to web URL after delay
        setTimeout(() => {
          if (document.hidden) {
            // App opened successfully
            return;
          }
          // App didn't open, go to web URL
          if (bank.link?.webUrl) {
            window.open(bank.link.webUrl, '_blank');
          }
        }, 1500);
      } else {
        // On desktop, open web URL directly
        if (bank.link.webUrl) {
          window.open(bank.link.webUrl, '_blank');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to open ${bank.name}`,
        variant: 'destructive',
      });
    }
  };

  const handleCustomLinkSaved = async () => {
    // Reload custom links
    if (profile?.id) {
      try {
        const links = await customBankLinkApi.getAllCustomLinks(profile.id);
        const linksMap = new Map();
        links.forEach(link => {
          linksMap.set(link.account_id, {
            app_name: link.app_name,
            app_url: link.app_url
          });
        });
        setCustomLinks(linksMap);
      } catch (error) {
        console.error('Error reloading custom links:', error);
      }
    }
  };

  if (paymentApps.length === 0 && userBanks.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {/* User's Bank Apps */}
        {userBanks.length > 0 && (
          <Card className="border border-border/70 shadow-card animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span>Your Bank Apps</span>
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {userBanks.length} Linked
                </span>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Quick access to your bank and financial institution portals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {userBanks.map((bank) => {
                  const hasLink = bank.customLink || (bank.link && (bank.link.webUrl || bank.link.urlScheme));
                  const linkLabel = bank.customLink 
                    ? `Open ${bank.customLink.app_name}`
                    : hasLink 
                      ? 'Open banking app' 
                      : 'Select app to open';
                  
                  return (
                    <Button
                      key={bank.name}
                      variant="outline"
                      className="h-auto flex-col items-start p-3.5 bg-card hover:bg-muted/50 border border-border/80 hover:border-primary/40 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 group text-left"
                      onClick={() => handleOpenBank(bank)}
                    >
                      <div className="flex items-center gap-2.5 w-full mb-2">
                        {bank.logo ? (
                          <img 
                            src={bank.logo} 
                            alt={`${bank.name} logo`}
                            className="h-8 w-8 object-contain rounded-lg flex-shrink-0 bg-muted/40 p-1 border border-border/60 shadow-2xs"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg flex-shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <span className="font-semibold text-xs sm:text-sm text-foreground break-words flex-1 group-hover:text-primary transition-colors">
                          {bank.name}
                        </span>
                        {hasLink ? (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                        ) : (
                          <span className="text-xs text-muted-foreground flex-shrink-0">⚙️</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 w-full font-medium">
                        {linkLabel}
                      </p>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Apps */}
        {paymentApps.length > 0 && (
          <Card className="border border-border/70 shadow-card animate-slide-up animate-stagger-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <span>Quick Payment Apps</span>
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Regional Apps
                </span>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Launch fast payments & UPI apps directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {paymentApps.map((app) => (
                  <Button
                    key={app.name}
                    variant="outline"
                    className="h-auto flex-col items-start p-3.5 bg-card hover:bg-muted/50 border border-border/80 hover:border-emerald-500/40 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 group text-left"
                    onClick={() => handleOpenApp(app)}
                  >
                    <div className="flex items-center gap-2.5 w-full mb-2">
                      {app.logoUrl ? (
                        <img 
                          src={app.logoUrl} 
                          alt={`${app.name} logo`}
                          className="h-8 w-8 object-contain rounded-lg flex-shrink-0 bg-muted/40 p-1 border border-border/60 shadow-2xs"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                          {app.icon}
                        </div>
                      )}
                      <span className="font-semibold text-xs sm:text-sm text-foreground break-words flex-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {app.name}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 w-full font-medium">
                      {app.description}
                    </p>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Select Bank App Dialog */}
      {selectedBank && profile && (
        <SelectBankAppDialog
          open={showSelectDialog}
          onOpenChange={setShowSelectDialog}
          accountId={selectedBank.accountId}
          accountName={selectedBank.name}
          institutionName={selectedBank.name}
          userId={profile.id}
          onSuccess={handleCustomLinkSaved}
        />
      )}
    </>
  );
}
