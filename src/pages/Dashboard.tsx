import { useEffect, useState } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, transactionApi, interestRateApi, emiApi, budgetApi, creditCardStatementApi } from '@/db/api';
import type { Account, Transaction, FinancialSummary, EMITransaction } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import { Plus, Wallet, CreditCard, TrendingUp, TrendingDown, Building2, AlertCircle, Calculator, DollarSign, ExternalLink, Sparkles, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
import QuickLinks from '@/components/dashboard/QuickLinks';
import AIInsights from '@/components/dashboard/AIInsights';
import BankQuickLinks from '@/components/BankQuickLinks';
import { getBankAppLink } from '@/config/paymentApps';
import { cache } from '@/utils/cache';

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
    remainingIncomeBudget: number;
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
  const [accountAdvanceBalances, setAccountAdvanceBalances] = useState<Record<string, number>>({});

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      // Add a small delay to allow the UI to render first
      const timer = setTimeout(() => {
        loadDashboardData();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, location.key]);

  const loadDashboardData = async () => {
    if (!user) return;

    // Check cache first
    const cacheKey = `dashboard-${user.id}`;
    const cachedData = cache.get<{
      summary: FinancialSummary;
      transactions: Transaction[];
      expenses: Transaction[];
    }>(cacheKey);

    if (cachedData) {
      setSummary(cachedData.summary);
      setRecentTransactions(cachedData.transactions);
      setAllExpenses(cachedData.expenses);
      setLoading(false);

      // Load heavy calculations in background
      loadHeavyCalculations(cachedData.summary);
      return;
    }

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

      // Filter expense, loan payment and credit card repayment transactions for the chart
      const expenses = monthExpenses.filter(t =>
        t.transaction_type === 'expense' ||
        t.transaction_type === 'loan_payment' ||
        t.transaction_type === 'credit_card_repayment'
      );
      setAllExpenses(expenses);

      // Cache the basic data
      cache.set(cacheKey, {
        summary: summaryData,
        transactions,
        expenses
      }, 10000); // Cache for 10 seconds

      setLoading(false);

      // Load heavy calculations in background
      loadHeavyCalculations(summaryData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      let errorMessage = 'Failed to load dashboard data';
      if (error instanceof Error) {
        errorMessage = `Failed to load dashboard data: ${error.message}`;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = `Failed to load dashboard data: ${(error as any).message}`;
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const loadHeavyCalculations = async (summaryData: FinancialSummary) => {
    if (!user) return;
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();


      const allTransactions = await transactionApi.getTransactions(user.id);

      const loanPromises = (summaryData?.accounts_by_type.loan || []).map(async (account) => {
        if (!account.loan_principal || !account.current_interest_rate || !account.loan_tenure_months) {
          return { accountId: account.id, data: null };
        }
        let emi = 0, accruedInterest = 0;
        try {
          const reference = await getAccruedInterestReference(account);
          const history = await interestRateApi.getInterestRateHistory(account.id);
          const sortedHistory = [...history].sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
          const openingRate = sortedHistory.length > 0 ? Number(sortedHistory[0].interest_rate) : Number(account.current_interest_rate);
          emi = calculateEMI(Number(account.loan_principal), openingRate, Number(account.loan_tenure_months));
          if (reference) {
            accruedInterest = calculateAccruedInterest(reference.referenceDate, reference.referenceBalance, history, Number(account.current_interest_rate));
          }
        } catch (error) {
          emi = calculateEMI(Number(account.loan_principal), Number(account.current_interest_rate), Number(account.loan_tenure_months));
        }
        return { accountId: account.id, data: { emi, accruedInterest } };
      });

      const loanResults = await Promise.all(loanPromises);
      const calculations: Record<string, { emi: number; accruedInterest: number }> = {};
      loanResults.forEach(r => { if (r.data) calculations[r.accountId] = r.data; });
      setLoanCalculations(calculations);

      const creditCardPromises = (summaryData?.accounts_by_type.credit_card || []).map(async (account) => {
        try {
          const [accountEMIs, txs, balance] = await Promise.all([
            emiApi.getActiveEMIsByAccount(account.id),
            transactionApi.getTransactionsByAccount(user.id, account.id),
            creditCardStatementApi.getAdvanceBalance(account.id)
          ]);
          return { accountId: account.id, emis: accountEMIs.length > 0 ? accountEMIs : null, transactions: txs, advanceBalance: balance };
        } catch (error) {
          return { accountId: account.id, emis: null, transactions: [], advanceBalance: 0 };
        }
      });

      const creditCardResults = await Promise.all(creditCardPromises);
      const emis: Record<string, EMITransaction[]> = {};
      const accountTxs: Record<string, Transaction[]> = {};
      const advanceMap: Record<string, number> = {};

      creditCardResults.forEach(r => {
        if (r.emis) emis[r.accountId] = r.emis;
        accountTxs[r.accountId] = r.transactions;
        advanceMap[r.accountId] = r.advanceBalance;
      });

      setAccountEMIs(emis);
      setAccountTransactions(accountTxs);
      setAccountAdvanceBalances(advanceMap);

      const allAccounts = [
        ...(summaryData?.accounts_by_type.cash || []),
        ...(summaryData?.accounts_by_type.bank || []),
        ...(summaryData?.accounts_by_type.credit_card || []),
        ...(summaryData?.accounts_by_type.loan || [])
      ];

      const budget = await budgetApi.getBudget(user.id, currentMonth, currentYear);
      const cashFlowData = calculateMonthlyCashFlow(allAccounts, allTransactions, accountTxs, emis, budget || null, currentMonth, currentYear, advanceMap);
      setCashFlow(cashFlowData);

      const details = getCreditCardDuesDetails(allAccounts, accountTxs, emis, advanceMap);
      setCreditCardDuesDetails(details);
    } catch (error) {
      console.error('Error:', error);
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

  const handleOpenBankApp = (e: React.MouseEvent, bankName: string, webUrl?: string) => {
    e.stopPropagation(); // Prevent account card click

    const bankLink = getBankAppLink(bankName);
    if (!bankLink) {
      // No deep link configured, open web URL if available
      if (webUrl) {
        window.open(webUrl, '_blank');
      } else {
        toast({
          title: 'Bank App Not Configured',
          description: `No app link available for ${bankName}`,
          variant: 'destructive',
        });
      }
      return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && bankLink.urlScheme) {
      // Try deep link on mobile
      window.location.href = bankLink.urlScheme;

      // Fallback to web URL after delay
      setTimeout(() => {
        if (document.hidden) {
          return; // App opened successfully
        }
        if (bankLink.webUrl) {
          window.open(bankLink.webUrl, '_blank');
        }
      }, 1500);
    } else {
      // On desktop, open web URL
      if (bankLink.webUrl) {
        window.open(bankLink.webUrl, '_blank');
      } else {
        toast({
          title: 'Web URL Not Available',
          description: `Please use the mobile app for ${bankName}`,
        });
      }
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
      if (t.transaction_splits && t.transaction_splits.length > 0) {
        t.transaction_splits.forEach(s => {
          const category = s.category || 'Other';
          const existing = acc.find(item => item.name === category);
          if (existing) {
            existing.value += Number(s.amount);
          } else {
            acc.push({ name: category, value: Number(s.amount) });
          }
        });
      } else {
        const category = t.category || 'Other';
        const existing = acc.find(item => item.name === category);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          acc.push({ name: category, value: Number(t.amount) });
        }
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  const COLORS = [
    '#4f46e5', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Rose
    '#3b82f6', // Blue
    '#f97316', // Orange
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.user_metadata?.full_name || user?.name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'there';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-52 rounded-xl bg-muted/60" />
            <Skeleton className="h-4 w-72 rounded-lg bg-muted/50" />
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-10 w-28 rounded-xl bg-muted/60" />
            <Skeleton className="h-10 w-32 rounded-xl bg-muted/60" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-muted/50" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Modern Executive Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 animate-slide-down">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {getGreeting()}, <span className="text-primary">{displayName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span>Financial Command Center</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-2.5 flex-wrap items-center">
          <Link to="/voice-transact">
            <Button size="sm" className="h-9 rounded-xl gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Ask AI Copilot</span>
            </Button>
          </Link>
          <Link to="/accounts/new">
            <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-xs gap-1.5 font-medium">
              <Plus className="h-4 w-4" />
              <span>Add Account</span>
            </Button>
          </Link>
          <Link to="/transactions/new">
            <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-xs gap-1.5 font-medium">
              <Plus className="h-4 w-4" />
              <span>Add Transaction</span>
            </Button>
          </Link>
          {summary?.accounts_by_type.loan && summary.accounts_by_type.loan.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="h-9 rounded-xl shadow-xs gap-1.5 font-medium text-xs sm:text-sm"
              onClick={handlePostMonthlyInterest}
              disabled={postingInterest}
            >
              <Calculator className="h-4 w-4" />
              <span>{postingInterest ? 'Posting...' : 'Post Interest'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-11 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60 gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none rounded-lg px-4 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
              Overview
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1 sm:flex-none rounded-lg px-4 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
              Accounts
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex-1 sm:flex-none rounded-lg px-4 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
              Charts & Analytics
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 sm:flex-none rounded-lg px-4 text-xs sm:text-sm font-semibold whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all">
              Transactions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Executive Metrics 4-Card Grid */}
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Current Assets */}
            <Card className="border border-border/70 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 bg-card animate-slide-up group">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Assets
                </CardTitle>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(summary?.total_assets || 0, currency)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>Cash & bank account balances</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Liabilities */}
            <Card className="border border-border/70 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 bg-card animate-slide-up animate-stagger-1 group">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Liabilities
                </CardTitle>
                <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(summary?.total_liabilities || 0, currency)}
                </div>
                <div className="flex flex-col mt-2 gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                    <span>Credit cards & obligations</span>
                  </div>
                  {cashFlow && cashFlow.creditCardDues > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-semibold w-fit">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                      Monthly Dues: {formatCurrency(cashFlow.creditCardDues, currency)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Liquid Assets */}
            <Card className="border border-border/70 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 bg-card animate-slide-up animate-stagger-2 group">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Liquid Assets
                </CardTitle>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(summary?.liquid_assets || 0, currency)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  <span>Immediately available capital</span>
                </div>
              </CardContent>
            </Card>

            {/* Working Capital */}
            <Card className="border border-border/70 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 bg-card animate-slide-up animate-stagger-3 group">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-3 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Working Capital
                </CardTitle>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${(summary?.working_capital || 0) >= 0 ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${(summary?.working_capital || 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatCurrency(summary?.working_capital || 0, currency)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${(summary?.working_capital || 0) >= 0 ? 'bg-indigo-500' : 'bg-amber-500'}`}></span>
                  <span>Total assets minus liabilities</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links - Bank Apps and Payment Apps */}
          <QuickLinks
            countryCode={profile?.default_country || 'US'}
            accounts={summary ? [
              ...summary.accounts_by_type.bank,
              ...summary.accounts_by_type.credit_card,
              ...summary.accounts_by_type.loan
            ] : []}
          />

          {/* AI Financial Insights */}
          <AIInsights />
        </TabsContent>

        <TabsContent value="charts" className="space-y-6 mt-6">
          {/* Monthly Cash Flow Summary */}
          {cashFlow && (
            <Card className="border border-border/70 shadow-card rounded-2xl bg-card animate-slide-up">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">Monthly Cash Flow Forecast</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Inflows, expected budgets, and planned dues for the current month
                      </CardDescription>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                    cashFlow.netAvailable >= 0 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                  }`}>
                    Net: {formatCurrency(cashFlow.netAvailable, currency)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Inflows & Opening */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Liquid Inflows
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">Opening Balance</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatCurrency(cashFlow.openingBalance, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">Income Received</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          + {formatCurrency(cashFlow.incomeReceived, currency)}
                        </span>
                      </div>
                      {cashFlow.remainingIncomeBudget > 0 && (
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-muted-foreground">Pending Expected Income</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            + {formatCurrency(cashFlow.remainingIncomeBudget, currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outflows & Budgets */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Outflows & Commitments
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">Expenses Incurred</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                          - {formatCurrency(cashFlow.expensesIncurred, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">Remaining Budget</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                          - {formatCurrency(cashFlow.remainingBudget, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">Credit Card Dues</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
                          - {formatCurrency(cashFlow.creditCardDues, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Available Summary */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/70 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Projected End-of-Month Reserve
                      </span>
                      <div className="mt-3">
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                          cashFlow.netAvailable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {formatCurrency(cashFlow.netAvailable, currency)}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          After all budgeted expenses and pending credit card obligations
                        </p>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                      Formula: Opening + Income − Expenses − Remaining Budget − Dues
                    </div>
                  </div>
                </div>

                {/* Credit Card Dues Breakdown */}
                {creditCardDuesDetails.length > 0 && (
                  <div className="pt-4 border-t border-border/50 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Credit Card Dues Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {creditCardDuesDetails.map(({ account, dueAmount, nextDueDate }) => (
                        <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                          <div className="flex items-center gap-2.5">
                            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <div>
                              <p className="font-semibold text-xs text-foreground truncate max-w-[130px]">{account.account_name}</p>
                              {nextDueDate && (
                                <p className="text-[11px] text-muted-foreground">
                                  Due: {nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-purple-600 dark:text-purple-400 tabular-nums">
                            {formatCurrency(dueAmount, account.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Donut Chart 1: Cash & Bank Distribution */}
            <Card className="border border-border/70 rounded-2xl shadow-card bg-card animate-slide-up">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <span>Cash & Bank Distribution</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Proportion across checking, savings, and cash
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bankAccountsData.length > 0 ? (
                  <div className="relative h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bankAccountsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {bankAccountsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          formatter={(value: number) => formatCurrency(value, currency)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Liquid</span>
                      <span className="text-base font-extrabold text-foreground mt-0.5 tabular-nums">
                        {formatCurrency(summary?.liquid_assets || 0, currency)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    No bank accounts linked yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donut Chart 2: Expenses Breakdown */}
            <Card className="border border-border/70 rounded-2xl shadow-card bg-card animate-slide-up animate-stagger-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <span>Expenses Breakdown</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Current month spending categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expenseData.length > 0 ? (
                  <div className="relative h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {expenseData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          formatter={(value: number) => formatCurrency(value, currency)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Spent</span>
                      <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                        {formatCurrency(expenseData.reduce((sum, item) => sum + item.value, 0), currency)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                    No expenses recorded this month
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interest Rate Charts for Floating Rate Loans */}
          {summary?.accounts_by_type?.loan && summary.accounts_by_type.loan.filter(account => account.interest_rate_type === 'floating').length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Floating Interest Rate Trends</h2>
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
          {summary?.accounts_by_type?.loan && summary.accounts_by_type.loan.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Interest Rate History & Accrued Interest</h2>
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
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6 mt-6">
          <Card className="border border-border/70 shadow-card rounded-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Your Financial Accounts</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Manage checking, credit cards, loans, and cash balances
                  </CardDescription>
                </div>
              </div>
              <Link to="/accounts">
                <Button variant="outline" size="sm" className="text-xs h-8 px-3 rounded-lg">
                  Manage All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Cash Accounts */}
                {summary?.accounts_by_type.cash.map((account, index) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-4 border border-border/70 rounded-xl bg-card hover:bg-muted/30 hover:border-emerald-500/40 transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 cursor-pointer animate-slide-up animate-stagger-${Math.min(index + 1, 4)}`}
                    onClick={() => handleAccountClick(account)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground break-words">{account.account_name}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {getAccountTypeLabel(account.account_type)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </div>
                  </div>
                ))}

                {/* Bank Accounts */}
                {summary?.accounts_by_type.bank.map((account, index) => {
                  return (
                    <div
                      key={account.id}
                      className={`p-4 border border-border/70 rounded-xl bg-card hover:bg-muted/30 hover:border-blue-500/40 transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 animate-slide-up animate-stagger-${Math.min(index + 1, 4)}`}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleAccountClick(account)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted/40 p-1 border border-border/60 flex items-center justify-center">
                            <BankLogo src={account.institution_logo} alt={account.institution_name || 'Bank'} bankName={account.institution_name || undefined} className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground break-words">{account.account_name}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {getAccountTypeLabel(account.account_type)} • {formatAccountNumber(account.last_4_digits)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400 tabular-nums">
                          {formatCurrency(Number(account.balance), account.currency)}
                        </div>
                      </div>
                      {user && (
                        <div className="mt-3 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                          <BankQuickLinks
                            bankName={account.institution_name || ''}
                            country={account.country}
                            accountId={account.id}
                            userId={user.id}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Credit Card Accounts */}
                {summary?.accounts_by_type.credit_card.map((account, index) => {
                  const emis = accountEMIs[account.id] || [];
                  const transactions = accountTransactions[account.id] || [];
                  const bankLink = getBankAppLink(account.institution_name || '');

                  let statementAmount = account.balance;
                  let dueAmount = 0;
                  let showDueAmount = false;
                  let dueDate: Date | null = null;

                  if (account.statement_day) {
                    const statementCalc = calculateCreditCardStatementAmount(
                      account.id,
                      account.statement_day,
                      transactions,
                      emis,
                      new Date(),
                      Number(account.balance),
                      account.due_day,
                      accountAdvanceBalances[account.id] || 0
                    );
                    statementAmount = statementCalc.statementAmount;

                    showDueAmount = shouldDisplayDueAmount(account.statement_day);
                    if (showDueAmount) {
                      dueAmount = Math.abs(statementAmount);
                      if (account.due_day) {
                        dueDate = getStatementDueDate(account.statement_day, account.due_day);
                      }
                    }
                  } else {
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
                      className={`p-4 border border-border/70 rounded-xl bg-card hover:bg-muted/30 hover:border-purple-500/40 transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 space-y-3 cursor-pointer animate-slide-up animate-stagger-${Math.min(index + 1, 4)}`}
                      onClick={() => handleAccountClick(account)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted/40 p-1 border border-border/60 flex items-center justify-center">
                            <BankLogo src={account.institution_logo} alt={account.institution_name || 'Credit Card'} bankName={account.institution_name || undefined} className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground break-words">{account.account_name}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {getAccountTypeLabel(account.account_type)} • {formatAccountNumber(account.last_4_digits)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-extrabold text-sm sm:text-base text-purple-600 dark:text-purple-400 tabular-nums">
                              {formatCurrency(Number(account.balance), account.currency)}
                            </div>
                            {emis.length > 0 && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                + {formatCurrency(emis.reduce((sum: number, emi: any) => sum + emi.monthly_emi, 0), account.currency)} EMI
                              </div>
                            )}
                          </div>
                          {bankLink && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-lg"
                              onClick={(e) => handleOpenBankApp(e, account.institution_name || '', bankLink.webUrl)}
                              title={`Open ${account.institution_name} app`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Credit Limit Information */}
                      {account.credit_limit && (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Credit Utilization</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold tabular-nums ${
                                warningLevel === 'danger' ? 'text-rose-600 dark:text-rose-400' :
                                warningLevel === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {utilization?.toFixed(1)}%
                              </span>
                              {warningLevel !== 'safe' && (
                                <AlertCircle className={`h-3 w-3 ${warningLevel === 'danger' ? 'text-rose-600' : 'text-amber-600'}`} />
                              )}
                            </div>
                          </div>
                          <Progress
                            value={utilization || 0}
                            className="h-1.5 rounded-full"
                          />
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Available: {formatCurrency(availableCredit || 0, account.currency)}</span>
                            <span>Limit: {formatCurrency(account.credit_limit, account.currency)}</span>
                          </div>
                        </div>
                      )}

                      {/* Due Amount Information */}
                      {showDueAmount && (
                        <div className="pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>
                              {dueAmount > 0
                                ? dueDate
                                  ? `${formatCurrency(dueAmount, account.currency)} due on ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : billingInfo
                                    ? `${formatCurrency(dueAmount, account.currency)} due on ${billingInfo.dueDateStr}`
                                    : `${formatCurrency(dueAmount, account.currency)} outstanding balance`
                                : 'No outstanding amount due'
                              }
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bank Quick Links */}
                      {user && (
                        <div className="pt-2.5 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                          <BankQuickLinks
                            bankName={account.institution_name || ''}
                            country={account.country}
                            accountId={account.id}
                            userId={user.id}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loan Accounts */}
                {summary?.accounts_by_type.loan.map((account, index) => {
                  return (
                    <div
                      key={account.id}
                      className={`p-4 border border-border/70 rounded-xl bg-card hover:bg-muted/30 hover:border-orange-500/40 transition-all duration-200 shadow-2xs hover:shadow-card hover:-translate-y-0.5 animate-slide-up animate-stagger-${Math.min(index + 1, 4)}`}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleAccountClick(account)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted/40 p-1 border border-border/60 flex items-center justify-center">
                            <BankLogo src={account.institution_logo} alt={account.institution_name || 'Loan'} bankName={account.institution_name || undefined} className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground break-words">{account.account_name}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {getAccountTypeLabel(account.account_type)} • {account.interest_rate_type}
                            </p>
                            {loanCalculations[account.id] && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                                EMI: {formatCurrency(loanCalculations[account.id].emi, account.currency)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-sm sm:text-base text-orange-600 dark:text-orange-400 tabular-nums">
                            {formatCurrency(Number(account.balance), account.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {account.current_interest_rate}% APR
                          </div>
                        </div>
                      </div>
                      {user && (
                        <div className="mt-3 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                          <BankQuickLinks
                            bankName={account.institution_name || ''}
                            country={account.country}
                            accountId={account.id}
                            userId={user.id}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {!summary || (summary.accounts_by_type.bank.length === 0 &&
                  summary.accounts_by_type.credit_card.length === 0 &&
                  summary.accounts_by_type.loan.length === 0 &&
                  summary.accounts_by_type.cash.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-sm">No accounts found.</p>
                      <Link to="/accounts/new" className="mt-2 inline-block">
                        <Button size="sm" variant="outline" className="text-xs mt-2">Add Your First Account</Button>
                      </Link>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Transactions */}
        <TabsContent value="transactions" className="space-y-6 mt-6">
          <Card className="border border-border/70 shadow-card rounded-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Recent Transactions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Latest inflows, expenses, and account transfers
                </CardDescription>
              </div>
              <Link to="/transactions">
                <Button variant="outline" size="sm" className="text-xs h-8 px-3 rounded-lg">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2.5">
                {recentTransactions.map(transaction => {
                  const isIncome = transaction.transaction_type === 'income';
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3.5 border border-border/60 rounded-xl hover:bg-muted/30 transition-all duration-200 gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {transaction.description || transaction.transaction_type}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            {transaction.category || 'General'} • {new Date(transaction.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className={`text-xs sm:text-sm font-extrabold flex-shrink-0 tabular-nums ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isIncome ? '+' : '-'}
                        {formatCurrency(Number(transaction.amount), transaction.currency)}
                      </div>
                    </div>
                  );
                })}
                {recentTransactions.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">No transactions yet.</p>
                    <Link to="/transactions/new" className="mt-2 inline-block">
                      <Button size="sm" variant="outline" className="text-xs mt-2">Add First Transaction</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
