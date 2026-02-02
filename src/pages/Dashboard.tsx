import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { accountApi } from '@/db/api';
import type { Account } from '@/types/types';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (user) {
          const data = await accountApi.getAccounts(user.id);
          setAccounts(data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle>
            {profile?.full_name ? `Welcome, ${profile.full_name}` : 'Welcome to SmartFinHub'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading your overview...'
              : `You have ${accounts.length} account${accounts.length === 1 ? '' : 's'} linked.`}
          </p>
          <Button className="mt-3" onClick={() => navigate('/accounts')}>
            Go to Accounts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
