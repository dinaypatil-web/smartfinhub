import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2, Mail, Phone } from 'lucide-react';
import PhoneAuth from '@/components/PhoneAuth';
import { isMojoAuthConfigured } from '@/services/mojoauth';
import { profileApi } from '@/db/api';
import { useEncryption } from '@/contexts/EncryptionContext';

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const encryption = useEncryption();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationType, setRegistrationType] = useState<'email' | 'phone'>('email');
  const [phoneRegistrationSuccess, setPhoneRegistrationSuccess] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');

  const mojoAuthEnabled = isMojoAuthConfigured();

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create encryption salt for this user
      const encryptionSalt = await encryption.createNewKey(password);
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email`,
          data: {
            encryption_salt: encryptionSalt,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with encryption salt
        await profileApi.updateProfile(data.user.id, {
          encryption_salt: encryptionSalt,
        });
        
        setRegistrationSuccess(true);
        setRegistrationType('email');
        toast({
          title: 'Success',
          description: 'Registration successful! Please check your email to verify your account.',
        });
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

  const handlePhoneAuthSuccess = async (phoneNumber: string, accessToken: string) => {
    setLoading(true);

    try {
      // Create a temporary password for phone-based registration
      const tempPassword = `phone_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Create encryption salt for this user
      const encryptionSalt = await encryption.createNewKey(tempPassword);
      
      // Create user with phone as email (using phone@mojoauth.local format)
      const phoneEmail = `${phoneNumber.replace(/\+/g, '')}@mojoauth.local`;
      
      const { data, error } = await supabase.auth.signUp({
        email: phoneEmail,
        password: tempPassword,
        options: {
          data: {
            phone: phoneNumber,
            auth_method: 'phone',
            mojoauth_token: accessToken,
            encryption_salt: encryptionSalt,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with phone number and encryption salt
        await profileApi.updateProfile(data.user.id, { 
          phone: phoneNumber,
          email: phoneEmail,
          encryption_salt: encryptionSalt,
        });

        setRegisteredPhone(phoneNumber);
        setPhoneRegistrationSuccess(true);
        setRegistrationType('phone');
        
        toast({
          title: 'Success',
          description: 'Phone number verified! Your account has been created.',
        });

        // Auto-login after successful registration
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Phone registration error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete registration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (phoneRegistrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md shadow-elegant animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Registration Complete!</CardTitle>
            <CardDescription className="text-base">
              Your phone number <strong>{registeredPhone}</strong> has been verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your account has been created successfully. You can now sign in with your phone number.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please check your email inbox and click the verification link to activate your account.
                The link will expire in 24 hours.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes and check again</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setRegistrationSuccess(false);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Register with a different email
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already verified?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-elegant hover-lift">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-4xl font-bold gradient-text">SmartFinHub</CardTitle>
          <CardDescription className="text-base">
            Create your account to get started
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
                <form onSubmit={handleEmailRegister} className="space-y-4">
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
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 6 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone">
                <PhoneAuth onSuccess={handlePhoneAuthSuccess} />
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleEmailRegister} className="space-y-4">
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
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
