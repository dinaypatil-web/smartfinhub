import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ExternalLink } from 'lucide-react';
import { bankingApps, type BankingApp } from '@/data/bankingApps';
import { customBankLinkApi } from '@/db/api';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
    payment: filteredApps.filter(app => app.category === 'payment'),
    finance: filteredApps.filter(app => app.category === 'finance')
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
      <DialogContent className="max-w-2xl h-[90vh] max-h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select Banking App</DialogTitle>
          <DialogDescription>
            Choose which app to open when you click the quick link for <strong>{accountName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="banking">Bank</TabsTrigger>
              <TabsTrigger value="payment">Pay</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
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

                <TabsContent value="finance" className="space-y-2 mt-0">
                  {appsByCategory.finance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No finance apps found
                    </div>
                  ) : (
                    appsByCategory.finance.map(app => <AppCard key={app.id} app={app} />)
                  )}
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
