import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accountApi, interestRateApi } from '@/db/api';
import type { Account } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatAccountNumber } from '@/utils/format';
import { Plus, Edit, Trash2, Building2, CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import InterestRateManager from '@/components/InterestRateManager';
import { calculateEMI, calculateAccruedInterest } from '@/utils/loanCalculations';
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
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [loanCalculations, setLoanCalculations] = useState<Record<string, { emi: number; accruedInterest: number }>>({});

  const currency = profile?.default_currency || 'USD';

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

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
                          <CardTitle className="text-lg">{account.account_name}</CardTitle>
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
                        {account.institution_logo && (
                          <img 
                            src={account.institution_logo} 
                            alt={account.institution_name} 
                            className="h-10 w-10 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{account.institution_name}</p>
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
                {groupedAccounts.credit_card.map(account => (
                  <Card key={account.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        {account.institution_logo && (
                          <img 
                            src={account.institution_logo} 
                            alt={account.institution_name} 
                            className="h-10 w-10 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{account.institution_name}</p>
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
                        {account.institution_logo && (
                          <img 
                            src={account.institution_logo} 
                            alt={account.institution_name} 
                            className="h-10 w-10 rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <CardTitle className="text-lg">{account.account_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{account.institution_name}</p>
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
                        {loanCalculations[account.id] && (
                          <div>
                            <p className="text-sm text-muted-foreground">Monthly EMI</p>
                            <p className="font-medium text-primary">
                              {formatCurrency(loanCalculations[account.id].emi, account.currency)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                          <p className="text-xl font-bold text-danger">
                            {formatCurrency(Number(account.balance), account.currency)}
                          </p>
                        </div>
                        {loanCalculations[account.id] && loanCalculations[account.id].accruedInterest > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Accrued Interest
                            </p>
                            <p className="text-xl font-bold text-amber-600">
                              {formatCurrency(loanCalculations[account.id].accruedInterest, account.currency)}
                            </p>
                          </div>
                        )}
                      </div>
                      {account.interest_rate_type === 'floating' && (
                        <InterestRateManager
                          accountId={account.id}
                          accountName={account.account_name}
                          currentRate={account.current_interest_rate || 0}
                          onRateUpdated={loadAccounts}
                        />
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
