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
    if (!bankLink) return;
    
    let url = '';
    switch (type) {
      case 'web':
        url = bankLink.web_url || '';
        break;
      case 'ios':
        url = bankLink.ios_app_url || '';
        break;
      case 'android':
        url = bankLink.android_app_url || '';
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
    if (!bankLink) return;
    
    const platform = detectPlatform();
    
    // Try deep link first for mobile platforms
    if (platform === 'ios' && bankLink.deep_link_ios) {
      window.location.href = bankLink.deep_link_ios;
      // Fallback to app store after a delay if deep link fails
      setTimeout(() => {
        if (bankLink.ios_app_url) {
          window.open(bankLink.ios_app_url, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else if (platform === 'android' && bankLink.deep_link_android) {
      window.location.href = bankLink.deep_link_android;
      // Fallback to play store after a delay if deep link fails
      setTimeout(() => {
        if (bankLink.android_app_url) {
          window.open(bankLink.android_app_url, '_blank', 'noopener,noreferrer');
        }
      }, 1500);
    } else if (bankLink.web_url) {
      window.open(bankLink.web_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return null;
  }

  // If no bank link found and no custom links, show add button only
  if (!bankLink && customLinks.length === 0) {
    return (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Bank Link
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Bank Link</DialogTitle>
            <DialogDescription>
              Add quick links to access your bank's website or mobile app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={newLink.bank_name}
                onChange={(e) => setNewLink({ ...newLink, bank_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="web_url">Website URL</Label>
              <Input
                id="web_url"
                type="url"
                placeholder="https://www.bank.com"
                value={newLink.web_url}
                onChange={(e) => setNewLink({ ...newLink, web_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ios_app_url">iOS App URL</Label>
              <Input
                id="ios_app_url"
                type="url"
                placeholder="https://apps.apple.com/..."
                value={newLink.ios_app_url}
                onChange={(e) => setNewLink({ ...newLink, ios_app_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="android_app_url">Android App URL</Label>
              <Input
                id="android_app_url"
                type="url"
                placeholder="https://play.google.com/..."
                value={newLink.android_app_url}
                onChange={(e) => setNewLink({ ...newLink, android_app_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={newLink.notes}
                onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddCustomLink} className="w-full">
              Add Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {bankLink && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={openSmartLink}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Bank
          </Button>
          
          {bankLink.web_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openBankLink('web')}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              Web
            </Button>
          )}
          
          {(bankLink.ios_app_url || bankLink.android_app_url) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const platform = detectPlatform();
                if (platform === 'ios') openBankLink('ios');
                else if (platform === 'android') openBankLink('android');
                else openBankLink('web');
              }}
              className="gap-2"
            >
              <Smartphone className="h-4 w-4" />
              App
            </Button>
          )}
        </>
      )}
      
      {customLinks.map((link) => (
        <Button
          key={link.id}
          variant="outline"
          size="sm"
          onClick={() => openCustomLink(link)}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {link.bank_name}
        </Button>
      ))}
      
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Bank Link</DialogTitle>
            <DialogDescription>
              Add additional quick links to access your bank's services.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bank_name">Link Name</Label>
              <Input
                id="bank_name"
                value={newLink.bank_name}
                onChange={(e) => setNewLink({ ...newLink, bank_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="web_url">Website URL</Label>
              <Input
                id="web_url"
                type="url"
                placeholder="https://www.bank.com"
                value={newLink.web_url}
                onChange={(e) => setNewLink({ ...newLink, web_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ios_app_url">iOS App URL</Label>
              <Input
                id="ios_app_url"
                type="url"
                placeholder="https://apps.apple.com/..."
                value={newLink.ios_app_url}
                onChange={(e) => setNewLink({ ...newLink, ios_app_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="android_app_url">Android App URL</Label>
              <Input
                id="android_app_url"
                type="url"
                placeholder="https://play.google.com/..."
                value={newLink.android_app_url}
                onChange={(e) => setNewLink({ ...newLink, android_app_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={newLink.notes}
                onChange={(e) => setNewLink({ ...newLink, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleAddCustomLink} className="w-full">
              Add Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
