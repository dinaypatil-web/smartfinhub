import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone, Building2 } from 'lucide-react';
import { getPaymentAppsForCountry, getBankAppLink, type PaymentApp, type BankAppLink } from '@/config/paymentApps';
import { useToast } from '@/hooks/use-toast';
import type { Account } from '@/types/types';
import { useMemo } from 'react';

interface QuickLinksProps {
  countryCode: string;
  accounts?: Account[];
}

interface BankQuickLink {
  name: string;
  logo: string | null;
  link: BankAppLink;
}

export default function QuickLinks({ countryCode, accounts = [] }: QuickLinksProps) {
  const { toast } = useToast();
  const paymentApps = getPaymentAppsForCountry(countryCode);

  // Extract unique banks from user's accounts
  const userBanks = useMemo(() => {
    const banksMap = new Map<string, BankQuickLink>();
    
    accounts.forEach(account => {
      if (account.account_type !== 'cash' && account.institution_name) {
        const bankLink = getBankAppLink(account.institution_name);
        if (bankLink && !banksMap.has(account.institution_name)) {
          banksMap.set(account.institution_name, {
            name: account.institution_name,
            logo: account.institution_logo,
            link: bankLink,
          });
        }
      }
    });
    
    return Array.from(banksMap.values());
  }, [accounts]);

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
          if (bank.link.webUrl) {
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

  if (paymentApps.length === 0 && userBanks.length === 0) {
    return null;
  }

  return (
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
              {userBanks.map((bank) => (
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
                        className="h-8 w-8 object-contain rounded"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm break-words line-clamp-2 flex-1">{bank.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground text-left w-full break-words">
                    Open banking app
                  </p>
                </Button>
              ))}
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
                        className="h-8 w-8 object-contain rounded"
                      />
                    ) : (
                      <span className="text-2xl">{app.icon}</span>
                    )}
                    <span className="font-semibold text-sm break-words line-clamp-2 flex-1">{app.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground text-left w-full break-words">
                    {app.description}
                  </p>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
