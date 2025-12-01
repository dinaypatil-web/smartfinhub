import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accountApi, transactionApi, interestRateApi } from '@/db/api';
import type { Account, Transaction, FinancialSummary } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import { Plus, Wallet, CreditCard, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { calculateEMI, calculateAccruedInterest } from '@/utils/loanCalculations';
import InterestRateChart from '@/components/InterestRateChart';
import InterestRateTable from '@/components/InterestRateTable';
import BankLogo from '@/components/BankLogo';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanCalculations, setLoanCalculations] = useState<Record<string, { emi: number; accruedInterest: number }>>({});

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [summaryData, transactions] = await Promise.all([
        accountApi.getFinancialSummary(user.id),
        transactionApi.getTransactions(user.id, 10)
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(transactions);

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
                const history = await interestRateApi.getInterestRateHistory(account.id);
                accruedInterest = calculateAccruedInterest(
                  account.loan_start_date,
                  Number(account.balance),
                  history,
                  Number(account.current_interest_rate)
                );
              } catch (error) {
                console.error('Error calculating accrued interest:', error);
              }
            }

            calculations[account.id] = { emi, accruedInterest };
          }
        }
      }

      setLoanCalculations(calculations);
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

  const expenseData = recentTransactions
    .filter(t => t.transaction_type === 'expense')
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.email || 'User'}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/accounts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </Link>
          <Link to="/transactions/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
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

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
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

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
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

        <Card className={`border-l-4 ${(summary?.working_capital || 0) >= 0 ? 'border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20' : 'border-l-amber-500 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20'}`}>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash & Bank Accounts Distribution</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Expenses Breakdown</CardTitle>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Accounts</CardTitle>
            <Link to="/accounts">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.accounts_by_type.cash.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border-l-4 border-l-emerald-500 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
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
                <div key={account.id} className="flex items-center justify-between p-4 border-l-4 border-l-blue-500 rounded-lg bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md border-2 border-blue-200 dark:border-blue-800">
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
              {summary?.accounts_by_type.credit_card.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border-l-4 border-l-purple-500 rounded-lg bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 hover:shadow-md transition-shadow">
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
                  <div className="text-right font-semibold text-purple-600 dark:text-purple-400">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </div>
                </div>
              ))}
              {summary?.accounts_by_type.loan.map(account => (
                <div key={account.id} className="flex items-center justify-between p-4 border-l-4 border-l-orange-500 rounded-lg bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 hover:shadow-md transition-shadow">
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
    </div>
  );
}
