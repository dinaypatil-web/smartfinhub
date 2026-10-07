import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, categoryApi, budgetApi, emiApi, loanEMIPaymentApi, creditCardStatementApi } from '@/db/api';
import type { TransactionType, Account, CreditCardPaymentAllocation, IncomeCategoryKey } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Plus,
  Info,
  Trash2,
  Sparkles,
  X,
  Send,
  Bot,
  Check,
  CheckCircle2,
  Wallet,
  Landmark,
  Building,
  ArrowRight,
} from 'lucide-react';
import { parseSmartChatbotCommand } from '@/services/aiService';
import { formatCurrency } from '@/utils/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCardStatementSelector } from '@/components/CreditCardStatementSelector';
import {
  calculateMonthlyEMI,
  calculateEMIDetails,
  validateCreditLimit,
  getCreditLimitWarningMessage,
  calculateFirstEMIDueDate
} from '@/utils/emiCalculations';
import { calculateEMIBreakdown } from '@/utils/loanCalculations';
import { getTransactionStatementInfo, getStatementPeriod } from '@/utils/statementCalculations';
import { INCOME_CATEGORIES, getIncomeCategoryName } from '@/constants/incomeCategories';
import { cache } from '@/utils/cache';

export interface PostPostingAccountDetail {
  id: string;
  name: string;
  type: string;
  institution_name?: string;
  roleLabel: string;
  previousBalance?: number;
  postBalance: number;
  currency: string;
  credit_limit?: number | null;
  changeAmount?: number;
}

export interface PostPostingSummary {
  isEdit: boolean;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  category?: string;
  income_category?: string;
  description?: string;
  transaction_date: string;
  accounts: PostPostingAccountDetail[];
}

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
  const [isManualBreakdown, setIsManualBreakdown] = useState(false);

  // Credit Card Statement and Payment Management
  const [ccAllocations, setCCAllocations] = useState<CreditCardPaymentAllocation[]>([]);
  const [ccAdvanceCreated, setCCAdvanceCreated] = useState(0);
  const [ccAdvanceUsed, setCCAdvanceUsed] = useState(0);
  const [ccAdvanceBalance, setCCAdvanceBalance] = useState(0);
  const [creditCardAdvances, setCreditCardAdvances] = useState<{ creditCardId: string; accountName: string; balance: number }[]>([]);
  const [ccLastAutoFilledTotal, setCCLastAutoFilledTotal] = useState<number | null>(null);
  const [isSplitRepayment, setIsSplitRepayment] = useState(false);
  const [splitSources, setSplitSources] = useState<Array<{ accountId: string; amount: string }>>([]);

  // Split Transaction within Multiple Expense Categories State
  const [isSplitCategory, setIsSplitCategory] = useState(false);
  const [splitCategories, setSplitCategories] = useState<Array<{ category: string; amount: string; description: string }>>([
    { category: '', amount: '', description: '' }
  ]);
  const [splitBudgets, setSplitBudgets] = useState<Record<string, { budgeted: number; spent: number; remaining: number } | null>>({});

  // Post-Posting Balances Display State
  const [postPostingSummary, setPostPostingSummary] = useState<PostPostingSummary | null>(null);
  const [isPostPostingModalOpen, setIsPostPostingModalOpen] = useState(false);

  // Multi-Transaction Batch Posting State
  interface BatchDraftItem {
    transaction_type: 'expense' | 'income';
    amount: number;
    category: string | null;
    income_category: IncomeCategoryKey | null;
    from_account_id: string | null;
    to_account_id: string | null;
    description: string;
    transaction_date: string;
    account_name?: string;
  }

  const [batchDrafts, setBatchDrafts] = useState<BatchDraftItem[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState<number>(0);
  const [isBatchSaving, setIsBatchSaving] = useState<boolean>(false);

  const loadBatchItemIntoForm = (item: BatchDraftItem) => {
    setFormData(prev => ({
      ...prev,
      transaction_type: item.transaction_type,
      amount: item.amount > 0 ? item.amount.toString() : '',
      from_account_id: item.from_account_id || '',
      to_account_id: item.to_account_id || '',
      category: item.category || '',
      income_category: item.income_category || '',
      description: item.description || '',
      transaction_date: item.transaction_date || new Date().toISOString().slice(0, 10),
      is_emi: false,
      emi_months: '',
      bank_charges: ''
    }));
    setLastUpdatedFields([
      item.transaction_type === 'income' ? 'Income' : 'Expense',
      'Amount',
      item.transaction_type === 'income' ? 'Income Category' : 'Expense Category',
      'Account',
      'Date'
    ]);
  };

  const updateCurrentBatchDraftFromForm = () => {
    if (batchDrafts.length === 0) return;
    setBatchDrafts(prev => {
      const copy = [...prev];
      if (copy[batchCurrentIndex]) {
        copy[batchCurrentIndex] = {
          ...copy[batchCurrentIndex],
          transaction_type: formData.transaction_type === 'income' ? 'income' : 'expense',
          amount: Number(formData.amount) || 0,
          from_account_id: formData.from_account_id || null,
          to_account_id: formData.to_account_id || null,
          category: formData.category || null,
          income_category: (formData.income_category as IncomeCategoryKey) || null,
          description: formData.description || '',
          transaction_date: formData.transaction_date,
        };
      }
      return copy;
    });
  };

  const handleSelectBatchItem = (index: number) => {
    if (index === batchCurrentIndex || index < 0 || index >= batchDrafts.length) return;
    updateCurrentBatchDraftFromForm();
    setBatchCurrentIndex(index);
    loadBatchItemIntoForm(batchDrafts[index]);
  };

  // Integrated AI Chatbot Assistant State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAIChat, setShowAIChat] = useState(!id);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'model'; content: string }>>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I am your Smart AI Assistant. I can help you record this transaction or answer any questions. Tell me details about your transaction, or ask for guidance! E.g.:\n\n• *\"I spent 1200 on grocery shopping at supermarket yesterday\"*\n• *\"Salary credit of 75000 in HDFC bank\"*\n• *\"Repay 5000 CC bill of SBI credit card from HDFC savings\"*\n• *\"Which expense categories do I have?\"*"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatStreamingText, setChatStreamingText] = useState('');
  const [lastUpdatedFields, setLastUpdatedFields] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Autocomplete Suggestions logic
  const [suggestions, setSuggestions] = useState<{ text: string; type: 'reason' | 'account' }[]>([]);

  useEffect(() => {
    if (!chatInput) {
      setSuggestions([]);
      return;
    }

    // 1. Check if user wrote "from" followed by partial account name
    const fromMatch = chatInput.match(/(?:^|\s)from\s+([a-zA-Z0-9\s]*)$/i);
    if (fromMatch) {
      const partial = fromMatch[1].toLowerCase();
      const accountSuggestions = accounts
        .filter(acc => acc.account_name.toLowerCase().includes(partial))
        .map(acc => ({ text: acc.account_name, type: 'account' as const }));
      setSuggestions(accountSuggestions);
      return;
    }

    // 2. Check if user wrote "for" or "on"
    const forMatch = chatInput.match(/(?:^|\s)(for|on)\s+([a-zA-Z0-9\s]*)$/i);
    if (forMatch) {
      const partial = forMatch[2].toLowerCase();
      // Find most used reasons (descriptions/categories) from expense transactions
      const expenseTx = transactions.filter(t => t.transaction_type === 'expense');
      
      const frequencies: Record<string, number> = {};
      expenseTx.forEach(t => {
        const desc = t.description || t.category;
        if (desc) {
          frequencies[desc] = (frequencies[desc] || 0) + 1;
        }
      });

      const sortedDescriptions = Object.keys(frequencies)
        .sort((a, b) => frequencies[b] - frequencies[a]);

      let filtered = sortedDescriptions.filter(desc => 
        desc.toLowerCase().includes(partial)
      );

      // Fallback/enrich with categories
      if (filtered.length < 5) {
        categories.forEach(cat => {
          const name = cat.name;
          if (name && !filtered.includes(name) && name.toLowerCase().includes(partial)) {
            filtered.push(name);
          }
        });
      }

      const reasonSuggestions = filtered.slice(0, 6).map(desc => ({
        text: desc,
        type: 'reason' as const
      }));
      setSuggestions(reasonSuggestions);
      return;
    }

    setSuggestions([]);
  }, [chatInput, accounts, transactions, categories]);

  const handleSelectSuggestion = (suggestionText: string, type: 'reason' | 'account') => {
    if (type === 'reason') {
      const regex = /(.*?\b(for|on)\s+)(.*)$/i;
      const match = chatInput.match(regex);
      if (match) {
        setChatInput(match[1] + suggestionText + " ");
      } else {
        setChatInput(chatInput + " " + suggestionText + " ");
      }
    } else if (type === 'account') {
      const regex = /(.*?\bfrom\s+)(.*)$/i;
      const match = chatInput.match(regex);
      if (match) {
        setChatInput(match[1] + suggestionText + " ");
      } else {
        setChatInput(chatInput + " " + suggestionText + " ");
      }
    }
  };

  // Auto-scroll chat message list to bottom
  useEffect(() => {
    if (showAIChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatStreamingText, isChatLoading, showAIChat]);

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

  const [hasFetchedAdvances, setHasFetchedAdvances] = useState(false);

  // Fetch all Credit Card advance balances where remaining_balance > 0
  useEffect(() => {
    const fetchAllAdvances = async () => {
      if (!user || accounts.length === 0 || hasFetchedAdvances) return;
      try {
        const creditCards = accounts.filter(a => a.account_type === 'credit_card');
        const advancesList = await Promise.all(
          creditCards.map(async (card) => {
            const balance = await creditCardStatementApi.getAdvanceBalance(card.id);
            return {
              creditCardId: card.id,
              accountName: card.account_name,
              balance: balance
            };
          })
        );
        setCreditCardAdvances(advancesList.filter(adv => adv.balance > 0));
        setHasFetchedAdvances(true);
      } catch (err) {
        console.error('Error fetching all CC advances:', err);
      }
    };
    fetchAllAdvances();
    // Reset flag if accounts change (e.g., new card added)
    return () => setHasFetchedAdvances(false);
  }, [user, accounts]);

  // When "Advance Balance" is selected as payment source, set advance consumed to amount
  useEffect(() => {
    if (formData.transaction_type === 'credit_card_repayment' && 
        formData.from_account_id?.startsWith('advance_balance') && 
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

  // Load budget info for each split category dynamically
  useEffect(() => {
    if (!user || formData.transaction_type !== 'expense' || !isSplitCategory) {
      setSplitBudgets({});
      return;
    }

    const loadSplitBudgets = async () => {
      const transactionDate = new Date(formData.transaction_date);
      const month = transactionDate.getMonth() + 1;
      const year = transactionDate.getFullYear();

      // Get unique selected split categories that we don't have budgets for yet
      const uniqueCategories = Array.from(new Set(
        splitCategories
          .map(s => s.category)
          .filter(cat => cat && !splitBudgets[cat])
      ));

      if (uniqueCategories.length === 0) return;

      const newBudgets = { ...splitBudgets };
      let updated = false;

      await Promise.all(uniqueCategories.map(async (cat) => {
        try {
          const info = await budgetApi.getCategoryBudgetInfo(user.id, cat, month, year);
          newBudgets[cat] = info;
          updated = true;
        } catch (error) {
          console.error(`Error loading budget info for split category ${cat}:`, error);
          newBudgets[cat] = null;
        }
      }));

      if (updated) {
        setSplitBudgets(newBudgets);
      }
    };

    loadSplitBudgets();
  }, [splitCategories, formData.transaction_date, user, formData.transaction_type, isSplitCategory]);

  // Reset split budgets when transaction date changes
  useEffect(() => {
    setSplitBudgets({});
  }, [formData.transaction_date]);

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
              } catch (error) {
                console.error("Error sourcing historical principal for edit:", error);
              }
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
      const [accountsData, categoriesData, transactionsData] = await Promise.all([
        accountApi.getAccounts(user.id),
        categoryApi.getCategories(user.id),
        transactionApi.getTransactions(user.id)
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);
      setTransactions(transactionsData);

      if (id) {
        const transaction = transactionsData.find(t => t.id === id);
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

          // Pre-populate category splits if they exist
          if (transaction.transaction_splits && transaction.transaction_splits.length > 0) {
            setIsSplitCategory(true);
            setSplitCategories(transaction.transaction_splits.map((s: any) => ({
              category: s.category,
              amount: s.amount.toString(),
              description: s.description || ''
            })));
          } else {
            setIsSplitCategory(false);
            setSplitCategories([{ category: '', amount: '', description: '' }]);
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

  const handleSendChatMessage = async (customCommand?: string) => {
    const text = customCommand !== undefined ? customCommand : chatInput;
    if (!text.trim()) return;

    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to record transactions and view your accounts.',
        variant: 'destructive',
      });
      return;
    }

    setChatInput('');
    setIsChatLoading(true);
    setChatStreamingText('Analyzing details...');
    setLastUpdatedFields([]);

    const userMessageId = Math.random().toString();
    setChatMessages(prev => [...prev, { id: userMessageId, role: 'user', content: text }]);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const history = chatMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      await parseSmartChatbotCommand(
        {
          command: text,
          accounts,
          categories,
          transactions,
          chatHistory: history,
          currentDate: today
        },
        (_chunk) => {
          setChatStreamingText('Processing transaction...');
        },
        (result: any) => {
          setIsChatLoading(false);
          setChatStreamingText('');

          const botResponse = result.reply || result.clarificationQuestion || "I've updated the transaction details for you!";
          const botMessageId = Math.random().toString();
          setChatMessages(prev => [
            ...prev,
            { id: botMessageId, role: 'model', content: botResponse }
          ]);

          // Apply extracted updates if the intent is transaction
          if (result.intent === 'transaction') {
            // Check for multi-transaction batch processing
            if (result.batchTransactions && result.batchTransactions.length > 1) {
              const defaultFromAcc = accounts.find(a => a.account_type === 'bank' || a.account_type === 'cash')?.id || accounts[0]?.id || null;
              const defaultToAcc = accounts.find(a => a.account_type === 'bank')?.id || accounts[0]?.id || null;

              const sanitizedBatch: BatchDraftItem[] = result.batchTransactions
                .filter((bt: any) => bt.transaction_type === 'income' || bt.transaction_type === 'expense')
                .map((bt: any) => {
                  const isInc = bt.transaction_type === 'income';
                  let accId = isInc ? (bt.to_account_id || defaultToAcc) : (bt.from_account_id || defaultFromAcc);
                  if (bt.account_name) {
                    const matchedAcc = accounts.find(a =>
                      a.account_name.toLowerCase().includes(bt.account_name.toLowerCase()) ||
                      bt.account_name.toLowerCase().includes(a.account_name.toLowerCase())
                    );
                    if (matchedAcc) accId = matchedAcc.id;
                  }

                  // Resolve Expense Category
                  let finalCat = bt.category;
                  if (!isInc && finalCat) {
                    const matchedCat = categories.find(c =>
                      c.name.toLowerCase() === finalCat.toLowerCase() ||
                      c.name.toLowerCase().includes(finalCat.toLowerCase())
                    );
                    finalCat = matchedCat ? matchedCat.name : finalCat;
                  } else if (!isInc && !finalCat) {
                    finalCat = categories[0]?.name || 'Others';
                  }

                  // Resolve Income Category
                  let finalIncCat = bt.income_category;
                  if (isInc && finalIncCat) {
                    const matchedInc = INCOME_CATEGORIES.find(ic =>
                      ic.key.toLowerCase() === finalIncCat.toLowerCase() ||
                      ic.name.toLowerCase() === finalIncCat.toLowerCase()
                    );
                    finalIncCat = matchedInc ? matchedInc.key : finalIncCat;
                  } else if (isInc && !finalIncCat) {
                    finalIncCat = 'others';
                  }

                  return {
                    transaction_type: isInc ? 'income' : 'expense',
                    amount: Number(bt.amount) || 0,
                    from_account_id: isInc ? null : accId,
                    to_account_id: isInc ? accId : null,
                    category: isInc ? null : finalCat,
                    income_category: isInc ? (finalIncCat as IncomeCategoryKey) : null,
                    description: bt.description?.trim() || (isInc ? getIncomeCategoryName((finalIncCat || 'others') as any) : (finalCat || 'Expense')),
                    transaction_date: bt.transaction_date || today,
                  };
                });

              if (sanitizedBatch.length > 1) {
                setBatchDrafts(sanitizedBatch);
                setBatchCurrentIndex(0);
                loadBatchItemIntoForm(sanitizedBatch[0]);

                const expCount = sanitizedBatch.filter(b => b.transaction_type === 'expense').length;
                const incCount = sanitizedBatch.filter(b => b.transaction_type === 'income').length;
                
                const batchNotice = `📋 I have prepared a batch of **${sanitizedBatch.length} transactions** (${expCount} expense${expCount !== 1 ? 's' : ''}, ${incCount} income).\n\n` +
                  `• **Transaction 1 of ${sanitizedBatch.length}** is currently loaded in the form for your review.\n` +
                  `• You can edit & save transactions one-by-one with **Save & Next**, or click **Submit & Post All (${sanitizedBatch.length}) Transactions** to post all at once!`;

                setChatMessages(prev => [
                  ...prev,
                  { id: Math.random().toString(), role: 'model', content: batchNotice }
                ]);

                toast({
                  title: 'Batch Mode Activated 📋',
                  description: `Loaded ${sanitizedBatch.length} transactions. Transaction #1 is ready in the form.`,
                });
                return;
              }
            }

            if (result.extractedInfo) {
              const ext = result.extractedInfo;
              const updates: any = {};
              const updatedNames: string[] = [];

            if (ext.transaction_type) {
              updates.transaction_type = ext.transaction_type;
              updatedNames.push('Transaction Type');
            }
            if (ext.amount !== undefined && ext.amount !== null && !isNaN(Number(ext.amount))) {
              updates.amount = ext.amount.toString();
              updatedNames.push('Amount');
            }

            // Resolve From Account: match by id or account name
            if (ext.from_account_id) {
              const matchedFrom = accounts.find(a => 
                a.id === ext.from_account_id || 
                a.account_name.toLowerCase() === ext.from_account_id.toLowerCase() ||
                a.account_name.toLowerCase().includes(ext.from_account_id.toLowerCase()) ||
                ext.from_account_id.toLowerCase().includes(a.account_name.toLowerCase())
              );
              if (matchedFrom) {
                updates.from_account_id = matchedFrom.id;
                updatedNames.push('From Account');
              }
            }

            // Resolve To Account: match by id or account name
            if (ext.to_account_id) {
              const matchedTo = accounts.find(a => 
                a.id === ext.to_account_id || 
                a.account_name.toLowerCase() === ext.to_account_id.toLowerCase() ||
                a.account_name.toLowerCase().includes(ext.to_account_id.toLowerCase()) ||
                ext.to_account_id.toLowerCase().includes(a.account_name.toLowerCase())
              );
              if (matchedTo) {
                updates.to_account_id = matchedTo.id;
                updatedNames.push('To Account');
              }
            }

            // Resolve Expense Category: case-insensitive match
            if (ext.category) {
              const matchedCat = categories.find(c => 
                c.name.toLowerCase() === ext.category.toLowerCase() ||
                c.name.toLowerCase().includes(ext.category.toLowerCase()) ||
                ext.category.toLowerCase().includes(c.name.toLowerCase())
              );
              updates.category = matchedCat ? matchedCat.name : ext.category;
              updatedNames.push('Category');
            }

            // Resolve Income Category
            if (ext.income_category) {
              const matchedInc = INCOME_CATEGORIES.find(ic => 
                ic.key.toLowerCase() === ext.income_category.toLowerCase() ||
                ic.name.toLowerCase() === ext.income_category.toLowerCase()
              );
              updates.income_category = matchedInc ? matchedInc.key : ext.income_category;
              updatedNames.push('Income Category');
            }

            if (ext.description) {
              updates.description = ext.description;
              updatedNames.push('Description');
            }
            if (ext.transaction_date) {
              updates.transaction_date = ext.transaction_date;
              updatedNames.push('Date');
            }
            if (ext.is_emi !== undefined && ext.is_emi !== null) {
              updates.is_emi = ext.is_emi;
              updatedNames.push('Is EMI');
            }
            if (ext.emi_months) {
              updates.emi_months = ext.emi_months.toString();
              updatedNames.push('EMI Months');
            }
            if (ext.bank_charges !== undefined && ext.bank_charges !== null) {
              updates.bank_charges = ext.bank_charges.toString();
              updatedNames.push('Bank Charges');
            }

            if (Object.keys(updates).length > 0) {
              setFormData(prev => ({ ...prev, ...updates }));
              setLastUpdatedFields(updatedNames);
              
              toast({
                title: 'Form Auto-Filled ✨',
                description: `Successfully set: ${updatedNames.join(', ')}`,
              });
            }
          }
        }
      },
        (error: string) => {
          setIsChatLoading(false);
          setChatStreamingText('');
          const errId = Math.random().toString();
          setChatMessages(prev => [
            ...prev,
            { id: errId, role: 'model', content: `Sorry, I encountered an error: ${error}` }
          ]);
        }
      );
    } catch (err: any) {
      setIsChatLoading(false);
      setChatStreamingText('');
      const errId = Math.random().toString();
      setChatMessages(prev => [
        ...prev,
        { id: errId, role: 'model', content: `Sorry, I encountered an error: ${err.message || err}` }
      ]);
    }
  };

  // Submit all batch transactions at once sequentially
  const handleSaveAllBatchTransactions = async () => {
    if (!user || batchDrafts.length === 0) return;

    // Validate all items: ensure amount, accounts, and non-blank categories
    for (let i = 0; i < batchDrafts.length; i++) {
      const item = batchDrafts[i];
      if (!item.amount || item.amount <= 0) {
        toast({
          title: 'Validation Error',
          description: `Transaction #${i + 1} has an invalid or missing amount.`,
          variant: 'destructive',
        });
        return;
      }
      if (item.transaction_type !== 'income' && item.transaction_type !== 'expense') {
        toast({
          title: 'Invalid Transaction Type',
          description: `Transaction #${i + 1} is '${item.transaction_type}'. Batch posting supports only Income or Expense.`,
          variant: 'destructive',
        });
        return;
      }
      if (item.transaction_type === 'expense') {
        if (!item.from_account_id) {
          toast({
            title: 'Missing Account',
            description: `Transaction #${i + 1} is missing a source account (Paid From).`,
            variant: 'destructive',
          });
          return;
        }
        if (!item.category || !item.category.trim()) {
          toast({
            title: 'Missing Category',
            description: `Transaction #${i + 1}: Expense category cannot remain blank.`,
            variant: 'destructive',
          });
          return;
        }
      }
      if (item.transaction_type === 'income') {
        if (!item.to_account_id) {
          toast({
            title: 'Missing Account',
            description: `Transaction #${i + 1} is missing a destination account (Received In).`,
            variant: 'destructive',
          });
          return;
        }
        if (!item.income_category || !item.income_category.trim()) {
          toast({
            title: 'Missing Category',
            description: `Transaction #${i + 1}: Income category cannot remain blank.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setIsBatchSaving(true);
    setLoading(true);
    const total = batchDrafts.length;
    const today = new Date().toISOString().slice(0, 10);

    try {
      for (let i = 0; i < total; i++) {
        const item = batchDrafts[i];
        const isInc = item.transaction_type === 'income';
        const payload: any = {
          user_id: user.id,
          transaction_type: item.transaction_type,
          from_account_id: isInc ? null : item.from_account_id,
          to_account_id: isInc ? item.to_account_id : null,
          amount: Number(item.amount),
          currency: 'INR',
          category: isInc ? null : (item.category || 'Others'),
          income_category: isInc ? (item.income_category || 'others') : null,
          description: item.description?.trim() || (isInc ? getIncomeCategoryName((item.income_category || 'others') as any) : (item.category || 'Expense')),
          transaction_date: item.transaction_date || today,
        };

        await transactionApi.createTransaction(payload);

        // Fetch updated account balance for all associated accounts
        const associatedIds = [item.from_account_id, item.to_account_id].filter(Boolean) as string[];
        const updatedAccounts = await Promise.all(
          associatedIds.map(async (accId) => {
            try {
              return await accountApi.getAccountById(accId);
            } catch {
              return null;
            }
          })
        );
        const validAccs = updatedAccounts.filter(Boolean) as Account[];

        const balanceReportLines = validAccs.map(acc => {
          const isFrom = acc.id === item.from_account_id;
          const role = isFrom ? 'Debited' : 'Credited';
          return `  • **${acc.account_name}** (${role}): **₹${Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}**`;
        }).join('\n');

        const catDisplay = isInc
          ? (item.income_category ? getIncomeCategoryName(item.income_category as any) : 'Income')
          : (item.category || 'Expense');

        const successMsg = `✅ **Transaction ${i + 1} of ${total} posted successfully!**\n- Amount: ₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${item.transaction_type === 'income' ? 'Income' : 'Expense'} - ${catDisplay})\n- **Post-Posting Account Balances:**\n${balanceReportLines || '  • N/A'}`;

        setChatMessages(prev => [
          ...prev,
          { id: Math.random().toString(), role: 'model', content: successMsg }
        ]);
      }

      toast({
        title: 'Batch Posting Completed! 🎉',
        description: `Successfully posted ${total} of ${total} transactions. All account balances updated.`,
        variant: 'default',
      });

      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model',
          content: `🎉 **All ${total} of ${total} transactions have been accepted and posted.** All account balances have been updated!`
        }
      ]);

      setBatchDrafts([]);
      setBatchCurrentIndex(0);
      cache.clearPattern('dashboard-');
      navigate('/transactions');
    } catch (err: any) {
      console.error('Batch save error:', err);
      toast({
        title: 'Batch Posting Failed',
        description: err.message || 'Error occurred while saving batch transactions',
        variant: 'destructive',
      });
    } finally {
      setIsBatchSaving(false);
      setLoading(false);
    }
  };

  const handleResetForNewTransaction = async () => {
    setIsPostPostingModalOpen(false);
    setPostPostingSummary(null);
    setFormData({
      transaction_type: 'expense',
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
    setIsSplitCategory(false);
    setSplitCategories([{ category: '', amount: '', description: '' }]);
    setIsSplitRepayment(false);
    setSplitSources([]);
    setCalculatedEMI(null);
    setLoanBreakdown(null);
    setExistingEMI(null);
    setCreditLimitWarning(null);
    setStatementInfo(null);
    if (id) {
      navigate('/transactions/new');
    } else if (user) {
      try {
        const freshAccs = await accountApi.getAccounts(user.id);
        setAccounts(freshAccs);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resolvePostPostingAccountBalances = async (prevAccountsMap: Map<string, Account>) => {
    // Determine all associated accounts
    const associatedItems: { id: string; roleLabel: string }[] = [];

    if (formData.transaction_type === 'expense') {
      if (formData.from_account_id && !formData.from_account_id.startsWith('advance_balance')) {
        associatedItems.push({ id: formData.from_account_id, roleLabel: 'Debited (Paid From)' });
      }
    } else if (formData.transaction_type === 'income') {
      if (formData.to_account_id) {
        associatedItems.push({ id: formData.to_account_id, roleLabel: 'Credited (Received In)' });
      }
    } else if (formData.transaction_type === 'transfer') {
      if (formData.from_account_id) {
        associatedItems.push({ id: formData.from_account_id, roleLabel: 'Transferred From (Debited)' });
      }
      if (formData.to_account_id) {
        associatedItems.push({ id: formData.to_account_id, roleLabel: 'Transferred To (Credited)' });
      }
    } else if (formData.transaction_type === 'withdrawal') {
      if (formData.from_account_id) {
        associatedItems.push({ id: formData.from_account_id, roleLabel: 'Source Account (Debited)' });
      }
      if (formData.to_account_id) {
        associatedItems.push({ id: formData.to_account_id, roleLabel: 'Cash Account (Credited)' });
      }
    } else if (formData.transaction_type === 'loan_payment') {
      if (formData.from_account_id) {
        associatedItems.push({ id: formData.from_account_id, roleLabel: 'Payment Account (Debited)' });
      }
      if (formData.to_account_id) {
        associatedItems.push({ id: formData.to_account_id, roleLabel: 'Loan Account (Principal Reduced)' });
      }
    } else if (formData.transaction_type === 'credit_card_repayment') {
      if (isSplitRepayment) {
        splitSources.forEach(s => {
          if (s.accountId && !s.accountId.startsWith('advance_balance')) {
            associatedItems.push({
              id: s.accountId,
              roleLabel: `Repayment Source (${formatCurrency(parseFloat(s.amount) || 0, formData.currency)})`
            });
          }
        });
      } else if (formData.from_account_id && !formData.from_account_id.startsWith('advance_balance')) {
        associatedItems.push({ id: formData.from_account_id, roleLabel: 'Payment Account (Debited)' });
      }
      if (formData.to_account_id) {
        associatedItems.push({ id: formData.to_account_id, roleLabel: 'Credit Card (Debt Repaid)' });
      }
    }

    // If update and account changed, include original account
    if (id && originalAccountId && originalAccountId !== formData.from_account_id && !originalAccountId.startsWith('advance_balance')) {
      associatedItems.push({ id: originalAccountId, roleLabel: 'Previous Account (Reverted)' });
    }

    const postAccounts: PostPostingAccountDetail[] = [];
    const seenIds = new Set<string>();
    for (const item of associatedItems) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      try {
        const updated = await accountApi.getAccountById(item.id);
        if (updated) {
          const prev = prevAccountsMap.get(item.id);
          const prevBal = prev ? Number(prev.balance) : undefined;
          const newBal = Number(updated.balance);
          const change = prevBal !== undefined ? newBal - prevBal : undefined;
          postAccounts.push({
            id: updated.id,
            name: updated.account_name,
            type: updated.account_type,
            institution_name: updated.institution_name,
            roleLabel: item.roleLabel,
            previousBalance: prevBal,
            postBalance: newBal,
            currency: updated.currency || formData.currency,
            credit_limit: updated.credit_limit,
            changeAmount: change
          });
        }
      } catch (e) {
        console.error('Failed to fetch updated account balance:', e);
      }
    }

    try {
      if (user) {
        const freshAccs = await accountApi.getAccounts(user.id);
        setAccounts(freshAccs);
      }
    } catch (e) {
      console.error(e);
    }

    const summary: PostPostingSummary = {
      isEdit: !!id,
      transaction_type: formData.transaction_type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      category: formData.category || undefined,
      income_category: formData.income_category || undefined,
      description: formData.description || undefined,
      transaction_date: formData.transaction_date,
      accounts: postAccounts
    };

    setPostPostingSummary(summary);
    setIsPostPostingModalOpen(true);

    const toastBalances = postAccounts
      .map(a => `${a.name}: ${formatCurrency(a.postBalance, a.currency)}`)
      .join(' • ');

    toast({
      title: id ? 'Transaction Updated Successfully! 🎉' : 'Transaction Posted Successfully! 🎉',
      description: toastBalances ? `Balances after posting: ${toastBalances}` : (id ? 'Transaction updated successfully' : 'Transaction created successfully'),
    });

    return summary;
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

    if (formData.transaction_type === 'income' && !formData.income_category) {
      toast({
        title: 'Error',
        description: 'Please select an income category. Income category cannot remain blank.',
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

    if (formData.transaction_type === 'expense' && !isSplitCategory && !formData.category) {
      toast({
        title: 'Error',
        description: 'Please select an expense category. Expense category cannot remain blank.',
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

    if (formData.transaction_type === 'credit_card_repayment') {
      if (!formData.to_account_id) {
        toast({
          title: 'Error',
          description: 'Please select a credit card account',
          variant: 'destructive',
        });
        return;
      }

      if (isSplitRepayment) {
        if (splitSources.length === 0) {
          toast({
            title: 'Error',
            description: 'Please add at least one source account',
            variant: 'destructive',
          });
          return;
        }

        const uniqueAccounts = new Set<string>();
        for (const source of splitSources) {
          if (!source.accountId) {
            toast({
              title: 'Error',
              description: 'Please select an account for all sourcing rows',
              variant: 'destructive',
            });
            return;
          }
          if (uniqueAccounts.has(source.accountId)) {
            toast({
              title: 'Error',
              description: 'Sourcing accounts must be unique. Please remove duplicate rows.',
              variant: 'destructive',
            });
            return;
          }
          uniqueAccounts.add(source.accountId);

          const sourceAmt = parseFloat(source.amount);
          if (isNaN(sourceAmt) || sourceAmt <= 0) {
            toast({
              title: 'Error',
              description: 'Sourced amounts must be greater than zero',
              variant: 'destructive',
            });
            return;
          }
        }

        const sourcedSum = splitSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        const requiredAmt = parseFloat(formData.amount);
        if (isNaN(requiredAmt) || requiredAmt <= 0) {
          toast({
            title: 'Error',
            description: 'Please enter a valid repayment amount',
            variant: 'destructive',
          });
          return;
        }

        if (Math.abs(sourcedSum - requiredAmt) > 0.01) {
          toast({
            title: 'Error',
            description: `The total sourced amount (${formatCurrency(sourcedSum, formData.currency)}) must match the repayment amount (${formatCurrency(requiredAmt, formData.currency)})`,
            variant: 'destructive',
          });
          return;
        }
      } else {
        if (!formData.from_account_id) {
          toast({
            title: 'Error',
            description: 'Please select a payment source account',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // If using advance balance, validate amount doesn't exceed available advance
    const isUsingAdvanceBalance = !isSplitRepayment && formData.from_account_id?.startsWith('advance_balance');
    if (isUsingAdvanceBalance) {
      const activeAdvanceBalance = formData.from_account_id === 'advance_balance'
        ? ccAdvanceBalance
        : creditCardAdvances.find(adv => adv.creditCardId === formData.from_account_id.replace('advance_balance_', ''))?.balance || 0;
      
      if (parseFloat(formData.amount) > activeAdvanceBalance) {
        toast({
          title: 'Error',
          description: `Amount exceeds available advance balance of ${formatCurrency(activeAdvanceBalance, formData.currency)}`,
          variant: 'destructive',
        });
        return;
      }
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

    // Validate Category Splits if selected for Expense transactions
    if (formData.transaction_type === 'expense' && isSplitCategory) {
      if (splitCategories.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one category split',
          variant: 'destructive',
        });
        return;
      }

      const uniqueCategories = new Set<string>();
      for (const split of splitCategories) {
        if (!split.category) {
          toast({
            title: 'Error',
            description: 'Please select a category for all split rows',
            variant: 'destructive',
          });
          return;
        }
        if (uniqueCategories.has(split.category)) {
          toast({
            title: 'Error',
            description: 'Split categories must be unique. Please remove duplicate rows.',
            variant: 'destructive',
          });
          return;
        }
        uniqueCategories.add(split.category);

        const splitAmt = parseFloat(split.amount);
        if (isNaN(splitAmt) || splitAmt <= 0) {
          toast({
            title: 'Error',
            description: 'Split amounts must be greater than zero',
            variant: 'destructive',
          });
          return;
        }
      }

      const splitsSum = splitCategories.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      const transactionAmt = parseFloat(formData.amount);

      if (Math.abs(splitsSum - transactionAmt) > 0.01) {
        toast({
          title: 'Error',
          description: `The total split categories amount (${formatCurrency(splitsSum, formData.currency)}) must match the transaction amount (${formatCurrency(transactionAmt, formData.currency)})`,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    const prevAccountsMap = new Map<string, Account>();
    accounts.forEach(a => prevAccountsMap.set(a.id, a));

    try {
      const transactionData: any = {
        user_id: user.id,
        transaction_type: formData.transaction_type,
        from_account_id: formData.from_account_id?.startsWith('advance_balance') ? null : (formData.from_account_id || null),
        to_account_id: formData.to_account_id || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: (formData.transaction_type === 'expense' && isSplitCategory) ? 'Split' : (formData.category || null),
        income_category: formData.income_category || null,
        description: formData.description || null,
        transaction_date: formData.transaction_date,
        transaction_splits: (formData.transaction_type === 'expense' && isSplitCategory) ? splitCategories : undefined,
      };


      if (id) {
        const transactionId = id as string;
        await transactionApi.updateTransaction(transactionId, {
          ...transactionData,
          loan_components: formData.transaction_type === 'loan_payment' ? loanBreakdown : undefined
        });

        // Handle EMI update
        if (formData.is_emi) {
          const purchaseAmount = parseFloat(formData.amount);
          const bankCharges = parseFloat(formData.bank_charges);
          const emiMonths = parseInt(formData.emi_months);
          const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bankCharges, emiMonths);
          const totalAmount = purchaseAmount + bankCharges;

          const account = accounts.find((a: any) => a.id === formData.from_account_id);
          const statementDay = account ? account.statement_day : null;

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
            next_due_date: existingEMI && existingEMI.start_date === formData.transaction_date
              ? existingEMI.next_due_date
              : (() => {
                  const firstDue = calculateFirstEMIDueDate(formData.transaction_date, statementDay);
                  const paid = emiMonths - (existingEMI ? existingEMI.remaining_installments : emiMonths);
                  const newDue = new Date(firstDue);
                  newDue.setMonth(newDue.getMonth() + paid);
                  if (statementDay) {
                    const lastDay = new Date(newDue.getFullYear(), newDue.getMonth() + 1, 0).getDate();
                    newDue.setDate(Math.min(statementDay, lastDay));
                  }
                  return newDue.toISOString().split('T')[0];
                })(),
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


        // Handle Credit Card Repayment update
        if (formData.transaction_type === 'credit_card_repayment' && formData.to_account_id) {
          try {
            // Revert step is handled by api.ts inside updateTransaction automatically.
            await creditCardStatementApi.deleteAllocations(transactionId);

            // Apply new allocations
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
                        amount: (alloc as any).amount_paid !== undefined ? (alloc as any).amount_paid : (alloc as any).allocated_amount,
                        transaction_date: emi.next_due_date <= formData.transaction_date ? emi.next_due_date : formData.transaction_date,
                        statement_month: statementMonth,
                        status: 'pending',
                        emi_id: emi.id
                      });
                      lineId = newLine.id;
                    }
                  } catch (err) {
                    console.error('Error creating statement line for EMI:', err);
                  }
                }

                mappedAllocations.push({
                  line_id: lineId,
                  amount: (alloc as any).amount_paid !== undefined ? (alloc as any).amount_paid : (alloc as any).allocated_amount,
                  emi_id: alloc.emi_id
                });
              }

              await creditCardStatementApi.allocateRepayment(transactionId, mappedAllocations);

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
              const consumeCardId = formData.from_account_id === 'advance_balance'
                ? (formData.to_account_id as string)
                : formData.from_account_id.replace('advance_balance_', '');

              await creditCardStatementApi.consumeAdvanceBalance(
                user.id,
                consumeCardId,
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
        let created: any = null;

        if (formData.transaction_type === 'credit_card_repayment' && isSplitRepayment) {
          const createdTransactions = [];
          const advanceSourcesToConsume: { creditCardId: string; amount: number }[] = [];

          for (const source of splitSources) {
            const isAdvanceSrc = source.accountId.startsWith('advance_balance_');
            const advanceCreditCardId = isAdvanceSrc ? source.accountId.replace('advance_balance_', '') : null;

            const createdTx = await transactionApi.createTransaction({
              user_id: user.id,
              transaction_type: 'credit_card_repayment',
              from_account_id: isAdvanceSrc ? null : source.accountId,
              to_account_id: formData.to_account_id,
              amount: parseFloat(source.amount),
              currency: formData.currency,
              category: formData.category || null,
              income_category: (formData.income_category as any) || null,
              description: formData.description 
                ? `${formData.description} (Split repayment${isAdvanceSrc ? ' - from advance' : ''})`
                : `Credit card split repayment (${formatCurrency(parseFloat(source.amount), formData.currency)}${isAdvanceSrc ? ' - from advance balance' : ''})`,
              transaction_date: formData.transaction_date,
            });
            if (createdTx) {
              createdTransactions.push({ id: createdTx.id, amount: parseFloat(source.amount) });
              if (isAdvanceSrc && advanceCreditCardId) {
                advanceSourcesToConsume.push({ creditCardId: advanceCreditCardId, amount: parseFloat(source.amount) });
              }
            }
          }

          if (createdTransactions.length > 0) {
            // Assign created to first split transaction to prevent downstream errors
            created = createdTransactions[0];

            if (ccAllocations.length > 0) {
              const resolvedAllocations = [];
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
                        status: 'pending',
                        emi_id: emi.id
                      });
                      lineId = newLine.id;
                    }
                  } catch (err) {
                    console.error('Error creating statement line for EMI:', err);
                    continue;
                  }
                }

                resolvedAllocations.push({
                  line_id: lineId,
                  amount_remaining: alloc.amount_paid,
                  emi_id: alloc.emi_id
                });
              }

              let allocationIdx = 0;
              const processedEMIs = new Set<string>();
              for (const tx of createdTransactions) {
                let txSourcedAmountRemaining = tx.amount;
                const txAllocations = [];

                while (txSourcedAmountRemaining > 0 && allocationIdx < resolvedAllocations.length) {
                  const currentAlloc = resolvedAllocations[allocationIdx];
                  if (currentAlloc.amount_remaining <= 0) {
                    allocationIdx++;
                    continue;
                  }
                  const amountToAllocate = Math.min(txSourcedAmountRemaining, currentAlloc.amount_remaining);
                  txAllocations.push({
                    line_id: currentAlloc.line_id,
                    amount: amountToAllocate,
                    emi_id: currentAlloc.emi_id
                  });
                  currentAlloc.amount_remaining -= amountToAllocate;
                  txSourcedAmountRemaining -= amountToAllocate;
                  if (currentAlloc.amount_remaining <= 0.001) {
                    allocationIdx++;
                  }
                }

                if (txAllocations.length > 0) {
                  await creditCardStatementApi.allocateRepayment(tx.id, txAllocations);
                  for (const allocation of txAllocations) {
                    await creditCardStatementApi.updateStatementLineStatus(
                      allocation.line_id,
                      'paid',
                      allocation.amount
                    );

                    if (allocation.emi_id && !processedEMIs.has(allocation.emi_id)) {
                      processedEMIs.add(allocation.emi_id);
                      try {
                        await emiApi.payEMIInstallment(allocation.emi_id);
                      } catch (err) {
                        console.error('Error updating EMI installment:', err);
                      }
                    }
                  }
                }
              }
            }

            // Associate advance payment with the last split transaction
            const lastTx = createdTransactions[createdTransactions.length - 1];
            if (ccAdvanceCreated > 0 && lastTx) {
              await creditCardStatementApi.createAdvancePayment(
                user.id,
                formData.to_account_id as string,
                ccAdvanceCreated,
                formData.currency,
                `Advance payment from transaction ${lastTx.id}`,
                lastTx.id
              );
            }

            if (ccAdvanceUsed > 0) {
              const consumeCardId = formData.from_account_id === 'advance_balance'
                ? (formData.to_account_id as string)
                : formData.from_account_id.replace('advance_balance_', '');

              await creditCardStatementApi.consumeAdvanceBalance(
                user.id,
                consumeCardId,
                ccAdvanceUsed
              );
            }

            // Consume advance balances from split sources
            for (const advSrc of advanceSourcesToConsume) {
              await creditCardStatementApi.consumeAdvanceBalance(
                user.id,
                advSrc.creditCardId,
                advSrc.amount
              );
            }

            toast({
              title: 'Success',
              description: `Split repayment created successfully across ${splitSources.length} accounts`,
            });
          }
        } else {
          // Standard Single Account Creation
          created = await transactionApi.createTransaction({
            ...transactionData,
            loan_components: formData.transaction_type === 'loan_payment' ? loanBreakdown : undefined
          });

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
                const consumeCardId = formData.from_account_id === 'advance_balance'
                  ? (formData.to_account_id as string)
                  : formData.from_account_id.replace('advance_balance_', '');

                await creditCardStatementApi.consumeAdvanceBalance(
                  user.id,
                  consumeCardId,
                  ccAdvanceUsed
                );
              }
            } catch (error) {
              console.error('Error processing CC repayment:', error);
            }
          }
        }


        if (formData.is_emi && created) {
          const purchaseAmount = parseFloat(formData.amount);
          const bank_charges = parseFloat(formData.bank_charges);
          const emiMonths = parseInt(formData.emi_months);
          const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bank_charges, emiMonths);
          const totalAmount = purchaseAmount + bank_charges;

          const account = accounts.find((a: any) => a.id === formData.from_account_id);
          const statementDay = account ? account.statement_day : null;

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
            next_due_date: calculateFirstEMIDueDate(formData.transaction_date, statementDay),
            description: formData.description || `EMI for ${formData.category || 'purchase'}`,
            status: 'active' as const,
          });
        }

        // --- BATCH TRANSACTION QUEUE HANDLING ---
        if (batchDrafts.length > 0 && batchCurrentIndex < batchDrafts.length - 1) {
          const accIds = [formData.from_account_id, formData.to_account_id].filter(Boolean) as string[];
          const updatedAccounts = await Promise.all(
            accIds.map(async (accId) => {
              try {
                return await accountApi.getAccountById(accId);
              } catch {
                return null;
              }
            })
          );
          const validAccs = updatedAccounts.filter(Boolean) as Account[];
          const balanceReportLines = validAccs.map(acc => {
            const isFrom = acc.id === formData.from_account_id;
            const role = isFrom ? 'Debited' : 'Credited';
            return `  • **${acc.account_name}** (${role}): **₹${Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}**`;
          }).join('\n');

          const catDisplay = formData.transaction_type === 'income'
            ? (formData.income_category ? getIncomeCategoryName(formData.income_category as any) : 'Income')
            : (formData.category || 'Expense');

          const progressMsg = `✅ **Transaction ${batchCurrentIndex + 1} of ${batchDrafts.length} posted successfully!**\n- Amount: ₹${Number(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${formData.transaction_type} - ${catDisplay})\n- **Post-Posting Account Balances:**\n${balanceReportLines || '  • N/A'}`;

          setChatMessages(prev => [
            ...prev,
            { id: Math.random().toString(), role: 'model', content: progressMsg }
          ]);

          const nextIdx = batchCurrentIndex + 1;
          setBatchCurrentIndex(nextIdx);
          loadBatchItemIntoForm(batchDrafts[nextIdx]);

          const balSummary = validAccs.map(a => `${a.account_name}: ₹${Number(a.balance).toLocaleString('en-IN')}`).join(' • ');
          toast({
            title: `Transaction ${batchCurrentIndex + 1} of ${batchDrafts.length} Saved!`,
            description: balSummary ? `Post-posting Balances: ${balSummary}` : `Loaded Transaction ${nextIdx + 1} of ${batchDrafts.length} for review.`,
          });

          cache.clearPattern('dashboard-');
          try {
            const accs = await accountApi.getAccounts(user.id);
            setAccounts(accs);
          } catch (e) {
            console.error(e);
          }

          // Do NOT navigate away to transactions page! Keep user on form for remaining batch items
          setLoading(false);
          return;
        } else if (batchDrafts.length > 0 && batchCurrentIndex === batchDrafts.length - 1) {
          const accIds = [formData.from_account_id, formData.to_account_id].filter(Boolean) as string[];
          const updatedAccounts = await Promise.all(
            accIds.map(async (accId) => {
              try {
                return await accountApi.getAccountById(accId);
              } catch {
                return null;
              }
            })
          );
          const validAccs = updatedAccounts.filter(Boolean) as Account[];
          const balanceReportLines = validAccs.map(acc => {
            const isFrom = acc.id === formData.from_account_id;
            const role = isFrom ? 'Debited' : 'Credited';
            return `  • **${acc.account_name}** (${role}): **₹${Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}**`;
          }).join('\n');

          const catDisplay = formData.transaction_type === 'income'
            ? (formData.income_category ? getIncomeCategoryName(formData.income_category as any) : 'Income')
            : (formData.category || 'Expense');

          const progressMsg = `✅ **Transaction ${batchDrafts.length} of ${batchDrafts.length} posted successfully!**\n- Amount: ₹${Number(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${formData.transaction_type} - ${catDisplay})\n- **Post-Posting Account Balances:**\n${balanceReportLines || '  • N/A'}\n\n🎉 **All ${batchDrafts.length} of ${batchDrafts.length} batch transactions have been accepted and posted.** All account balances have been updated!`;

          setChatMessages(prev => [
            ...prev,
            { id: Math.random().toString(), role: 'model', content: progressMsg }
          ]);

          setBatchDrafts([]);
          setBatchCurrentIndex(0);
        }
      }

      cache.clearPattern('dashboard-');
      await resolvePostPostingAccountBalances(prevAccountsMap);
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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAIChat(!showAIChat)}
          className={`shadow-md transition-all gap-1.5 ${showAIChat ? 'bg-primary text-white hover:bg-primary/95 border-primary font-medium' : 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/40 font-medium'}`}
        >
          <Sparkles className={`h-4 w-4 ${showAIChat ? 'animate-pulse text-white' : 'text-purple-600 dark:text-purple-400'}`} />
          {showAIChat ? 'Hide AI Guide' : 'Ask AI Assistant ✨'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={showAIChat ? 'lg:col-span-7 w-full' : 'lg:col-span-12 max-w-2xl mx-auto w-full'}>
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{id ? 'Edit Transaction' : 'Add New Transaction'}</span>
                {!showAIChat && (
                  <span className="text-xs text-muted-foreground font-normal italic flex items-center gap-1">
                    AI Assistant available in header ✨
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Batch Transaction Mode Banner */}
              {batchDrafts.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 dark:bg-teal-950/30 shadow-md animate-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">
                        #{batchCurrentIndex + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          Batch Mode: Transaction {batchCurrentIndex + 1} of {batchDrafts.length}
                          <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-400 bg-teal-500/10">
                            {batchDrafts.length} Items Total
                          </Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Reviewing details for transaction #{batchCurrentIndex + 1}. You can save step-by-step or post all at once.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-md shadow-emerald-950/20 gap-1.5"
                        onClick={handleSaveAllBatchTransactions}
                        disabled={isBatchSaving || loading}
                      >
                        {isBatchSaving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            Posting {batchDrafts.length} Transactions...
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 text-white" />
                            Submit & Post All ({batchDrafts.length}) Transactions
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/20"
                        onClick={() => {
                          setBatchDrafts([]);
                          setBatchCurrentIndex(0);
                          toast({ title: 'Batch Cancelled', description: 'Returned to standard single transaction form.' });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Discard Batch
                      </Button>
                    </div>
                  </div>

                  {/* Batch items navigation pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-teal-500/20">
                    {batchDrafts.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectBatchItem(idx)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          idx === batchCurrentIndex
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                            : idx < batchCurrentIndex
                              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                              : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        <span>#{idx + 1}</span>
                        <span className="font-semibold">₹{Number(item.amount || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] opacity-80 capitalize">({item.category || item.income_category || item.transaction_type})</span>
                        {idx < batchCurrentIndex && <Check className="h-3 w-3 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  {formData.transaction_type === 'credit_card_repayment' && (
                    <div className="flex items-center space-x-2 pb-1">
                      <Checkbox
                        id="is_split_repayment"
                        checked={isSplitRepayment}
                        onCheckedChange={(checked) => {
                          const flag = checked as boolean;
                          setIsSplitRepayment(flag);
                          if (flag) {
                            const currentSource = formData.from_account_id && formData.from_account_id !== 'advance_balance' 
                              ? [{ accountId: formData.from_account_id, amount: formData.amount || '0' }]
                              : [{ accountId: '', amount: '' }];
                            setSplitSources(currentSource);
                          } else {
                            if (splitSources.length > 0 && splitSources[0].accountId) {
                              setFormData(prev => ({ ...prev, from_account_id: splitSources[0].accountId }));
                            }
                          }
                        }}
                      />
                      <Label htmlFor="is_split_repayment" className="cursor-pointer text-sm font-semibold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                        Sourcing from Multiple Accounts
                      </Label>
                    </div>
                  )}

                  {!isSplitRepayment ? (
                    <>
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
                                ...creditCardAdvances.map(adv => (
                                  <SelectItem key={`advance_balance_${adv.creditCardId}`} value={`advance_balance_${adv.creditCardId}`}>
                                    CC Advance: {adv.accountName} ({formatCurrency(adv.balance, formData.currency)})
                                  </SelectItem>
                                ))
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
                        const isAdvance = formData.from_account_id.startsWith('advance_balance');
                        if (isAdvance) {
                          const activeAdvanceBalance = formData.from_account_id === 'advance_balance'
                            ? ccAdvanceBalance
                            : creditCardAdvances.find(adv => adv.creditCardId === formData.from_account_id.replace('advance_balance_', ''))?.balance || 0;
                          
                          return (
                            <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Available CC Advance</span>
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(activeAdvanceBalance, formData.currency)}
                                </span>
                              </div>
                            </div>
                          );
                        }

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

                      {/* Display warning box if balance is insufficient */}
                      {formData.transaction_type === 'credit_card_repayment' && formData.from_account_id && formData.from_account_id !== 'advance_balance' && (() => {
                        const selectedAccount = accounts.find((a: Account) => a.id === formData.from_account_id);
                        const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
                        const reqAmount = parseFloat(formData.amount) || 0;
                        const hasInsufficientFunds = selectedAccount && selectedAccount.account_type !== 'credit_card' && balance < reqAmount;

                        if (hasInsufficientFunds) {
                          return (
                            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mt-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />
                              <AlertDescription className="text-amber-900 dark:text-amber-200">
                                <div className="flex flex-col gap-2">
                                  <span className="font-semibold text-sm">⚠️ Insufficient Funds</span>
                                  <span className="text-xs">
                                    Selected account balance ({formatCurrency(balance, selectedAccount.currency)}) is insufficient for this repayment amount ({formatCurrency(reqAmount, formData.currency)}).
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-fit border-amber-500 text-amber-900 hover:bg-amber-100 bg-white"
                                    onClick={() => {
                                      setIsSplitRepayment(true);
                                      const initialSources = [
                                        { accountId: formData.from_account_id, amount: Math.max(0, balance).toString() },
                                        { accountId: '', amount: Math.max(0, reqAmount - Math.max(0, balance)).toString() }
                                      ];
                                      setSplitSources(initialSources);
                                    }}
                                  >
                                    Split Repayment Across Multiple Accounts
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-purple-900 dark:text-purple-300">Sourcing Accounts Breakdown</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 flex items-center gap-1 h-8"
                          onClick={() => setSplitSources([...splitSources, { accountId: '', amount: '' }])}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Source
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {splitSources.map((source, index) => {
                          const isAdvanceSource = source.accountId.startsWith('advance_balance_');
                          const advanceSource = isAdvanceSource
                            ? creditCardAdvances.find(adv => `advance_balance_${adv.creditCardId}` === source.accountId)
                            : null;
                          const sourceAccount = !isAdvanceSource ? accounts.find(a => a.id === source.accountId) : null;
                          const sourceBalance = isAdvanceSource
                            ? (advanceSource?.balance || 0)
                            : (sourceAccount ? Number(sourceAccount.balance) : 0);
                          const sourceAmount = parseFloat(source.amount) || 0;
                          const isSourceInsufficient = (sourceAccount || advanceSource) && sourceBalance < sourceAmount;

                          return (
                            <div key={index} className="flex gap-2 items-start bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-purple-100 dark:border-purple-950/30">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Source Account {index + 1} *</Label>
                                <Select
                                  value={source.accountId}
                                  onValueChange={(val) => {
                                    const updated = [...splitSources];
                                    updated[index].accountId = val;
                                    setSplitSources(updated);
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {accounts.filter(a => a.account_type === 'bank' || a.account_type === 'cash').map(account => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.account_name} ({formatCurrency(account.balance, account.currency)})
                                      </SelectItem>
                                    ))}
                                    {creditCardAdvances.map(adv => (
                                      <SelectItem key={`advance_balance_${adv.creditCardId}`} value={`advance_balance_${adv.creditCardId}`}>
                                        CC Advance: {adv.accountName} ({formatCurrency(adv.balance, formData.currency)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {(sourceAccount || advanceSource) && (
                                  <div className="flex justify-between items-center text-[10px] px-1 pt-0.5">
                                    <span className="text-muted-foreground">
                                      {isAdvanceSource ? 'Advance ' : ''}Balance: {formatCurrency(sourceBalance, isAdvanceSource ? formData.currency : (sourceAccount?.currency || formData.currency))}
                                    </span>
                                    {isSourceInsufficient && (
                                      <span className="text-destructive font-medium">⚠️ {isAdvanceSource ? 'Exceeds advance balance' : 'Insufficient funds'}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="w-[130px] space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Sourced Amount *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-9"
                                  value={source.amount}
                                  onChange={(e) => {
                                    const updated = [...splitSources];
                                    updated[index].amount = e.target.value;
                                    setSplitSources(updated);
                                  }}
                                  placeholder="0.00"
                                />
                              </div>

                              {splitSources.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 mt-5 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const updated = splitSources.filter((_, i) => i !== index);
                                    setSplitSources(updated);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Live sum breakdown */}
                      {(() => {
                        const requiredTotal = parseFloat(formData.amount) || 0;
                        const sourcedTotal = splitSources.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                        const remaining = requiredTotal - sourcedTotal;

                        return (
                          <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-950/30 flex items-center justify-between text-xs font-semibold">
                            <div className="flex gap-4">
                              <span className="text-muted-foreground">Total Required: <strong className="text-foreground">{formatCurrency(requiredTotal, formData.currency)}</strong></span>
                              <span className="text-muted-foreground">Total Sourced: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(sourcedTotal, formData.currency)}</strong></span>
                            </div>
                            {Math.abs(remaining) > 0.01 ? (
                              <span className={remaining > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-destructive'}>
                                {remaining > 0 ? `Shortfall: ${formatCurrency(remaining, formData.currency)}` : `Excess: ${formatCurrency(Math.abs(remaining), formData.currency)}`}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                ✓ Sourced Fully Matching
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">
                    {formData.transaction_type === 'income' ? 'Income Category' : 'Expense Category'}
                  </Label>
                  {formData.transaction_type === 'expense' && (
                    <div className="flex items-center space-x-2 pb-1">
                      <Checkbox
                        id="is_split_category"
                        checked={isSplitCategory}
                        onCheckedChange={(checked) => {
                          const flag = checked as boolean;
                          setIsSplitCategory(flag);
                          if (flag) {
                            // Initialize split rows with partial amounts
                            if (splitCategories.length <= 1 && !splitCategories[0].category) {
                              const transAmt = parseFloat(formData.amount) || 0;
                              setSplitCategories([
                                { category: formData.category, amount: (transAmt / 2 || '').toString(), description: '' },
                                { category: '', amount: (transAmt / 2 || '').toString(), description: '' }
                              ]);
                            }
                          } else {
                            if (splitCategories.length > 0 && splitCategories[0].category) {
                              setFormData(prev => ({ ...prev, category: splitCategories[0].category }));
                            }
                          }
                        }}
                      />
                      <Label htmlFor="is_split_category" className="cursor-pointer text-xs font-semibold flex items-center gap-1 text-purple-800 dark:text-purple-300">
                        Split across Multiple Categories
                      </Label>
                    </div>
                  )}
                </div>

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
                ) : formData.transaction_type === 'loan_payment' ? (
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
                ) : !isSplitCategory ? (
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
                ) : (
                  // Category Splits Breakdown rows
                  <div className="space-y-3 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-purple-900 dark:text-purple-300">Category Splits Breakdown</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 flex items-center gap-1 h-8 text-[11px]"
                        onClick={() => setSplitCategories([...splitCategories, { category: '', amount: '', description: '' }])}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Category
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {splitCategories.map((split, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-purple-100 dark:border-purple-950/30">
                          <div className="flex-1 w-full space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Category {index + 1} *</Label>
                            <Select
                              value={split.category}
                              onValueChange={(val) => {
                                const updated = [...splitCategories];
                                updated[index].category = val;
                                setSplitCategories(updated);
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.icon} {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                             {split.category && !splitBudgets[split.category] && (
                               <div className="mt-1 text-[9px] text-muted-foreground animate-pulse leading-none">
                                 Loading budget status...
                               </div>
                             )}

                             {split.category && splitBudgets[split.category] && (
                               <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-medium leading-none">
                                 {(() => {
                                   const info = splitBudgets[split.category]!;
                                   const remainingColor = info.remaining < 0 
                                     ? 'text-red-600 dark:text-red-400 font-bold' 
                                     : info.remaining < info.budgeted * 0.2 
                                       ? 'text-amber-600 dark:text-amber-400 font-bold' 
                                       : 'text-emerald-600 dark:text-emerald-400 font-bold';
                                   return (
                                     <>
                                       <span className="text-muted-foreground">Budgeted: <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(info.budgeted, formData.currency)}</span></span>
                                       <span className="text-muted-foreground">• Spent: <span className="text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(info.spent, formData.currency)}</span></span>
                                       <span className="text-muted-foreground">• Remaining: <span className={remainingColor}>{formatCurrency(info.remaining, formData.currency)}</span></span>
                                     </>
                                   );
                                 })()}
                               </div>
                             )}
                           </div>

                          <div className="w-full sm:w-[130px] space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Split Amount *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="h-9"
                              value={split.amount}
                              onChange={(e) => {
                                const updated = [...splitCategories];
                                updated[index].amount = e.target.value;
                                setSplitCategories(updated);
                              }}
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex-1 w-full space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Split Notes (Optional)</Label>
                            <Input
                              type="text"
                              className="h-9"
                              value={split.description}
                              onChange={(e) => {
                                const updated = [...splitCategories];
                                updated[index].description = e.target.value;
                                setSplitCategories(updated);
                              }}
                              placeholder="e.g. Lunch portion"
                            />
                          </div>

                          {splitCategories.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 mt-0 sm:mt-5 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => {
                                const updated = splitCategories.filter((_, i) => i !== index);
                                setSplitCategories(updated);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Live splits sum calculation block */}
                    {(() => {
                      const requiredTotal = parseFloat(formData.amount) || 0;
                      const splitSum = splitCategories.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                      const remaining = requiredTotal - splitSum;

                      return (
                        <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-950/30 flex items-center justify-between text-[11px] font-semibold">
                          <div className="flex gap-4">
                            <span className="text-muted-foreground">Transaction Total: <strong className="text-foreground">{formatCurrency(requiredTotal, formData.currency)}</strong></span>
                            <span className="text-muted-foreground">Allocated Total: <strong className="text-purple-600 dark:text-purple-400">{formatCurrency(splitSum, formData.currency)}</strong></span>
                          </div>
                          {Math.abs(remaining) > 0.01 ? (
                            <span className={remaining > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse font-bold' : 'text-destructive font-bold'}>
                              {remaining > 0 ? `Unallocated: ${formatCurrency(remaining, formData.currency)}` : `Excess: ${formatCurrency(Math.abs(remaining), formData.currency)}`}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                              ✓ Allocated Perfectly
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
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
                  if (!formData.from_account_id?.startsWith('advance_balance')) {
                    setCCAdvanceUsed(amount);
                  }
                }}
                onTotalSelectedChange={(total) => {
                  setFormData(prev => {
                    const currentAmount = parseFloat(prev.amount) || 0;
                    // Only auto-fill if empty, 0, or matches the last auto-filled total (meaning the user hasn't typed custom values)
                    if (currentAmount === 0 || ccLastAutoFilledTotal === null || currentAmount === ccLastAutoFilledTotal) {
                      setCCLastAutoFilledTotal(total);
                      return { ...prev, amount: total > 0 ? total.toString() : '' };
                    }
                    return prev;
                  });
                  // If using advance balance, also set advance consumed to total
                  if (formData.from_account_id?.startsWith('advance_balance')) {
                    setCCAdvanceUsed(total);
                    setCCAdvanceCreated(0);
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
                {formData.from_account_id?.startsWith('advance_balance') ? (
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

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={loading || isBatchSaving} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {batchDrafts.length > 0 ? (
                  batchCurrentIndex < batchDrafts.length - 1
                    ? `Save & Next Transaction (${batchCurrentIndex + 1} of ${batchDrafts.length})`
                    : `Save & Complete Batch (${batchDrafts.length} of ${batchDrafts.length})`
                ) : (
                  id ? 'Update Transaction' : 'Create Transaction'
                )}
              </Button>
              {batchDrafts.length > 1 && (
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={handleSaveAllBatchTransactions}
                  disabled={loading || isBatchSaving}
                >
                  {isBatchSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Submit & Post All ({batchDrafts.length})
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => navigate('/transactions')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>

    {showAIChat && (
      <div className="lg:col-span-5 w-full lg:sticky lg:top-6">
        <Card className="border border-purple-100 dark:border-purple-950/40 shadow-xl overflow-hidden bg-gradient-to-br from-white to-purple-50/10 dark:from-slate-900 dark:to-purple-950/10 flex flex-col h-[650px]">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/10 border-b border-purple-100/60 dark:border-purple-950/30 p-4 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-gradient-to-tr from-primary to-purple-600 p-2 rounded-xl text-white shadow-md shadow-primary/20">
                  <Sparkles className="h-4 w-4 animate-pulse text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                    AI Transaction Guide
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter data naturally & ask for help
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50" onClick={() => setShowAIChat(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 flex flex-col flex-1 overflow-hidden">
            {/* Recently auto-filled fields list */}
            {lastUpdatedFields.length > 0 && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                  ✨ Auto-filled Fields:
                </p>
                <div className="flex flex-wrap gap-1">
                  {lastUpdatedFields.map((field) => (
                    <span key={field} className="text-[9px] px-2 py-0.5 bg-emerald-105/90 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded font-medium border border-emerald-200/40">
                      {field}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  💡 Saved pattern matches: the AI chatbot learns with each transaction to help you in the future.
                </p>
              </div>
            )}

            {/* Batch Status in AI Sidebar */}
            {batchDrafts.length > 0 && (
              <div className="mb-3 p-2.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 rounded-xl space-y-2 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-teal-600 animate-pulse" />
                    Batch Processing ({batchDrafts.length} items)
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-300">
                    Active: #{batchCurrentIndex + 1}
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  onClick={handleSaveAllBatchTransactions}
                  disabled={isBatchSaving || loading}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Submit & Post All ({batchDrafts.length})
                </Button>
              </div>
            )}

            {/* Message list area */}
            <ScrollArea className="h-[380px] lg:h-[420px] flex-1 pr-3 mb-3 overflow-y-auto">
              <div className="space-y-3.5 pb-2">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {msg.role !== 'user' && (
                      <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0 border border-purple-200/50 dark:border-purple-900/30">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-purple-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 border border-purple-100/50 dark:border-purple-950/30 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {/* Chat loading / thinking animation */}
                {isChatLoading && (
                  <div className="flex gap-2.5 max-w-[85%] mr-auto items-center animate-in fade-in duration-200">
                    <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0 border border-purple-200/50 dark:border-purple-900/30">
                      <Bot className="h-4 w-4 animate-bounce text-purple-600" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-purple-100/60 dark:border-purple-950/40 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs shadow-sm flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                      <span>{chatStreamingText || 'Analyzing details...'}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Clickable suggestion pills */}
            <div className="mb-3 space-y-1 shrink-0">
              <p className="text-[10px] text-muted-foreground font-medium px-1">Suggested inputs:</p>
              <div className="flex flex-wrap gap-1 max-h-[75px] overflow-y-auto pr-1">
                {[
                  'Groceries 350 yesterday',
                  'HDFC Bank 50000 salary',
                  'SBI Card repayment 1500 from Cash',
                  'Show my bank balances',
                  'What categories do I have?'
                ].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => handleSendChatMessage(pill)}
                    className="text-[10px] px-2 py-1 bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/30 border border-purple-100/60 dark:border-purple-950/30 text-purple-700 dark:text-purple-300 rounded-full transition-colors cursor-pointer text-left truncate max-w-[240px]"
                  >
                    💡 {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-3 space-y-1 shrink-0 animate-in fade-in-50 duration-300">
                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 px-1">
                  <Bot className="h-3 w-3 text-purple-600 animate-pulse" />
                  {suggestions[0].type === 'account' ? 'Select Account:' : 'Most Used Reasons:'}
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {suggestions.map((s, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-2.5 rounded-full bg-background text-foreground hover:bg-primary hover:text-primary-foreground border border-input transition-all shadow-sm font-medium"
                      onClick={() => handleSelectSuggestion(s.text, s.type)}
                    >
                      {s.type === 'account' ? '💳 ' : '🏷️ '}
                      {s.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input action bar */}
            <div className="flex gap-2 items-center border-t border-purple-100/50 dark:border-purple-950/20 pt-3 shrink-0">
              <Input
                placeholder="Enter natural language command..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSendChatMessage())}
                className="h-9 text-xs focus-visible:ring-purple-400 bg-white dark:bg-slate-800/80"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white shadow-md shadow-primary/10 rounded-lg shrink-0"
                onClick={() => handleSendChatMessage()}
                disabled={isChatLoading}
              >
                <Send className="h-3.5 w-3.5 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </div>

  {/* Post-Posting Account Balances Confirmation Dialog */}
  <Dialog
    open={isPostPostingModalOpen}
    onOpenChange={(open) => {
      setIsPostPostingModalOpen(open);
      if (!open && postPostingSummary) {
        navigate('/transactions', { state: { postPostingSummary } });
      }
    }}
  >
    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-emerald-500/30">
      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-4 ring-emerald-500/10">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {postPostingSummary?.isEdit ? 'Transaction Updated!' : 'Transaction Posted!'}
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 text-xs">
                Success
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Transaction recorded successfully. Below are the updated balances of associated accounts.
            </DialogDescription>
          </div>
        </div>

        {/* Transaction Snapshot */}
        {postPostingSummary && (
          <div className="mt-4 p-3.5 rounded-lg bg-background/80 backdrop-blur-xs border border-border shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs font-semibold">
                  {postPostingSummary.transaction_type.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {postPostingSummary.transaction_date}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {postPostingSummary.description || postPostingSummary.category || (postPostingSummary.income_category ? getIncomeCategoryName(postPostingSummary.income_category as any) : 'Transaction')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Amount</span>
              <span className="text-base font-bold text-foreground">
                {formatCurrency(postPostingSummary.amount, postPostingSummary.currency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Post-Posting Associated Account Balances */}
      <div className="p-6 space-y-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Balances of Associated Accounts (Post-Posting)
          </h4>

          {postPostingSummary?.accounts && postPostingSummary.accounts.length > 0 ? (
            <div className="space-y-2.5">
              {postPostingSummary.accounts.map((acc) => {
                const isCard = acc.type === 'credit_card';
                const isLoan = acc.type === 'loan';
                const isBank = acc.type === 'bank';

                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                          {isCard ? (
                            <CreditCard className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                          ) : isLoan ? (
                            <Building className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                          ) : isBank ? (
                            <Landmark className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Wallet className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {acc.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider">
                              {acc.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {acc.roleLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          {isCard ? 'Outstanding Debt' : isLoan ? 'Loan Balance' : 'Post-Posting Balance'}
                        </span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(acc.postBalance, acc.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Prior Balance & Change */}
                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span>Previous:</span>
                        <span className="font-medium text-foreground/80">
                          {acc.previousBalance !== undefined
                            ? formatCurrency(acc.previousBalance, acc.currency)
                            : '—'}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                        <span className="font-semibold text-foreground">
                          {formatCurrency(acc.postBalance, acc.currency)}
                        </span>
                      </div>

                      {acc.changeAmount !== undefined && (
                        <span className={`text-[11px] font-semibold ${acc.changeAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {acc.changeAmount >= 0 ? `+${formatCurrency(acc.changeAmount, acc.currency)}` : formatCurrency(acc.changeAmount, acc.currency)}
                        </span>
                      )}
                    </div>

                    {/* Card limit or loan details if applicable */}
                    {isCard && acc.credit_limit && (
                      <div className="mt-2 p-2 rounded-md bg-purple-500/5 text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between">
                        <span>Available Credit Limit:</span>
                        <span className="font-semibold">
                          {formatCurrency(Math.max(0, acc.credit_limit - acc.postBalance), acc.currency)} / {formatCurrency(acc.credit_limit, acc.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No accounts associated with this transaction.</p>
          )}
        </div>
      </div>

      <DialogFooter className="p-4 bg-muted/30 border-t flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto text-xs"
          onClick={handleResetForNewTransaction}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Another Transaction
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            setIsPostPostingModalOpen(false);
            navigate('/transactions', { state: { postPostingSummary } });
          }}
        >
          <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
          View Transactions
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
  );
}
