import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calendar, Edit2, Check, X, Calculator } from 'lucide-react';
import { calculateAllEMIBreakdowns } from '@/utils/loanCalculations';
import { formatCurrency } from '@/utils/format';
import type { LoanEMIPayment, InterestRateHistory } from '@/types/types';
import { interestRateApi } from '@/db/api';
import { useToast } from '@/hooks/use-toast';

interface EMIPaymentEntry {
  payment_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  outstanding_principal: number;
  interest_rate: number;
  payment_number: number;
  notes: string;
}

interface LoanEMIPaymentManagerProps {
  loanPrincipal: number;
  interestRate: number;
  loanStartDate: string;
  currency: string;
  onPaymentsChange: (payments: EMIPaymentEntry[]) => void;
  initialPayments?: EMIPaymentEntry[];
  accountId?: string;
  interestRateType: 'fixed' | 'floating';
  dueDayOfMonth?: number;
}

export default function LoanEMIPaymentManager({
  loanPrincipal,
  interestRate,
  loanStartDate,
  currency,
  onPaymentsChange,
  initialPayments = [],
  accountId,
  interestRateType,
  dueDayOfMonth
}: LoanEMIPaymentManagerProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<EMIPaymentEntry[]>(initialPayments);
  const [emiEntries, setEmiEntries] = useState<Array<{ payment_date: string; emi_amount: string; notes: string }>>([]);
  const [newPayment, setNewPayment] = useState({
    payment_date: '',
    emi_amount: '',
    notes: ''
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    principal_component: string;
    interest_component: string;
  }>({ principal_component: '', interest_component: '' });
  const [rateHistory, setRateHistory] = useState<InterestRateHistory[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    onPaymentsChange(payments);
  }, [payments]);

  useEffect(() => {
    if (accountId) {
      loadInterestRateHistory();
    } else {
      setRateHistory([{
        id: 'temp',
        account_id: 'temp',
        interest_rate: interestRate,
        effective_date: loanStartDate,
        created_at: new Date().toISOString()
      }]);
    }
  }, [accountId, interestRate, loanStartDate]);

  const loadInterestRateHistory = async () => {
    if (!accountId) return;
    
    setLoadingRates(true);
    try {
      const rates = await interestRateApi.getInterestRateHistory(accountId);
      if (rates.length === 0) {
        setRateHistory([{
          id: 'temp',
          account_id: accountId,
          interest_rate: interestRate,
          effective_date: loanStartDate,
          created_at: new Date().toISOString()
        }]);
      } else {
        setRateHistory(rates);
      }
    } catch (error) {
      console.error('Error loading interest rate history:', error);
      toast({
        title: 'Warning',
        description: 'Could not load interest rate history. Using current rate.',
        variant: 'destructive',
      });
      setRateHistory([{
        id: 'temp',
        account_id: accountId || 'temp',
        interest_rate: interestRate,
        effective_date: loanStartDate,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleAddEMIEntry = () => {
    if (!newPayment.payment_date || !newPayment.emi_amount) {
      return;
    }

    const emiAmount = parseFloat(newPayment.emi_amount);
    if (isNaN(emiAmount) || emiAmount <= 0) {
      return;
    }

    const newEntry = {
      payment_date: newPayment.payment_date,
      emi_amount: newPayment.emi_amount,
      notes: newPayment.notes
    };

    setEmiEntries([...emiEntries, newEntry]);
    setNewPayment({ payment_date: '', emi_amount: '', notes: '' });
  };

  const handleRemoveEMIEntry = (index: number) => {
    setEmiEntries(emiEntries.filter((_, i) => i !== index));
  };

  const handleCalculateComponents = () => {
    if (emiEntries.length === 0) {
      toast({
        title: 'No Entries',
        description: 'Please add EMI payment entries first.',
        variant: 'destructive',
      });
      return;
    }

    const sortedEntries = [...emiEntries].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );

    const paymentsToCalculate = sortedEntries.map(entry => ({
      payment_date: entry.payment_date,
      emi_amount: parseFloat(entry.emi_amount)
    }));

    const rateHistoryForCalculation = rateHistory.map(rate => ({
      effective_date: rate.effective_date,
      interest_rate: rate.interest_rate
    }));

    const outstandingPrincipal = payments.length > 0 
      ? payments[payments.length - 1].outstanding_principal 
      : loanPrincipal;

    const effectiveStartDate = payments.length > 0
      ? payments[payments.length - 1].payment_date
      : loanStartDate;

    const calculatedPayments = calculateAllEMIBreakdowns(
      effectiveStartDate,
      outstandingPrincipal,
      paymentsToCalculate,
      rateHistoryForCalculation,
      dueDayOfMonth
    );

    const startingPaymentNumber = payments.length + 1;
    const paymentsWithNotes = calculatedPayments.map((payment, index) => ({
      ...payment,
      payment_number: startingPaymentNumber + index,
      interest_rate: interestRate,
      notes: sortedEntries[index]?.notes || ''
    }));

    setPayments([...payments, ...paymentsWithNotes]);
    setEmiEntries([]);
    
    toast({
      title: 'Success',
      description: `Calculated components for ${calculatedPayments.length} payments.`,
    });
  };

  const handleRemovePayment = (index: number) => {
    const updatedPayments = payments.filter((_, i) => i !== index).map((payment, idx) => ({
      ...payment,
      payment_number: idx + 1
    }));
    setPayments(updatedPayments);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValues({
      principal_component: payments[index].principal_component.toString(),
      interest_component: payments[index].interest_component.toString()
    });
  };

  const handleSaveEdit = (index: number) => {
    const principalComponent = parseFloat(editValues.principal_component);
    const interestComponent = parseFloat(editValues.interest_component);
    
    if (isNaN(principalComponent) || isNaN(interestComponent)) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter valid numbers for principal and interest.',
        variant: 'destructive',
      });
      return;
    }

    const payment = payments[index];
    const expectedTotal = payment.emi_amount;
    const actualTotal = principalComponent + interestComponent;
    
    if (Math.abs(actualTotal - expectedTotal) > 0.01) {
      toast({
        title: 'Validation Error',
        description: 'Principal + Interest must equal EMI Amount.',
        variant: 'destructive',
      });
      return;
    }

    const updatedPayments = [...payments];
    let outstandingPrincipal = index === 0 ? loanPrincipal : payments[index - 1].outstanding_principal;
    
    updatedPayments[index] = {
      ...updatedPayments[index],
      principal_component: principalComponent,
      interest_component: interestComponent,
      outstanding_principal: Math.max(0, Math.round((outstandingPrincipal - principalComponent) * 100) / 100)
    };

    for (let i = index + 1; i < updatedPayments.length; i++) {
      outstandingPrincipal = updatedPayments[i - 1].outstanding_principal;
      const newOutstanding = Math.max(0, Math.round((outstandingPrincipal - updatedPayments[i].principal_component) * 100) / 100);
      updatedPayments[i] = {
        ...updatedPayments[i],
        outstanding_principal: newOutstanding
      };
    }
    
    setPayments(updatedPayments);
    setEditingIndex(null);
    toast({
      title: 'Success',
      description: 'Payment updated successfully.',
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValues({ principal_component: '', interest_component: '' });
  };

  const totalPrincipalPaid = payments.reduce((sum, p) => sum + p.principal_component, 0);
  const totalInterestPaid = payments.reduce((sum, p) => sum + p.interest_component, 0);
  const currentOutstanding = payments.length > 0 
    ? payments[payments.length - 1].outstanding_principal 
    : loanPrincipal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          EMI Payment History
        </CardTitle>
        <CardDescription>
          Record each EMI payment to track principal and interest breakdown accurately
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loanPrincipal > 0 && interestRate > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Principal Paid</p>
              <p className="text-lg font-semibold">{formatCurrency(totalPrincipalPaid, currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Interest Paid</p>
              <p className="text-lg font-semibold">{formatCurrency(totalInterestPaid, currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Principal</p>
              <p className="text-lg font-semibold">{formatCurrency(currentOutstanding, currency)}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Step 1: Add EMI Payment Entries</h4>
            {interestRateType === 'floating' && rateHistory.length > 1 && (
              <div className="text-xs text-muted-foreground">
                {rateHistory.length} rate changes detected
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                min={loanStartDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emi_amount">EMI Amount *</Label>
              <Input
                id="emi_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newPayment.emi_amount}
                onChange={(e) => setNewPayment({ ...newPayment, emi_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Payment notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="invisible">Action</Label>
              <Button
                type="button"
                onClick={handleAddEMIEntry}
                disabled={!newPayment.payment_date || !newPayment.emi_amount || !loanPrincipal || !interestRate}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>
        </div>

        {emiEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">EMI Entries ({emiEntries.length})</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">EMI Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emiEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(entry.emi_amount), currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEMIEntry(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCalculateComponents}
                disabled={loadingRates}
                className="flex-1"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Step 2: Calculate Principal & Interest Components
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Interest will be calculated from day 1 of loan{interestRateType === 'floating' ? ', considering all rate changes' : ''}.
            </p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Payment History ({payments.length} payments)</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">EMI Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.emi_amount, currency)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {editingIndex === index ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.principal_component}
                              onChange={(e) => setEditValues({ ...editValues, principal_component: e.target.value })}
                              className="w-24 h-8 text-right"
                            />
                          ) : (
                            formatCurrency(payment.principal_component, currency)
                          )}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">
                          {editingIndex === index ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.interest_component}
                              onChange={(e) => setEditValues({ ...editValues, interest_component: e.target.value })}
                              className="w-24 h-8 text-right"
                            />
                          ) : (
                            formatCurrency(payment.interest_component, currency)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(payment.outstanding_principal, currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingIndex === index ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveEdit(index)}
                                  title="Save changes"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  title="Cancel editing"
                                >
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(index)}
                                  title="Edit principal/interest"
                                >
                                  <Edit2 className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemovePayment(index)}
                                  title="Delete payment"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {payments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No EMI payments recorded yet</p>
            <p className="text-sm">Add payment details above to track your loan repayment history</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
