import { useState, useEffect } from 'react';
import { interestRateApi } from '@/db/api';
import type { InterestRateHistory } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface InterestRateManagerProps {
  accountId: string;
  accountName: string;
  currentRate: number;
  onRateUpdated?: () => void;
}

export default function InterestRateManager({ accountId, accountName, currentRate, onRateUpdated }: InterestRateManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<InterestRateHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [formData, setFormData] = useState({
    interest_rate: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await interestRateApi.getInterestRateHistory(accountId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading interest rate history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.interest_rate || !formData.effective_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await interestRateApi.addInterestRate({
        account_id: accountId,
        interest_rate: parseFloat(formData.interest_rate),
        effective_date: formData.effective_date,
      });

      toast({
        title: 'Success',
        description: 'Interest rate updated successfully',
      });

      setFormData({
        interest_rate: '',
        effective_date: new Date().toISOString().split('T')[0],
      });

      loadHistory();
      onRateUpdated?.();
    } catch (error) {
      console.error('Error updating interest rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update interest rate',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="mr-2 h-4 w-4" />
          Update Interest Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Interest Rate - {accountName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Interest Rate</p>
                  <p className="text-2xl font-bold">{typeof currentRate === 'number' ? currentRate.toFixed(2) : '0.00'}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interest_rate">New Interest Rate (%) *</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="5.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Interest Rate Change
            </Button>
          </form>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Interest Rate History
            </h3>
            {loadingHistory ? (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interest rate changes recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{entry.interest_rate.toFixed(2)}%</p>
                          <p className="text-sm text-muted-foreground">
                            Effective: {format(new Date(entry.effective_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            Added: {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
