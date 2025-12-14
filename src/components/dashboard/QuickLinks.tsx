import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Smartphone } from 'lucide-react';
import { getPaymentAppsForCountry, type PaymentApp } from '@/config/paymentApps';
import { useToast } from '@/hooks/use-toast';

interface QuickLinksProps {
  countryCode: string;
}

export default function QuickLinks({ countryCode }: QuickLinksProps) {
  const { toast } = useToast();
  const paymentApps = getPaymentAppsForCountry(countryCode);

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

  if (paymentApps.length === 0) {
    return null;
  }

  return (
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
                <span className="font-semibold text-sm">{app.name}</span>
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground text-left w-full">
                {app.description}
              </p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
