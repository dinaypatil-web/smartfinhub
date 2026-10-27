import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/db/supabase';
import PhoneAuth from '@/components/PhoneAuth';
import { isMojoAuthConfigured } from '@/services/mojoauth';
import { profileApi } from '@/db/api';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithEmail } = useHybridAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const mojoAuthEnabled = isMojoAuthConfigured();

  // 3D Parallax Tilt & Mouse Spotlight physics
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], ['6deg', '-6deg']);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], ['-6deg', '6deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const currentX = (e.clientX - rect.left) / width - 0.5;
    const currentY = (e.clientY - rect.top) / height - 0.5;

    mouseX.set(currentX);
    mouseY.set(currentY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (error: any) {
      // Handled in auth context
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Sign In Failed',
        description: error.message || `Unable to authenticate with ${provider}.`,
        variant: 'destructive',
      });
    } finally {
      setSocialLoading(null);
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

  const handlePhoneAuthSuccess = async (phoneNumber: string, _accessToken: string) => {
    setLoading(true);

    try {
      const profile = await profileApi.getProfileByPhone(phoneNumber);

      if (!profile) {
        throw new Error('No account found with this phone number. Please register first.');
      }

      const phoneEmail = `${phoneNumber.replace(/\+/g, '')}@mojoauth.local`;
      const tempPassword = `phone_${profile.id}`;

      const { error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: tempPassword,
      });

      if (error) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: tempPassword,
        });

        if (updateError) throw updateError;

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
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden perspective-[1200px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Keyframes for Rotating Beam and Button Shimmer */}
      <style>{`
        @keyframes spinBeam {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes btnShimmer {
          0% {
            transform: translateX(-150%);
          }
          50%, 100% {
            transform: translateX(150%);
          }
        }
      `}</style>

      {/* Luxury Animated Metallic Gold Ribbon Waves Backdrop */}
      <AuthBackground />

      {/* Framer Motion 3D Interactive Card Container */}
      <motion.div
        ref={cardRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 35, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[430px]"
      >
        {/* Outer Frame with Continuous Rotating Traveling Light Beam */}
        <div className="relative rounded-[30px] p-[1.5px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
          {/* Continuous Rotating Amber Laser Light Beam */}
          <div 
            className="absolute -inset-[100%] pointer-events-none opacity-80"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 290deg, #f59e0b 340deg, #fef08a 360deg)',
              animation: 'spinBeam 4s linear infinite',
            }}
          />

          {/* Outer Glass Bracket & Ambient Halo */}
          <div className="relative rounded-[28.5px] bg-[#0c0d14]/90 sm:bg-[#0c0d14]/80 backdrop-blur-2xl p-1.5 sm:p-2 border border-white/10">
            
            {/* Subtle Outer Corner Highlights */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/50 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/50 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/50 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/50 rounded-br-xl pointer-events-none" />

            {/* Inner Frosted Dark Card */}
            <div className="rounded-[22px] bg-[#0c0d14]/90 backdrop-blur-xl border border-amber-500/20 p-6 sm:p-8 text-white relative overflow-hidden">
              
              {/* Dynamic Glass Mouse Spotlight Highlight */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(400px circle at 50% 10%, rgba(245, 158, 11, 0.15), transparent 70%)',
                }}
              />

              {/* Header / Brand */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="text-center mb-6"
              >
                <motion.div 
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] mb-3 transition-transform cursor-pointer"
                >
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </motion.div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Back</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-normal">
                  Enter your credentials to access your secure account
                </p>
              </motion.div>

              {/* Phone vs Email Tabs if MojoAuth is enabled */}
              {mojoAuthEnabled ? (
                <Tabs defaultValue="email" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 border border-white/10 rounded-xl p-1">
                    <TabsTrigger 
                      value="email" 
                      className="flex items-center gap-2 rounded-lg text-xs font-medium text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-950 transition-all"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger 
                      value="phone" 
                      className="flex items-center gap-2 rounded-lg text-xs font-medium text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-950 transition-all"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email">
                    {renderEmailForm()}
                  </TabsContent>

                  <TabsContent value="phone" className="mt-2">
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <PhoneAuth onSuccess={handlePhoneAuthSuccess} />
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                renderEmailForm()
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-semibold">
                  <span className="bg-[#0c0d14] px-3 text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Logins: Google & Apple */}
              <div className="grid grid-cols-2 gap-3">
                {/* Google Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading || socialLoading !== null}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 transition-colors duration-200 hover:border-amber-400/40 cursor-pointer"
                >
                  {socialLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                      />
                    </svg>
                  )}
                  <span>Google</span>
                </motion.button>

                {/* Apple Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={loading || socialLoading !== null}
                  className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 transition-colors duration-200 hover:border-amber-400/40 cursor-pointer"
                >
                  {socialLoading === 'apple' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.68-.82 1.13-1.96 1-3.12-1 .04-2.17.67-2.85 1.48-.6.7-1.13 1.83-.99 2.95 1.11.09 2.16-.49 2.84-1.31z" />
                    </svg>
                  )}
                  <span>Apple</span>
                </motion.button>
              </div>

              {/* Footer */}
              <div className="text-center mt-6 text-xs text-slate-400">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors hover:underline"
                >
                  Sign Up
                </Link>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  /* Email & Password Form Implementation */
  function renderEmailForm() {
    return (
      <form onSubmit={handleEmailLogin} className="space-y-4">
        {/* Email Field */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-1.5"
        >
          <Label htmlFor="email" className="text-xs font-medium text-slate-300">
            Email Address
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="pl-10 h-11 rounded-xl bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400/80 transition-all text-sm"
            />
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          className="space-y-1.5"
        >
          <Label htmlFor="password" className="text-xs font-medium text-slate-300">
            Password
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="pl-10 pr-10 h-11 rounded-xl bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400/80 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-black/40 border-white/20 text-amber-500 focus:ring-amber-400/30 focus:ring-offset-0 transition cursor-pointer"
            />
            <span>Remember me</span>
          </label>

          <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-amber-400/90 hover:text-amber-300 font-medium transition-colors hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f111a] border-amber-500/20 text-white sm:max-w-md rounded-2xl">
              <form onSubmit={handleForgotPassword}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Reset Password
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs sm:text-sm">
                    Enter your email address and we'll send you a secure link to reset your password.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-xs font-medium text-slate-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={resetLoading}
                        className="pl-10 h-11 rounded-xl bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-110 rounded-xl transition cursor-pointer"
                  >
                    {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
                    Send Reset Link
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Primary Radiant Amber Gradient Sign In Button with Shimmer Wave */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="relative overflow-hidden w-full h-11 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400 active:scale-[0.99] disabled:opacity-60 transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] flex items-center justify-center gap-2 group mt-2 cursor-pointer"
        >
          {/* Animated Button Shimmer Wave */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)',
              animation: 'btnShimmer 3s ease-in-out infinite',
            }}
          />

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-950 relative z-10" />
          ) : (
            <>
              <span className="text-sm font-bold tracking-wide relative z-10">Sign In</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1 relative z-10" />
            </>
          )}
        </motion.button>
      </form>
    );
  }
}
