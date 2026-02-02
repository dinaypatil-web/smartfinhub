/**
 * Hybrid Authentication Context
 * 
 * Combines Auth0 (for social login) with Supabase (for database)
 * - Auth0 handles: Google Sign-in, Apple Sign-in, authentication tokens
 * - Supabase handles: Database operations, user profiles, RLS policies
 * - Encryption: Initializes client-side encryption key on login
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';
import { profileApi } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { isAuth0Configured } from '@/config/auth0';
import { useEncryption } from './EncryptionContext';

interface HybridAuthContextType {
  // User info
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  
  // Auth0 methods
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  
  // Common methods
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Auth provider info
  authProvider: 'auth0' | 'supabase' | null;
}

const HybridAuthContext = createContext<HybridAuthContextType | undefined>(undefined);

export function HybridAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const encryption = useEncryption();
  
  // Only use Auth0 hooks if Auth0 is configured
  const auth0Enabled = isAuth0Configured();
  const auth0Context = auth0Enabled ? useAuth0() : {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    loginWithRedirect: async () => {},
    logout: async () => {},
    getAccessTokenSilently: async () => '',
  };
  
  const {
    user: auth0User,
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = auth0Context;

  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);  const [authProvider, setAuthProvider] = useState<'auth0' | 'supabase' | null>(null);  // Sync Auth0 user with Supabase
  const syncAuth0UserWithSupabase = useCallback(async (auth0User: any) => {
    try {
      // Check if profile exists in Supabase
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', auth0User.email)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        return;
      }

      if (!existingProfile) {
        // Create new profile for Auth0 user
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            email: auth0User.email,
            nickname: auth0User.name || auth0User.email?.split('@')[0],
            auth0_sub: auth0User.sub,
            default_country: 'US',
            default_currency: 'USD',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          toast({
            title: 'Error',
            description: 'Failed to create user profile',
            variant: 'destructive',
          });
          return;
        }

        setProfile(newProfile);
      } else {
        // Update auth0_sub if not set
        if (!existingProfile.auth0_sub) {
          await supabase
            .from('profiles')
            .update({ auth0_sub: auth0User.sub })
            .eq('id', existingProfile.id);
        }
        setProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error syncing Auth0 user:', error);
    }
  }, [toast]);

  // Refresh profile from Supabase
  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        let userProfile: Profile | null = null;

        if (authProvider === 'auth0' && user.email) {
          // For Auth0 users, fetch by email
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
          userProfile = data;
        } else if (authProvider === 'supabase' && user.id) {
          // For Supabase users, fetch by ID
          userProfile = await profileApi.getProfile(user.id);
        }

        setProfile(userProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }
  }, [user, authProvider]);

  // Auth0 login methods
  const loginWithGoogle = useCallback(async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: 'google-oauth2',
          prompt: 'select_account',
        },
      });
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in with Google',
        variant: 'destructive',
      });
    }
  }, [loginWithRedirect, toast]);

  const loginWithApple = useCallback(async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: 'apple',
        },
      });
    } catch (error) {
      console.error('Apple login error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign in with Apple',
        variant: 'destructive',
      });
    }
  }, [loginWithRedirect, toast]);

  // Supabase email/password methods
  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for specific error types
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the confirmation link.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Check if email is confirmed
      if (!data.user.email_confirmed_at && data.user.confirmed_at === null) {
        throw new Error('Please verify your email address before signing in. Check your inbox for the confirmation link.');
      }

      setUser(data.user);
      setAuthProvider('supabase');
      
      // Load profile and initialize encryption
      const userProfile = await profileApi.getProfile(data.user.id);
      if (userProfile) {
        setProfile(userProfile);
        
        // Initialize encryption key if salt exists
        if (userProfile.encryption_salt) {
          try {
            await encryption.initializeKey(password, userProfile.encryption_salt);
          } catch (error) {
            console.error('Failed to initialize encryption:', error);
            toast({
              title: 'Warning',
              description: 'Failed to initialize encryption. Some data may not be accessible.',
              variant: 'destructive',
            });
          }
        }
      } else {
        throw new Error('Failed to load user profile');
      }
      
      toast({
        title: 'Success',
        description: 'Signed in successfully',
      });
    } catch (error: any) {
      console.error('Email login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast({
          title: 'Account Already Exists',
          description: 'This email is already registered. Please login instead.',
          variant: 'destructive',
        });
        throw new Error('Email already registered');
      }

      // If user is created and confirmed immediately (email verification disabled)
      if (data.user && data.session) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        // If profile doesn't exist, create it
        if (!existingProfile) {
          // Check if this is the first user (should be admin)
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          const role = count === 0 ? 'admin' : 'user';

          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              phone: data.user.phone,
              role: role,
            });
        }        // Load profile
        const profile = await profileApi.getProfile(data.user.id);
        setProfile(profile);
        setUser(data.user);
        setAuthProvider('supabase');

        toast({
          title: 'Success',
          description: 'Account created successfully! Redirecting to dashboard...',
        });

        // Navigate to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        // Email verification is required
        toast({
          title: 'Success',
          description: 'Account created! Please check your email to verify your account.',
        });
      }
    } catch (error: any) {
      console.error('Email signup error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      if (authProvider === 'auth0') {
        await auth0Logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
      } else if (authProvider === 'supabase') {
        await supabase.auth.signOut();
      }

      setUser(null);
      setProfile(null);
      setAuthProvider(null);
      
      // Clear encryption key from memory
      encryption.clearKey();
      
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  }, [authProvider, auth0Logout, toast]);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Auth0 first
        if (isAuth0Authenticated && auth0User) {
          setUser(auth0User);
          setAuthProvider('auth0');
          setLoading(false); // Set loading false immediately
          
          // Sync with Supabase in background (non-blocking)
          syncAuth0UserWithSupabase(auth0User).then(() => {          });
          return;
        }

        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setAuthProvider('supabase');
          setLoading(false); // Set loading false immediately
          
          // Load profile and initialize encryption in background (non-blocking)
          profileApi.getProfile(session.user.id).then(async (userProfile) => {
            if (userProfile) {
              setProfile(userProfile);            }
          });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    if (!isAuth0Loading) {
      initAuth();
    }
  }, [isAuth0Authenticated, auth0User, isAuth0Loading]);

  // Listen to Supabase auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !isAuth0Authenticated) {
        setUser(session.user);
        setAuthProvider('supabase');
        
        // Initialize encryption for Supabase user in background (non-blocking)
        profileApi.getProfile(session.user.id).then(async (userProfile) => {
          if (userProfile) {
            setProfile(userProfile);          }
        });
      } else if (!session?.user && !isAuth0Authenticated) {
        setUser(null);
        setProfile(null);
        setAuthProvider(null);      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuth0Authenticated]);

  const value: HybridAuthContextType = {
    user,
    profile,
    loading: loading || isAuth0Loading,
    loginWithGoogle,
    loginWithApple,
    loginWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
    authProvider,
  };

  return (
    <HybridAuthContext.Provider value={value}>
      {children}
    </HybridAuthContext.Provider>
  );
}

export function useHybridAuth() {
  const context = useContext(HybridAuthContext);
  if (context === undefined) {
    throw new Error('useHybridAuth must be used within a HybridAuthProvider');
  }
  return context;
}
