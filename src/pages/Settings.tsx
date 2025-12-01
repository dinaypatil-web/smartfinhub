import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { countries } from '@/utils/countries';
import { generateOTP, sendOTP, storeOTP, verifyOTP, formatPhoneNumber, isValidPhoneNumber } from '@/utils/otp';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    default_country: profile?.default_country || 'IN',
    default_currency: profile?.default_currency || 'INR',
  });

  // Phone update states
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneData, setPhoneData] = useState({
    countryCode: '+91',
    phone: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [showPhoneForm, setShowPhoneForm] = useState(false);

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

  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!isValidPhoneNumber(phoneData.phone)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setPhoneLoading(true);

    try {
      // Format phone number with country code
      const fullPhone = formatPhoneNumber(phoneData.phone, phoneData.countryCode.replace('+', ''));
      
      // Generate OTP
      const newOTP = generateOTP();
      
      // Send OTP via Twilio
      const result = await sendOTP(fullPhone, newOTP);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Store OTP locally for verification
      storeOTP(fullPhone, newOTP);
      
      setFormattedPhone(fullPhone);
      setOtpSent(true);
      
      toast({
        title: 'OTP Sent',
        description: 'Please check your phone for the verification code.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPhoneLoading(true);

    try {
      // Verify OTP
      const verification = verifyOTP(formattedPhone, otp);
      
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid OTP');
      }

      // Update profile with verified phone number
      await profileApi.updateProfile(user.id, { phone: formattedPhone });
      await refreshProfile();
      
      toast({
        title: 'Success',
        description: 'Phone number updated successfully! You can now login with this number.',
      });

      // Reset form
      setOtpSent(false);
      setOtp('');
      setPhoneData({ countryCode: '+91', phone: '' });
      setShowPhoneForm(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify OTP',
        variant: 'destructive',
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResendPhoneOTP = async () => {
    setPhoneLoading(true);
    
    try {
      // Generate new OTP
      const newOTP = generateOTP();
      
      // Send OTP via Twilio
      const result = await sendOTP(formattedPhone, newOTP);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Store OTP locally for verification
      storeOTP(formattedPhone, newOTP);
      
      toast({
        title: 'OTP Resent',
        description: 'A new verification code has been sent to your phone.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend OTP',
        variant: 'destructive',
      });
    } finally {
      setPhoneLoading(false);
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
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Number
          </CardTitle>
          <CardDescription>
            {profile?.phone 
              ? 'Update your phone number for login and notifications'
              : 'Add a phone number to enable phone-based login'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPhoneForm && !otpSent ? (
            <div className="space-y-4">
              {profile?.phone && (
                <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-900 dark:text-emerald-100">
                    Current phone: {profile.phone}
                  </AlertDescription>
                </Alert>
              )}
              <Button 
                onClick={() => setShowPhoneForm(true)}
                variant={profile?.phone ? "outline" : "default"}
              >
                <Phone className="mr-2 h-4 w-4" />
                {profile?.phone ? 'Update Phone Number' : 'Add Phone Number'}
              </Button>
            </div>
          ) : !otpSent ? (
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  We'll send you a verification code via SMS to confirm your phone number.
                </AlertDescription>
              </Alert>
              <form onSubmit={handleSendPhoneOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="country-code">Country Code</Label>
                  <Select
                    value={phoneData.countryCode}
                    onValueChange={(value) => setPhoneData({ ...phoneData, countryCode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+91">🇮🇳 India (+91)</SelectItem>
                      <SelectItem value="+1">🇺🇸 USA (+1)</SelectItem>
                      <SelectItem value="+44">🇬🇧 UK (+44)</SelectItem>
                      <SelectItem value="+61">🇦🇺 Australia (+61)</SelectItem>
                      <SelectItem value="+86">🇨🇳 China (+86)</SelectItem>
                      <SelectItem value="+81">🇯🇵 Japan (+81)</SelectItem>
                      <SelectItem value="+82">🇰🇷 South Korea (+82)</SelectItem>
                      <SelectItem value="+65">🇸🇬 Singapore (+65)</SelectItem>
                      <SelectItem value="+971">🇦🇪 UAE (+971)</SelectItem>
                      <SelectItem value="+966">🇸🇦 Saudi Arabia (+966)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="1234567890"
                    value={phoneData.phone}
                    onChange={(e) => setPhoneData({ ...phoneData, phone: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter your phone number without country code</p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={phoneLoading}>
                    {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Verification Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPhoneForm(false);
                      setPhoneData({ countryCode: '+91', phone: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  A 6-digit verification code has been sent to {formattedPhone}
                </AlertDescription>
              </Alert>
              <form onSubmit={handleVerifyPhoneOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Code expires in 10 minutes
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={phoneLoading || otp.length !== 6}>
                  {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Update Phone Number
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleResendPhoneOTP}
                    disabled={phoneLoading}
                  >
                    {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setShowPhoneForm(false);
                      setPhoneData({ countryCode: '+91', phone: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{profile?.email || 'Not set'}</p>
          </div>
          <div>
            <Label>Phone</Label>
            <p className="text-sm text-muted-foreground">{profile?.phone || 'Not set'}</p>
          </div>
          <div>
            <Label>Role</Label>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role || 'user'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
