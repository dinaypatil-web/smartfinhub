import { useState, useEffect } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { profileApi } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Mail, Shield, Sun, Moon, Monitor, Palette, Bot, Sparkles, Key, CheckCircle2, AlertCircle, Eye, EyeOff, Zap, ExternalLink } from 'lucide-react';
import { getAIProviderConfig, saveAIProviderConfig, testAIProviderConnection, type AIProviderType } from '@/services/aiService';
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
  const { theme, setTheme } = useTheme();
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

  // AI Configuration state
  const [aiProvider, setAiProvider] = useState<AIProviderType>('builtin');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingAI, setSavingAI] = useState(false);

  useEffect(() => {
    const config = getAIProviderConfig();
    setAiProvider(config.provider);
    setGeminiApiKey(config.geminiApiKey);
    setGeminiModel(config.geminiModel || 'gemini-1.5-flash');
    setGroqApiKey(config.groqApiKey);
    setGroqModel(config.groqModel || 'llama-3.3-70b-versatile');
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const activeKey = aiProvider === 'gemini' ? geminiApiKey : groqApiKey;
      const activeModel = aiProvider === 'gemini' ? geminiModel : groqModel;
      const res = await testAIProviderConnection(aiProvider, activeKey, activeModel);
      setTestResult(res);
      toast({
        title: res.success ? 'Connection Successful' : 'Connection Failed',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed' });
      toast({
        title: 'Connection Test Failed',
        description: e.message || 'An error occurred during testing',
        variant: 'destructive',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAISettings = () => {
    setSavingAI(true);
    try {
      saveAIProviderConfig({
        provider: aiProvider,
        geminiApiKey,
        geminiModel,
        groqApiKey,
        groqModel,
      });
      toast({
        title: 'AI Settings Saved',
        description: `Active AI Provider is set to ${
          aiProvider === 'gemini'
            ? 'Google Gemini Flash (Free)'
            : aiProvider === 'groq'
            ? 'Groq Cloud (Free)'
            : 'Smart Built-in Offline Engine'
        }.`,
      });
    } catch (e: any) {
      toast({
        title: 'Save Failed',
        description: e.message || 'Could not save AI settings',
        variant: 'destructive',
      });
    } finally {
      setSavingAI(false);
    }
  };

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
    <div className="container mx-auto p-6 max-w-2xl space-y-6 animate-fade-in">
      <div className="animate-slide-down">
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose your preferred theme or sync with your system settings
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : 'text-foreground'}`}>
                    Light
                  </span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-foreground'}`}>
                    Dark
                  </span>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Monitor className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : 'text-foreground'}`}>
                    System
                  </span>
                </button>
              </div>
              {theme === 'system' && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>System mode:</strong> The theme will automatically switch based on your device's system preferences.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up animate-stagger-1">
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

      {/* AI Smart Assistant & Engine Configuration Card */}
      <Card className="animate-slide-up animate-stagger-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Smart Assistant & Engine
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Free Tier Available
                  </span>
                </CardTitle>
                <CardDescription>
                  Configure industry-leading free AI providers for intelligent transaction punching, smart descriptions, and financial insights
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ai_provider" className="text-sm font-semibold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Select AI Engine Provider
            </Label>
            <Select
              value={aiProvider}
              onValueChange={(val: AIProviderType) => {
                setAiProvider(val);
                setTestResult(null);
              }}
            >
              <SelectTrigger id="ai_provider" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Google Gemini Flash</span>
                    <span className="text-xs text-muted-foreground">(Free • Fast • Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="groq">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Groq Cloud (Llama 3.3 70B)</span>
                    <span className="text-xs text-muted-foreground">(Free • Ultra Low Latency)</span>
                  </div>
                </SelectItem>
                <SelectItem value="builtin">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Smart Built-in Engine</span>
                    <span className="text-xs text-muted-foreground">(100% Offline • On-Device NLP)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Google Gemini Config */}
          {aiProvider === 'gemini' && (
            <div className="space-y-4 rounded-lg border bg-background/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Google Gemini AI Configuration</p>
                  <p className="text-xs text-muted-foreground">
                    Google AI Studio provides a generous free tier with 15 requests per minute and 1 million tokens per minute — completely free without requiring any credit card or billing setup.
                  </p>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                >
                  Get Free Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gemini_api_key" className="text-xs">
                  Gemini API Key
                </Label>
                <div className="relative">
                  <Input
                    id="gemini_api_key"
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gemini_model" className="text-xs">
                  Model
                </Label>
                <Select value={geminiModel} onValueChange={setGeminiModel}>
                  <SelectTrigger id="gemini_model" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (Fastest & Free)</SelectItem>
                    <SelectItem value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen Flash)</SelectItem>
                    <SelectItem value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Groq Cloud Config */}
          {aiProvider === 'groq' && (
            <div className="space-y-4 rounded-lg border bg-background/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Groq Cloud Configuration</p>
                  <p className="text-xs text-muted-foreground">
                    Groq provides ultra-fast inference on LPU hardware with a free API key on top open-weights models like Llama 3.3 70B.
                  </p>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0"
                >
                  Get Free Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groq_api_key" className="text-xs">
                  Groq API Key
                </Label>
                <div className="relative">
                  <Input
                    id="groq_api_key"
                    type={showGroqKey ? 'text' : 'password'}
                    placeholder="gsk_..."
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groq_model" className="text-xs">
                  Model
                </Label>
                <Select value={groqModel} onValueChange={setGroqModel}>
                  <SelectTrigger id="groq_model" className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Built-in Engine Info */}
          {aiProvider === 'builtin' && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Smart On-Device Engine Active</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Runs 100% on your device using enhanced NLP tokenization, continuous memory learning from past transactions, merchant dictionary mapping, and offline financial reporting. Zero external latency, completely free, and works without an internet connection.
              </p>
            </div>
          )}

          {/* Connection Test Result Feedback */}
          {testResult && (
            <div
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold">{testResult.success ? 'Success: ' : 'Error: '}</span>
                {testResult.message}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection || (aiProvider !== 'builtin' && !((aiProvider === 'gemini' ? geminiApiKey : groqApiKey).trim()))}
            >
              {testingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
              Test Connection
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAISettings}
              disabled={savingAI}
            >
              {savingAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up animate-stagger-2">
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

      <Card className="animate-slide-up animate-stagger-3">
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
