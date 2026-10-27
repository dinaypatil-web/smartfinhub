import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff, Phone, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import PhoneAuth from '@/components/PhoneAuth';
import { isMojoAuthConfigured } from '@/services/mojoauth';
import { profileApi } from '@/db/api';
import { useEncryption } from '@/contexts/EncryptionContext';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const encryption = useEncryption();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationType, setRegistrationType] = useState<'email' | 'phone'>('email');
  const [phoneRegistrationSuccess, setPhoneRegistrationSuccess] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');

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
      const tempPassword = `phone_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const encryptionSalt = await encryption.createNewKey(tempPassword);
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
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 w-full max-w-[430px] p-2 rounded-[28px] bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
          <div className="rounded-[22px] bg-[#0c0d14]/85 backdrop-blur-xl border border-amber-500/20 p-8 text-center text-white">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">Registration Complete!</h2>
            <p className="text-sm text-slate-400 mt-2">
              Your phone number <strong className="text-amber-400">{registeredPhone}</strong> has been verified.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 transition shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 w-full max-w-[430px] p-2 rounded-[28px] bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
          <div className="rounded-[22px] bg-[#0c0d14]/85 backdrop-blur-xl border border-amber-500/20 p-8 text-center text-white">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">Check Your Email</h2>
            <p className="text-sm text-slate-400 mt-2">
              We've sent a verification link to <strong className="text-amber-400">{email}</strong>
            </p>
            <div className="text-xs text-slate-400 bg-black/40 border border-white/10 rounded-xl p-3.5 my-4 text-left">
              Please check your inbox (or spam) and click the verification link to activate your account.
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setRegistrationSuccess(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="w-full py-2.5 rounded-xl border border-white/20 text-xs font-medium text-slate-200 hover:bg-white/5 transition cursor-pointer"
              >
                Register with a different email
              </button>
              <div className="text-xs text-slate-400">
                Already verified?{' '}
                <Link to="/login" className="text-amber-400 hover:underline font-semibold">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden perspective-[1200px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
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

      <AuthBackground />

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
        <div className="relative rounded-[30px] p-[1.5px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
          {/* Continuous Rotating Amber Laser Light Beam */}
          <div 
            className="absolute -inset-[100%] pointer-events-none opacity-80"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 290deg, #f59e0b 340deg, #fef08a 360deg)',
              animation: 'spinBeam 4s linear infinite',
            }}
          />

          <div className="relative rounded-[28.5px] bg-[#0c0d14]/90 sm:bg-[#0c0d14]/80 backdrop-blur-2xl p-1.5 sm:p-2 border border-white/10">
            {/* Corner highlights */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/50 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/50 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/50 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/50 rounded-br-xl pointer-events-none" />

            <div className="rounded-[22px] bg-[#0c0d14]/90 backdrop-blur-xl border border-amber-500/20 p-6 sm:p-8 text-white relative overflow-hidden">
              <div 
                className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(400px circle at 50% 10%, rgba(245, 158, 11, 0.15), transparent 70%)',
                }}
              />

              {/* Header */}
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
                  Create <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">Account</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-normal">
                  Sign up to start managing your finances securely
                </p>
              </motion.div>

              {mojoAuthEnabled ? (
                <Tabs
                  value={registrationType}
                  onValueChange={(v) => setRegistrationType(v as 'email' | 'phone')}
                  className="w-full"
                >
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
                    {renderRegisterForm()}
                  </TabsContent>

                  <TabsContent value="phone" className="mt-2">
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <PhoneAuth onSuccess={handlePhoneAuthSuccess} />
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                renderRegisterForm()
              )}

              {/* Footer */}
              <div className="text-center mt-6 text-xs text-slate-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors hover:underline"
                >
                  Sign In
                </Link>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  function renderRegisterForm() {
    return (
      <form onSubmit={handleEmailRegister} className="space-y-4">
        {/* Email */}
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

        {/* Password */}
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="pl-10 pr-10 h-11 rounded-xl bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400/80 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>

        {/* Confirm Password */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.36, duration: 0.5 }}
          className="space-y-1.5"
        >
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">
            Confirm Password
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-400 transition-colors">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="pl-10 pr-10 h-11 rounded-xl bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400/80 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>

        {/* Primary Radiant Amber Gradient Create Account Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="relative overflow-hidden w-full h-11 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400 active:scale-[0.99] disabled:opacity-60 transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] flex items-center justify-center gap-2 group mt-2 cursor-pointer"
        >
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
              <span className="text-sm font-bold tracking-wide relative z-10">Create Account</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1 relative z-10" />
            </>
          )}
        </motion.button>
      </form>
    );
  }
}
