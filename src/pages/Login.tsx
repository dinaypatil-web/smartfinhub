import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Loader2, Mail, Phone } from 'lucide-react';
import { supabase } from '@/db/supabase';
import PhoneAuth from '@/components/PhoneAuth';
import { isMojoAuthConfigured } from '@/services/mojoauth';
import { profileApi } from '@/db/api';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithEmail } = useHybridAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const mojoAuthEnabled = isMojoAuthConfigured();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (error: any) {
      // Error already handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password reset link sent to your email',
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

  const handlePhoneAuthSuccess = async (phoneNumber: string, accessToken: string) => {
    setLoading(true);

    try {
      // Find user by phone number in profiles
      const profile = await profileApi.getProfileByPhone(phoneNumber);
      
      if (!profile) {
        throw new Error('No account found with this phone number. Please register first.');
      }

      // Sign in with the phone-based email
      const phoneEmail = `${phoneNumber.replace(/\+/g, '')}@mojoauth.local`;
      const tempPassword = `phone_${profile.id}`;
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: tempPassword,
      });

      if (error) {
        // If password doesn't match, update it with MojoAuth token
        const { error: updateError } = await supabase.auth.updateUser({
          password: tempPassword,
        });
        
        if (updateError) throw updateError;
        
        // Retry sign in
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: phoneEmail,
          password: tempPassword,
        });
        
        if (retryError) throw retryError;
      }

      toast({
        title: 'Success',
        description: 'Signed in successfully!',
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Phone login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with phone number',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
          {mojoAuthEnabled ? (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="px-0 text-sm">
                          Forgot password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <form onSubmit={handleForgotPassword}>
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
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
                          disabled={resetLoading}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={resetLoading}>
                        {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="phone">
          <PhoneAuth onSuccess={handlePhoneAuthSuccess} />
        </TabsContent>
      </Tabs>
    ) : (
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-fallback">Email</Label>
          <Input
            id="email-fallback"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-fallback">Password</Label>
          <Input
            id="password-fallback"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="flex justify-end">
          <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="px-0 text-sm">
                Forgot password?
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleForgotPassword}>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter your email address and we'll send you a link to reset your password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={resetLoading}>
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>
    )}
  </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
