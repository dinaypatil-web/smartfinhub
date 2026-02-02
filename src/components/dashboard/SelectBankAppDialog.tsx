import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink, Smartphone, Plus } from 'lucide-react';
import { bankingApps, type BankingApp } from '@/data/bankingApps';
import { customBankLinkApi } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface SelectBankAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  institutionName: string;
  userId: string;
  onSuccess: () => void;
}

export function SelectBankAppDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  institutionName,
  userId,
  onSuccess
}: SelectBankAppDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<BankingApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'unknown'>('unknown');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customAppName, setCustomAppName] = useState('');
  const [customAppUrl, setCustomAppUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    if (/android/i.test(userAgent)) {
      setPlatform('android');
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform('ios');
    }
  }, []);

  const filteredApps = searchQuery
    ? bankingApps.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bankingApps;

  const appsByCategory = {
    upi: filteredApps.filter(app => app.category === 'upi'),
    wallet: filteredApps.filter(app => app.category === 'wallet'),
    banking: filteredApps.filter(app => app.category === 'banking'),
    payment: filteredApps.filter(app => app.category === 'payment')
  };

  const handleSelectApp = async (app: BankingApp) => {
    setSelectedApp(app);
    setLoading(true);

    try {
      await customBankLinkApi.createCustomLink({
        user_id: userId,
        account_id: accountId,
        institution_name: institutionName,
        app_name: app.name,
        app_url: app.deepLink || app.webUrl
      });

      toast({
        title: 'App Link Saved',
        description: `${app.name} will be used for ${accountName} quick link.`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving custom link:', error);
      toast({
        title: 'Error',
        description: 'Failed to save app preference. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setSelectedApp(null);
    }
  };

  const handleOpenAppStore = () => {
    const searchTerm = encodeURIComponent(institutionName + ' banking app');
    let storeUrl = '';

    if (platform === 'android') {
      storeUrl = `https://play.google.com/store/search?q=${searchTerm}&c=apps`;
    } else if (platform === 'ios') {
      storeUrl = `https://apps.apple.com/search?term=${searchTerm}`;
    } else {
      storeUrl = `https://play.google.com/store/search?q=${searchTerm}&c=apps`;
    }

    window.open(storeUrl, '_blank');
    
    toast({
      title: 'Opening App Store',
      description: `After installing the app, use "Add Custom App" below to save the link.`
    });
  };

  const handleSaveCustomApp = async () => {
    if (!customAppName.trim() || !customAppUrl.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both app name and URL/deep link.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await customBankLinkApi.createCustomLink({
        user_id: userId,
        account_id: accountId,
        institution_name: institutionName,
        app_name: customAppName.trim(),
        app_url: customAppUrl.trim()
      });

      toast({
        title: 'Custom App Link Saved',
        description: `${customAppName} will be used for ${accountName} quick link.`
      });

      setCustomAppName('');
      setCustomAppUrl('');
      setShowCustomForm(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving custom app link:', error);
      toast({
        title: 'Error',
        description: 'Failed to save custom app link. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const AppCard = ({ app }: { app: BankingApp }) => (
    <button
      onClick={() => handleSelectApp(app)}
      disabled={loading}
      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-12 h-12 flex items-center justify-center bg-background rounded-lg border border-border overflow-hidden flex-shrink-0">
        <img
          src={app.logo}
          alt={app.name}
          className="w-10 h-10 object-contain"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/40?text=' + app.name.charAt(0);
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{app.name}</h4>
        <p className="text-xs text-muted-foreground truncate">{app.description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] h-[95vh] max-h-[900px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Select Banking App</DialogTitle>
          <DialogDescription>
            Choose which app to open when you click the quick link for <strong>{accountName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="upi">UPI</TabsTrigger>
                <TabsTrigger value="wallet">Wallet</TabsTrigger>
                <TabsTrigger value="banking">Bank</TabsTrigger>
                <TabsTrigger value="payment">Pay</TabsTrigger>
              </TabsList>

              <div className="min-h-[300px]">
                <TabsContent value="all" className="space-y-2 mt-0">
                  {filteredApps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No apps found matching your search
                    </div>
                  ) : (
                    filteredApps.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>

                <TabsContent value="upi" className="space-y-2 mt-0">
                  {appsByCategory.upi.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No UPI apps found
                    </div>
                  ) : (
                    appsByCategory.upi.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>

                <TabsContent value="wallet" className="space-y-2 mt-0">
                  {appsByCategory.wallet.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No wallet apps found
                    </div>
                  ) : (
                    appsByCategory.wallet.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>

                <TabsContent value="banking" className="space-y-2 mt-0">
                  {appsByCategory.banking.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No banking apps found
                    </div>
                  ) : (
                    appsByCategory.banking.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>

                <TabsContent value="payment" className="space-y-2 mt-0">
                  {appsByCategory.payment.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment apps found
                    </div>
                  ) : (
                    appsByCategory.payment.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-1">Can't find your app?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Search for {institutionName} in your device's app store
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenAppStore}
                    className="w-full"
                  >
                    Open {platform === 'ios' ? 'App Store' : 'Play Store'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Plus className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-1">Add Custom App Link</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    After installing an app from the store, add its link here
                  </p>
                  
                  {!showCustomForm ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCustomForm(true)}
                      className="w-full"
                    >
                      Add Custom App
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="custom-app-name" className="text-xs">App Name</Label>
                        <Input
                          id="custom-app-name"
                          placeholder="e.g., Chase Mobile"
                          value={customAppName}
                          onChange={(e) => setCustomAppName(e.target.value)}
                          disabled={loading}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="custom-app-url" className="text-xs">
                          App URL or Deep Link
                        </Label>
                        <Input
                          id="custom-app-url"
                          placeholder="e.g., chase:// or https://..."
                          value={customAppUrl}
                          onChange={(e) => setCustomAppUrl(e.target.value)}
                          disabled={loading}
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the app's deep link (e.g., chase://) or web URL
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveCustomApp}
                          disabled={loading}
                          className="flex-1"
                        >
                          Save Link
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setShowCustomForm(false);
                            setCustomAppName('');
                            setCustomAppUrl('');
                          }}
                          disabled={loading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
