import { useEffect, useState } from 'react';
import { transactionApi, emiApi } from '@/db/api';
import type { Transaction, Account, EMITransaction } from '@/types/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatAccountNumber } from '@/utils/format';
import { TrendingUp, TrendingDown, ArrowRightLeft, CreditCard, Building2 } from 'lucide-react';
import BankLogo from './BankLogo';

interface AccountStatementDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

export default function AccountStatementDialog({
  account,
  open,
  onOpenChange,
  currency,
}: AccountStatementDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emiTransactions, setEmiTransactions] = useState<EMITransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (account && open) {
      loadStatement();
    }
  }, [account, open]);

  const loadStatement = async () => {
    if (!account) return;

    setLoading(true);
    try {
      // Get last 90 days date
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      // Fetch all transactions for the user
      const allTransactions = await transactionApi.getTransactions(account.user_id);
      
      // Filter transactions for this account within last 90 days
      const accountTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
        const isAccountTransaction = t.from_account_id === account.id || t.to_account_id === account.id;
        return isInDateRange && isAccountTransaction;
      });

      // Sort by date descending
      accountTransactions.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      setTransactions(accountTransactions);

      // Load EMI transactions if credit card
      if (account.account_type === 'credit_card') {
        const emis = await emiApi.getEMIsByAccount(account.id);
        setEmiTransactions(emis);
      }
    } catch (error) {
      console.error('Error loading statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-danger" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-primary" />;
      case 'withdrawal':
        return <TrendingDown className="h-4 w-4 text-warning" />;
      case 'loan_payment':
        return <Building2 className="h-4 w-4 text-primary" />;
      case 'credit_card_payment':
        return <CreditCard className="h-4 w-4 text-primary" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    // If this account is the source (from), it's a debit
    if (transaction.from_account_id === account?.id) {
      return -transaction.amount;
    }
    // If this account is the destination (to), it's a credit
    if (transaction.to_account_id === account?.id) {
      return transaction.amount;
    }
    return 0;
  };

  const calculateRunningBalance = () => {
    if (!account) return [];
    
    let balance = Number(account.balance);
    const transactionsWithBalance = [];

    // Process transactions in reverse order (oldest first) to calculate running balance
    for (let i = transactions.length - 1; i >= 0; i--) {
      const transaction = transactions[i];
      const amount = getTransactionAmount(transaction);
      
      // Subtract the transaction to get the balance before this transaction
      balance -= amount;
      
      transactionsWithBalance.unshift({
        transaction,
        balanceAfter: balance + amount,
      });
    }

    return transactionsWithBalance;
  };

  const transactionsWithBalance = calculateRunningBalance();

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BankLogo
              alt={account.institution_name || 'Bank'}
              bankName={account.institution_name || undefined}
              className="h-8 w-8"
            />
            <div>
              <div className="text-lg font-semibold">{account.account_name}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {account.last_4_digits && `****${account.last_4_digits}`}
                {' • '}Last 90 Days Statement
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className={`text-xl font-bold ${
                account.account_type === 'credit_card' || account.account_type === 'loan'
                  ? Number(account.balance) > 0 ? 'text-danger' : 'text-success'
                  : Number(account.balance) >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {formatCurrency(Math.abs(Number(account.balance)), currency)}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Account Type</div>
              <div className="text-lg font-semibold capitalize">
                {account.account_type.replace('_', ' ')}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Transactions</div>
              <div className="text-lg font-semibold">{transactions.length}</div>
            </div>

            {account.account_type === 'credit_card' && account.credit_limit && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Credit Limit</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(Number(account.credit_limit), currency)}
                </div>
              </div>
            )}

            {account.account_type === 'loan' && account.loan_principal && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Loan Principal</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(Number(account.loan_principal), currency)}
                </div>
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full bg-muted" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions in the last 90 days
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsWithBalance.map(({ transaction, balanceAfter }) => {
                      const amount = getTransactionAmount(transaction);
                      const isEMI = emiTransactions.some(emi => emi.transaction_id === transaction.id);
                      
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(transaction.transaction_date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              <span className="capitalize text-sm">
                                {transaction.transaction_type.replace('_', ' ')}
                              </span>
                              {isEMI && (
                                <Badge variant="outline" className="text-xs">EMI</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {transaction.description || transaction.category || '-'}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            amount >= 0 ? 'text-success' : 'text-danger'
                          }`}>
                            {amount >= 0 ? '+' : ''}{formatCurrency(amount, currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(balanceAfter, currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
