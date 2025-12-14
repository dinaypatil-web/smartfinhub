import { useState, useEffect } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { profileApi } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Mail, Shield } from 'lucide-react';
import { countries } from '@/utils/countries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import ChangePassword from '@/components/ChangePassword';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    default_country: profile?.default_country || 'IN',
    default_currency: profile?.default_currency || 'INR',
  });
  
  // Phone number update state
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [password, setPassword] = useState('');
  const [updatingPhone, setUpdatingPhone] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        default_country: profile.default_country,
        default_currency: profile.default_currency,
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      await profileApi.updateProfile(user.id, formData);
      await refreshProfile();
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneUpdate = async () => {
    if (!user || !profile?.email) {
      toast({
        title: 'Error',
        description: 'User information not available',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number
    if (!newPhone.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    // Validate password
    if (!password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your password to confirm',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingPhone(true);

    try {
      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (signInError) {
        toast({
          title: 'Error',
          description: 'Incorrect password. Please try again.',
          variant: 'destructive',
        });
        setUpdatingPhone(false);
        return;
      }

      // Update phone number
      await profileApi.updateProfile(user.id, { phone: newPhone });
      await refreshProfile();

      toast({
        title: 'Success',
        description: 'Phone number updated successfully. A notification has been sent to your email.',
      });

      // Reset form and close dialog
      setShowPhoneDialog(false);
      setNewPhone('');
      setPassword('');
    } catch (error: any) {
      console.error('Error updating phone:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update phone number',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPhone(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>
            Set your default country and currency for the dashboard display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="default_country">Default Country</Label>
              <Select
                value={formData.default_country}
                onValueChange={(value) => {
                  const country = countries.find(c => c.code === value);
                  setFormData({
                    default_country: value,
                    default_currency: country?.currency || formData.default_currency
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_currency">Default Currency</Label>
              <Select
                value={formData.default_currency}
                onValueChange={(value) => setFormData({ ...formData, default_currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.currency} value={country.currency}>
                      {country.currency} - {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <p className="text-sm text-muted-foreground mt-1">{profile?.email || 'Not set'}</p>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground flex-1">{profile?.phone || 'Not set'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewPhone(profile?.phone || '');
                  setShowPhoneDialog(true);
                }}
              >
                Update
              </Button>
            </div>
          </div>
          <div>
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{profile?.role || 'user'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Password</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Keep your account secure by using a strong password
              </p>
              <ChangePassword />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Update Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Update Phone Number
            </DialogTitle>
            <DialogDescription>
              Enter your new phone number and confirm with your password for security.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPhone">New Phone Number</Label>
              <Input
                id="newPhone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                disabled={updatingPhone}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US, +91 for India)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Confirm Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={updatingPhone}
              />
              <p className="text-xs text-muted-foreground">
                For security, please confirm your password to update your phone number.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> After updating, a confirmation email will be sent to your registered email address.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPhoneDialog(false);
                setNewPhone('');
                setPassword('');
              }}
              disabled={updatingPhone}
            >
              Cancel
            </Button>
            <Button onClick={handlePhoneUpdate} disabled={updatingPhone}>
              {updatingPhone && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Phone Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
