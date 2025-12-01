import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { generateOTP, sendOTP, storeOTP, verifyOTP, formatPhoneNumber, isValidPhoneNumber } from '@/utils/otp';

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailRegister, setEmailRegister] = useState({ email: '', password: '', confirmPassword: '' });
  const [phoneRegister, setPhoneRegister] = useState({ phone: '', password: '', confirmPassword: '', countryCode: '+91' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emailRegister.password !== emailRegister.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (emailRegister.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailRegister.email,
        password: emailRegister.password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Success',
          description: 'Please check your email to verify your account.',
        });
        navigate('/login');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to register',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneRegister.password !== phoneRegister.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (phoneRegister.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number
    if (!isValidPhoneNumber(phoneRegister.phone)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Format phone number with country code
      const formattedPhone = formatPhoneNumber(phoneRegister.phone, phoneRegister.countryCode.replace('+', ''));
      
      // Generate OTP
      const newOTP = generateOTP();
      setGeneratedOTP(newOTP);
      
      // Send OTP via Twilio
      const result = await sendOTP(formattedPhone, newOTP);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Store OTP locally for verification
      storeOTP(formattedPhone, newOTP);
      
      setPhoneForOtp(formattedPhone);
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
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify OTP
      const verification = verifyOTP(phoneForOtp, otp);
      
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid OTP');
      }

      // OTP verified, now create the account
      const { data, error } = await supabase.auth.signUp({
        phone: phoneForOtp,
        password: phoneRegister.password,
        options: {
          data: {
            phone_verified: true,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setOtpVerified(true);
        toast({
          title: 'Success',
          description: 'Account created successfully!',
        });
        
        // Auto-login after successful registration
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    
    try {
      // Generate new OTP
      const newOTP = generateOTP();
      setGeneratedOTP(newOTP);
      
      // Send OTP via Twilio
      const result = await sendOTP(phoneForOtp, newOTP);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      // Store OTP locally for verification
      storeOTP(phoneForOtp, newOTP);
      
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">SmartFinHub</CardTitle>
          <CardDescription className="text-center">
            Create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleEmailRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={emailRegister.email}
                      onChange={(e) => setEmailRegister({ ...emailRegister, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={emailRegister.password}
                      onChange={(e) => setEmailRegister({ ...emailRegister, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={emailRegister.confirmPassword}
                      onChange={(e) => setEmailRegister({ ...emailRegister, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone">
                <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    We'll send you a verification code via SMS using Twilio.
                  </AlertDescription>
                </Alert>
                <form onSubmit={handlePhoneRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country-code">Country Code</Label>
                    <Select
                      value={phoneRegister.countryCode}
                      onValueChange={(value) => setPhoneRegister({ ...phoneRegister, countryCode: value })}
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
                    <Label htmlFor="phone-register">Phone Number</Label>
                    <Input
                      id="phone-register"
                      type="tel"
                      placeholder="1234567890"
                      value={phoneRegister.phone}
                      onChange={(e) => setPhoneRegister({ ...phoneRegister, phone: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Enter your phone number without country code</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-password">Password</Label>
                    <Input
                      id="phone-password"
                      type="password"
                      placeholder="••••••••"
                      value={phoneRegister.password}
                      onChange={(e) => setPhoneRegister({ ...phoneRegister, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-confirm-password">Confirm Password</Label>
                    <Input
                      id="phone-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={phoneRegister.confirmPassword}
                      onChange={(e) => setPhoneRegister({ ...phoneRegister, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Verification Code
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {!otpVerified ? (
                <>
                  <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 dark:text-blue-100">
                      A 6-digit verification code has been sent to {phoneForOtp}
                    </AlertDescription>
                  </Alert>
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
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
                    <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verify & Complete Registration
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleResendOTP}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resend Code
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp('');
                          setOtpVerified(false);
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-900 dark:text-emerald-100">
                    Account created successfully! Redirecting to dashboard...
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
