import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, categoryApi, budgetApi, emiApi } from '@/db/api';
import type { TransactionType, Account } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, TrendingDown, AlertCircle, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  calculateMonthlyEMI, 
  calculateEMIDetails, 
  validateCreditLimit,
  getCreditLimitWarningMessage 
} from '@/utils/emiCalculations';
import { getTransactionStatementInfo } from '@/utils/statementCalculations';
import { INCOME_CATEGORIES } from '@/constants/incomeCategories';
import { cache } from '@/utils/cache';

// Transaction form for creating and editing transactions
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
    income_category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    is_emi: false,
    emi_months: '',
    bank_charges: '',
  });

  const [calculatedEMI, setCalculatedEMI] = useState<{
    monthlyEMI: number;
    totalAmount: number;
    totalInterest: number;
    effectiveRate: number;
  } | null>(null);

  const [creditLimitWarning, setCreditLimitWarning] = useState<string | null>(null);
  const [statementInfo, setStatementInfo] = useState<{
    statementDate: Date;
    dueDate: Date;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Calculate statement and due dates for credit card transactions
  useEffect(() => {
    if (formData.from_account_id && formData.transaction_date && !formData.is_emi) {
      const account = accounts.find((a: Account) => a.id === formData.from_account_id);
      if (account && account.account_type === 'credit_card' && account.statement_day && account.due_day) {
        const transactionDate = new Date(formData.transaction_date);
        const { statementDate, dueDate } = getTransactionStatementInfo(
          account.statement_day,
          account.due_day,
          transactionDate
        );
        
        setStatementInfo({
          statementDate,
          dueDate
        });
      } else {
        setStatementInfo(null);
      }
    } else {
      setStatementInfo(null);
    }
  }, [formData.from_account_id, formData.transaction_date, formData.is_emi, accounts]);

  // Auto-select "Loan repayments" category when loan_payment transaction type is selected
  useEffect(() => {
    if (formData.transaction_type === 'loan_payment') {
      const loanRepaymentCategory = categories.find(c => c.name === 'Loan repayments');
      if (loanRepaymentCategory && formData.category !== loanRepaymentCategory.name) {
        setFormData(prev => ({ ...prev, category: loanRepaymentCategory.name }));
      }
    }
  }, [formData.transaction_type, categories]);

  useEffect(() => {
    // Load budget info when category changes and transaction type is expense or loan_payment
    if (user && formData.category && (formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && formData.transaction_date) {
      loadBudgetInfo();
    } else {
      setBudgetInfo(null);
    }
  }, [user, formData.category, formData.transaction_type, formData.transaction_date]);

  // Calculate EMI when EMI fields change
  useEffect(() => {
    if (formData.is_emi && formData.amount && formData.emi_months && formData.bank_charges) {
      const amount = parseFloat(formData.amount);
      const months = parseInt(formData.emi_months);
      const charges = parseFloat(formData.bank_charges);
      
      if (!isNaN(amount) && !isNaN(months) && !isNaN(charges) && months > 0) {
        const emiDetails = calculateEMIDetails(amount, charges, months);
        setCalculatedEMI(emiDetails);
      } else {
        setCalculatedEMI(null);
      }
    } else {
      setCalculatedEMI(null);
    }
  }, [formData.is_emi, formData.amount, formData.emi_months, formData.bank_charges]);

  // Validate credit limit when amount or account changes
  useEffect(() => {
    if (formData.from_account_id && formData.amount) {
      const account = accounts.find((a: Account) => a.id === formData.from_account_id);
      if (account && account.account_type === 'credit_card') {
        const amount = parseFloat(formData.amount);
        if (!isNaN(amount)) {
          const warning = getCreditLimitWarningMessage(account.balance, account.credit_limit, account.currency);
          setCreditLimitWarning(warning);
          
          // Validate if transaction would exceed limit
          const validation = validateCreditLimit(account.balance, amount, account.credit_limit);
          if (!validation.valid) {
            setCreditLimitWarning(`⚠️ ${validation.message}`);
          }
        }
      } else {
        setCreditLimitWarning(null);
      }
    } else {
      setCreditLimitWarning(null);
    }
  }, [formData.from_account_id, formData.amount, accounts]);

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
            income_category: transaction.income_category || '',
            description: transaction.description || '',
            transaction_date: transaction.transaction_date,
            is_emi: false,
            emi_months: '',
            bank_charges: '',
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

    // Validate amount is positive
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Amount must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    // Validate account selections based on transaction type
    if (formData.transaction_type === 'income' && !formData.to_account_id) {
      toast({
        title: 'Error',
        description: 'Please select a destination account for income',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'expense' && !formData.from_account_id) {
      toast({
        title: 'Error',
        description: 'Please select a source account for expense',
        variant: 'destructive',
      });
      return;
    }

    if ((formData.transaction_type === 'transfer' || formData.transaction_type === 'withdrawal') && 
        (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both source and destination accounts',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'loan_payment' && (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both payment source and loan account',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'credit_card_repayment' && (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both payment source and credit card account',
        variant: 'destructive',
      });
      return;
    }

    // Validate EMI fields if EMI is selected
    if (formData.is_emi) {
      if (!formData.emi_months || parseInt(formData.emi_months) <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter valid EMI duration',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.bank_charges || parseFloat(formData.bank_charges) < 0) {
        toast({
          title: 'Error',
          description: 'Please enter valid bank charges',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate credit limit for credit card transactions
    if (formData.from_account_id) {
      const account = accounts.find((a: Account) => a.id === formData.from_account_id);
      if (account && account.account_type === 'credit_card' && account.credit_limit) {
        const validation = validateCreditLimit(
          account.balance,
          parseFloat(formData.amount),
          account.credit_limit
        );
        if (!validation.valid) {
          toast({
            title: 'Credit Limit Exceeded',
            description: validation.message,
            variant: 'destructive',
          });
          return;
        }
      }
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
        income_category: formData.income_category || null,
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      };

      let createdTransaction = null;

      if (id) {
        await transactionApi.updateTransaction(id, transactionData);
        
        // Clear dashboard cache to reflect updated transaction
        cache.clearPattern('dashboard-');
        
        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      } else {
        createdTransaction = await transactionApi.createTransaction(transactionData);
        
        // Create EMI transaction if EMI option is selected
        if (formData.is_emi && createdTransaction) {
          const purchaseAmount = parseFloat(formData.amount);
          const bankCharges = parseFloat(formData.bank_charges);
          const emiMonths = parseInt(formData.emi_months);
          const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bankCharges, emiMonths);
          const totalAmount = purchaseAmount + bankCharges;
          
          const emiData = {
            user_id: user.id,
            account_id: formData.from_account_id,
            transaction_id: createdTransaction.id,
            purchase_amount: purchaseAmount,
            bank_charges: bankCharges,
            total_amount: totalAmount,
            emi_months: emiMonths,
            monthly_emi: monthlyEMI,
            remaining_installments: emiMonths,
            start_date: formData.transaction_date,
            next_due_date: formData.transaction_date,
            description: formData.description || `EMI for ${formData.category || 'purchase'}`,
            status: 'active' as const,
          };
          
          await emiApi.createEMI(emiData);
        }
        
        // Clear dashboard cache to reflect new transaction
        cache.clearPattern('dashboard-');
        
        toast({
          title: 'Success',
          description: formData.is_emi 
            ? 'Transaction and EMI created successfully' 
            : 'Transaction created successfully',
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
                  <SelectItem value="credit_card_repayment">Credit Card Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.transaction_type === 'expense' || formData.transaction_type === 'withdrawal' || 
              formData.transaction_type === 'transfer' || formData.transaction_type === 'loan_payment' ||
              formData.transaction_type === 'credit_card_repayment') && (
              <div className="space-y-2">
                <Label htmlFor="from_account_id">
                  {formData.transaction_type === 'withdrawal' ? 'From Bank/Credit Card *' : 
                   formData.transaction_type === 'credit_card_repayment' ? 'From Bank Account *' : 'From Account *'}
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
                      : formData.transaction_type === 'credit_card_repayment'
                      ? accounts.filter(a => a.account_type === 'bank' || a.account_type === 'cash').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))
                      : accounts.filter(a => a.account_type !== 'loan').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                
                {/* Display available balance for selected account */}
                {formData.from_account_id && (() => {
                  const selectedAccount = accounts.find((a: Account) => a.id === formData.from_account_id);
                  if (selectedAccount) {
                    const isCreditCard = selectedAccount.account_type === 'credit_card';
                    const availableBalance = isCreditCard 
                      ? (selectedAccount.credit_limit || 0) + selectedAccount.balance // Credit card: limit + negative balance
                      : selectedAccount.balance; // Other accounts: actual balance
                    
                    return (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {isCreditCard ? 'Available Credit' : 'Available Balance'}
                          </span>
                          <span className={`text-sm font-semibold ${
                            availableBalance < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {formatCurrency(availableBalance, selectedAccount.currency)}
                          </span>
                        </div>
                        {isCreditCard && selectedAccount.credit_limit && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">Credit Limit</span>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(selectedAccount.credit_limit, selectedAccount.currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {(formData.transaction_type === 'income' || formData.transaction_type === 'transfer' || 
              formData.transaction_type === 'withdrawal' || formData.transaction_type === 'loan_payment' ||
              formData.transaction_type === 'credit_card_repayment') && (
              <div className="space-y-2">
                <Label htmlFor="to_account_id">
                  {formData.transaction_type === 'withdrawal' ? 'To Cash Account *' : 
                   formData.transaction_type === 'credit_card_repayment' ? 'To Credit Card *' : 
                   formData.transaction_type === 'loan_payment' ? 'To Loan Account *' : 'To Account *'}
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
                      : formData.transaction_type === 'credit_card_repayment'
                      ? accounts.filter(a => a.account_type === 'credit_card').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))
                      : formData.transaction_type === 'loan_payment'
                      ? accounts.filter(a => a.account_type === 'loan').map(account => (
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
                  min="0"
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

            {(formData.transaction_type === 'income' || formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && (
              <div className="space-y-2">
                <Label htmlFor="category">
                  {formData.transaction_type === 'income' ? 'Income Category' : 'Expense Category'}
                </Label>
                {formData.transaction_type === 'income' ? (
                  <Select
                    value={formData.income_category}
                    onValueChange={(value) => setFormData({ ...formData, income_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map(category => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Budget Information Display for Expense and Loan Payment Transactions */}
                {(formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && formData.category && (
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

            {/* Credit Limit Warning */}
            {creditLimitWarning && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  {creditLimitWarning}
                </AlertDescription>
              </Alert>
            )}

            {/* EMI Option for Credit Card Transactions */}
            {formData.from_account_id && 
             accounts.find((a: Account) => a.id === formData.from_account_id)?.account_type === 'credit_card' && 
             !id && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_emi"
                    checked={formData.is_emi}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        is_emi: checked as boolean,
                        emi_months: checked ? formData.emi_months : '',
                        bank_charges: checked ? formData.bank_charges : '',
                      })
                    }
                  />
                  <Label htmlFor="is_emi" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="h-4 w-4" />
                    Convert to EMI (Equated Monthly Installment)
                  </Label>
                </div>

                {formData.is_emi && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emi_months">EMI Duration (Months) *</Label>
                        <Input
                          id="emi_months"
                          type="number"
                          min="1"
                          max="60"
                          value={formData.emi_months}
                          onChange={(e) => setFormData({ ...formData, emi_months: e.target.value })}
                          placeholder="e.g., 12"
                          required={formData.is_emi}
                        />
                        <p className="text-xs text-muted-foreground">
                          Number of monthly installments (1-60)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bank_charges">Bank Charges *</Label>
                        <Input
                          id="bank_charges"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.bank_charges}
                          onChange={(e) => setFormData({ ...formData, bank_charges: e.target.value })}
                          placeholder="0.00"
                          required={formData.is_emi}
                        />
                        <p className="text-xs text-muted-foreground">
                          Processing fees and interest charges
                        </p>
                      </div>
                    </div>

                    {calculatedEMI && (
                      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                              EMI Calculation Summary
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <div className="text-muted-foreground">Monthly EMI</div>
                                <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                  {formatCurrency(calculatedEMI.monthlyEMI, formData.currency)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Total Amount</div>
                                <div className="font-medium">
                                  {formatCurrency(calculatedEMI.totalAmount, formData.currency)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Total Interest</div>
                                <div className="font-medium">
                                  {formatCurrency(calculatedEMI.totalInterest, formData.currency)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Effective Rate</div>
                                <div className="font-medium">
                                  {calculatedEMI.effectiveRate.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Statement and Due Date Info for Credit Card Transactions (Non-EMI) */}
            {formData.from_account_id && 
             !formData.is_emi &&
             accounts.find((a: Account) => a.id === formData.from_account_id)?.account_type === 'credit_card' && 
             statementInfo && (
              <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold text-sm text-purple-900 dark:text-purple-200">
                      Credit Card Billing Information
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Statement Date</div>
                        <div className="font-medium text-purple-600 dark:text-purple-400">
                          {statementInfo.statementDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Payment Due Date</div>
                        <div className="font-medium text-purple-600 dark:text-purple-400">
                          {statementInfo.dueDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This transaction will be included in the statement generated on {statementInfo.statementDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and payment will be due on {statementInfo.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
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
