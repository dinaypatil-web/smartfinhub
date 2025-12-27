import { useEffect, useState } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, emiApi, categoryApi } from '@/db/api';
import type { Transaction, Account, EMITransaction, ExpenseCategory } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { calculateTotalDueAmount, getBillingCycleInfo } from '@/utils/billingCycleCalculations';
import { INCOME_CATEGORIES } from '@/constants/incomeCategories';
import BankLogo from '@/components/BankLogo';

export default function Reports() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    accountId: 'all',
    transactionType: 'all',
    expenseCategory: 'all',
    incomeCategory: 'all',
  });
  
  // Credit card statement state
  const [selectedCreditCard, setSelectedCreditCard] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [creditCardEMIs, setCreditCardEMIs] = useState<EMITransaction[]>([]);

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Auto-select first credit card when accounts load
    const creditCards = accounts.filter(a => a.account_type === 'credit_card');
    if (creditCards.length > 0 && !selectedCreditCard) {
      setSelectedCreditCard(creditCards[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    // Load EMIs when credit card is selected
    if (selectedCreditCard) {
      loadCreditCardEMIs();
    }
  }, [selectedCreditCard]);

  const loadCreditCardEMIs = async () => {
    if (!selectedCreditCard) return;
    
    try {
      const emis = await emiApi.getEMIsByAccount(selectedCreditCard);
      setCreditCardEMIs(emis);
    } catch (error) {
      console.error('Error loading EMIs:', error);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        transactionApi.getTransactions(user.id),
        accountApi.getAccounts(user.id),
        categoryApi.getCategories(user.id),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      const dateMatch = transactionDate >= startDate && transactionDate <= endDate;
      const accountMatch = filters.accountId === 'all' || 
        t.from_account_id === filters.accountId || 
        t.to_account_id === filters.accountId;
      const typeMatch = filters.transactionType === 'all' || t.transaction_type === filters.transactionType;
      
      // Category filters
      const expenseCategoryMatch = filters.expenseCategory === 'all' || 
        (t.transaction_type === 'expense' && t.category === filters.expenseCategory);
      const incomeCategoryMatch = filters.incomeCategory === 'all' || 
        (t.transaction_type === 'income' && t.income_category === filters.incomeCategory);

      return dateMatch && accountMatch && typeMatch && 
        (filters.expenseCategory === 'all' || expenseCategoryMatch) &&
        (filters.incomeCategory === 'all' || incomeCategoryMatch);
    });
  };

  const calculateSummary = () => {
    const filtered = getFilteredTransactions();
    
    // Helper function to safely parse amount as number
    const parseAmount = (amount: any): number => {
      if (typeof amount === 'number') return amount;
      if (typeof amount === 'string') return parseFloat(amount) || 0;
      return 0;
    };
    
    const income = filtered
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);
    
    const expenses = filtered
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const withdrawals = filtered
      .filter(t => t.transaction_type === 'withdrawal')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const transfers = filtered
      .filter(t => t.transaction_type === 'transfer')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const loanPayments = filtered
      .filter(t => t.transaction_type === 'loan_payment')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const creditCardRepayments = filtered
      .filter(t => t.transaction_type === 'credit_card_repayment')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    return {
      income,
      expenses,
      withdrawals,
      transfers,
      loanPayments,
      creditCardRepayments,
      netPosition: income - expenses - loanPayments,
      totalTransactions: filtered.length,
    };
  };

  const getAccountBalances = () => {
    return accounts.map(account => ({
      ...account,
      balance: account.balance,
    }));
  };

  const exportToCSV = () => {
    const filtered = getFilteredTransactions();
    const headers = ['Date', 'Type', 'Category', 'From Account', 'To Account', 'Amount', 'Description'];
    const rows = filtered.map(t => [
      formatDate(t.transaction_date),
      t.transaction_type,
      t.category || '',
      accounts.find(a => a.id === t.from_account_id)?.account_name || '',
      accounts.find(a => a.id === t.to_account_id)?.account_name || '',
      t.amount.toString(),
      t.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${filters.startDate}_to_${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCreditCardStatement = () => {
    if (!selectedCreditCard || !selectedMonth) return null;

    const account = accounts.find(a => a.id === selectedCreditCard);
    if (!account || !account.statement_day) return null;

    // Parse selected month (YYYY-MM)
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Get billing cycle info for the selected month
    const billingInfo = getBillingCycleInfo(account.statement_day, account.due_day || account.statement_day);
    
    // Calculate statement date for the selected month
    const statementDate = new Date(year, month - 1, account.statement_day);
    
    // Calculate billing cycle start (day after previous statement)
    const cycleStart = new Date(statementDate);
    cycleStart.setMonth(cycleStart.getMonth() - 1);
    cycleStart.setDate(cycleStart.getDate() + 1);
    
    // Billing cycle end is the statement date
    const cycleEnd = statementDate;

    // Get transactions for this account in the billing cycle
    const accountTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      const isInCycle = transactionDate >= cycleStart && transactionDate <= cycleEnd;
      const isAccountTransaction = t.from_account_id === selectedCreditCard || t.to_account_id === selectedCreditCard;
      return isInCycle && isAccountTransaction;
    });

    // Get EMIs for this account
    const accountEMIs = creditCardEMIs.filter(emi => {
      const emiDate = new Date(emi.next_due_date);
      return emiDate >= cycleStart && emiDate <= cycleEnd;
    });

    // Calculate due amount
    const dueAmount = calculateTotalDueAmount(selectedCreditCard, accountTransactions, accountEMIs, account.statement_day);

    return {
      account,
      cycleStart,
      cycleEnd,
      statementDate,
      dueDate: new Date(billingInfo.dueDateStr),
      transactions: accountTransactions.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      ),
      emis: accountEMIs,
      dueAmount,
    };
  };

  const creditCardStatement = getCreditCardStatement();

  const summary = calculateSummary();
  const filteredTransactions = getFilteredTransactions();
  const accountBalances = getAccountBalances();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">View and analyze your financial data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account</Label>
              <Select
                value={filters.accountId}
                onValueChange={(value) => setFilters({ ...filters, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Select
                value={filters.transactionType}
                onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="loan_payment">Loan Payment</SelectItem>
                  <SelectItem value="credit_card_repayment">Credit Card Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Filters */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="space-y-2">
              <Label htmlFor="expenseCategory">Expense Category</Label>
              <Select
                value={filters.expenseCategory}
                onValueChange={(value) => setFilters({ ...filters, expenseCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expense Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeCategory">Income Category</Label>
              <Select
                value={filters.incomeCategory}
                onValueChange={(value) => setFilters({ ...filters, incomeCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Income Categories</SelectItem>
                  {INCOME_CATEGORIES.map(category => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max xl:grid xl:grid-cols-4">
            <TabsTrigger value="summary" className="flex-1 xl:flex-none whitespace-nowrap">Summary</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1 xl:flex-none whitespace-nowrap">Transaction History</TabsTrigger>
            <TabsTrigger value="balances" className="flex-1 xl:flex-none whitespace-nowrap">Account Balances</TabsTrigger>
            <TabsTrigger value="credit-card" className="flex-1 xl:flex-none whitespace-nowrap">Credit Card Statement</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(summary.income, currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-danger" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">
                  {formatCurrency(summary.expenses, currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Position</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(summary.netPosition, currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalTransactions}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Withdrawals</span>
                  <span className="text-sm font-semibold">{formatCurrency(summary.withdrawals, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Transfers</span>
                  <span className="text-sm font-semibold">{formatCurrency(summary.transfers, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Loan Payments</span>
                  <span className="text-sm font-semibold">{formatCurrency(summary.loanPayments, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Credit Card Repayments</span>
                  <span className="text-sm font-semibold">{formatCurrency(summary.creditCardRepayments, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History ({filteredTransactions.length} transactions)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>From Account</TableHead>
                      <TableHead>To Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No transactions found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                          <TableCell className="capitalize">{transaction.transaction_type.replace('_', ' ')}</TableCell>
                          <TableCell>{transaction.category || '-'}</TableCell>
                          <TableCell>
                            {accounts.find(a => a.id === transaction.from_account_id)?.account_name || '-'}
                          </TableCell>
                          <TableCell>
                            {accounts.find(a => a.id === transaction.to_account_id)?.account_name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.amount, currency)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountBalances.map(account => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.account_name}</TableCell>
                        <TableCell className="capitalize">{account.account_type.replace('_', ' ')}</TableCell>
                        <TableCell>{account.institution_name || '-'}</TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          account.account_type === 'credit_card' || account.account_type === 'loan'
                            ? 'text-danger'
                            : account.balance >= 0
                            ? 'text-success'
                            : 'text-danger'
                        }`}>
                          {formatCurrency(Math.abs(account.balance), account.currency)}
                          {(account.account_type === 'credit_card' || account.account_type === 'loan') && ' (Outstanding)'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(
                    accountBalances
                      .filter(a => a.account_type === 'cash' || a.account_type === 'bank')
                      .reduce((sum, a) => sum + a.balance, 0),
                    currency
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">
                  {formatCurrency(
                    accountBalances
                      .filter(a => a.account_type === 'credit_card')
                      .reduce((sum, a) => sum + Math.abs(a.balance), 0),
                    currency
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  accountBalances.reduce((sum, a) => {
                    if (a.account_type === 'loan') return sum;
                    return sum + a.balance;
                  }, 0) >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {formatCurrency(
                    accountBalances.reduce((sum, a) => {
                      if (a.account_type === 'loan') return sum;
                      return sum + a.balance;
                    }, 0),
                    currency
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credit-card" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit Card Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Select Credit Card</Label>
                  <Select value={selectedCreditCard} onValueChange={setSelectedCreditCard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a credit card" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter(a => a.account_type === 'credit_card')
                        .map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Month</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>

              {creditCardStatement && (
                <div className="space-y-6 mt-6">
                  {/* Statement Summary */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Statement Date</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatDate(creditCardStatement.statementDate.toISOString())}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Due Date</div>
                        <div className="text-2xl font-bold mt-1">
                          {formatDate(creditCardStatement.dueDate.toISOString())}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total Due Amount</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                          {formatCurrency(creditCardStatement.dueAmount, currency)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Account Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md border-2 border-purple-200 dark:border-purple-800">
                          <BankLogo 
                            src={creditCardStatement.account.institution_logo} 
                            alt={creditCardStatement.account.institution_name || 'Credit Card'} 
                            bankName={creditCardStatement.account.institution_name || undefined} 
                            className="h-10 w-10" 
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{creditCardStatement.account.account_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {creditCardStatement.account.institution_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Current Balance</div>
                          <div className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(Number(creditCardStatement.account.balance), currency)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Billing Cycle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Billing Cycle</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <span className="font-medium">
                          {formatDate(creditCardStatement.cycleStart.toISOString())}
                        </span>
                        {' to '}
                        <span className="font-medium">
                          {formatDate(creditCardStatement.cycleEnd.toISOString())}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transactions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {creditCardStatement.transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No transactions in this billing cycle
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditCardStatement.transactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(transaction.transaction_date)}
                                </TableCell>
                                <TableCell>{transaction.description || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{transaction.category || 'Uncategorized'}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  <span className={
                                    transaction.from_account_id === selectedCreditCard
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }>
                                    {transaction.from_account_id === selectedCreditCard ? '-' : '+'}
                                    {formatCurrency(transaction.amount, currency)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* EMI Transactions */}
                  {creditCardStatement.emis.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">EMI Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Next Due Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Monthly EMI</TableHead>
                              <TableHead className="text-right">Remaining</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {creditCardStatement.emis.map((emi) => (
                              <TableRow key={emi.id}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(emi.next_due_date)}
                                </TableCell>
                                <TableCell>{emi.description || 'EMI Payment'}</TableCell>
                                <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                                  {formatCurrency(emi.monthly_emi, currency)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">
                                    {emi.remaining_installments} / {emi.emi_months}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {!creditCardStatement && selectedCreditCard && (
                <div className="text-center py-8 text-muted-foreground">
                  {accounts.find(a => a.id === selectedCreditCard)?.statement_day
                    ? 'Select a month to view the statement'
                    : 'This credit card does not have a statement day configured'}
                </div>
              )}

              {accounts.filter(a => a.account_type === 'credit_card').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No credit cards found. Add a credit card account to view statements.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
