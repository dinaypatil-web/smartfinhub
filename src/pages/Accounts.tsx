import { useEffect, useState } from 'react';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, interestRateApi, emiApi, transactionApi } from '@/db/api';
import type { Account, EMITransaction, Transaction } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import { Plus, Edit, Trash2, Building2, CreditCard, Wallet, TrendingUp, AlertCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import InterestRateManager from '@/components/InterestRateManager';
import { calculateEMI, calculateAccruedInterest } from '@/utils/loanCalculations';
import { 
  calculateAvailableCredit, 
  calculateCreditUtilization, 
  getCreditLimitWarningLevel,
  calculateStatementAmount 
} from '@/utils/emiCalculations';
import {
  getBillingCycleInfo,
  isDueDatePassed
} from '@/utils/billingCycleCalculations';
import { 
  calculateCreditCardStatementAmount, 
  shouldDisplayDueAmount, 
  getStatementDueDate 
} from '@/utils/statementCalculations';
import BankLogo from '@/components/BankLogo';
import { cache } from '@/utils/cache';
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
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Credit Cards
              </h2>
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
                      emis
                    );
                    statementAmount = statementCalc.statementAmount;
                    
                    // Only show due amount after statement date
                    showDueAmount = shouldDisplayDueAmount(account.statement_day);
                    if (showDueAmount) {
                      // Use calculated statement amount (only includes transactions up to statement date)
                      // NOT the entire balance (which includes transactions after statement date)
                      dueAmount = Math.abs(statementAmount);
                      if (account.due_day) {
                        dueDate = getStatementDueDate(account.statement_day, account.due_day);
                        billingInfo = getBillingCycleInfo(account.statement_day, account.due_day);
                      }
                    }
                  } else {
                    // Fallback to old calculation if no statement day
                    statementAmount = calculateStatementAmount(account.balance, emis);
                    dueAmount = Math.abs(account.balance);
                    showDueAmount = true;
                    if (account.statement_day && account.due_day) {
                      billingInfo = getBillingCycleInfo(account.statement_day, account.due_day);
                    }
                  }
                  
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
                              + {formatCurrency(statementAmount - account.balance, account.currency)} in EMIs
                            </p>
                          )}
                        </div>

                        {/* Credit Limit Section */}
                        {account.credit_limit && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Credit Utilization</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${
                                  warningLevel === 'danger' ? 'text-red-600 dark:text-red-400' :
                                  warningLevel === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                  'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {utilization?.toFixed(1)}%
                                </span>
                                {warningLevel !== 'safe' && (
                                  <AlertCircle className={`h-4 w-4 ${
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
                              <History className="h-4 w-4" />
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
