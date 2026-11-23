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
import { Loader2, Phone, Mail, Shield, Sun, Moon, Monitor, Palette, Bot, Sparkles, Key, CheckCircle2, AlertCircle, Eye, EyeOff, Zap, ExternalLink, RefreshCw, Cpu } from 'lucide-react';
import { 
  getAIProviderConfig, 
  saveAIProviderConfig, 
  testAIProviderConnection, 
  fetchGeminiAvailableModels, 
  fetchGroqAvailableModels, 
  DEFAULT_GEMINI_MODEL, 
  DEFAULT_GROQ_MODEL, 
  type AIProviderType 
} from '@/services/aiService';
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
  const { user, profile, refreshProfile, signOut } = useAuth();
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

  // Account Erasure (DPDP Act 2023) state
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // AI Configuration state
  const [aiProvider, setAiProvider] = useState<AIProviderType>('builtin');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState(DEFAULT_GROQ_MODEL);
  const [geminiAvailableModels, setGeminiAvailableModels] = useState<string[]>([
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite'
  ]);
  const [groqAvailableModels, setGroqAvailableModels] = useState<string[]>([
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768',
    'gemma2-9b-it'
  ]);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [discoveringModels, setDiscoveringModels] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingAI, setSavingAI] = useState(false);

  useEffect(() => {
    const config = getAIProviderConfig();
    setAiProvider(config.provider);
    setGeminiApiKey(config.geminiApiKey);
    setGeminiModel(config.geminiModel || DEFAULT_GEMINI_MODEL);
    setGroqApiKey(config.groqApiKey);
    setGroqModel(config.groqModel || DEFAULT_GROQ_MODEL);

    if (config.geminiApiKey) {
      fetchGeminiAvailableModels(config.geminiApiKey).then(models => {
        if (models && models.length > 0) setGeminiAvailableModels(models);
      }).catch(() => {});
    }
    if (config.groqApiKey) {
      fetchGroqAvailableModels(config.groqApiKey).then(models => {
        if (models && models.length > 0) setGroqAvailableModels(models);
      }).catch(() => {});
    }
  }, []);

  const handleDiscoverModels = async (provider: 'gemini' | 'groq') => {
    const key = provider === 'gemini' ? geminiApiKey.trim() : groqApiKey.trim();
    if (!key) {
      toast({
        title: 'API Key Required',
        description: `Please enter your ${provider === 'gemini' ? 'Google Gemini' : 'Groq'} API key before discovering models.`,
        variant: 'destructive',
      });
      return;
    }

    setDiscoveringModels(true);
    try {
      if (provider === 'gemini') {
        const models = await fetchGeminiAvailableModels(key);
        setGeminiAvailableModels(models);
        if (!models.includes(geminiModel)) {
          const preferred = models.find(m => m.includes('2.5-flash') || m.includes('flash')) || models[0];
          if (preferred) {
            setGeminiModel(preferred);
            saveAIProviderConfig({ geminiModel: preferred });
          }
        }
        toast({
          title: 'Models Discovered',
          description: `Found ${models.length} active Gemini models for your account.`,
        });
      } else {
        const models = await fetchGroqAvailableModels(key);
        setGroqAvailableModels(models);
        if (!models.includes(groqModel)) {
          const preferred = models.find(m => m.includes('70b') || m.includes('llama3') || m.includes('8b')) || models[0];
          if (preferred) {
            setGroqModel(preferred);
            saveAIProviderConfig({ groqModel: preferred });
          }
        }
        toast({
          title: 'Models Discovered',
          description: `Found ${models.length} active Groq models for your account.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Discovery Failed',
        description: err.message || 'Could not fetch models list',
        variant: 'destructive',
      });
    } finally {
      setDiscoveringModels(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const activeKey = aiProvider === 'gemini' ? geminiApiKey : groqApiKey;
      const activeModel = aiProvider === 'gemini' ? geminiModel : groqModel;
      const res = await testAIProviderConnection(aiProvider, activeKey, activeModel);
      setTestResult(res);

      if (res.detectedModel) {
        if (aiProvider === 'gemini') {
          setGeminiModel(res.detectedModel);
          if (!geminiAvailableModels.includes(res.detectedModel)) {
            setGeminiAvailableModels(prev => [res.detectedModel!, ...prev]);
          }
        } else if (aiProvider === 'groq') {
          setGroqModel(res.detectedModel);
          if (!groqAvailableModels.includes(res.detectedModel)) {
            setGroqAvailableModels(prev => [res.detectedModel!, ...prev]);
          }
        }
      }

      if (res.success) {
        saveAIProviderConfig({
          provider: aiProvider,
          geminiApiKey,
          geminiModel: (aiProvider === 'gemini' && res.detectedModel) ? res.detectedModel : geminiModel,
          groqApiKey,
          groqModel: (aiProvider === 'groq' && res.detectedModel) ? res.detectedModel : groqModel,
        });
      }

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      toast({
        title: 'Confirmation Mismatch',
        description: 'Please type DELETE exactly to confirm account erasure.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;
    setDeletingAccount(true);
    try {
      await profileApi.deleteUserAccount(user.id);
      toast({
        title: 'Account & Data Erased',
        description: 'All your personal and financial data has been permanently deleted in accordance with India\'s DPDP Act 2023.',
      });
      setShowDeleteAccountDialog(false);
      await signOut();
      window.location.href = '/login';
    } catch (err: any) {
      console.error('Account erasure error:', err);
      toast({
        title: 'Erasure Failed',
        description: err.message || 'Failed to erase account data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
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
                saveAIProviderConfig({ provider: val });
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setGeminiApiKey(val);
                      saveAIProviderConfig({ geminiApiKey: val, provider: 'gemini' });
                      if (val.trim() && aiProvider !== 'gemini') {
                        setAiProvider('gemini');
                      }
                    }}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="gemini_model" className="text-xs font-medium flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    Model Name / Identifier
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => handleDiscoverModels('gemini')}
                    disabled={discoveringModels || !geminiApiKey.trim()}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${discoveringModels ? 'animate-spin' : ''}`} />
                    Auto-Discover Models
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    id="gemini_model"
                    type="text"
                    placeholder="gemini-2.5-flash"
                    value={geminiModel}
                    onChange={(e) => {
                      const val = e.target.value.trim().replace(/^models\//, '');
                      setGeminiModel(val);
                      saveAIProviderConfig({ geminiModel: val });
                    }}
                    className="font-mono text-sm bg-background flex-1"
                  />
                  <Select
                    value={geminiModel}
                    onValueChange={(val) => {
                      setGeminiModel(val);
                      saveAIProviderConfig({ geminiModel: val });
                    }}
                  >
                    <SelectTrigger className="w-[140px] bg-background">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      {geminiAvailableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m} {m === 'gemini-2.5-flash' ? '(Recommended)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Suggested:</span>
                  {['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setGeminiModel(m);
                        saveAIProviderConfig({ geminiModel: m });
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        geminiModel === m
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      {m} {m === 'gemini-2.5-flash' ? '★' : ''}
                    </button>
                  ))}
                </div>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setGroqApiKey(val);
                      saveAIProviderConfig({ groqApiKey: val, provider: 'groq' });
                      if (val.trim() && aiProvider !== 'groq') {
                        setAiProvider('groq');
                      }
                    }}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="groq_model" className="text-xs font-medium flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    Model Name / Identifier
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => handleDiscoverModels('groq')}
                    disabled={discoveringModels || !groqApiKey.trim()}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${discoveringModels ? 'animate-spin' : ''}`} />
                    Auto-Discover Models
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    id="groq_model"
                    type="text"
                    placeholder="llama3-70b-8192"
                    value={groqModel}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setGroqModel(val);
                      saveAIProviderConfig({ groqModel: val });
                    }}
                    className="font-mono text-sm bg-background flex-1"
                  />
                  <Select
                    value={groqModel}
                    onValueChange={(val) => {
                      setGroqModel(val);
                      saveAIProviderConfig({ groqModel: val });
                    }}
                  >
                    <SelectTrigger className="w-[140px] bg-background">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      {groqAvailableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m} {m === 'llama3-70b-8192' ? '(Recommended)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Suggested:</span>
                  {['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setGroqModel(m);
                        saveAIProviderConfig({ groqModel: m });
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        groqModel === m
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      }`}
                    >
                      {m} {m === 'llama3-70b-8192' ? '★' : ''}
                    </button>
                  ))}
                </div>
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

      {/* Privacy & Right to Erasure (DPDP Act 2023) */}
      <Card className="border-red-200 dark:border-red-900/50 animate-slide-up">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600 dark:text-red-400">Privacy & Data Erasure (DPDP Act 2023)</CardTitle>
          </div>
          <CardDescription>
            Exercise your rights under India's Digital Personal Data Protection Act 2023, including complete personal data erasure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p>• <strong>Data Minimization:</strong> When using Cloud AI (Gemini/Groq), financial identifiers and transaction descriptions are automatically masked to safeguard your privacy.</p>
            <p>• <strong>Local Processing:</strong> Using the Built-in Engine ensures all calculations and categorization happen strictly on your device.</p>
            <p>• <strong>Right to Erasure (Section 12):</strong> You have the legal right to completely erase your personal and financial data from our systems.</p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Permanently Delete Account & All Data</p>
              <p className="text-xs text-muted-foreground">Irreversibly deletes all accounts, transactions, budgets, statements, and your profile.</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteAccountDialog(true);
              }}
            >
              Delete Account
            </Button>
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

      {/* Account Deletion Dialog (DPDP Act 2023 Right to Erasure) */}
      <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Permanent Account Erasure
            </DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. In accordance with India's DPDP Act 2023, all your personal data, bank accounts, transactions, and settings will be permanently erased.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold">Warning: This cannot be reversed.</p>
              <p className="text-xs mt-1">If you proceed, all your financial records and profile data will be permanently wiped from the database.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmDelete">Type <strong>DELETE</strong> below to confirm:</Label>
              <Input
                id="confirmDelete"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                disabled={deletingAccount}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAccountDialog(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmationText !== 'DELETE' || deletingAccount}
            >
              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erase Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
