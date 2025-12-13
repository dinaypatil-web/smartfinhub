import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accountApi, transactionApi, interestRateApi, emiApi, loanEMIPaymentApi, budgetApi } from '@/db/api';
import type { Account, Transaction, FinancialSummary, EMITransaction, Budget } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import { Plus, Wallet, CreditCard, TrendingUp, TrendingDown, Building2, AlertCircle, Calculator, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { calculateEMI, calculateAccruedInterest } from '@/utils/loanCalculations';
import { 
  calculateAvailableCredit, 
  calculateCreditUtilization, 
  getCreditLimitWarningLevel,
  calculateStatementAmount 
} from '@/utils/emiCalculations';
import {
  getBillingCycleInfo
} from '@/utils/billingCycleCalculations';
import { 
  calculateCreditCardStatementAmount, 
  shouldDisplayDueAmount, 
  getStatementDueDate 
} from '@/utils/statementCalculations';
import { checkAndPostInterestForAllLoans, getAccruedInterestReference } from '@/utils/loanInterestPosting';
import { calculateMonthlyCashFlow, getCreditCardDuesDetails } from '@/utils/cashFlowCalculations';
import { useToast } from '@/hooks/use-toast';
import InterestRateChart from '@/components/InterestRateChart';
import InterestRateTable from '@/components/InterestRateTable';
import BankLogo from '@/components/BankLogo';
import AccountStatementDialog from '@/components/AccountStatementDialog';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allExpenses, setAllExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingInterest, setPostingInterest] = useState(false);
  const [loanCalculations, setLoanCalculations] = useState<Record<string, { emi: number; accruedInterest: number }>>({});
  const [accountEMIs, setAccountEMIs] = useState<Record<string, EMITransaction[]>>({});
  const [accountTransactions, setAccountTransactions] = useState<Record<string, Transaction[]>>({});
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [cashFlow, setCashFlow] = useState<{
    openingBalance: number;
    incomeReceived: number;
    expensesIncurred: number;
    creditCardRepayments: number;
    remainingBudget: number;
    expectedBalance: number;
    creditCardDues: number;
    netAvailable: number;
  } | null>(null);
  const [creditCardDuesDetails, setCreditCardDuesDetails] = useState<Array<{
    account: Account;
    dueAmount: number;
    nextStatementDate: Date | null;
    nextDueDate: Date | null;
  }>>([]);

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, location.key]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get current month date range for expense breakdown
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [summaryData, transactions, monthExpenses] = await Promise.all([
        accountApi.getFinancialSummary(user.id),
        transactionApi.getTransactions(user.id, 10),
        transactionApi.getTransactionsByDateRange(user.id, startOfMonth, endOfMonth)
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(transactions);
      
      // Filter only expense transactions for the chart
      const expenses = monthExpenses.filter(t => t.transaction_type === 'expense');
      setAllExpenses(expenses);

      // Calculate loan metrics for all loan accounts
      const calculations: Record<string, { emi: number; accruedInterest: number }> = {};
      
      if (summaryData?.accounts_by_type.loan) {
        for (const account of summaryData.accounts_by_type.loan) {
          if (account.loan_principal && account.current_interest_rate && account.loan_tenure_months) {
            // Calculate EMI
            const emi = calculateEMI(
              Number(account.loan_principal),
              Number(account.current_interest_rate),
              Number(account.loan_tenure_months)
            );

            // Calculate accrued interest
            let accruedInterest = 0;
            if (account.loan_start_date) {
              try {
                // Get the reference point considering both EMI payments and interest_charge transactions
                const reference = await getAccruedInterestReference(account);
                const history = await interestRateApi.getInterestRateHistory(account.id);
                
                if (reference) {
                  accruedInterest = calculateAccruedInterest(
                    reference.referenceDate,
                    reference.referenceBalance,
                    history,
                    Number(account.current_interest_rate)
                  );
                }
              } catch (error) {
                console.error('Error calculating accrued interest:', error);
              }
            }

            calculations[account.id] = { emi, accruedInterest };
          }
        }
      }

      setLoanCalculations(calculations);

      // Load EMI data for credit card accounts
      const emis: Record<string, EMITransaction[]> = {};
      const accountTxs: Record<string, Transaction[]> = {};
      if (summaryData?.accounts_by_type.credit_card) {
        for (const account of summaryData.accounts_by_type.credit_card) {
          try {
            const accountEMIs = await emiApi.getActiveEMIsByAccount(account.id);
            if (accountEMIs.length > 0) {
              emis[account.id] = accountEMIs;
            }
            
            // Load transactions for due amount calculation
            const txs = await transactionApi.getTransactionsByAccount(user.id, account.id);
            accountTxs[account.id] = txs;
          } catch (error) {
            console.error(`Error loading data for account ${account.id}:`, error);
          }
        }
      }
      setAccountEMIs(emis);
      setAccountTransactions(accountTxs);

      // Calculate monthly cash flow
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      // Get all accounts from summary
      const allAccounts = [
        ...(summaryData.accounts_by_type.cash || []),
        ...(summaryData.accounts_by_type.bank || []),
        ...(summaryData.accounts_by_type.credit_card || []),
        ...(summaryData.accounts_by_type.loan || [])
      ];
      
      // Get all transactions for cash flow calculation
      const allTransactions = await transactionApi.getTransactions(user.id);
      
      const budget = await budgetApi.getBudget(user.id, currentMonth, currentYear);
      const cashFlowData = calculateMonthlyCashFlow(
        allAccounts,
        allTransactions,
        budget,
        currentMonth,
        currentYear
      );
      setCashFlow(cashFlowData);
      
      // Get credit card dues details with statement dates
      const creditCardDetails = getCreditCardDuesDetails(allAccounts);
      setCreditCardDuesDetails(creditCardDetails);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Wallet className="h-5 w-5" />;
      case 'bank':
        return <Building2 className="h-5 w-5" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'loan':
        return <Wallet className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const handlePostMonthlyInterest = async () => {
    if (!user || !summary) return;

    setPostingInterest(true);
    try {
      const loanAccounts = summary.accounts_by_type.loan || [];
      const result = await checkAndPostInterestForAllLoans(loanAccounts, user.id);

      if (result.results.length === 0) {
        toast({
          title: 'No Interest to Post',
          description: 'No loan accounts are due for interest posting today.',
        });
      } else {
        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.length - successCount;

        if (successCount > 0) {
          toast({
            title: 'Interest Posted Successfully',
            description: `Posted interest for ${successCount} loan account(s). Total: ${formatCurrency(result.totalPosted, currency)}`,
          });
          
          // Reload dashboard data to reflect changes
          await loadDashboardData();
        }

        if (failCount > 0) {
          const failedAccounts = result.results
            .filter(r => !r.success)
            .map(r => r.accountName)
            .join(', ');
          
          toast({
            title: 'Some Interest Postings Failed',
            description: `Failed to post interest for: ${failedAccounts}`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error posting interest:', error);
      toast({
        title: 'Error',
        description: 'Failed to post monthly interest. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPostingInterest(false);
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'cash':
        return 'Cash';
      case 'bank':
        return 'Bank Account';
      case 'credit_card':
        return 'Credit Card';
      case 'loan':
        return 'Loan Account';
      default:
        return type;
    }
  };

  const getBalanceColor = (account: Account) => {
    if (account.account_type === 'credit_card' || account.account_type === 'loan') {
      return Number(account.balance) > 0 ? 'text-danger' : 'text-success';
    }
    return Number(account.balance) >= 0 ? 'text-success' : 'text-danger';
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    setStatementDialogOpen(true);
  };

  const bankAccountsData = [
    ...(summary?.accounts_by_type.cash.map(acc => ({
      name: acc.account_name,
      value: Number(acc.balance)
    })) || []),
    ...(summary?.accounts_by_type.bank.map(acc => ({
      name: acc.account_name,
      value: Number(acc.balance)
    })) || [])
  ];

  const expenseData = allExpenses
    .reduce((acc, t) => {
      const category = t.category || 'Other';
      const existing = acc.find(item => item.name === category);
      if (existing) {
        existing.value += Number(t.amount);
      } else {
        acc.push({ name: category, value: Number(t.amount) });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
  ];

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'cash':
        return 'from-emerald-500 to-teal-600';
      case 'bank':
        return 'from-blue-500 to-indigo-600';
      case 'credit_card':
        return 'from-purple-500 to-pink-600';
      case 'loan':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-muted" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Welcome back, {profile?.email || 'User'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/accounts/new">
            <Button size="sm" className="md:size-default shadow-elegant hover:shadow-glow transition-smooth">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </Link>
          <Link to="/transactions/new">
            <Button variant="outline" size="sm" className="md:size-default hover-lift">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </Link>
          {summary?.accounts_by_type.loan && summary.accounts_by_type.loan.length > 0 && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="md:size-default hover-lift"
              onClick={handlePostMonthlyInterest}
              disabled={postingInterest}
            >
              <Calculator className="mr-2 h-4 w-4" />
              {postingInterest ? 'Posting...' : 'Post Monthly Interest'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 min-w-max md:min-w-0">
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 hover-lift shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Assets</CardTitle>
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary?.total_assets || 0, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cash and bank accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 hover-lift shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Liabilities</CardTitle>
            <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary?.total_liabilities || 0, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Credit card balances
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 hover-lift shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liquid Assets</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary?.liquid_assets || 0, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 hover-lift shadow-card ${(summary?.working_capital || 0) >= 0 ? 'border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20' : 'border-l-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Capital</CardTitle>
            <div className={`h-10 w-10 rounded-full ${(summary?.working_capital || 0) >= 0 ? 'bg-purple-500/20' : 'bg-amber-500/20'} flex items-center justify-center`}>
              <TrendingUp className={`h-5 w-5 ${(summary?.working_capital || 0) >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.working_capital || 0) >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatCurrency(summary?.working_capital || 0, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assets minus liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {cashFlow && (
        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Monthly Cash Flow Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Opening Balance</span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(cashFlow.openingBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Income Received</span>
                    <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      + {formatCurrency(cashFlow.incomeReceived, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expenses Incurred</span>
                    <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                      - {formatCurrency(cashFlow.expensesIncurred, currency)}
                    </span>
                  </div>
                  {cashFlow.creditCardRepayments > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Credit Card Repayments</span>
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        - {formatCurrency(cashFlow.creditCardRepayments, currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Remaining Budget</span>
                    <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                      - {formatCurrency(cashFlow.remainingBudget, currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-l-2 border-muted pl-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Expected Balance</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(cashFlow.expectedBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Credit Card Dues</span>
                    <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                      - {formatCurrency(cashFlow.creditCardDues, currency)}
                    </span>
                  </div>
                </div>

                <div className="border-l-2 border-muted pl-4 flex items-center justify-between">
                  <span className="text-base font-semibold text-muted-foreground">Net Available</span>
                  <span className={`text-2xl font-bold ${cashFlow.netAvailable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(cashFlow.netAvailable, currency)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-muted">
                <p className="text-xs text-muted-foreground">
                  This summary shows your projected cash position for the current month based on opening balance, income received, expenses incurred, credit card repayments, remaining budget allocation, and credit card dues.
                </p>
              </div>

              {/* Credit Card Dues Breakdown */}
              {creditCardDuesDetails.length > 0 && (
                <div className="pt-3 border-t border-muted space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Upcoming Credit Card Dues</h4>
                  {creditCardDuesDetails.map(({ account, dueAmount, nextDueDate }) => (
                    <div key={account.id} className="flex items-center justify-between text-sm p-2 rounded bg-purple-50 dark:bg-purple-950/20">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-medium">{account.account_name}</p>
                          {nextDueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due: {nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(dueAmount, account.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 min-w-max md:min-w-0">
        <Card className="shadow-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              Cash & Bank Accounts Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bankAccountsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bankAccountsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bankAccountsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No bank accounts yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-secondary" />
              </div>
              Expenses Breakdown (Current Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expenses yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 min-w-max lg:min-w-0">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Your Accounts
            </CardTitle>
            <Link to="/accounts">
              <Button variant="ghost" size="sm" className="hover-lift">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.accounts_by_type.cash.map(account => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-4 border-l-4 border-l-emerald-500 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 hover-lift shadow-card cursor-pointer"
                  onClick={() => handleAccountClick(account)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-elegant">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </div>
                </div>
              ))}
              {summary?.accounts_by_type.bank.map(account => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-4 border-l-4 border-l-blue-500 rounded-lg bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 hover-lift shadow-card cursor-pointer"
                  onClick={() => handleAccountClick(account)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-elegant border-2 border-blue-200 dark:border-blue-800">
                      <BankLogo src={account.institution_logo} alt={account.institution_name || 'Bank'} bankName={account.institution_name || undefined} className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getAccountTypeLabel(account.account_type)} • {formatAccountNumber(account.last_4_digits)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </div>
                </div>
              ))}
              {summary?.accounts_by_type.credit_card.map(account => {
                const emis = accountEMIs[account.id] || [];
                const transactions = accountTransactions[account.id] || [];
                
                // Calculate statement amount using proper statement period logic
                let statementAmount = account.balance;
                let dueAmount = 0;
                let showDueAmount = false;
                let dueDate: Date | null = null;
                
                if (account.statement_day) {
                  const statementCalc = calculateCreditCardStatementAmount(
                    account.id,
                    account.statement_day,
                    transactions,
                    emis
                  );
                  statementAmount = statementCalc.statementAmount;
                  
                  // Only show due amount after statement date
                  showDueAmount = shouldDisplayDueAmount(account.statement_day);
                  if (showDueAmount) {
                    // After statement date, the entire balance is due
                    dueAmount = Math.abs(account.balance);
                    if (account.due_day) {
                      dueDate = getStatementDueDate(account.statement_day, account.due_day);
                    }
                  }
                } else {
                  // Fallback to old calculation if no statement day
                  statementAmount = calculateStatementAmount(account.balance, emis);
                  dueAmount = Math.abs(account.balance);
                  showDueAmount = true;
                }
                
                const utilization = account.credit_limit ? calculateCreditUtilization(account.balance, account.credit_limit) : null;
                const warningLevel = account.credit_limit ? getCreditLimitWarningLevel(account.balance, account.credit_limit) : 'safe';
                const availableCredit = account.credit_limit ? calculateAvailableCredit(account.balance, account.credit_limit) : null;
                
                const billingInfo = (account.statement_day && account.due_day) 
                  ? getBillingCycleInfo(account.statement_day, account.due_day)
                  : null;
                
                return (
                  <div 
                    key={account.id} 
                    className="p-4 border-l-4 border-l-purple-500 rounded-lg bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 hover:shadow-md transition-shadow space-y-3 cursor-pointer"
                    onClick={() => handleAccountClick(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md border-2 border-purple-200 dark:border-purple-800">
                          <BankLogo src={account.institution_logo} alt={account.institution_name || 'Credit Card'} bankName={account.institution_name || undefined} className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="font-medium">{account.account_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAccountTypeLabel(account.account_type)} • {formatAccountNumber(account.last_4_digits)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-purple-600 dark:text-purple-400">
                          {formatCurrency(Number(account.balance), account.currency)}
                        </div>
                        {emis.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            + {formatCurrency(statementAmount - account.balance, account.currency)} EMI
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credit Limit Information */}
                    {account.credit_limit && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Credit Utilization</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              warningLevel === 'danger' ? 'text-red-600 dark:text-red-400' :
                              warningLevel === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {utilization?.toFixed(1)}%
                            </span>
                            {warningLevel !== 'safe' && (
                              <AlertCircle className={`h-3 w-3 ${
                                warningLevel === 'danger' ? 'text-red-600' : 'text-amber-600'
                              }`} />
                            )}
                          </div>
                        </div>
                        <Progress 
                          value={utilization || 0} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Available: {formatCurrency(availableCredit || 0, account.currency)}</span>
                          <span>Limit: {formatCurrency(account.credit_limit, account.currency)}</span>
                        </div>
                      </div>
                    )}

                    {/* EMI Information */}
                    {emis.length > 0 && (
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Active EMIs ({emis.length})</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            Total Statement: {formatCurrency(statementAmount, account.currency)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {emis.slice(0, 2).map(emi => (
                            <div key={emi.id} className="flex items-center justify-between text-xs bg-purple-50 dark:bg-purple-950/30 rounded px-2 py-1">
                              <span className="text-muted-foreground truncate max-w-[150px]">
                                {emi.description}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {emi.remaining_installments}/{emi.emi_months}
                                </Badge>
                                <span className="font-medium">
                                  {formatCurrency(emi.monthly_emi, account.currency)}/mo
                                </span>
                              </div>
                            </div>
                          ))}
                          {emis.length > 2 && (
                            <div className="text-xs text-center text-muted-foreground">
                              +{emis.length - 2} more EMIs
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Due Amount Information - Only show after statement date */}
                    {showDueAmount && (
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {dueAmount > 0 
                              ? dueDate
                                ? `${formatCurrency(dueAmount, account.currency)} due on ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                : billingInfo 
                                  ? `${formatCurrency(dueAmount, account.currency)} due on ${billingInfo.dueDateStr}`
                                  : `${formatCurrency(dueAmount, account.currency)} outstanding balance`
                              : dueDate
                                ? `No amount due (Next due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                                : billingInfo
                                  ? `No amount due (Next due: ${billingInfo.dueDateStr})`
                                  : 'No outstanding balance'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    {!showDueAmount && account.statement_day && (
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Statement will be generated on day {account.statement_day}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {summary?.accounts_by_type.loan.map(account => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-4 border-l-4 border-l-orange-500 rounded-lg bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleAccountClick(account)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md border-2 border-orange-200 dark:border-orange-800">
                      <BankLogo src={account.institution_logo} alt={account.institution_name || 'Loan'} bankName={account.institution_name || undefined} className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getAccountTypeLabel(account.account_type)} • {account.interest_rate_type}
                      </p>
                      {loanCalculations[account.id] && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                          EMI: {formatCurrency(loanCalculations[account.id].emi, account.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account.current_interest_rate}% APR
                    </div>
                  </div>
                </div>
              ))}
              {!summary || (summary.accounts_by_type.bank.length === 0 && 
                summary.accounts_by_type.credit_card.length === 0 && 
                summary.accounts_by_type.loan.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts yet. Add your first account to get started!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description || transaction.transaction_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.category} • {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`font-semibold ${
                    transaction.transaction_type === 'income' ? 'text-success' : 'text-danger'
                  }`}>
                    {transaction.transaction_type === 'income' ? '+' : '-'}
                    {formatCurrency(Number(transaction.amount), transaction.currency)}
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Add your first transaction!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interest Rate Charts for Floating Rate Loans */}
      {summary?.accounts_by_type.loan.filter(account => account.interest_rate_type === 'floating').length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Floating Interest Rate Trends</h2>
          <div className="grid gap-6 xl:grid-cols-1">
            {summary.accounts_by_type.loan
              .filter(account => account.interest_rate_type === 'floating')
              .map(account => (
                <InterestRateChart
                  key={account.id}
                  accountId={account.id}
                  accountName={account.account_name}
                />
              ))}
          </div>
        </div>
      )}

      {/* Interest Rate History Tables for All Loans */}
      {summary?.accounts_by_type.loan.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Interest Rate History & Accrued Interest</h2>
          <div className="grid gap-6 xl:grid-cols-1">
            {summary.accounts_by_type.loan.map(account => (
              <InterestRateTable
                key={account.id}
                accountId={account.id}
                accountName={account.account_name}
                loanPrincipal={account.loan_principal || 0}
                loanStartDate={account.loan_start_date || new Date().toISOString().split('T')[0]}
                currency={account.currency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Account Statement Dialog */}
      <AccountStatementDialog
        account={selectedAccount}
        open={statementDialogOpen}
        onOpenChange={setStatementDialogOpen}
        currency={currency}
      />
    </div>
  );
}
