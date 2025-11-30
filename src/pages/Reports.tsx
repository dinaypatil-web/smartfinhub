import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transactionApi, accountApi } from '@/db/api';
import type { Transaction, Account } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';

export default function Reports() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    accountId: 'all',
    transactionType: 'all',
  });

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [transactionsData, accountsData] = await Promise.all([
        transactionApi.getTransactions(user.id),
        accountApi.getAccounts(user.id),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
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

      return dateMatch && accountMatch && typeMatch;
    });
  };

  const calculateSummary = () => {
    const filtered = getFilteredTransactions();
    const income = filtered
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filtered
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const withdrawals = filtered
      .filter(t => t.transaction_type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    const transfers = filtered
      .filter(t => t.transaction_type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    const loanPayments = filtered
      .filter(t => t.transaction_type === 'loan_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const creditCardPayments = filtered
      .filter(t => t.transaction_type === 'credit_card_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      withdrawals,
      transfers,
      loanPayments,
      creditCardPayments,
      netPosition: income - expenses,
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
                  <SelectItem value="credit_card_payment">Credit Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="balances">Account Balances</TabsTrigger>
        </TabsList>

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
                  <span className="text-sm font-medium">Credit Card Payments</span>
                  <span className="text-sm font-semibold">{formatCurrency(summary.creditCardPayments, currency)}</span>
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
      </Tabs>
    </div>
  );
}
