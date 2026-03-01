import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, loanEMIPaymentApi } from '@/db/api';
import type { Account, LoanEMIPayment } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, TrendingDown, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function LoanEMIHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loanAccounts, setLoanAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [emiPayments, setEMIPayments] = useState<LoanEMIPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const accounts = await accountApi.getAccounts(user.id);
        const loans = accounts.filter((a: Account) => a.account_type === 'loan');
        setLoanAccounts(loans);

        if (loans.length > 0) {
          setSelectedAccountId(loans[0].id);
        }
      } catch (error) {
        console.error('Error fetching loan accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedAccountId) return;

      try {
        setCalculating(true);
        const payments = await loanEMIPaymentApi.getPaymentsByAccount(selectedAccountId);
        setEMIPayments(payments);
      } catch (error) {
        console.error('Error fetching EMI payments:', error);
      } finally {
        setCalculating(false);
      }
    };

    fetchPayments();
  }, [selectedAccountId, user]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will not delete the associated transaction if any.')) {
      return;
    }

    try {
      setCalculating(true);
      await loanEMIPaymentApi.deletePayment(paymentId);
      setEMIPayments(emiPayments.filter(p => p.id !== paymentId));
      toast({
        title: 'Success',
        description: 'Payment record deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment record.',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
    }
  };

  const selectedAccount = loanAccounts.find((a: Account) => a.id === selectedAccountId);

  const totalPrincipalPaid = emiPayments.reduce((sum: number, p: LoanEMIPayment) => sum + p.principal_component, 0);
  const totalInterestPaid = emiPayments.reduce((sum: number, p: LoanEMIPayment) => sum + p.interest_component, 0);
  const totalEMIPaid = emiPayments.reduce((sum: number, p: LoanEMIPayment) => sum + p.emi_amount, 0);

  const currentOutstanding = selectedAccount
    ? Number(selectedAccount.balance)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/accounts')}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">EMI Payment History</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/loan-emi-simulator')}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                EMI Simulator
              </Button>
            </div>
            <p className="text-slate-600 dark:text-slate-400">Track principal and interest payments for your loans</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-96">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-slate-600 dark:text-slate-400">Loading loan accounts...</p>
            </div>
          </div>
        ) : loanAccounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No loan accounts found. Create a loan account to view EMI payment history.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Account Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Loan Account</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a loan account" />
                  </SelectTrigger>
                  <SelectContent>
                    {loanAccounts.map((account: Account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {formatCurrency(Number(account.balance), account.currency)} outstanding
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedAccount && (
              <>
                {/* Account Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Outstanding Principal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(currentOutstanding, selectedAccount.currency)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Current balance</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Principal Paid
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPrincipalPaid, selectedAccount.currency)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{emiPayments.length} payments</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Interest Paid
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(totalInterestPaid, selectedAccount.currency)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalEMIPaid > 0 ? `${(totalInterestPaid / totalEMIPaid * 100).toFixed(1)}% of total` : '0%'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total EMI Paid
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalEMIPaid, selectedAccount.currency)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Principal + Interest</p>
                    </CardContent>
                  </Card>
                </div>

                {/* EMI Payments Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>EMI Payment Details</CardTitle>
                        <CardDescription>
                          Bifurcation of principal and interest for each payment
                        </CardDescription>
                      </div>
                      {calculating && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {emiPayments.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingDown className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No EMI payments recorded yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payment Date</TableHead>
                              <TableHead className="text-right">EMI Amount</TableHead>
                              <TableHead className="text-right">Principal</TableHead>
                              <TableHead className="text-right">Interest</TableHead>
                              <TableHead className="text-right">Interest %</TableHead>
                              <TableHead className="text-right">Outstanding</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emiPayments.map((payment: LoanEMIPayment) => {
                              const interestPercentage = payment.emi_amount > 0
                                ? (payment.interest_component / payment.emi_amount) * 100
                                : 0;

                              return (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-medium">
                                    {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(payment.emi_amount, selectedAccount.currency)}
                                  </TableCell>
                                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                    {formatCurrency(payment.principal_component, selectedAccount.currency)}
                                  </TableCell>
                                  <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
                                    {formatCurrency(payment.interest_component, selectedAccount.currency)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    <Badge variant={interestPercentage > 40 ? 'destructive' : interestPercentage > 20 ? 'secondary' : 'outline'}>
                                      {interestPercentage.toFixed(1)}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(payment.outstanding_principal, selectedAccount.currency)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                                      Paid
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeletePayment(payment.id)}
                                      className="h-8 w-8 text-slate-400 hover:text-red-600 transition-colors"
                                      title="Delete payment record"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Summary Card */}
                {emiPayments.length > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                      <CardTitle className="text-base text-blue-900 dark:text-blue-200">Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Average Interest %</div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {((totalInterestPaid / totalEMIPaid) * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">No. of Payments</div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {emiPayments.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Payment Span</div>
                          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {emiPayments.length > 1
                              ? `${Math.round((new Date(emiPayments[0].payment_date).getTime() - new Date(emiPayments[emiPayments.length - 1].payment_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                              : '-'
                            }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info Alert */}
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-200">
                    <strong>How it works:</strong> When you make a loan payment, the app automatically calculates how much goes toward principal and interest based on your loan's interest rate and outstanding balance. During monthly interest posting, these amounts may be adjusted based on actual accrued interest.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
