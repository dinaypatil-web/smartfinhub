import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { profileApi } from '@/db/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          // Check if profile exists, if not create one
          try {
            const profile = await profileApi.getProfile(session.user.id);
            
            if (!profile) {
              // Create profile for OAuth user by inserting directly
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email || null,
                  phone: session.user.phone || null,
                  nickname: session.user.user_metadata?.full_name || 
                            session.user.user_metadata?.name || 
                            session.user.email?.split('@')[0] || 
                            'User',
                  role: 'user',
                });
              
              if (insertError) {
                console.error('Error creating profile:', insertError);
                // Continue anyway, profile might already exist
              }
            }
          } catch (profileError) {
            console.error('Error checking profile:', profileError);
            // Continue anyway, profile might already exist
          }

          toast({
            title: 'Success',
            description: 'Logged in successfully!',
          });

          navigate('/');
        } else {
          throw new Error('No session found');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: 'Authentication Error',
          description: error.message || 'Failed to complete authentication',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we authenticate you</p>
      </div>
    </div>
  );
}
