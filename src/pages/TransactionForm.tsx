import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, categoryApi, budgetApi, emiApi, loanEMIPaymentApi, creditCardStatementApi } from '@/db/api';
import type { TransactionType, Account, CreditCardPaymentAllocation } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, TrendingDown, CreditCard, AlertCircle, Plus, Info } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCardStatementSelector } from '@/components/CreditCardStatementSelector';
import {
  calculateMonthlyEMI,
  calculateEMIDetails,
  validateCreditLimit,
  getCreditLimitWarningMessage
} from '@/utils/emiCalculations';
import { calculateEMIBreakdown } from '@/utils/loanCalculations';
import { getTransactionStatementInfo, getStatementPeriod } from '@/utils/statementCalculations';
import { INCOME_CATEGORIES } from '@/constants/incomeCategories';
import { cache } from '@/utils/cache';

// Transaction form for creating and editing transactions
export default function TransactionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{ budgeted: number; spent: number; remaining: number } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const [formData, setFormData] = useState({
    transaction_type: 'expense' as TransactionType,
    from_account_id: '',
    to_account_id: '',
    amount: '',
    currency: profile?.default_currency || 'INR',
    category: '',
    income_category: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    is_emi: false,
    emi_months: '',
    bank_charges: '',
  });

  const [calculatedEMI, setCalculatedEMI] = useState<{
    monthlyEMI: number;
    totalAmount: number;
    totalInterest: number;
    effectiveRate: number;
  } | null>(null);

  const [creditLimitWarning, setCreditLimitWarning] = useState<string | null>(null);
  const [statementInfo, setStatementInfo] = useState<{
    statementDate: Date;
    dueDate: Date;
    periodStartDate?: Date;
    periodEndDate?: Date;
  } | null>(null);

  const [existingEMI, setExistingEMI] = useState<any>(null);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [originalAccountId, setOriginalAccountId] = useState<string | null>(null);

  const [loanBreakdown, setLoanBreakdown] = useState<{
    principal: number;
    interest: number;
  } | null>(null);
  const [loanOutstandingPrincipalBefore, setLoanOutstandingPrincipalBefore] = useState<number>(0);
  const [isManualBreakdown, setIsManualBreakdown] = useState(false);

  // Credit Card Statement and Payment Management
  const [ccAllocations, setCCAllocations] = useState<CreditCardPaymentAllocation[]>([]);
  const [ccAdvanceCreated, setCCAdvanceCreated] = useState(0);
  const [ccAdvanceUsed, setCCAdvanceUsed] = useState(0);
  const [ccAdvanceBalance, setCCAdvanceBalance] = useState(0);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Handle pre-fill from navigation state
  useEffect(() => {
    if (!id && location.state?.prefill) {
      setFormData(prev => ({
        ...prev,
        ...location.state.prefill,
        // Ensure amount is string
        amount: location.state.prefill.amount ? String(location.state.prefill.amount) : prev.amount
      }));
    }
  }, [id, location.state]);

  // Calculate statement and due dates for credit card transactions
  useEffect(() => {
    let accountId = '';

    // For spending (Expense/Transfer FROM card)
    if (formData.from_account_id && !formData.is_emi &&
      (formData.transaction_type === 'expense' || formData.transaction_type === 'withdrawal' || formData.transaction_type === 'transfer')) {
      accountId = formData.from_account_id;
    }
    // For repayment (Transfer/Repayment TO card)
    else if (formData.to_account_id && formData.transaction_type === 'credit_card_repayment') {
      accountId = formData.to_account_id;
    }

    if (accountId && formData.transaction_date) {
      const account = accounts.find((a: Account) => a.id === accountId);
      if (account && account.account_type === 'credit_card' && account.statement_day && account.due_day) {
        try {
          const transactionDate = new Date(formData.transaction_date);
          const { statementDate, dueDate } = getTransactionStatementInfo(
            account.statement_day,
            account.due_day,
            transactionDate
          );

          // For repayment, also compute the statement period
          // The period being paid is: lastStatementDate (exclusive) to currentStatementDate (inclusive)
          if (formData.transaction_type === 'credit_card_repayment') {
            const { lastStatementDate, currentStatementDate } = getStatementPeriod(
              account.statement_day,
              transactionDate
            );
            setStatementInfo({
              statementDate,
              dueDate,
              periodStartDate: lastStatementDate,
              periodEndDate: currentStatementDate
            });
          } else {
            setStatementInfo({
              statementDate,
              dueDate
            });
          }
        } catch (error) {
          console.error('Error calculating statement info:', error);
          setStatementInfo(null);
        }
      } else {
        setStatementInfo(null);
      }
    } else {
      setStatementInfo(null);
    }
  }, [formData.from_account_id, formData.to_account_id, formData.transaction_type, formData.transaction_date, formData.is_emi, accounts]);

  // Fetch advance balance for the selected credit card during repayment
  useEffect(() => {
    const fetchAdvanceBalance = async () => {
      if (formData.transaction_type === 'credit_card_repayment' && formData.to_account_id) {
        try {
          const balance = await creditCardStatementApi.getAdvanceBalance(formData.to_account_id);
          setCCAdvanceBalance(balance);
        } catch (err) {
          console.error('Error fetching advance balance:', err);
          setCCAdvanceBalance(0);
        }
      } else {
        setCCAdvanceBalance(0);
      }
    };
    fetchAdvanceBalance();
  }, [formData.transaction_type, formData.to_account_id]);

  // When "Advance Balance" is selected as payment source, set advance consumed to amount
  useEffect(() => {
    if (formData.transaction_type === 'credit_card_repayment' && 
        formData.from_account_id === 'advance_balance' && 
        formData.amount) {
      const amount = parseFloat(formData.amount) || 0;
      setCCAdvanceUsed(amount);
      setCCAdvanceCreated(0); // No advance created when using advance balance
    }
  }, [formData.transaction_type, formData.from_account_id, formData.amount]);

  // Auto-select "Loan repayments" category when loan_payment transaction type is selected
  useEffect(() => {
    if (formData.transaction_type === 'loan_payment') {
      const loanRepaymentCategory = categories.find(c => c.name === 'Loan repayments');
      if (loanRepaymentCategory && formData.category !== loanRepaymentCategory.name) {
        setFormData(prev => ({ ...prev, category: loanRepaymentCategory.name }));
      }
    }
  }, [formData.transaction_type, categories]);

  useEffect(() => {
    // Load budget info when category changes and transaction type is expense or loan_payment
    if (user && formData.category && (formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && formData.transaction_date) {
      loadBudgetInfo();
    } else {
      setBudgetInfo(null);
    }
  }, [user, formData.category, formData.transaction_type, formData.transaction_date]);

  // Calculate EMI when EMI fields change
  useEffect(() => {
    if (formData.is_emi && formData.amount && formData.emi_months && formData.bank_charges) {
      const amount = parseFloat(formData.amount);
      const months = parseInt(formData.emi_months);
      const charges = parseFloat(formData.bank_charges);

      if (!isNaN(amount) && !isNaN(months) && !isNaN(charges) && months > 0) {
        const emiDetails = calculateEMIDetails(amount, charges, months);
        setCalculatedEMI(emiDetails);
      } else {
        setCalculatedEMI(null);
      }
    } else {
      setCalculatedEMI(null);
    }
  }, [formData.is_emi, formData.amount, formData.emi_months, formData.bank_charges]);

  // Validate credit limit when amount or account changes
  useEffect(() => {
    if (formData.from_account_id && formData.amount) {
      try {
        const account = accounts.find((a: Account) => a.id === formData.from_account_id);
        if (account && account.account_type === 'credit_card') {
          const amount = parseFloat(formData.amount);
          if (!isNaN(amount) && amount > 0) {
            // Adjust balance based on the original transaction if we are editing
            const isSameAccount = formData.from_account_id === originalAccountId;
            const baseBalance = (id && isSameAccount) ? account.balance - originalAmount : account.balance;
            const projectedBalance = baseBalance + amount;

            // Display warning based on the result of the edit
            const warning = getCreditLimitWarningMessage(projectedBalance, account.credit_limit, account.currency);
            setCreditLimitWarning(warning);

            // Validate if the net change would exceed the limit
            const validation = validateCreditLimit(baseBalance, amount, account.credit_limit);
            if (!validation.valid) {
              setCreditLimitWarning(`⚠️ ${validation.message}`);
            }
          } else {
            setCreditLimitWarning(null);
          }
        } else {
          setCreditLimitWarning(null);
        }
      } catch (error) {
        console.error('Error validating credit limit:', error);
        setCreditLimitWarning(null);
      }
    } else {
      setCreditLimitWarning(null);
    }
  }, [formData.from_account_id, formData.amount, accounts, id, originalAmount, originalAccountId]);

  // Calculate Loan Breakdown (Principal vs Interest)
  useEffect(() => {
    const calculateLoanSplit = async () => {
      if (formData.transaction_type === 'loan_payment' && formData.to_account_id && formData.amount && !isManualBreakdown) {
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) return;

        const account = accounts.find((a: Account) => a.id === formData.to_account_id);
        if (account && account.account_type === 'loan' && user) {
          try {
            let outstandingPrincipal = Number(account.balance);

            // If editing an existing transaction, source outstanding principal from historical record
            if (id) {
              try {
                const currentPayment = await loanEMIPaymentApi.getPaymentByTransactionId(id);
                if (currentPayment) {
                  const prevPaymentNumber = currentPayment.payment_number - 1;
                  if (prevPaymentNumber >= 1) {
                    const payments = await loanEMIPaymentApi.getPaymentsByAccount(formData.to_account_id);
                    const prevPayment = payments.find(p => p.payment_number === prevPaymentNumber);
                    if (prevPayment) {
                      outstandingPrincipal = prevPayment.outstanding_principal;
                    }
                  } else {
                    // First payment, use initial principal
                    outstandingPrincipal = Number(account.loan_principal || account.balance);
                  }
                }
                setLoanOutstandingPrincipalBefore(outstandingPrincipal);
              } catch (error) {
                console.error("Error sourcing historical principal for edit:", error);
              }
            } else {
              setLoanOutstandingPrincipalBefore(outstandingPrincipal);
            }

            // Simple calculation: Interest = Outstanding Principal × Annual Rate / 12 / 100
            // Principal = Payment Amount - Interest
            const breakdown = calculateEMIBreakdown(
              outstandingPrincipal, // Outstanding principal BEFORE this payment
              amount, // Current payment amount
              Number(account.current_interest_rate || 0) // Annual interest rate
            );

            setLoanBreakdown({
              principal: breakdown.principalComponent,
              interest: breakdown.interestComponent
            });
          } catch (error) {
            console.error("Error calculating loan breakdown", error);
            setLoanBreakdown(null);
          }
        }
      } else if (formData.transaction_type !== 'loan_payment') {
        setLoanBreakdown(null);
      }
    };

    calculateLoanSplit();
  }, [formData.transaction_type, formData.to_account_id, formData.amount, formData.transaction_date, accounts, isManualBreakdown, id, user]);

  const loadBudgetInfo = async () => {
    if (!user || !formData.category || formData.transaction_type !== 'expense') return;

    setLoadingBudget(true);
    try {
      const transactionDate = new Date(formData.transaction_date);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();

      const info = await budgetApi.getCategoryBudgetInfo(user.id, formData.category, month, year);
      setBudgetInfo(info);
    } catch (error) {
      console.error('Error loading budget info:', error);
      setBudgetInfo(null);
    } finally {
      setLoadingBudget(false);
    }
  };

  const loadData = async () => {
    if (!user) return;

    setLoadingData(true);
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountApi.getAccounts(user.id),
        categoryApi.getCategories(user.id)
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      if (id) {
        const transactions = await transactionApi.getTransactions(user.id);
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
          // Fetch EMI details if it's a credit card transaction
          let emiData = null;
          if (transaction.from_account_id) {
            const account = accountsData.find((a: Account) => a.id === transaction.from_account_id);
            if (account && account.account_type === 'credit_card') {
              emiData = await emiApi.getEMIByTransactionId(transaction.id);
            }
          }

          setExistingEMI(emiData);
          setOriginalAmount(Number(transaction.amount));
          setOriginalAccountId(transaction.from_account_id);

          // Fetch credit card repayment allocations if applicable
          if (transaction.transaction_type === 'credit_card_repayment') {
            try {
              const allocations = await creditCardStatementApi.getRepaymentAllocations(transaction.id);
              setCCAllocations(allocations);
            } catch (error) {
              console.error('Error fetching CC repayment allocations:', error);
            }
          }

          setFormData({
            transaction_type: transaction.transaction_type,
            from_account_id: transaction.from_account_id || '',
            to_account_id: transaction.to_account_id || '',
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            category: transaction.category || '',
            income_category: transaction.income_category || '',
            description: transaction.description || '',
            transaction_date: transaction.transaction_date,
            is_emi: !!emiData,
            emi_months: emiData ? emiData.emi_months.toString() : '',
            bank_charges: emiData ? emiData.bank_charges.toString() : '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    // Validate amount is positive
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Amount must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    // Validate account selections based on transaction type
    if (formData.transaction_type === 'income' && !formData.to_account_id) {
      toast({
        title: 'Error',
        description: 'Please select a destination account for income',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'expense' && !formData.from_account_id) {
      toast({
        title: 'Error',
        description: 'Please select a source account for expense',
        variant: 'destructive',
      });
      return;
    }

    if ((formData.transaction_type === 'transfer' || formData.transaction_type === 'withdrawal') &&
      (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both source and destination accounts',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'loan_payment' && (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both payment source and loan account',
        variant: 'destructive',
      });
      return;
    }

    if (formData.transaction_type === 'credit_card_repayment' && (!formData.from_account_id || !formData.to_account_id)) {
      toast({
        title: 'Error',
        description: 'Please select both payment source and credit card account',
        variant: 'destructive',
      });
      return;
    }

    // If using advance balance, validate amount doesn't exceed available advance
    const isUsingAdvanceBalance = formData.from_account_id === 'advance_balance';
    if (isUsingAdvanceBalance && parseFloat(formData.amount) > ccAdvanceBalance) {
      toast({
        title: 'Error',
        description: `Amount exceeds available advance balance of ${ccAdvanceBalance}`,
        variant: 'destructive',
      });
      return;
    }

    // Validate EMI fields if EMI is selected
    if (formData.is_emi) {
      if (!formData.emi_months || parseInt(formData.emi_months) <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter valid EMI duration',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.bank_charges || parseFloat(formData.bank_charges) < 0) {
        toast({
          title: 'Error',
          description: 'Please enter valid bank charges',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate credit limit for credit card transactions
    if (formData.from_account_id) {
      try {
        const account = accounts.find((a: Account) => a.id === formData.from_account_id);
        if (account && account.account_type === 'credit_card' && account.credit_limit) {
          const amount = parseFloat(formData.amount);
          const isSameAccount = formData.from_account_id === originalAccountId;
          const currentBalance = Number(account.balance) || 0;
          const originalAmt = Number(originalAmount) || 0;
          const creditLimit = Number(account.credit_limit) || 0;

          const baseBalance = (id && isSameAccount) ? currentBalance - originalAmt : currentBalance;

          const validation = validateCreditLimit(
            baseBalance,
            amount,
            creditLimit
          );
          if (!validation.valid) {
            toast({
              title: 'Credit Limit Exceeded',
              description: validation.message,
              variant: 'destructive',
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error validating credit limit:', error);
        // Don't block the transaction if validation fails
      }
    }

    setLoading(true);

    try {
      const transactionData: any = {
        user_id: user.id,
        transaction_type: formData.transaction_type,
        from_account_id: formData.from_account_id === 'advance_balance' ? null : (formData.from_account_id || null),
        to_account_id: formData.to_account_id || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category || null,
        income_category: formData.income_category || null,
        description: formData.description || null,
        transaction_date: formData.transaction_date,
      };


      if (id) {
        const transactionId = id as string;
        await transactionApi.updateTransaction(transactionId, transactionData);

        // Handle EMI update
        if (formData.is_emi) {
          const purchaseAmount = parseFloat(formData.amount);
          const bankCharges = parseFloat(formData.bank_charges);
          const emiMonths = parseInt(formData.emi_months);
          const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bankCharges, emiMonths);
          const totalAmount = purchaseAmount + bankCharges;

          const emiData = {
            user_id: user.id,
            account_id: formData.from_account_id,
            transaction_id: transactionId,
            purchase_amount: purchaseAmount,
            bank_charges: bankCharges,
            total_amount: totalAmount,
            emi_months: emiMonths,
            monthly_emi: monthlyEMI,
            remaining_installments: existingEMI ? existingEMI.remaining_installments : emiMonths,
            start_date: formData.transaction_date,
            next_due_date: formData.transaction_date,
            description: formData.description || `EMI for ${formData.category || 'purchase'}`,
            status: 'active' as const,
          };

          if (existingEMI) {
            await emiApi.updateEMI(existingEMI.id, emiData);
          } else {
            await emiApi.createEMI(emiData);
          }
        } else if (existingEMI) {
          await emiApi.deleteEMI(existingEMI.id);
        }

        // Handle Loan Payment update
        if (formData.transaction_type === 'loan_payment' && formData.to_account_id && loanBreakdown) {
          const loanAccount = accounts.find(a => a.id === formData.to_account_id);
          if (loanAccount) {
            const currentPayment = await loanEMIPaymentApi.getPaymentByTransactionId(transactionId);
            if (currentPayment) {
              await loanEMIPaymentApi.updatePaymentByTransactionId(transactionId, {
                payment_date: formData.transaction_date,
                emi_amount: parseFloat(formData.amount),
                principal_component: loanBreakdown.principal,
                interest_component: loanBreakdown.interest,
                outstanding_principal: Math.max(0, loanOutstandingPrincipalBefore - loanBreakdown.principal),
                interest_rate: Number(loanAccount.current_interest_rate || 0),
                notes: formData.description
              });
            }
          }
        }

        // Handle Credit Card Repayment update
        if (formData.transaction_type === 'credit_card_repayment' && formData.to_account_id) {
          try {
            // 1. Revert old allocations
            const oldAllocations = await creditCardStatementApi.getRepaymentAllocations(transactionId);
            for (const alloc of oldAllocations) {
              await creditCardStatementApi.updateStatementLineStatus(alloc.statement_line_id, 'pending', 0);
              if (alloc.emi_id) {
                await emiApi.unpayEMIInstallment(alloc.emi_id);
              }
            }

            await creditCardStatementApi.deleteAllocations(transactionId);

            // 2. Apply new allocations
            if (ccAllocations.length > 0) {
              const mappedAllocations = ccAllocations.map(a => ({
                line_id: a.statement_line_id,
                amount: a.amount_paid,
                emi_id: a.emi_id
              }));
              await creditCardStatementApi.allocateRepayment(transactionId, mappedAllocations);

              for (const allocation of ccAllocations) {
                await creditCardStatementApi.updateStatementLineStatus(
                  allocation.statement_line_id,
                  'paid',
                  allocation.amount_paid
                );

                if (allocation.emi_id) {
                  try {
                    await emiApi.payEMIInstallment(allocation.emi_id);
                  } catch (err) {
                    console.error('Error updating EMI installment:', err);
                  }
                }
              }
            }

            // Handle Advance Payments (Created/Used)
            const existingAdvance = await creditCardStatementApi.getAdvancePaymentByTransactionId(transactionId);

            if (existingAdvance) {
              // Check if card changed
              if (existingAdvance.credit_card_id !== formData.to_account_id) {
                // Delete old advance payment (this will propagate balance updates to the old card)
                await creditCardStatementApi.deleteAdvancePayment(existingAdvance.id);

                // Create new advance payment on the new card if needed
                if (ccAdvanceCreated > 0) {
                  await creditCardStatementApi.createAdvancePayment(
                    user.id,
                    formData.to_account_id as string,
                    ccAdvanceCreated,
                    formData.currency,
                    `Advance payment from transaction ${transactionId} (Updated)`,
                    transactionId
                  );
                }
              } else {
                // Same card, update or delete
                if (ccAdvanceCreated > 0) {
                  await creditCardStatementApi.updateAdvancePayment(existingAdvance.id, {
                    payment_amount: ccAdvanceCreated,
                    notes: `Advance payment from transaction ${transactionId} (Updated)`
                  });
                } else {
                  await creditCardStatementApi.deleteAdvancePayment(existingAdvance.id);
                }
              }
            } else if (ccAdvanceCreated > 0) {
              await creditCardStatementApi.createAdvancePayment(
                user.id,
                formData.to_account_id as string,
                ccAdvanceCreated,
                formData.currency,
                `Advance payment from transaction ${transactionId} (Updated)`,
                transactionId
              );
            }

            if (ccAdvanceUsed > 0) {
              await creditCardStatementApi.consumeAdvanceBalance(
                user.id,
                formData.to_account_id as string,
                ccAdvanceUsed
              );
            }
          } catch (error) {
            console.error('Error processing CC repayment update:', error);
          }
        }

        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      } else {
        // Create new transaction
        const created = await transactionApi.createTransaction(transactionData);

        if (formData.transaction_type === 'credit_card_repayment' && created && formData.to_account_id) {
          try {
            if (ccAllocations.length > 0) {
              const mappedAllocations = [];

              for (const alloc of ccAllocations) {
                let lineId = alloc.statement_line_id;

                // Handle virtual EMI lines (create real statement line on the fly)
                if (lineId.startsWith('emi_') && alloc.emi_id) {
                  try {
                    const emi = await emiApi.getEMIById(alloc.emi_id);
                    if (emi) {
                      const statementMonth = formData.transaction_date.slice(0, 7);
                      const newLine = await creditCardStatementApi.createStatementLine({
                        credit_card_id: formData.to_account_id,
                        user_id: user.id,
                        transaction_id: alloc.transaction_id || null,
                        description: alloc.description || `EMI Installment: ${emi.description}`,
                        amount: alloc.amount_paid,
                        transaction_date: emi.next_due_date <= formData.transaction_date ? emi.next_due_date : formData.transaction_date,
                        statement_month: statementMonth,
                        status: 'pending', // Will be updated to paid shortly
                        emi_id: emi.id
                      });
                      lineId = newLine.id;
                    }
                  } catch (err) {
                    console.error('Error creating statement line for EMI:', err);
                    continue; // Skip this allocation if creation fails
                  }
                }

                mappedAllocations.push({
                  line_id: lineId,
                  amount: alloc.amount_paid,
                  emi_id: alloc.emi_id
                });
              }

              await creditCardStatementApi.allocateRepayment(created.id, mappedAllocations);

              // Update status for all allocations
              for (const allocation of mappedAllocations) {
                await creditCardStatementApi.updateStatementLineStatus(
                  allocation.line_id,
                  'paid',
                  allocation.amount
                );

                if (allocation.emi_id) {
                  try {
                    await emiApi.payEMIInstallment(allocation.emi_id);
                  } catch (err) {
                    console.error('Error updating EMI installment:', err);
                  }
                }
              }
            }

            if (ccAdvanceCreated > 0) {
              await creditCardStatementApi.createAdvancePayment(
                user.id,
                formData.to_account_id as string,
                ccAdvanceCreated,
                formData.currency,
                `Advance payment from transaction ${created.id}`,
                created.id
              );
            }

            if (ccAdvanceUsed > 0) {
              await creditCardStatementApi.consumeAdvanceBalance(
                user.id,
                formData.to_account_id as string,
                ccAdvanceUsed
              );
            }
          } catch (error) {
            console.error('Error processing CC repayment:', error);
          }
        }

        if (formData.transaction_type === 'loan_payment' && formData.to_account_id && loanBreakdown && created) {
          const loanAccount = accounts.find(a => a.id === formData.to_account_id);
          if (loanAccount) {
            const existingPayments = await loanEMIPaymentApi.getPaymentsByAccount(formData.to_account_id as string);
            await loanEMIPaymentApi.createLoanEMIPayment({
              user_id: user.id,
              account_id: formData.to_account_id as string,
              payment_date: formData.transaction_date,
              emi_amount: parseFloat(formData.amount),
              principal_component: loanBreakdown.principal,
              interest_component: loanBreakdown.interest,
              outstanding_principal: Math.max(0, loanOutstandingPrincipalBefore - loanBreakdown.principal),
              interest_rate: Number(loanAccount.current_interest_rate || 0),
              payment_number: existingPayments.length + 1,
              transaction_id: created.id,
              notes: formData.description
            });

            if (loanBreakdown.interest > 0) {
              await accountApi.adjustBalance(formData.to_account_id as string, loanBreakdown.interest);
            }
          }
        }

        if (formData.is_emi && created) {
          const purchaseAmount = parseFloat(formData.amount);
          const bank_charges = parseFloat(formData.bank_charges);
          const emiMonths = parseInt(formData.emi_months);
          const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bank_charges, emiMonths);
          const totalAmount = purchaseAmount + bank_charges;

          await emiApi.createEMI({
            user_id: user.id,
            account_id: formData.from_account_id!,
            transaction_id: created.id,
            purchase_amount: purchaseAmount,
            bank_charges,
            total_amount: totalAmount,
            emi_months: emiMonths,
            monthly_emi: monthlyEMI,
            remaining_installments: emiMonths,
            start_date: formData.transaction_date,
            next_due_date: formData.transaction_date,
            description: formData.description || `EMI for ${formData.category || 'purchase'}`,
            status: 'active' as const,
          });
        }

        toast({
          title: 'Success',
          description: 'Transaction created successfully',
        });
      }

      cache.clearPattern('dashboard-');
      navigate('/transactions');
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/transactions')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Transactions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Transaction' : 'Add New Transaction'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: TransactionType) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="loan_payment">Loan Payment</SelectItem>
                  <SelectItem value="credit_card_repayment">Credit Card Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.transaction_type === 'expense' || formData.transaction_type === 'withdrawal' ||
              formData.transaction_type === 'transfer' || formData.transaction_type === 'loan_payment' ||
              formData.transaction_type === 'credit_card_repayment') && (
                <div className="space-y-2">
                  <Label htmlFor="from_account_id">
                    {formData.transaction_type === 'withdrawal' ? 'From Bank/Credit Card *' :
                      formData.transaction_type === 'credit_card_repayment' ? 'From Bank Account *' : 'From Account *'}
                  </Label>
                  <Select
                    value={formData.from_account_id}
                    onValueChange={(value) => setFormData({ ...formData, from_account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.transaction_type === 'withdrawal'
                        ? accounts.filter(a => a.account_type === 'bank' || a.account_type === 'credit_card').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name} ({account.account_type})
                          </SelectItem>
                        ))
                        : formData.transaction_type === 'credit_card_repayment'
                          ? [
                            ...accounts.filter(a => a.account_type === 'bank' || a.account_type === 'cash').map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name}
                              </SelectItem>
                            )),
                            ...(ccAdvanceBalance > 0 ? [
                              <SelectItem key="advance_balance" value="advance_balance">
                                Advance Balance ({formatCurrency(ccAdvanceBalance, formData.currency)})
                              </SelectItem>
                            ] : [])
                          ]
                          : accounts.filter(a => a.account_type !== 'loan').map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_name} ({account.account_type})
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>

                  {/* Display available balance for selected account */}
                  {formData.from_account_id && (() => {
                    const selectedAccount = accounts.find((a: Account) => a.id === formData.from_account_id);
                    if (selectedAccount) {
                      const isCreditCard = selectedAccount.account_type === 'credit_card';
                      const amount = parseFloat(formData.amount) || 0;

                      // Calculate projected Available Credit for Credit Cards
                      let availableBalance = Number(selectedAccount.balance) || 0;
                      let projectedAvailable = 0;
                      let isOverLimit = false;

                      if (isCreditCard && selectedAccount.credit_limit) {
                        const isSameAccount = formData.from_account_id === originalAccountId;
                        const currentBalance = Number(selectedAccount.balance) || 0;
                        const creditLimit = Number(selectedAccount.credit_limit) || 0;
                        const originalAmt = Number(originalAmount) || 0;

                        const baseBalance = (id && isSameAccount) ? currentBalance - originalAmt : currentBalance;
                        const projectedBalance = baseBalance + amount;

                        availableBalance = creditLimit - currentBalance;
                        projectedAvailable = creditLimit - projectedBalance;
                        isOverLimit = projectedBalance > creditLimit;
                      }

                      return (
                        <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {isCreditCard ? 'Current Balance Limit' : 'Current Balance'}
                            </span>
                            <span className={`text-sm font-semibold ${!isCreditCard && availableBalance < 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(isCreditCard ? (selectedAccount.credit_limit || 0) - selectedAccount.balance : availableBalance, selectedAccount.currency)}
                            </span>
                          </div>

                          {isCreditCard && (
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-dashed">
                              <span className="text-sm font-medium">Projected Balance Limit</span>
                              <span className={`text-sm font-bold ${isOverLimit ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {formatCurrency(projectedAvailable, selectedAccount.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

            {(formData.transaction_type === 'income' || formData.transaction_type === 'transfer' ||
              formData.transaction_type === 'withdrawal' || formData.transaction_type === 'loan_payment' ||
              formData.transaction_type === 'credit_card_repayment') && (
                <div className="space-y-2">
                  <Label htmlFor="to_account_id">
                    {formData.transaction_type === 'withdrawal' ? 'To Cash Account *' :
                      formData.transaction_type === 'credit_card_repayment' ? 'To Credit Card *' :
                        formData.transaction_type === 'loan_payment' ? 'To Loan Account *' : 'To Account *'}
                  </Label>
                  <Select
                    value={formData.to_account_id}
                    onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.transaction_type === 'withdrawal'
                        ? accounts.filter(a => a.account_type === 'cash').map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}
                          </SelectItem>
                        ))
                        : formData.transaction_type === 'credit_card_repayment'
                          ? accounts.filter(a => a.account_type === 'credit_card').map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_name}
                            </SelectItem>
                          ))
                          : formData.transaction_type === 'loan_payment'
                            ? accounts.filter(a => a.account_type === 'loan').map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name}
                              </SelectItem>
                            ))
                            : accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name} ({account.account_type})
                              </SelectItem>
                            ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Date *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {(formData.transaction_type === 'income' || formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && (
              <div className="space-y-2">
                <Label htmlFor="category">
                  {formData.transaction_type === 'income' ? 'Income Category' : 'Expense Category'}
                </Label>
                {formData.transaction_type === 'income' ? (
                  <Select
                    value={formData.income_category}
                    onValueChange={(value) => setFormData({ ...formData, income_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map(category => (
                        <SelectItem key={category.key} value={category.key}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Budget Information Display for Expense and Loan Payment Transactions */}
                {(formData.transaction_type === 'expense' || formData.transaction_type === 'loan_payment') && formData.category && (
                  <div className="mt-3">
                    {loadingBudget ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading budget info...
                      </div>
                    ) : budgetInfo ? (
                      <Alert className={`${budgetInfo.remaining < 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'}`}>
                        <TrendingDown className={`h-4 w-4 ${budgetInfo.remaining < 0 ? 'text-red-600' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'text-amber-600' : 'text-blue-600'}`} />
                        <AlertDescription>
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">Budget Status for {formData.category}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <div className="text-muted-foreground">Budgeted</div>
                                <div className="font-medium">{formatCurrency(budgetInfo.budgeted, formData.currency)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Spent</div>
                                <div className="font-medium">{formatCurrency(budgetInfo.spent, formData.currency)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Remaining</div>
                                <div className={`font-medium ${budgetInfo.remaining < 0 ? 'text-red-600 dark:text-red-400' : budgetInfo.remaining < budgetInfo.budgeted * 0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {formatCurrency(budgetInfo.remaining, formData.currency)}
                                </div>
                              </div>
                            </div>
                            {budgetInfo.remaining < 0 && (
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <span>Budget exceeded by {formatCurrency(Math.abs(budgetInfo.remaining), formData.currency)}</span>
                              </div>
                            )}
                            {budgetInfo.remaining >= 0 && budgetInfo.remaining < budgetInfo.budgeted * 0.2 && (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <span>Low budget remaining ({((budgetInfo.remaining / budgetInfo.budgeted) * 100).toFixed(0)}%)</span>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Credit Card Statement Selector for Repayment */}
            {formData.transaction_type === 'credit_card_repayment' && formData.to_account_id && (
              <CreditCardStatementSelector
                creditCardId={formData.to_account_id}
                repaymentAmount={parseFloat(formData.amount) || 0}
                onAllocationsChange={setCCAllocations}
                onAdvanceCreatedChange={(amount) => {
                  // Don't override advance created when using advance balance
                  if (formData.from_account_id !== 'advance_balance') {
                    setCCAdvanceCreated(amount);
                  }
                }}
                onAdvanceUsedChange={(amount) => {
                  // Don't override advance used when using advance balance
                  if (formData.from_account_id !== 'advance_balance') {
                    setCCAdvanceUsed(amount);
                  }
                }}
                onTotalSelectedChange={(total) => {
                  // Auto-populate amount field with total selected
                  if (total > 0) {
                    setFormData(prev => ({ ...prev, amount: total.toString() }));
                    // If using advance balance, also set advance consumed to total
                    if (formData.from_account_id === 'advance_balance') {
                      setCCAdvanceUsed(total);
                      setCCAdvanceCreated(0);
                    }
                  }
                }}
                currency={formData.currency}
                initialAllocations={ccAllocations}
                periodEndDate={statementInfo?.periodEndDate ? statementInfo.periodEndDate.toISOString().split('T')[0] : undefined}
              />
            )}

            {/* Loan Payment Principal/Interest Breakdown */}
            {formData.transaction_type === 'loan_payment' && loanBreakdown && (
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">EMI Breakdown</h3>
                    <button
                      type="button"
                      onClick={() => setIsManualBreakdown(!isManualBreakdown)}
                      className="text-xs px-2 py-1 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors"
                    >
                      {isManualBreakdown ? 'Use Auto' : 'Manual Adjust'}
                    </button>
                  </div>

                  {/* EMI Amount Breakdown Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-muted-foreground mb-1">Principal</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(loanBreakdown.principal, formData.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ({((loanBreakdown.principal / parseFloat(formData.amount)) * 100).toFixed(1)}%)
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-muted-foreground mb-1">Interest</div>
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(loanBreakdown.interest, formData.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ({((loanBreakdown.interest / parseFloat(formData.amount)) * 100).toFixed(1)}%)
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-muted-foreground mb-1">Total EMI</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(parseFloat(formData.amount), formData.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Paid to Loan</div>
                    </div>
                  </div>

                  {/* Outstanding Principal Display */}
                  {formData.to_account_id && (
                    <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-200 dark:border-blue-800">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                        <div>
                          <div className="text-xs text-muted-foreground">Outstanding Principal Before This Payment</div>
                          <div className="text-sm font-semibold mt-1">
                            {formatCurrency(
                              Math.max(0, Number(accounts.find(a => a.id === formData.to_account_id)?.balance || 0) + (originalAmount || 0)),
                              formData.currency
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right border-t sm:border-0 pt-2 sm:pt-0">
                          <div className="text-xs text-muted-foreground">After this payment</div>
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(
                              Math.max(0, Number(accounts.find(a => a.id === formData.to_account_id)?.balance || 0) + (originalAmount || 0) - loanBreakdown.principal),
                              formData.currency
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Breakdown Input */}
                  {isManualBreakdown && (
                    <div className="space-y-4 border-t border-blue-200 dark:border-blue-800 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="manual_principal" className="text-xs">Principal Amount</Label>
                          <Input
                            id="manual_principal"
                            type="number"
                            step="0.01"
                            min="0"
                            max={parseFloat(formData.amount) || 0}
                            value={loanBreakdown.principal}
                            onChange={(e) => {
                              const principal = parseFloat(e.target.value) || 0;
                              const total = parseFloat(formData.amount) || 0;
                              setLoanBreakdown({
                                principal,
                                interest: Math.max(0, total - principal)
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="manual_interest" className="text-xs">Interest Amount</Label>
                          <Input
                            id="manual_interest"
                            type="number"
                            step="0.01"
                            min="0"
                            max={parseFloat(formData.amount) || 0}
                            value={loanBreakdown.interest}
                            onChange={(e) => {
                              const interest = parseFloat(e.target.value) || 0;
                              const total = parseFloat(formData.amount) || 0;
                              setLoanBreakdown({
                                interest,
                                principal: Math.max(0, total - interest)
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {loanBreakdown.principal < 0 && (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Principal cannot be negative</span>
                        </div>
                      )}
                      {Math.abs((loanBreakdown.principal + loanBreakdown.interest) - (parseFloat(formData.amount) || 0)) > 0.01 && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Principal + Interest must equal EMI amount</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                    💡 EMI Breakdown for this payment only: Principal reduces loan balance, Interest is charged. Shows outstanding principal at the time of this payment.
                  </div>
                </div>
              </div>
            )}

            {/* Credit Card Repayment Summary UI */}
            {formData.transaction_type === 'credit_card_repayment' && formData.to_account_id && (
              <div className="space-y-4">
                {formData.from_account_id === 'advance_balance' ? (
                  // Special display when using advance balance
                  <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-200">Using Advance Balance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Advance Consumed</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(ccAdvanceUsed, formData.currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          From existing advance balance
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current Outstanding</div>
                        {(() => {
                          const account = accounts.find((a: Account) => a.id === formData.to_account_id);
                          const currentBalance = account ? Math.abs(Number(account.balance)) : 0;
                          const newBalance = Math.max(0, currentBalance - (parseFloat(formData.amount) || 0));
                          return (
                            <>
                              <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(newBalance, formData.currency)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Before: {formatCurrency(currentBalance, formData.currency)}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal display when using bank account
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-950/10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3 text-purple-600" />
                        Allocated to Statement
                      </div>
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(ccAllocations.reduce((sum, a) => sum + a.amount_paid, 0), formData.currency)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {ccAllocations.length} items selected
                      </div>
                    </div>

                    <div className="space-y-1 border-l pl-4 border-purple-100 dark:border-purple-900/30">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {ccAdvanceCreated > 0 ? (
                          <>
                            <Plus className="h-3 w-3 text-emerald-600" />
                            Advance Created
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 text-blue-600" />
                            Advance Consumed
                          </>
                        )}
                      </div>
                      <div className={`text-lg font-bold ${ccAdvanceCreated > 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {formatCurrency(ccAdvanceCreated > 0 ? ccAdvanceCreated : ccAdvanceUsed, formData.currency)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {ccAdvanceCreated > 0 ? 'Recorded for future' : 'Adjusted from existing'}
                      </div>
                    </div>

                    <div className="space-y-1 border-l pl-4 border-purple-100 dark:border-purple-900/30">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3 text-blue-600" />
                        Current Outstanding
                      </div>
                      {(() => {
                        const account = accounts.find((a: Account) => a.id === formData.to_account_id);
                        const currentBalance = account ? Math.abs(Number(account.balance)) : 0;
                        const newBalance = Math.max(0, currentBalance - (parseFloat(formData.amount) || 0));
                        return (
                          <>
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(newBalance, formData.currency)}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              Before: {formatCurrency(currentBalance, formData.currency)}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Credit Limit Warning */}
            {creditLimitWarning && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  {creditLimitWarning}
                </AlertDescription>
              </Alert>
            )}

            {/* EMI Option for Credit Card Transactions */}
            {formData.from_account_id &&
              accounts.find((a: Account) => a.id === formData.from_account_id)?.account_type === 'credit_card' && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_emi"
                      checked={formData.is_emi}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          is_emi: checked as boolean,
                          emi_months: checked ? formData.emi_months : '',
                          bank_charges: checked ? formData.bank_charges : '',
                        })
                      }
                    />
                    <Label htmlFor="is_emi" className="flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Convert to EMI (Equated Monthly Installment)
                    </Label>
                  </div>

                  {formData.is_emi && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emi_months">EMI Duration (Months) *</Label>
                          <Input
                            id="emi_months"
                            type="number"
                            min="1"
                            max="60"
                            value={formData.emi_months}
                            onChange={(e) => setFormData({ ...formData, emi_months: e.target.value })}
                            placeholder="e.g., 12"
                            required={formData.is_emi}
                          />
                          <p className="text-xs text-muted-foreground">
                            Number of monthly installments (1-60)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bank_charges">Bank Charges *</Label>
                          <Input
                            id="bank_charges"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.bank_charges}
                            onChange={(e) => setFormData({ ...formData, bank_charges: e.target.value })}
                            placeholder="0.00"
                            required={formData.is_emi}
                          />
                          <p className="text-xs text-muted-foreground">
                            Processing fees and interest charges
                          </p>
                        </div>
                      </div>

                      {calculatedEMI && (
                        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                                EMI Calculation Summary
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <div className="text-muted-foreground">Monthly EMI</div>
                                  <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                    {formatCurrency(calculatedEMI.monthlyEMI, formData.currency)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Total Amount</div>
                                  <div className="font-medium">
                                    {formatCurrency(calculatedEMI.totalAmount, formData.currency)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Total Interest</div>
                                  <div className="font-medium">
                                    {formatCurrency(calculatedEMI.totalInterest, formData.currency)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Effective Rate</div>
                                  <div className="font-medium">
                                    {calculatedEMI.effectiveRate.toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              )}

            {/* Statement and Due Date Info for Credit Card Transactions (Non-EMI) */}
            {formData.from_account_id &&
              !formData.is_emi &&
              accounts.find((a: Account) => a.id === formData.from_account_id)?.account_type === 'credit_card' &&
              statementInfo && (
                <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950/20">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold text-sm text-purple-900 dark:text-purple-200">
                        Credit Card Billing Information
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Statement Date</div>
                          <div className="font-medium text-purple-600 dark:text-purple-400">
                            {statementInfo.statementDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Payment Due Date</div>
                          <div className="font-medium text-purple-600 dark:text-purple-400">
                            {statementInfo.dueDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        This transaction will be included in the statement generated on {statementInfo.statementDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} and payment will be due on {statementInfo.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}


            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a note about this transaction"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {id ? 'Update Transaction' : 'Create Transaction'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
