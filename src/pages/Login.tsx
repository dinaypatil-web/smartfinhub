import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/db/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithEmail } = useHybridAuth();
  const [loading, setLoading] = useState(false);
  const [emailLogin, setEmailLogin] = useState({ email: '', password: '' });
  const [phoneLogin, setPhoneLogin] = useState({ phone: '', password: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginWithEmail(emailLogin.email, emailLogin.password);
      navigate('/');
    } catch (error: any) {
      // Error already handled in context
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number format
    if (!phoneLogin.phone.startsWith('+')) {
      toast({
        title: 'Error',
        description: 'Phone number must include country code (e.g., +1234567890)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phoneLogin.phone,
        password: phoneLogin.password,
      });

      if (error) {
        // Check for SMS provider error
        if (error.message.includes('SMS') || error.message.includes('provider') || error.message.includes('phone')) {
          throw new Error('Phone authentication is not configured. Please contact the administrator or use email login.');
        }
        throw error;
      }

      if (data.user) {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number format
    if (!phoneForOtp.startsWith('+')) {
      toast({
        title: 'Error',
        description: 'Phone number must include country code (e.g., +1234567890)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneForOtp,
      });

      if (error) {
        // Check for SMS provider error
        if (error.message.includes('SMS') || error.message.includes('provider') || error.message.includes('phone')) {
          throw new Error('Phone authentication is not configured. Please contact the administrator or use email login.');
        }
        throw error;
      }

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
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneForOtp,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Invalid OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password reset link has been sent to your email',
      });
      
      setForgotPasswordOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-elegant hover-lift">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-4xl font-bold gradient-text">SmartFinHub</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="otp">OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={emailLogin.email}
                    onChange={(e) => setEmailLogin({ ...emailLogin, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="px-0 text-xs h-auto">
                          Forgot Password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword}>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email">Email</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="your@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={resetLoading} className="w-full">
                              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Send Reset Link
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={emailLogin.password}
                    onChange={(e) => setEmailLogin({ ...emailLogin, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full shadow-elegant hover:shadow-glow transition-smooth" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="phone">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Phone authentication requires SMS provider configuration. If you encounter errors, please use email login instead.
                </AlertDescription>
              </Alert>
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-login">Phone Number</Label>
                  <Input
                    id="phone-login"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneLogin.phone}
                    onChange={(e) => setPhoneLogin({ ...phoneLogin, phone: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Include country code (e.g., +1 for US)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-password">Password</Label>
                  <Input
                    id="phone-password"
                    type="password"
                    placeholder="••••••••"
                    value={phoneLogin.password}
                    onChange={(e) => setPhoneLogin({ ...phoneLogin, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  OTP authentication requires SMS provider configuration. If you encounter errors, please use email login instead.
                </AlertDescription>
              </Alert>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-otp">Phone Number</Label>
                    <Input
                      id="phone-otp"
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneForOtp}
                      onChange={(e) => setPhoneForOtp(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Include country code (e.g., +1 for US)</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify OTP
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                  >
                    Back
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
