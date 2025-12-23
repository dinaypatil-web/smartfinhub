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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Your Bank Apps
              </CardTitle>
              <CardDescription>
                Quick access to your bank and financial institution apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
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
                      className="h-auto flex-col items-start p-4 hover:bg-accent transition-smooth"
                      onClick={() => handleOpenBank(bank)}
                    >
                      <div className="flex items-center gap-2 w-full mb-2">
                        {bank.logo ? (
                          <img 
                            src={bank.logo} 
                            alt={`${bank.name} logo`}
                            className="h-8 w-8 object-contain rounded flex-shrink-0"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-semibold text-sm break-words flex-1 text-left">{bank.name}</span>
                        {hasLink ? (
                          <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                        ) : (
                          <span className="text-xs text-muted-foreground flex-shrink-0">⚙️</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-left w-full break-words whitespace-normal">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Quick Payment Apps
              </CardTitle>
              <CardDescription>
                Access popular payment apps for your region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {paymentApps.map((app) => (
                  <Button
                    key={app.name}
                    variant="outline"
                    className="h-auto flex-col items-start p-4 hover:bg-accent transition-smooth"
                    onClick={() => handleOpenApp(app)}
                  >
                    <div className="flex items-center gap-2 w-full mb-2">
                      {app.logoUrl ? (
                        <img 
                          src={app.logoUrl} 
                          alt={`${app.name} logo`}
                          className="h-8 w-8 object-contain rounded flex-shrink-0"
                        />
                      ) : (
                        <span className="text-2xl flex-shrink-0">{app.icon}</span>
                      )}
                      <span className="font-semibold text-sm break-words flex-1 text-left">{app.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground text-left w-full break-words whitespace-normal">
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
