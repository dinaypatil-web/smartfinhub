import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { transactionApi, accountApi, categoryApi, budgetApi } from '@/db/api';
import type { TransactionType } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ budgeted: number; spent: number; remaining: number } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const [formData, setFormData] = useState({
    transaction_type: 'expense' as TransactionType,
    from_account_id: '',
    to_account_id: '',
    amount: '',
    currency: profile?.default_currency || 'INR',
    category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Load budget info when category changes and transaction type is expense
    if (user && formData.category && formData.transaction_type === 'expense' && formData.transaction_date) {
      loadBudgetInfo();
    } else {
      setBudgetInfo(null);
    }
  }, [user, formData.category, formData.transaction_type, formData.transaction_date]);

  const loadBudgetInfo = async () => {
    if (!user || !formData.category || formData.transaction_type !== 'expense') return;

    setLoadingBudget(true);
    try {
      const transactionDate = new Date(formData.transaction_date);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();

      const info = await budgetApi.getCategoryBudgetInfo(user.id, formData.category, month, year);
      setBudgetInfo(info);
    } catch (error) {
      console.error('Error loading budget info:', error);
      setBudgetInfo(null);
    } finally {
      setLoadingBudget(false);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    setLoadingData(true);
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountApi.getAccounts(user.id),
        categoryApi.getCategories(user.id)
      ]);
      
      setAccounts(accountsData);
      setCategories(categoriesData);

      if (id) {
        const transactions = await transactionApi.getTransactions(user.id);
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
          setFormData({
            transaction_type: transaction.transaction_type,
            from_account_id: transaction.from_account_id || '',
            to_account_id: transaction.to_account_id || '',
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            category: transaction.category || '',
            description: transaction.description || '',
            transaction_date: transaction.transaction_date,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const transactionData: any = {
        user_id: user.id,
        transaction_type: formData.transaction_type,
        from_account_id: formData.from_account_id || null,
        to_account_id: formData.to_account_id || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category || null,
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      };

      if (id) {
        await transactionApi.updateTransaction(id, transactionData);
        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      } else {
        await transactionApi.createTransaction(transactionData);
        toast({
          title: 'Success',
          description: 'Transaction created successfully',
        });
      }

      navigate('/transactions');
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/transactions')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Transactions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: TransactionType) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="loan_payment">Loan Payment</SelectItem>
                  <SelectItem value="credit_card_payment">Credit Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.transaction_type === 'expense' || formData.transaction_type === 'withdrawal' || 
              formData.transaction_type === 'transfer' || formData.transaction_type === 'loan_payment' || 
              formData.transaction_type === 'credit_card_payment') && (
              <div className="space-y-2">
                <Label htmlFor="from_account_id">
                  {formData.transaction_type === 'withdrawal' ? 'From Bank/Credit Card *' : 'From Account *'}
                </Label>
                <Select
                  value={formData.from_account_id}
                  onValueChange={(value) => setFormData({ ...formData, from_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.transaction_type === 'withdrawal'
                      ? accounts.filter(a => a.account_type === 'bank' || a.account_type === 'credit_card').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </SelectItem>
                        ))
                      : accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.transaction_type === 'income' || formData.transaction_type === 'transfer' || 
              formData.transaction_type === 'withdrawal' || formData.transaction_type === 'loan_payment' || 
              formData.transaction_type === 'credit_card_payment') && (
              <div className="space-y-2">
                <Label htmlFor="to_account_id">
                  {formData.transaction_type === 'withdrawal' ? 'To Cash Account *' : 'To Account *'}
                </Label>
                <Select
                  value={formData.to_account_id}
                  onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.transaction_type === 'withdrawal' 
                      ? accounts.filter(a => a.account_type === 'cash').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))
                      : accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Date *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {(formData.transaction_type === 'income' || formData.transaction_type === 'expense') && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Budget Information Display for Expense Transactions */}
                {formData.transaction_type === 'expense' && formData.category && (
                  <div className="mt-3">
                    {loadingBudget ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading budget info...
                      </div>
                    ) : budgetInfo ? (
                      <Alert className={`${budgetInfo.remaining < 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'}`}>
                        <TrendingDown className={`h-4 w-4 ${budgetInfo.remaining < 0 ? 'text-red-600' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'text-amber-600' : 'text-blue-600'}`} />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">Budget Status for {formData.category}</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Budgeted</div>
                                <div className="font-medium">{formatCurrency(budgetInfo.budgeted, formData.currency)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Spent</div>
                                <div className="font-medium">{formatCurrency(budgetInfo.spent, formData.currency)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Remaining</div>
                                <div className={`font-medium ${budgetInfo.remaining < 0 ? 'text-red-600 dark:text-red-400' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {formatCurrency(budgetInfo.remaining, formData.currency)}
                                </div>
                              </div>
                            </div>
                            {budgetInfo.remaining < 0 && (
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <span>Budget exceeded by {formatCurrency(Math.abs(budgetInfo.remaining), formData.currency)}</span>
                              </div>
                            )}
                            {budgetInfo.remaining >= 0 && budgetInfo.remaining < budgetInfo.budgeted * 0.2 && (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <span>Low budget remaining ({((budgetInfo.remaining / budgetInfo.budgeted) * 100).toFixed(0)}%)</span>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a note about this transaction"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {id ? 'Update Transaction' : 'Create Transaction'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
