import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'signup') {
          setStatus('error');
          setMessage('Invalid verification link. Please check your email and try again.');
          return;
        }

        // Verify the email using the token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (error) {
          console.error('Email verification error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may have expired.');
          return;
        }

        setStatus('success');
        setMessage('Email verified successfully! You can now sign in to your account.');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold gradient-text">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address'}
            {status === 'success' && 'Your email has been verified'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-center text-foreground font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-center text-foreground font-medium">{message}</p>
              <div className="flex flex-col w-full space-y-2">
                <Button onClick={() => navigate('/register')} className="w-full">
                  Back to Registration
                </Button>
                <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                  Go to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
