import { useEffect, useState } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, interestRateApi, emiApi, transactionApi, loanEMIPaymentApi } from '@/db/api';
import type { Account, EMITransaction, Transaction, LoanEMIPayment } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import {
  Plus, Edit, Trash2, Wallet,
  CreditCard,
  Building2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History as HistoryIcon,
  TrendingDown
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import InterestRateManager from '@/components/InterestRateManager';
import { calculateEMI, calculateAccruedInterest } from '@/utils/loanCalculations';
import LoanAmortizationSchedule from '@/components/LoanAmortizationSchedule';
import LoanScheduleComparison from '@/components/LoanScheduleComparison';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InterestRateHistory } from '@/types/types';
import {
  calculateAvailableCredit,
  calculateCreditUtilization,
  getCreditLimitWarningLevel,
  calculateStatementAmount
} from '@/utils/emiCalculations';
import {
  getBillingCycleInfo
} from '@/utils/billingCycleCalculations';
import { calculateCreditCardStatementAmount, shouldDisplayDueAmount, getStatementDueDate, calculateMinimumDue } from '@/utils/statementCalculations';
import BankLogo from '@/components/BankLogo';
import { cache } from '@/utils/cache';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Accounts() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [loanCalculations, setLoanCalculations] = useState<Record<string, { emi: number; accruedInterest: number }>>({});
  const [accountEMIs, setAccountEMIs] = useState<Record<string, EMITransaction[]>>({});
  const [accountTransactions, setAccountTransactions] = useState<Record<string, Transaction[]>>({});
  const [expandedLoanHistory, setExpandedLoanHistory] = useState<Record<string, boolean>>({});

  // Schedule Dialog State
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedLoanAccount, setSelectedLoanAccount] = useState<Account | null>(null);
  const [selectedRateHistory, setSelectedRateHistory] = useState<InterestRateHistory[]>([]);
  const [selectedActualPayments, setSelectedActualPayments] = useState<LoanEMIPayment[]>([]);

  const currency = profile?.default_currency || 'INR';

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user, location.key]);

  const loadAccounts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await accountApi.getAccounts(user.id);
      setAccounts(data);

      // Calculate loan metrics for all loan accounts
      const calculations: Record<string, { emi: number; accruedInterest: number }> = {};

      for (const account of data) {
        if (account.account_type === 'loan' && account.loan_principal && account.current_interest_rate && account.loan_tenure_months) {
          let emi = 0;
          let accruedInterest = 0;
          try {
            const history = account.id ? await interestRateApi.getInterestRateHistory(account.id) : [];
            const sortedHistory = [...history].sort(
              (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
            );
            const openingRate = sortedHistory.length > 0
              ? Number(sortedHistory[0].interest_rate)
              : Number(account.current_interest_rate);
            emi = calculateEMI(
              Number(account.loan_principal),
              openingRate,
              Number(account.loan_tenure_months)
            );
            if (account.loan_start_date) {
              accruedInterest = calculateAccruedInterest(
                account.loan_start_date,
                Number(account.balance),
                history,
                Number(account.current_interest_rate)
              );
            }
          } catch (error) {
            console.error('Error calculating loan metrics:', error);
            emi = calculateEMI(
              Number(account.loan_principal),
              Number(account.current_interest_rate),
              Number(account.loan_tenure_months)
            );
          }
          calculations[account.id] = { emi, accruedInterest };
        }
      }

      setLoanCalculations(calculations);

      // Load EMI data for credit card accounts and transactions for loan accounts
      const emis: Record<string, EMITransaction[]> = {};
      const accountTxs: Record<string, Transaction[]> = {};
      for (const account of data) {
        if (account.account_type === 'credit_card') {
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
        } else if (account.account_type === 'loan') {
          try {
            // Load loan payment transactions (where to_account_id is the loan account)
            const txs = await transactionApi.getTransactionsByAccount(user.id, account.id);
            const loanPayments = txs.filter(t => t.to_account_id === account.id && t.transaction_type === 'loan_payment');
            if (loanPayments.length > 0) {
              accountTxs[account.id] = loanPayments;
            }
          } catch (error) {
            console.error(`Error loading loan payments for account ${account.id}:`, error);
          }
        }
      }
      setAccountEMIs(emis);
      setAccountTransactions(accountTxs);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      await accountApi.deleteAccount(accountToDelete.id);

      // Clear dashboard cache to reflect deleted account
      cache.clearPattern('dashboard-');

      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };


  const handleViewSchedule = async (account: Account) => {
    setSelectedLoanAccount(account);
    setScheduleDialogOpen(true);
    try {
      const [history, payments] = await Promise.all([
        interestRateApi.getInterestRateHistory(account.id),
        loanEMIPaymentApi.getPaymentsByAccount(account.id)
      ]);
      setSelectedRateHistory(history);
      setSelectedActualPayments(payments);
    } catch (error) {
      console.error("Failed to load rate history or payments", error);
      setSelectedRateHistory([]);
      setSelectedActualPayments([]);
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

  const getAccountTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'cash':
        return 'default';
      case 'bank':
        return 'default';
      case 'credit_card':
        return 'secondary';
      case 'loan':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getBalanceColor = (account: Account) => {
    if (account.account_type === 'credit_card' || account.account_type === 'loan') {
      return Number(account.balance) > 0 ? 'text-danger' : 'text-success';
    }
    return Number(account.balance) >= 0 ? 'text-success' : 'text-danger';
  };

  const groupedAccounts = {
    cash: accounts.filter(a => a.account_type === 'cash'),
    bank: accounts.filter(a => a.account_type === 'bank'),
    credit_card: accounts.filter(a => a.account_type === 'credit_card'),
    loan: accounts.filter(a => a.account_type === 'loan'),
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-muted" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Manage your financial accounts</p>
        </div>
        <Link to="/accounts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </Link>
      </div>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Schedule - {selectedLoanAccount?.account_name}</DialogTitle>
          </DialogHeader>
          {selectedLoanAccount && (
            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Amortization Schedule</TabsTrigger>
                <TabsTrigger value="comparison">Schedule vs Actual</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-4">
                <LoanAmortizationSchedule
                  account={selectedLoanAccount}
                  rateHistory={selectedRateHistory}
                />
              </TabsContent>
              <TabsContent value="comparison" className="mt-4">
                <LoanScheduleComparison
                  account={selectedLoanAccount}
                  rateHistory={selectedRateHistory}
                  actualPayments={selectedActualPayments}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">Add your first account to get started</p>
            <Link to="/accounts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {groupedAccounts.cash.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                Cash Accounts
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedAccounts.cash.map(account => (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg break-words line-clamp-2">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Physical Cash</p>
                        </div>
                      </div>
                      <Badge variant={getAccountTypeBadgeVariant(account.account_type)}>
                        {getAccountTypeLabel(account.account_type)}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className={`text-2xl font-bold ${getBalanceColor(account)}`}>
                          {formatCurrency(Number(account.balance), account.currency)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/accounts/edit/${account.id}`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-danger" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {groupedAccounts.bank.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Bank Accounts
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedAccounts.bank.map(account => (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <BankLogo
                          src={account.institution_logo}
                          alt={account.institution_name || 'Bank'}
                          className="h-10 w-10"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg break-words line-clamp-2">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground break-words line-clamp-1">{account.institution_name}</p>
                        </div>
                      </div>
                      <Badge variant={getAccountTypeBadgeVariant(account.account_type)}>
                        {getAccountTypeLabel(account.account_type)}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Account Number</p>
                        <p className="font-medium">{formatAccountNumber(account.last_4_digits)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className={`text-2xl font-bold ${getBalanceColor(account)}`}>
                          {formatCurrency(Number(account.balance), account.currency)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/accounts/edit/${account.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {groupedAccounts.credit_card.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Credit Cards
                </h2>
                {(() => {
                  const totalDues = groupedAccounts.credit_card.reduce((sum, account) => {
                    if (account.statement_day) {
                      if (shouldDisplayDueAmount(account.statement_day)) {
                        const transactions = accountTransactions[account.id] || [];
                        const emis = accountEMIs[account.id] || [];
                        const statementCalc = calculateCreditCardStatementAmount(
                          account.id,
                          account.statement_day,
                          transactions,
                          emis,
                          new Date(),
                          Number(account.balance)
                        );
                        return sum + Math.abs(statementCalc.statementAmount);
                      }
                      return sum;
                    }
                    // For accounts without statement day, assume balance is due
                    const emis = accountEMIs[account.id] || [];
                    const statementAmount = calculateStatementAmount(Number(account.balance), emis);
                    return sum + Math.abs(statementAmount);
                  }, 0);

                  if (totalDues > 0) {
                    return (
                      <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900 shadow-sm animate-fade-in">
                        <CardContent className="py-2 px-4 flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Monthly Dues</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(totalDues, currency)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedAccounts.credit_card.map(account => {
                  const emis = accountEMIs[account.id] || [];
                  const transactions = accountTransactions[account.id] || [];

                  // Calculate statement amount using proper statement period logic
                  let statementAmount = account.balance;
                  let dueAmount = 0;
                  let showDueAmount = false;
                  let dueDate: Date | null = null;
                  let billingInfo = null;

                  if (account.statement_day) {
                    const statementCalc = calculateCreditCardStatementAmount(
                      account.id,
                      account.statement_day,
                      transactions,
                      emis,
                      new Date(),
                      Number(account.balance)
                    );
                    statementAmount = statementCalc.statementAmount;

                    // Only show due amount after statement date
                    showDueAmount = shouldDisplayDueAmount(account.statement_day);
                    if (showDueAmount) {
                      // Use calculated statement amount (only includes transactions up to statement date)
                      dueAmount = Math.abs(statementAmount);
                      if (account.due_day) {
                        dueDate = getStatementDueDate(account.statement_day, account.due_day);
                        billingInfo = getBillingCycleInfo(account.statement_day, account.due_day);
                      }
                    }
                  } else {
                    // Fallback to old calculation if no statement day
                    statementAmount = calculateStatementAmount(account.balance, emis);
                    dueAmount = Math.abs(statementAmount);
                    showDueAmount = true;
                    if (account.statement_day && account.due_day) {
                      billingInfo = getBillingCycleInfo(account.statement_day, account.due_day);
                    }
                  }

                  const monthlyEMIs = emis.reduce((sum, emi) => sum + emi.monthly_emi, 0);

                  const utilization = account.credit_limit ? calculateCreditUtilization(account.balance, account.credit_limit) : null;
                  const warningLevel = account.credit_limit ? getCreditLimitWarningLevel(account.balance, account.credit_limit) : 'safe';
                  const availableCredit = account.credit_limit ? calculateAvailableCredit(account.balance, account.credit_limit) : null;

                  return (
                    <Card key={account.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <BankLogo
                            src={account.institution_logo}
                            alt={account.institution_name || 'Credit Card'}
                            className="h-10 w-10"
                          />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg break-words line-clamp-2">{account.account_name}</CardTitle>
                            <p className="text-sm text-muted-foreground break-words line-clamp-1">{account.institution_name}</p>
                          </div>
                        </div>
                        <Badge variant={getAccountTypeBadgeVariant(account.account_type)}>
                          {getAccountTypeLabel(account.account_type)}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Card Number</p>
                          <p className="font-medium">{formatAccountNumber(account.last_4_digits)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                          <p className={`text-2xl font-bold ${getBalanceColor(account)}`}>
                            {formatCurrency(Number(account.balance), account.currency)}
                          </p>
                          {emis.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              + {formatCurrency(monthlyEMIs, account.currency)} in monthly installments
                            </p>
                          )}
                        </div>

                        {/* Credit Limit Section */}
                        {account.credit_limit && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Credit Utilization</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${warningLevel === 'danger' ? 'text-red-600 dark:text-red-400' :
                                  warningLevel === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                    'text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                  {utilization?.toFixed(1)}%
                                </span>
                                {warningLevel !== 'safe' && (
                                  <AlertCircle className={`h-4 w-4 ${warningLevel === 'danger' ? 'text-red-600' : 'text-amber-600'
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

                        {/* EMI Section */}
                        {emis.length > 0 && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Active EMIs</p>
                              <Badge variant="secondary">{emis.length}</Badge>
                            </div>
                            <div className="space-y-2">
                              {emis.map(emi => {
                                const remainingAmount = emi.monthly_emi * emi.remaining_installments;
                                return (
                                  <div key={emi.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium truncate max-w-[180px]">{emi.description}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {emi.remaining_installments}/{emi.emi_months}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Monthly EMI</span>
                                      <span className="font-semibold">{formatCurrency(emi.monthly_emi, account.currency)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Remaining</span>
                                      <span className="font-semibold">{formatCurrency(remainingAmount, account.currency)}</span>
                                    </div>
                                    <Progress
                                      value={((emi.emi_months - emi.remaining_installments) / emi.emi_months) * 100}
                                      className="h-1 mt-2"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <p className="text-sm font-semibold">Total Statement Amount</p>
                              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(statementAmount, account.currency)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Due Amount Section - Only show after statement date */}
                        {showDueAmount && (billingInfo || dueDate) && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Payment Due</p>
                              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {dueAmount > 0 ? formatCurrency(dueAmount, account.currency) : formatCurrency(0, account.currency)}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              Due on {dueDate
                                ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : billingInfo?.dueDateStr
                              }
                            </div>
                          </div>
                        )}

                        {/* Pay Bill Action */}
                        {dueAmount > 0 && (
                          <div className="pt-2">
                            <Button
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => navigate('/transactions/new', {
                                state: {
                                  prefill: {
                                    transaction_type: 'credit_card_repayment',
                                    to_account_id: account.id,
                                    amount: dueAmount, // Full Statement Amount
                                    description: `Payment for statement ending ${dueDate
                                      ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() - 20).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                      : 'recent'
                                      }`
                                  }
                                }
                              })}
                            >
                              Pay Bill
                            </Button>
                            <div className="flex justify-between items-center mt-1 px-1">
                              <p className="text-[10px] text-muted-foreground">
                                Min Due: {formatCurrency(calculateMinimumDue(dueAmount, account.currency), account.currency)}
                              </p>
                              <button
                                className="text-[10px] text-purple-600 underline hover:text-purple-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/transactions/new', {
                                    state: {
                                      prefill: {
                                        transaction_type: 'credit_card_repayment',
                                        to_account_id: account.id,
                                        amount: calculateMinimumDue(dueAmount, account.currency),
                                        description: `Minimum payment for ${account.account_name}`
                                      }
                                    }
                                  });
                                }}
                              >
                                Pay Minimum
                              </button>
                            </div>
                          </div>
                        )}
                        {!showDueAmount && account.statement_day && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="text-sm text-muted-foreground text-center">
                              Statement will be generated on day {account.statement_day}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/accounts/edit/${account.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAccountToDelete(account);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {groupedAccounts.loan.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                Loan Accounts
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedAccounts.loan.map(account => (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <BankLogo
                          src={account.institution_logo}
                          alt={account.institution_name || 'Loan'}
                          className="h-10 w-10"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg break-words line-clamp-2">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground break-words line-clamp-1">{account.institution_name}</p>
                        </div>
                      </div>
                      <Badge variant={getAccountTypeBadgeVariant(account.account_type)}>
                        {getAccountTypeLabel(account.account_type)}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Principal</p>
                          <p className="font-medium">
                            {formatCurrency(Number(account.loan_principal || 0), account.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tenure</p>
                          <p className="font-medium">{account.loan_tenure_months} months</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Interest Rate ({account.interest_rate_type})</p>
                          <p className="font-medium">{account.current_interest_rate}% APR</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Due Date</p>
                          <p className="font-medium">{account.due_date ? `${account.due_date} of each month` : 'Not set'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {loanCalculations[account.id] && (
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly EMI</p>
                            <p className="font-medium text-primary">
                              {formatCurrency(loanCalculations[account.id].emi, account.currency)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                        <p className="text-xl font-bold text-danger">
                          {formatCurrency(Number(account.balance), account.currency)}
                        </p>
                      </div>
                      {account.interest_rate_type === 'floating' && (
                        <InterestRateManager
                          accountId={account.id}
                          accountName={account.account_name}
                          currentRate={account.current_interest_rate || 0}
                          onRateUpdated={loadAccounts}
                        />
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleViewSchedule(account)}
                      >
                        <TrendingDown className="h-4 w-4 mr-2" />
                        View Amortization Schedule
                      </Button>

                      {/* Payment History Section */}
                      {accountTransactions[account.id] && accountTransactions[account.id].length > 0 && (
                        <div className="border-t pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between"
                            onClick={() => setExpandedLoanHistory(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                          >
                            <span className="flex items-center gap-2">
                              <HistoryIcon className="h-4 w-4" />
                              Payment History ({accountTransactions[account.id].length})
                            </span>
                            {expandedLoanHistory[account.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>

                          {expandedLoanHistory[account.id] && (
                            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                              {accountTransactions[account.id]
                                .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                                .map(transaction => (
                                  <div
                                    key={transaction.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </p>
                                      {transaction.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {transaction.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(transaction.amount, transaction.currency)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/accounts/edit/${account.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.account_name}"? This action cannot be undone.
              All associated transactions will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger text-danger-foreground hover:bg-danger/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
