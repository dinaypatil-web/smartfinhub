/**
 * Encryption Setup Component
 * 
 * Prompts user to enter password to derive encryption key after login.
 * This is required for end-to-end encryption of sensitive data.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { profileApi } from '@/db/api';
import { 
  generateSalt, 
  deriveKeyFromPassword, 
  arrayBufferToBase64,
  base64ToArrayBuffer,
  keyManager 
} from '@/utils/encryption';
import { useToast } from '@/hooks/use-toast';

export default function EncryptionSetup() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, profile, refreshProfile, updateEncryptionKeyStatus } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSetupEncryption = async () => {
    if (!password) {
      toast({
        title: 'Password Required',
        description: 'Please enter your password to set up encryption.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !profile) {
      toast({
        title: 'Error',
        description: 'User session not found. Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let salt: Uint8Array;

      // Check if user already has a salt
      if (profile.encryption_salt) {
        // Use existing salt
        salt = base64ToArrayBuffer(profile.encryption_salt);
      } else {
        // Generate new salt for first-time setup
        salt = generateSalt();
        const saltBase64 = arrayBufferToBase64(salt);

        // Save salt to database
        await profileApi.updateProfile(user.id, {
          encryption_salt: saltBase64,
        });

        // Refresh profile to get updated salt
        await refreshProfile();
      }

      // Derive encryption key from password
      const encryptionKey = await deriveKeyFromPassword(password, salt);

      // Store key in session
      await keyManager.setKey(encryptionKey);

      // Update encryption key status in AuthContext
      updateEncryptionKeyStatus();

      toast({
        title: 'Encryption Enabled',
        description: 'Your data is now protected with end-to-end encryption.',
      });

      // Navigate to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Encryption setup error:', error);
      toast({
        title: 'Setup Failed',
        description: 'Failed to set up encryption. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetupEncryption();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Enable Encryption</CardTitle>
          <CardDescription className="text-center">
            Enter your password to enable end-to-end encryption for your financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Zero-Knowledge Encryption:</strong> Your data is encrypted on your device before being sent to the server. 
              Even the app creator cannot access your information.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your account password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is the same password you use to log in to your account
              </p>
            </div>

            <Button
              onClick={handleSetupEncryption}
              disabled={loading || !password}
              className="w-full"
            >
              {loading ? 'Setting up...' : 'Enable Encryption'}
            </Button>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold">How it works:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your password derives a unique encryption key</li>
              <li>All sensitive data is encrypted before leaving your device</li>
              <li>The encryption key is never sent to the server</li>
              <li>Only you can decrypt your data with your password</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
