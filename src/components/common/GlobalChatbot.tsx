import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, Sparkles, Mic, MicOff, Send, X, AlertCircle, Calendar, CreditCard, Loader2, Trash2, Volume2, Check
} from 'lucide-react';
import { transactionApi, accountApi, categoryApi, budgetApi, emiApi, interestRateApi, userCustomBankLinksApi } from '@/db/api';
import { parseSmartChatbotCommand, type SmartChatbotResult } from '@/services/aiService';
import { calculateMonthlyEMI } from '@/utils/emiCalculations';
import { INCOME_CATEGORIES, getIncomeCategoryName } from '@/constants/incomeCategories';
import type { Account, ExpenseCategory } from '@/types/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  isInteractive?: boolean;
}

interface DraftTransaction {
  transaction_type: 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | 'interest_charge' | null;
  amount: number | null;
  from_account_id: string | null;
  to_account_id: string | null;
  category: string | null;
  income_category: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
  description: string | null;
  transaction_date: string | null;
  is_emi: boolean | null;
  emi_months: number | null;
  bank_charges: number | null;
}

interface DraftAccount {
  account_type: 'cash' | 'bank' | 'credit_card' | 'loan' | null;
  account_name: string | null;
  balance: number | null;
  currency: string | null;
  country: string | null;
  institution_name: string | null;
  last_4_digits: string | null;
  credit_limit: number | null;
  loan_principal: number | null;
  loan_tenure_months: number | null;
  current_interest_rate: number | null;
  loan_start_date: string | null;
  due_date: number | null;
  statement_day: number | null;
  due_day: number | null;
  web_url: string | null;
  ios_app_url: string | null;
  android_app_url: string | null;
  institution_logo: string | null;
}

interface DraftBudget {
  month: number | null;
  year: number | null;
  budgeted_income: number | null;
  budgeted_expenses: number | null;
  category_budgets: Record<string, number> | null;
}

interface DraftEMI {
  principal: number | null;
  annual_rate: number | null;
  tenure_months: number | null;
  monthly_emi?: number | null;
  total_interest?: number | null;
  total_payable?: number | null;
}

// Inline helper for bank logos if needed
const getBankLogo = (bankName: string) => {
  const normalized = bankName.toLowerCase();
  if (normalized.includes('hdfc')) return 'https://logo.clearbit.com/hdfcbank.com';
  if (normalized.includes('icici')) return 'https://logo.clearbit.com/icicibank.com';
  if (normalized.includes('sbi') || normalized.includes('state bank')) return 'https://logo.clearbit.com/sbi.co.in';
  if (normalized.includes('chase')) return 'https://logo.clearbit.com/chase.com';
  if (normalized.includes('citi')) return 'https://logo.clearbit.com/citibank.com';
  if (normalized.includes('axis')) return 'https://logo.clearbit.com/axisbank.com';
  return '';
};

export default function GlobalChatbot() {
  const { user, profile } = useHybridAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Lists from DB
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // UI & Chat states
  const [currentIntent, setCurrentIntent] = useState<'transaction' | 'account' | 'budget' | 'financial_inquiry' | 'emi_calculator' | 'financial_analysis' | 'general_help'>('general_help');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I am your Smart AI Assistant. Ask me to record a transaction, manage an account, analyze budgets, or answer financial queries! E.g. \"Spent 500 on lunch using my cash pocket\"."
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<{ text: string; type: 'reason' | 'account' }[]>([]);

  // Speech Recognition states
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active drafts
  const [draft, setDraft] = useState<DraftTransaction>({
    transaction_type: null,
    amount: null,
    from_account_id: null,
    to_account_id: null,
    category: null,
    income_category: null,
    description: null,
    transaction_date: null,
    is_emi: null,
    emi_months: null,
    bank_charges: null
  });

  const [draftAccount, setDraftAccount] = useState<DraftAccount>({
    account_type: null,
    account_name: null,
    balance: null,
    currency: 'INR',
    country: 'IN',
    institution_name: null,
    last_4_digits: null,
    credit_limit: null,
    loan_principal: null,
    loan_tenure_months: null,
    current_interest_rate: null,
    loan_start_date: null,
    due_date: null,
    statement_day: null,
    due_day: null,
    web_url: null,
    ios_app_url: null,
    android_app_url: null,
    institution_logo: null
  });

  const [draftBudget, setDraftBudget] = useState<DraftBudget>({
    month: null,
    year: null,
    budgeted_income: null,
    budgeted_expenses: null,
    category_budgets: null
  });

  const [draftEMI, setDraftEMI] = useState<DraftEMI>({
    principal: null,
    annual_rate: null,
    tenure_months: null
  });

  // Exclude rendering on auth pages
  const isAuthPage = ['/login', '/register', '/reset-password', '/auth/callback', '/confirm-email'].includes(location.pathname);

  useEffect(() => {
    if (user && open) {
      loadData();
    }
  }, [user, open]);

  // Load accounts/transactions/categories context
  const loadData = async () => {
    if (!user) return;
    try {
      const [fetchedAccounts, fetchedCategories, fetchedTransactions] = await Promise.all([
        accountApi.getAccounts(user.id),
        categoryApi.getCategories(user.id),
        transactionApi.getTransactions(user.id)
      ]);
      setAccounts(fetchedAccounts);
      setCategories(fetchedCategories);
      setTransactions(fetchedTransactions);
    } catch (e) {
      console.error('Failed to load DB context for GlobalChatbot:', e);
    }
  };

  // Autocomplete Suggestions Effect
  useEffect(() => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }

    // 1. Check if user wrote "from" followed by partial account name
    const fromMatch = inputValue.match(/(?:^|\s)from\s+([a-zA-Z0-9\s]*)$/i);
    if (fromMatch) {
      const partial = fromMatch[1].toLowerCase();
      const accountSuggestions = accounts
        .filter(acc => acc.account_name.toLowerCase().includes(partial))
        .map(acc => ({ text: acc.account_name, type: 'account' as const }));
      setSuggestions(accountSuggestions);
      return;
    }

    // 2. Check if user wrote "for" or "on"
    const forMatch = inputValue.match(/(?:^|\s)(for|on)\s+([a-zA-Z0-9\s]*)$/i);
    if (forMatch) {
      const partial = forMatch[2].toLowerCase();
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
  }, [inputValue, accounts, transactions, categories]);

  const handleSelectSuggestion = (suggestionText: string, type: 'reason' | 'account') => {
    if (type === 'reason') {
      const regex = /(.*?\b(for|on)\s+)(.*)$/i;
      const match = inputValue.match(regex);
      if (match) {
        setInputValue(match[1] + suggestionText + " ");
      } else {
        setInputValue(inputValue + " " + suggestionText + " ");
      }
    } else if (type === 'account') {
      const regex = /(.*?\bfrom\s+)(.*)$/i;
      const match = inputValue.match(regex);
      if (match) {
        setInputValue(match[1] + suggestionText + " ");
      } else {
        setInputValue(inputValue + " " + suggestionText + " ");
      }
    }
  };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText, open]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      
      rec.onstart = () => {
        setIsListening(true);
      };
      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: 'Speech Recognition Error',
          description: `Failed to capture voice command: ${event.error}`,
          variant: 'destructive'
        });
      };
      rec.onend = () => {
        setIsListening(false);
      };
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSendCommand(transcript);
      };
      recognitionRef.current = rec;
    }
  }, [accounts, categories]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputValue('');
      recognitionRef.current.start();
    }
  };

  // Validate missing fields helper
  const validateCurrentDraft = (intent: string, activeDraft: any): string[] => {
    const missing: string[] = [];
    if (intent === 'transaction') {
      const d = activeDraft as DraftTransaction;
      if (!d.transaction_type) missing.push('transaction_type');
      if (!d.amount || isNaN(Number(d.amount)) || Number(d.amount) <= 0) missing.push('amount');
      if (!d.description) missing.push('description');
      
      const type = d.transaction_type;
      if (type === 'expense') {
        if (!d.from_account_id) missing.push('from_account_id');
        if (!d.category) missing.push('category');
      } else if (type === 'income') {
        if (!d.to_account_id) missing.push('to_account_id');
        if (!d.income_category) missing.push('income_category');
      } else if (['transfer', 'withdrawal', 'loan_payment', 'credit_card_repayment'].includes(type || '')) {
        if (!d.from_account_id) missing.push('from_account_id');
        if (!d.to_account_id) missing.push('to_account_id');
      } else if (type === 'interest_charge') {
        if (!d.to_account_id) missing.push('to_account_id');
      }
    } else if (intent === 'account') {
      const d = activeDraft as DraftAccount;
      if (!d.account_type) missing.push('account_type');
      if (!d.account_name) missing.push('account_name');
      
      if (d.account_type === 'bank') {
        if (!d.institution_name) missing.push('institution_name');
      } else if (d.account_type === 'credit_card') {
        if (!d.institution_name) missing.push('institution_name');
        if (!d.credit_limit) missing.push('credit_limit');
        if (!d.statement_day) missing.push('statement_day');
        if (!d.due_day) missing.push('due_day');
      } else if (d.account_type === 'loan') {
        if (!d.institution_name) missing.push('institution_name');
        if (!d.loan_principal) missing.push('loan_principal');
        if (!d.loan_tenure_months) missing.push('loan_tenure_months');
        if (!d.current_interest_rate) missing.push('current_interest_rate');
        if (!d.loan_start_date) missing.push('loan_start_date');
        if (!d.due_date) missing.push('due_date');
      }
    } else if (intent === 'budget') {
      const d = activeDraft as DraftBudget;
      if (!d.month) missing.push('month');
      if (!d.year) missing.push('year');
      if (!d.budgeted_expenses && !d.category_budgets) {
        missing.push('budget_limit');
      }
    } else if (intent === 'emi_calculator') {
      const d = activeDraft as DraftEMI;
      if (!d.principal) missing.push('principal');
      if (!d.annual_rate) missing.push('annual_rate');
      if (!d.tenure_months) missing.push('tenure_months');
    }
    return missing;
  };

  // Command parser interaction
  const handleSendCommand = async (commandToSend?: string) => {
    const commandText = commandToSend || inputValue;
    if (!commandText.trim() || !user) return;

    setInputValue('');
    const userMsgId = Math.random().toString();
    setChatMessages(prev => [...prev, { id: userMsgId, role: 'user', content: commandText }]);
    setIsLoading(true);
    setStreamingText('');

    try {
      const today = new Date().toISOString().slice(0, 10);
      const chatHistory = chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      let gatheredText = '';

      await parseSmartChatbotCommand(
        {
          command: commandText,
          accounts,
          categories,
          transactions,
          chatHistory,
          currentDate: today
        },
        (chunk) => {
          gatheredText += chunk;
          setStreamingText(gatheredText);
        },
        async (parsedResult: SmartChatbotResult) => {
          setIsLoading(false);
          setStreamingText('');
          
          let friendlyQuestion = parsedResult.clarificationQuestion;
          const botMsgId = Math.random().toString();
          setCurrentIntent(parsedResult.intent);
          
          const ext = parsedResult.extractedInfo;
          
          if (parsedResult.intent === 'transaction') {
            const updatedDraft: DraftTransaction = {
              transaction_type: ext.transaction_type || draft.transaction_type,
              amount: ext.amount || draft.amount,
              from_account_id: ext.from_account_id || draft.from_account_id,
              to_account_id: ext.to_account_id || draft.to_account_id,
              category: ext.category || draft.category,
              income_category: ext.income_category || draft.income_category,
              description: ext.description || draft.description,
              transaction_date: ext.transaction_date || draft.transaction_date || today,
              is_emi: ext.is_emi !== undefined && ext.is_emi !== null ? ext.is_emi : draft.is_emi,
              emi_months: ext.emi_months || draft.emi_months,
              bank_charges: ext.bank_charges !== undefined && ext.bank_charges !== null ? ext.bank_charges : draft.bank_charges,
            };
            
            const clientMissing = validateCurrentDraft('transaction', updatedDraft);
            setDraft(updatedDraft);
            setMissingFields(clientMissing);
            
            setChatMessages(prev => [...prev, {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            }]);
          } else if (parsedResult.intent === 'account') {
            const updatedAccount: DraftAccount = {
              account_type: ext.account_type || draftAccount.account_type,
              account_name: ext.account_name || draftAccount.account_name,
              balance: ext.balance !== undefined && ext.balance !== null ? ext.balance : draftAccount.balance,
              currency: ext.currency || draftAccount.currency || 'INR',
              country: ext.country || draftAccount.country,
              institution_name: ext.institution_name || draftAccount.institution_name,
              last_4_digits: ext.last_4_digits || draftAccount.last_4_digits,
              credit_limit: ext.credit_limit || draftAccount.credit_limit,
              loan_principal: ext.loan_principal || draftAccount.loan_principal,
              loan_tenure_months: ext.loan_tenure_months || draftAccount.loan_tenure_months,
              current_interest_rate: ext.current_interest_rate !== undefined && ext.current_interest_rate !== null ? ext.current_interest_rate : draftAccount.current_interest_rate,
              loan_start_date: ext.loan_start_date || draftAccount.loan_start_date,
              due_date: ext.due_date !== undefined && ext.due_date !== null ? ext.due_date : draftAccount.due_date,
              statement_day: ext.statement_day !== undefined && ext.statement_day !== null ? ext.statement_day : draftAccount.statement_day,
              due_day: ext.due_day !== undefined && ext.due_day !== null ? ext.due_day : draftAccount.due_day,
              web_url: ext.web_url || draftAccount.web_url,
              ios_app_url: ext.ios_app_url || draftAccount.ios_app_url,
              android_app_url: ext.android_app_url || draftAccount.android_app_url,
              institution_logo: ext.institution_logo || draftAccount.institution_logo,
            };
            
            const clientMissing = validateCurrentDraft('account', updatedAccount);
            setDraftAccount(updatedAccount);
            setMissingFields(clientMissing);
            
            setChatMessages(prev => [...prev, {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            }]);
          } else if (parsedResult.intent === 'budget') {
            const updatedBudget: DraftBudget = {
              month: ext.month || draftBudget.month || (new Date().getMonth() + 1),
              year: ext.year || draftBudget.year || new Date().getFullYear(),
              budgeted_income: ext.budgeted_income || draftBudget.budgeted_income,
              budgeted_expenses: ext.budgeted_expenses || draftBudget.budgeted_expenses,
              category_budgets: ext.category_budgets || draftBudget.category_budgets,
            };
            
            const clientMissing = validateCurrentDraft('budget', updatedBudget);
            setDraftBudget(updatedBudget);
            setMissingFields(clientMissing);
            
            setChatMessages(prev => [...prev, {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            }]);
          } else {
            // General support / financial inquiry
            setChatMessages(prev => [...prev, {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion
            }]);
          }
        },
        (error) => {
          setIsLoading(false);
          setStreamingText('');
          toast({
            title: 'Parsing Error',
            description: error,
            variant: 'destructive'
          });
        }
      );
    } catch (e) {
      setIsLoading(false);
      console.error(e);
    }
  };

  // Reset Drafts
  const handleResetDraft = () => {
    const confirmMessageIndex = chatMessages.findIndex(m => m.isInteractive);
    if (confirmMessageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[confirmMessageIndex] = {
        ...updatedMessages[confirmMessageIndex],
        isInteractive: false
      };
      setChatMessages(updatedMessages);
    }
    
    setDraft({
      transaction_type: null,
      amount: null,
      from_account_id: null,
      to_account_id: null,
      category: null,
      income_category: null,
      description: null,
      transaction_date: null,
      is_emi: null,
      emi_months: null,
      bank_charges: null
    });
    
    setDraftAccount({
      account_type: null,
      account_name: null,
      balance: null,
      currency: 'INR',
      country: 'IN',
      institution_name: null,
      last_4_digits: null,
      credit_limit: null,
      loan_principal: null,
      loan_tenure_months: null,
      current_interest_rate: null,
      loan_start_date: null,
      due_date: null,
      statement_day: null,
      due_day: null,
      web_url: null,
      ios_app_url: null,
      android_app_url: null,
      institution_logo: null
    });

    setDraftBudget({
      month: null,
      year: null,
      budgeted_income: null,
      budgeted_expenses: null,
      category_budgets: null
    });
    
    setMissingFields([]);
    
    toast({
      title: 'Draft discarded',
      description: `The draft has been cleared.`
    });
  };

  // Save Transaction
  const handleSaveTransaction = async () => {
    if (!user || validateCurrentDraft('transaction', draft).length > 0) return;
    
    // Hide interactive controls
    const updatedMessages = chatMessages.map(m => m.isInteractive ? { ...m, isInteractive: false } : m);
    setChatMessages(updatedMessages);
    setIsLoading(true);
    
    try {
      const transactionPayload = {
        user_id: user.id,
        transaction_type: draft.transaction_type!,
        from_account_id: draft.from_account_id,
        to_account_id: draft.to_account_id,
        amount: Number(draft.amount),
        currency: 'INR',
        category: draft.category,
        income_category: draft.income_category,
        description: draft.description || draft.category || getIncomeCategoryName(draft.income_category || 'others'),
        transaction_date: draft.transaction_date || new Date().toISOString().slice(0, 10)
      };
      
      const newTx = await transactionApi.createTransaction(transactionPayload);

      if (draft.is_emi && draft.emi_months && draft.from_account_id) {
        const purchaseAmount = Number(draft.amount);
        const bankCharges = Number(draft.bank_charges || 0);
        const emiMonths = Number(draft.emi_months);
        const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bankCharges, emiMonths);
        const totalAmount = purchaseAmount + bankCharges;

        const emiData = {
          user_id: user.id,
          account_id: draft.from_account_id,
          transaction_id: newTx.id,
          purchase_amount: purchaseAmount,
          bank_charges: bankCharges,
          total_amount: totalAmount,
          emi_months: emiMonths,
          monthly_emi: monthlyEMI,
          remaining_installments: emiMonths,
          start_date: transactionPayload.transaction_date,
          next_due_date: transactionPayload.transaction_date,
          description: transactionPayload.description || `EMI for ${draft.category || 'purchase'}`,
          status: 'active' as const,
        };

        await emiApi.createEMI(emiData);
      }

      await loadData();
      setIsLoading(false);
      toast({
        title: 'Transaction Saved Successfully!',
        description: `Recorded ${draft.transaction_type} of ₹${draft.amount}.`,
      });

      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'model',
        content: `🎉 Transaction recorded! Saved "${transactionPayload.description}" for ₹${Number(draft.amount).toLocaleString('en-IN')}. What else can I help you with?`
      }]);

      setDraft({
        transaction_type: null,
        amount: null,
        from_account_id: null,
        to_account_id: null,
        category: null,
        income_category: null,
        description: null,
        transaction_date: null,
        is_emi: null,
        emi_months: null,
        bank_charges: null
      });
      setMissingFields([]);
    } catch (e) {
      setIsLoading(false);
      toast({
        title: 'Failed to Save Transaction',
        description: e instanceof Error ? e.message : 'Database error',
        variant: 'destructive'
      });
    }
  };

  // Save Account
  const handleSaveAccount = async () => {
    if (!user || validateCurrentDraft('account', draftAccount).length > 0) return;
    
    const updatedMessages = chatMessages.map(m => m.isInteractive ? { ...m, isInteractive: false } : m);
    setChatMessages(updatedMessages);
    setIsLoading(true);
    
    try {
      const accountPayload = {
        user_id: user.id,
        account_name: draftAccount.account_name!,
        account_type: draftAccount.account_type!,
        balance: Number(draftAccount.balance || 0),
        currency: draftAccount.currency || 'INR',
        country: draftAccount.country || 'IN',
        institution_name: draftAccount.account_type === 'cash' ? 'Cash' : (draftAccount.institution_name || draftAccount.account_name!),
        institution_logo: draftAccount.account_type === 'cash' ? null : (draftAccount.institution_logo || getBankLogo(draftAccount.institution_name || draftAccount.account_name!)),
        last_4_digits: draftAccount.last_4_digits || null,
        credit_limit: draftAccount.credit_limit || null,
        loan_principal: draftAccount.loan_principal || null,
        loan_tenure_months: draftAccount.loan_tenure_months || null,
        loan_start_date: draftAccount.account_type === 'loan' ? draftAccount.loan_start_date : null,
        current_interest_rate: draftAccount.current_interest_rate || null,
        due_date: draftAccount.account_type === 'loan' ? Number(draftAccount.due_date) : null,
        statement_day: draftAccount.account_type === 'credit_card' ? (draftAccount.statement_day ? Number(draftAccount.statement_day) : null) : null,
        due_day: draftAccount.account_type === 'credit_card' ? (draftAccount.due_day ? Number(draftAccount.due_day) : null) : null
      };
      
      const newAccount = await accountApi.createAccount(accountPayload as any);
      
      if (draftAccount.account_type === 'loan' && draftAccount.current_interest_rate && draftAccount.loan_start_date) {
        await interestRateApi.addInterestRate({
          account_id: newAccount.id,
          interest_rate: Number(draftAccount.current_interest_rate),
          effective_date: draftAccount.loan_start_date,
        });
      }

      const hasCustomLinks = !!(draftAccount.web_url || draftAccount.ios_app_url || draftAccount.android_app_url);
      if (draftAccount.account_type !== 'cash' && hasCustomLinks && newAccount) {
        await userCustomBankLinksApi.createCustomBankLink({
          user_id: user.id,
          account_id: newAccount.id,
          bank_name: draftAccount.institution_name || draftAccount.account_name!,
          web_url: draftAccount.web_url || null,
          ios_app_url: draftAccount.ios_app_url || null,
          android_app_url: draftAccount.android_app_url || null,
          notes: 'Created via AI Chatbot'
        });
      }
      
      await loadData();
      setIsLoading(false);
      toast({
        title: 'Account Created Successfully!',
        description: `Created account "${draftAccount.account_name}".`,
      });
      
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'model',
        content: `🎉 Account created! Added "${draftAccount.account_name}" (${draftAccount.account_type}) with a starting balance of ₹${Number(draftAccount.balance || 0).toLocaleString('en-IN')}. What's next?`
      }]);
      
      setDraftAccount({
        account_type: null,
        account_name: null,
        balance: null,
        currency: 'INR',
        country: 'IN',
        institution_name: null,
        last_4_digits: null,
        credit_limit: null,
        loan_principal: null,
        loan_tenure_months: null,
        current_interest_rate: null,
        loan_start_date: null,
        due_date: null,
        statement_day: null,
        due_day: null,
        web_url: null,
        ios_app_url: null,
        android_app_url: null,
        institution_logo: null
      });
      setMissingFields([]);
    } catch (e) {
      setIsLoading(false);
      toast({
        title: 'Failed to Create Account',
        description: e instanceof Error ? e.message : 'Database error',
        variant: 'destructive'
      });
    }
  };

  // Save Budget
  const handleSaveBudget = async () => {
    if (!user || validateCurrentDraft('budget', draftBudget).length > 0) return;
    
    const updatedMessages = chatMessages.map(m => m.isInteractive ? { ...m, isInteractive: false } : m);
    setChatMessages(updatedMessages);
    setIsLoading(true);
    
    try {
      const budgetPayload = {
        user_id: user.id,
        month: Number(draftBudget.month!),
        year: Number(draftBudget.year!),
        budgeted_income: Number(draftBudget.budgeted_income || 0),
        budgeted_expenses: Number(draftBudget.budgeted_expenses || 0),
        category_budgets: draftBudget.category_budgets || {},
        income_category_budgets: { salaries: 0, allowances: 0, family_income: 0, others: 0 },
        currency: profile?.default_currency || 'INR'
      };
      
      await budgetApi.createOrUpdateBudget(budgetPayload);
      await loadData();
      setIsLoading(false);
      
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[draftBudget.month! - 1];
      
      toast({
        title: 'Budget Saved Successfully!',
        description: `Configured budget limits for ${monthName} ${draftBudget.year}.`,
      });

      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'model',
        content: `🎉 Budget limits set! Configured overall budget limit of ₹${Number(draftBudget.budgeted_expenses || 0).toLocaleString('en-IN')} for ${monthName} ${draftBudget.year}. What next?`
      }]);

      setDraftBudget({
        month: null,
        year: null,
        budgeted_income: null,
        budgeted_expenses: null,
        category_budgets: null
      });
      setMissingFields([]);
    } catch (e) {
      setIsLoading(false);
      toast({
        title: 'Failed to Save Budget',
        description: e instanceof Error ? e.message : 'Database error',
        variant: 'destructive'
      });
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '';
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.account_name : '';
  };

  // If user is not logged in or it is an auth page, don't show the chatbot launcher
  if (!user || isAuthPage) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Floating launcher trigger */}
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-teal-500 via-primary to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white shadow-2xl hover:shadow-primary/30 flex items-center justify-center border-none p-0 group relative overflow-hidden transition-all duration-300 hover:scale-110 active:scale-95"
          title="Smart AI Assistant"
        >
          <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full animate-ping pointer-events-none"></span>
          <div className="relative z-10 flex items-center justify-center">
            <Bot className="h-6 w-6 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 absolute -top-1.5 -right-1.5 text-yellow-300" />
          </div>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="sm:max-w-[460px] w-full p-0 flex flex-col h-full bg-card/95 backdrop-blur-md border-l border-muted">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-teal-950/20 via-primary/10 to-indigo-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-teal-500 to-indigo-600 p-2 rounded-xl text-white shadow-md">
              <Bot className="h-5 w-5 animate-pulse text-white" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
                Smart AI Chatbot ✨
              </SheetTitle>
              <SheetDescription className="text-xs">
                Ask queries or write transactions naturally.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Dynamic collapsible draft transaction widget */}
        {currentIntent === 'transaction' && draft.transaction_type && (
          <div className="mx-4 mt-3 p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-indigo-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Draft Transaction
              </span>
              <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] capitalize py-0">
                {draft.transaction_type.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-muted-foreground">
              <div>Amount: <strong className="text-foreground font-mono">₹{draft.amount || '0'}</strong></div>
              <div>Category: <strong className="text-foreground">{draft.category || getIncomeCategoryName(draft.income_category || 'others')}</strong></div>
              {draft.from_account_id && (
                <div className="col-span-2 truncate">From Account: <strong className="text-foreground">{getAccountName(draft.from_account_id)}</strong></div>
              )}
              {draft.to_account_id && (
                <div className="col-span-2 truncate">To Account: <strong className="text-foreground">{getAccountName(draft.to_account_id)}</strong></div>
              )}
              <div className="col-span-2 truncate">Desc: <strong className="text-foreground italic">"{draft.description || 'N/A'}"</strong></div>
            </div>
          </div>
        )}

        {/* Dynamic collapsible draft account widget */}
        {currentIntent === 'account' && draftAccount.account_type && (
          <div className="mx-4 mt-3 p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-purple-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Draft Account
              </span>
              <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[9px] capitalize py-0">
                {draftAccount.account_type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-muted-foreground">
              <div className="col-span-2">Name: <strong className="text-foreground">{draftAccount.account_name || 'N/A'}</strong></div>
              <div>Balance: <strong className="text-foreground font-mono">₹{draftAccount.balance || '0'}</strong></div>
              <div>Bank: <strong className="text-foreground">{draftAccount.institution_name || 'N/A'}</strong></div>
            </div>
          </div>
        )}

        {/* Main Conversation Log */}
        <ScrollArea className="flex-grow px-4 py-3 h-[calc(100vh-250px)] overflow-y-auto">
          <div className="space-y-4 pb-4">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shadow shrink-0 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'U' : <Sparkles className="h-3.5 w-3.5 text-white" />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                        : 'bg-muted/80 text-foreground rounded-tl-none border border-muted/50'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {msg.isInteractive && (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-[10px] text-indigo-200 font-medium">Draft complete. Confirm and save?</span>
                      </div>
                      <div className="flex gap-1.5 w-full sm:w-auto">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-[10px] h-7 px-2"
                          onClick={handleResetDraft}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Discard
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 px-2 font-semibold"
                          onClick={
                            currentIntent === 'transaction' 
                              ? handleSaveTransaction 
                              : currentIntent === 'account' 
                                ? handleSaveAccount 
                                : handleSaveBudget
                          }
                        >
                          <Check className="h-3 w-3 mr-1" /> Confirm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {streamingText && (
              <div className="flex gap-2.5 max-w-[88%] mr-auto animate-pulse">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl text-xs leading-relaxed bg-muted/80 text-foreground rounded-tl-none border border-muted/50">
                  {streamingText}
                </div>
              </div>
            )}

            {isLoading && !streamingText && (
              <div className="flex gap-2.5 max-w-[88%] mr-auto">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl text-xs leading-relaxed bg-muted/50 text-muted-foreground rounded-tl-none flex items-center gap-1.5 border border-muted/30">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input area container */}
        <div className="p-4 border-t border-muted bg-card shrink-0 space-y-3">
          
          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-300">
              <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 px-1">
                <Bot className="h-3 w-3 text-primary animate-pulse" />
                {suggestions[0].type === 'account' ? 'Select Account:' : 'Most Used Reasons:'}
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {suggestions.map((s, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-[10px] h-7 px-2.5 rounded-full shadow-sm font-medium hover:bg-primary/20 hover:text-primary border border-muted hover:border-primary/30 transition-all"
                    onClick={() => handleSelectSuggestion(s.text, s.type)}
                  >
                    {s.type === 'account' ? '💳 ' : '🏷️ '}
                    {s.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Typing / Mic input row */}
          <div className="flex items-center gap-2">
            {recognitionSupported ? (
              <Button
                type="button"
                variant={isListening ? 'destructive' : 'outline'}
                size="icon"
                className={`h-10 w-10 rounded-full shrink-0 relative transition-all duration-300 shadow-md ${
                  isListening ? 'animate-pulse ring-4 ring-destructive/40' : 'hover:border-primary hover:text-primary hover:bg-primary/5'
                }`}
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? (
                  <div className="flex items-center justify-center">
                    <MicOff className="h-4.5 w-4.5" />
                    <span className="absolute inline-flex h-full w-full rounded-full bg-destructive/30 animate-ping duration-1000"></span>
                  </div>
                ) : (
                  <Mic className="h-4.5 w-4.5" />
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0 opacity-50 cursor-not-allowed"
                disabled
                title="Speech recognition not supported in browser"
              >
                <MicOff className="h-4.5 w-4.5" />
              </Button>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCommand();
              }}
              className="flex-grow flex items-center gap-2"
            >
              <div className="relative flex-grow">
                <Input
                  placeholder={isListening ? "Listening..." : "Type command... e.g. \"Spent 100 for...\""}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isListening || isLoading}
                  className="pr-9 h-10 bg-muted/40 border-muted focus-visible:ring-primary focus-visible:border-primary/80 text-xs rounded-full"
                />
                {inputValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                    onClick={() => setInputValue('')}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
                disabled={!inputValue.trim() || isLoading || isListening}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>

          <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Volume2 className="h-2.5 w-2.5" />
            Try typing: "Spent 100 for [reason] from [account]" to see suggestions.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
