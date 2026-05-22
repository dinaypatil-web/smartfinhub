import { useState, useEffect } from 'react';
import { ExternalLink, Smartphone, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bankLinksApi, userCustomBankLinksApi } from '@/db/api';
import type { BankLink, UserCustomBankLink } from '@/types/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BankQuickLinksProps {
  bankName: string;
  country: string;
  accountId: string;
  userId: string;
}

export default function BankQuickLinks({ bankName, country, accountId, userId }: BankQuickLinksProps) {
  const { toast } = useToast();
  const [bankLink, setBankLink] = useState<BankLink | null>(null);
  const [customLinks, setCustomLinks] = useState<UserCustomBankLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLink, setNewLink] = useState({
    bank_name: bankName,
    web_url: '',
    ios_app_url: '',
    android_app_url: '',
    notes: '',
  });

  useEffect(() => {
    loadBankLinks();
  }, [bankName, country, accountId]);

  const loadBankLinks = async () => {
    try {
      setLoading(true);
      
      // Try to find bank link in database
      const link = await bankLinksApi.getBankLinkByName(bankName, country);
      setBankLink(link);
      
      // Load custom links for this account
      const custom = await userCustomBankLinksApi.getCustomBankLinksByAccount(accountId);
      setCustomLinks(custom);
    } catch (error) {
      console.error('Failed to load bank links:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'web';
  };

  const openBankLink = (type: 'web' | 'ios' | 'android') => {
    const webUrl = customLinks[0]?.web_url || bankLink?.web_url;
    const iosAppUrl = customLinks[0]?.ios_app_url || bankLink?.ios_app_url;
    const androidAppUrl = customLinks[0]?.android_app_url || bankLink?.android_app_url;

    let url = '';
    switch (type) {
      case 'web':
        url = webUrl || '';
        break;
      case 'ios':
        url = iosAppUrl || '';
        break;
      case 'android':
        url = androidAppUrl || '';
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Link not available',
        description: `${type.toUpperCase()} link is not available for this bank.`,
        variant: 'destructive',
      });
    }
  };

  const openCustomLink = (link: UserCustomBankLink) => {
    const platform = detectPlatform();
    let url = '';
    
    if (platform === 'ios' && link.ios_app_url) {
      url = link.ios_app_url;
    } else if (platform === 'android' && link.android_app_url) {
      url = link.android_app_url;
    } else if (link.web_url) {
      url = link.web_url;
    }
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAddCustomLink = async () => {
    try {
      if (!newLink.web_url && !newLink.ios_app_url && !newLink.android_app_url) {
        toast({
          title: 'Error',
          description: 'Please provide at least one link (Web, iOS, or Android).',
          variant: 'destructive',
        });
        return;
      }

      await userCustomBankLinksApi.createCustomBankLink({
        user_id: userId,
        account_id: accountId,
        bank_name: newLink.bank_name,
        web_url: newLink.web_url || null,
        ios_app_url: newLink.ios_app_url || null,
        android_app_url: newLink.android_app_url || null,
        notes: newLink.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Custom bank link added successfully.',
      });

      setShowAddDialog(false);
      setNewLink({
        bank_name: bankName,
        web_url: '',
        ios_app_url: '',
        android_app_url: '',
        notes: '',
      });
      
      loadBankLinks();
    } catch (error) {
      console.error('Failed to add custom link:', error);
      toast({
        title: 'Error',
        description: 'Failed to add custom bank link.',
        variant: 'destructive',
      });
    }
  };

  const openSmartLink = () => {
    const webUrl = customLinks[0]?.web_url || bankLink?.web_url;
    const iosAppUrl = customLinks[0]?.ios_app_url || bankLink?.ios_app_url;
    const androidAppUrl = customLinks[0]?.android_app_url || bankLink?.android_app_url;
    const deepLinkIos = bankLink?.deep_link_ios;
    const deepLinkAndroid = bankLink?.deep_link_android;

    const platform = detectPlatform();
    
    // Try deep link first for mobile platforms
    if (platform === 'ios' && deepLinkIos) {
      window.location.href = deepLinkIos;
      // Fallback to app store after a delay if deep link fails
      setTimeout(() => {
        if (iosAppUrl) {
          window.open(iosAppUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else if (platform === 'android' && deepLinkAndroid) {
      window.location.href = deepLinkAndroid;
      // Fallback to play store after a delay if deep link fails
      setTimeout(() => {
        if (androidAppUrl) {
          window.open(androidAppUrl, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else if (platform === 'ios' && iosAppUrl) {
      window.open(iosAppUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'android' && androidAppUrl) {
      window.open(androidAppUrl, '_blank', 'noopener,noreferrer');
    } else if (webUrl) {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Link not available',
        description: 'No webpage or mobile app link is configured for this bank.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return null;
  }

  const webUrl = customLinks[0]?.web_url || bankLink?.web_url;
  const iosAppUrl = customLinks[0]?.ios_app_url || bankLink?.ios_app_url;
  const androidAppUrl = customLinks[0]?.android_app_url || bankLink?.android_app_url;
  const hasAnyLink = !!(webUrl || iosAppUrl || androidAppUrl);

  // If no bank link found and no custom links, show add button only
  if (!hasAnyLink) {
    return (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3.5 text-xs font-semibold border-dashed border-primary/30 text-primary-400 dark:text-primary-300 hover:text-primary-200 hover:border-primary hover:bg-primary/10 transition-smooth hover-lift hover:shadow-glow gap-1.5 flex items-center bg-primary/5"
          >
            <Plus className="h-4 w-4 text-primary animate-pulse-slow" />
            Add Quick Link
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-effect border-white/10 dark:bg-card/90 max-w-sm rounded-xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="gradient-text font-bold text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Configure Quick Links
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Setup quick-action shortcuts for website, iOS app, and Android app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-xs font-semibold text-muted-foreground">Bank Name</Label>
              <Input
                id="bank_name"
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.bank_name}
                onChange={(e) => setNewLink({ ...newLink, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="web_url" className="text-xs font-semibold text-muted-foreground">Website URL</Label>
              <Input
                id="web_url"
                type="url"
                placeholder="https://www.bank.com"
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.web_url}
                onChange={(e) => setNewLink({ ...newLink, web_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ios_app_url" className="text-xs font-semibold text-muted-foreground">iOS App URL</Label>
              <Input
                id="ios_app_url"
                type="url"
                placeholder="https://apps.apple.com/..."
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.ios_app_url}
                onChange={(e) => setNewLink({ ...newLink, ios_app_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="android_app_url" className="text-xs font-semibold text-muted-foreground">Android App URL</Label>
              <Input
                id="android_app_url"
                type="url"
                placeholder="https://play.google.com/..."
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.android_app_url}
                onChange={(e) => setNewLink({ ...newLink, android_app_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any helpful hints..."
                className="bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg min-h-[60px] text-white"
                value={newLink.notes}
                onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddCustomLink} className="w-full h-9 rounded-lg font-semibold text-xs shadow-primary hover:shadow-glow transition-smooth hover-lift mt-2 bg-primary hover:bg-primary/90 text-white">
              Save Quick Links
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {hasAnyLink && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={openSmartLink}
            className="h-8 rounded-full px-3.5 text-xs font-semibold border-primary/30 text-primary-400 dark:text-primary-300 hover:text-primary-200 hover:border-primary hover:bg-primary/10 transition-smooth hover-lift hover:shadow-glow gap-1.5 flex items-center bg-primary/5"
          >
            <ExternalLink className="h-3.5 w-3.5 animate-pulse-slow text-primary" />
            <span>Smart Link</span>
          </Button>
          
          {webUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openBankLink('web')}
              className="h-8 rounded-full px-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 transition-smooth hover-lift gap-1.5 flex items-center bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
              <span>Web Portal</span>
            </Button>
          )}
          
          {(iosAppUrl || androidAppUrl) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const platform = detectPlatform();
                if (platform === 'ios') openBankLink('ios');
                else if (platform === 'android') openBankLink('android');
                else openBankLink('web');
              }}
              className="h-8 rounded-full px-3.5 text-xs font-semibold text-blue-500 dark:text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 transition-smooth hover-lift gap-1.5 flex items-center bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-500" />
              <span>Mobile App</span>
            </Button>
          )}
        </>
      )}
      
      {customLinks.slice(1).map((link) => (
        <Button
          key={link.id}
          variant="outline"
          size="sm"
          onClick={() => openCustomLink(link)}
          className="h-8 rounded-full px-3.5 text-xs font-medium border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth hover-lift gap-1.5 flex items-center"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{link.bank_name}</span>
        </Button>
      ))}
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 flex items-center justify-center transition-smooth hover-lift hover:bg-primary/15 text-muted-foreground hover:text-primary border border-dashed border-border/60 hover:border-primary/40 bg-background/20"
            title="Add Custom Bank Link"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-effect border-white/10 dark:bg-card/90 max-w-sm rounded-xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="gradient-text font-bold text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add Custom Link
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Configure supplementary web portals or app links.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-xs font-semibold text-muted-foreground">Link Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g. NetBanking, Customer Care"
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.bank_name}
                onChange={(e) => setNewLink({ ...newLink, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="web_url" className="text-xs font-semibold text-muted-foreground">Website URL</Label>
              <Input
                id="web_url"
                type="url"
                placeholder="https://www.bank.com/portal"
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.web_url}
                onChange={(e) => setNewLink({ ...newLink, web_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ios_app_url" className="text-xs font-semibold text-muted-foreground">iOS App Store Link (Optional)</Label>
              <Input
                id="ios_app_url"
                type="url"
                placeholder="https://apps.apple.com/..."
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.ios_app_url}
                onChange={(e) => setNewLink({ ...newLink, ios_app_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="android_app_url" className="text-xs font-semibold text-muted-foreground">Android Play Store Link (Optional)</Label>
              <Input
                id="android_app_url"
                type="url"
                placeholder="https://play.google.com/..."
                className="h-9 bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg text-white"
                value={newLink.android_app_url}
                onChange={(e) => setNewLink({ ...newLink, android_app_url: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any helpful hints..."
                className="bg-background/40 border-border/40 focus:border-primary/50 text-xs transition-smooth rounded-lg min-h-[60px] text-white"
                value={newLink.notes}
                onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddCustomLink} className="w-full h-9 rounded-lg font-semibold text-xs shadow-primary hover:shadow-glow transition-smooth hover-lift mt-2 bg-primary hover:bg-primary/90 text-white">
              Save Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
