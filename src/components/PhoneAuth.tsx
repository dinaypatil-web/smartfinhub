import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendOTP, verifyOTP, resendOTP, validatePhoneNumber, formatPhoneNumber } from '@/services/mojoauth';

interface PhoneAuthProps {
  onSuccess: (phoneNumber: string, accessToken: string) => void;
  onCancel?: () => void;
}

export default function PhoneAuth({ onSuccess, onCancel }: PhoneAuthProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [stateId, setStateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number in international format (e.g., +1234567890)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await sendOTP(phoneNumber);
      setStateId(response.state_id);
      setStep('otp');
      startCountdown();
      toast({
        title: 'OTP Sent',
        description: `Verification code sent to ${formatPhoneNumber(phoneNumber)}`,
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

    if (otp.length < 4) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the complete verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOTP(stateId, otp);
      
      if (response.authenticated) {
        toast({
          title: 'Success',
          description: 'Phone number verified successfully!',
        });
        onSuccess(phoneNumber, response.oauth.access_token);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid OTP code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setResendLoading(true);

    try {
      const response = await resendOTP(stateId);
      setStateId(response.state_id);
      startCountdown();
      toast({
        title: 'OTP Resent',
        description: 'A new verification code has been sent',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend OTP',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setStateId('');
    setCountdown(0);
  };

  if (step === 'otp') {
    return (
      <div className="space-y-4 animate-slide-left">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Verify Your Phone</h3>
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to<br />
            <strong>{formatPhoneNumber(phoneNumber)}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              disabled={loading}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The verification code will expire in 10 minutes. Please enter it promptly.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" disabled={loading || otp.length < 4} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={handleResendOTP}
              disabled={countdown > 0 || resendLoading}
              className="text-sm"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : countdown > 0 ? (
                `Resend code in ${countdown}s`
              ) : (
                'Resend verification code'
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-right">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Sign Up with Phone</h3>
        <p className="text-sm text-muted-foreground">
          Enter your phone number to receive a verification code
        </p>
      </div>

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 234 567 8900"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +1 for US, +91 for India, +44 for UK)
          </p>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            We'll send you a one-time verification code via SMS to confirm your phone number.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Verification Code
          </Button>
        </div>
      </form>
    </div>
  );
}
