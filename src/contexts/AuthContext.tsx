import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { profileApi } from '@/db/api';
import { keyManager } from '@/utils/encryption';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasEncryptionKey: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEncryptionKey, setHasEncryptionKey] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const userProfile = await profileApi.getProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setHasEncryptionKey(keyManager.hasKey());
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        keyManager.clearKey();
        setHasEncryptionKey(false);
      } else {
        setHasEncryptionKey(keyManager.hasKey());
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    keyManager.clearKey();
    setUser(null);
    setProfile(null);
    setHasEncryptionKey(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, hasEncryptionKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
