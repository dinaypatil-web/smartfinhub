import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calendar, Edit2, Check, X } from 'lucide-react';
import { calculateEMIBreakdown } from '@/utils/loanCalculations';
import { formatCurrency } from '@/utils/format';
import type { LoanEMIPayment } from '@/types/types';

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
}

export default function LoanEMIPaymentManager({
  loanPrincipal,
  interestRate,
  loanStartDate,
  currency,
  onPaymentsChange,
  initialPayments = []
}: LoanEMIPaymentManagerProps) {
  const [payments, setPayments] = useState<EMIPaymentEntry[]>(initialPayments);
  const [newPayment, setNewPayment] = useState({
    payment_date: '',
    emi_amount: '',
    principal_component: '',
    interest_component: '',
    notes: ''
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    principal_component: string;
    interest_component: string;
  }>({ principal_component: '', interest_component: '' });

  useEffect(() => {
    onPaymentsChange(payments);
  }, [payments]);

  const calculateOutstandingPrincipal = (paymentIndex: number): number => {
    if (paymentIndex === 0) {
      return loanPrincipal;
    }
    return payments[paymentIndex - 1]?.outstanding_principal || loanPrincipal;
  };

  const handleAddPayment = () => {
    if (!newPayment.payment_date || !newPayment.emi_amount) {
      return;
    }

    const emiAmount = parseFloat(newPayment.emi_amount);
    if (isNaN(emiAmount) || emiAmount <= 0) {
      return;
    }

    const paymentNumber = payments.length + 1;
    const outstandingPrincipal = calculateOutstandingPrincipal(payments.length);

    let principalComponent: number;
    let interestComponent: number;

    if (newPayment.principal_component && newPayment.interest_component) {
      principalComponent = parseFloat(newPayment.principal_component);
      interestComponent = parseFloat(newPayment.interest_component);
      
      if (isNaN(principalComponent) || isNaN(interestComponent)) {
        return;
      }
      
      if (Math.abs((principalComponent + interestComponent) - emiAmount) > 0.01) {
        return;
      }
    } else {
      const breakdown = calculateEMIBreakdown(
        outstandingPrincipal,
        emiAmount,
        interestRate
      );
      principalComponent = breakdown.principalComponent;
      interestComponent = breakdown.interestComponent;
    }

    const newOutstandingPrincipal = Math.max(0, Math.round((outstandingPrincipal - principalComponent) * 100) / 100);

    const payment: EMIPaymentEntry = {
      payment_date: newPayment.payment_date,
      emi_amount: emiAmount,
      principal_component: principalComponent,
      interest_component: interestComponent,
      outstanding_principal: newOutstandingPrincipal,
      interest_rate: interestRate,
      payment_number: paymentNumber,
      notes: newPayment.notes
    };

    const updatedPayments = [...payments, payment];
    setPayments(updatedPayments);
    setNewPayment({ payment_date: '', emi_amount: '', principal_component: '', interest_component: '', notes: '' });
  };

  const handleRemovePayment = (index: number) => {
    const updatedPayments = payments.filter((_, i) => i !== index);
    
    let outstandingPrincipal = loanPrincipal;
    const recalculatedPayments = updatedPayments.map((payment, idx) => {
      const breakdown = calculateEMIBreakdown(
        outstandingPrincipal,
        payment.emi_amount,
        payment.interest_rate
      );
      
      outstandingPrincipal = breakdown.newOutstandingPrincipal;
      
      return {
        ...payment,
        payment_number: idx + 1,
        principal_component: breakdown.principalComponent,
        interest_component: breakdown.interestComponent,
        outstanding_principal: breakdown.newOutstandingPrincipal
      };
    });
    
    setPayments(recalculatedPayments);
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
      return;
    }

    const payment = payments[index];
    const expectedTotal = payment.emi_amount;
    const actualTotal = principalComponent + interestComponent;
    
    if (Math.abs(actualTotal - expectedTotal) > 0.01) {
      return;
    }

    const updatedPayments = [...payments];
    let outstandingPrincipal = index === 0 ? loanPrincipal : payments[index - 1].outstanding_principal;
    
    for (let i = index; i < updatedPayments.length; i++) {
      if (i === index) {
        updatedPayments[i] = {
          ...updatedPayments[i],
          principal_component: principalComponent,
          interest_component: interestComponent,
          outstanding_principal: Math.max(0, Math.round((outstandingPrincipal - principalComponent) * 100) / 100)
        };
        outstandingPrincipal = updatedPayments[i].outstanding_principal;
      } else {
        const breakdown = calculateEMIBreakdown(
          outstandingPrincipal,
          updatedPayments[i].emi_amount,
          updatedPayments[i].interest_rate
        );
        updatedPayments[i] = {
          ...updatedPayments[i],
          principal_component: breakdown.principalComponent,
          interest_component: breakdown.interestComponent,
          outstanding_principal: breakdown.newOutstandingPrincipal
        };
        outstandingPrincipal = breakdown.newOutstandingPrincipal;
      }
    }
    
    setPayments(updatedPayments);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValues({ principal_component: '', interest_component: '' });
  };

  const handleEMIAmountChange = (value: string) => {
    setNewPayment({ ...newPayment, emi_amount: value });
    
    const emiAmount = parseFloat(value);
    if (!isNaN(emiAmount) && emiAmount > 0 && !newPayment.principal_component && !newPayment.interest_component) {
      const outstandingPrincipal = calculateOutstandingPrincipal(payments.length);
      const breakdown = calculateEMIBreakdown(outstandingPrincipal, emiAmount, interestRate);
      setNewPayment(prev => ({
        ...prev,
        emi_amount: value,
        principal_component: breakdown.principalComponent.toFixed(2),
        interest_component: breakdown.interestComponent.toFixed(2)
      }));
    }
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
          <h4 className="font-medium">Add EMI Payment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                onChange={(e) => handleEMIAmountChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal_component">Principal Component</Label>
              <Input
                id="principal_component"
                type="number"
                step="0.01"
                placeholder="Auto-calculated"
                value={newPayment.principal_component}
                onChange={(e) => setNewPayment({ ...newPayment, principal_component: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave blank for auto-calculation</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest_component">Interest Component</Label>
              <Input
                id="interest_component"
                type="number"
                step="0.01"
                placeholder="Auto-calculated"
                value={newPayment.interest_component}
                onChange={(e) => setNewPayment({ ...newPayment, interest_component: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave blank for auto-calculation</p>
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
          </div>
          {newPayment.principal_component && newPayment.interest_component && newPayment.emi_amount && (
            <div className="text-sm">
              {Math.abs((parseFloat(newPayment.principal_component) + parseFloat(newPayment.interest_component)) - parseFloat(newPayment.emi_amount)) > 0.01 ? (
                <p className="text-destructive">⚠️ Principal + Interest must equal EMI Amount</p>
              ) : (
                <p className="text-green-600 dark:text-green-400">✓ Components sum correctly</p>
              )}
            </div>
          )}
          <Button
            type="button"
            onClick={handleAddPayment}
            disabled={!newPayment.payment_date || !newPayment.emi_amount || !loanPrincipal || !interestRate}
            className="w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </div>

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
