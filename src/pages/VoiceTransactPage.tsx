import { useState, useEffect, useRef } from 'react';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, categoryApi, budgetApi, interestRateApi } from '@/db/api';
import { parseSmartChatbotCommand, type SmartChatbotResult } from '@/services/aiService';
import { INCOME_CATEGORIES, getIncomeCategoryName } from '@/constants/incomeCategories';
import { countries } from '@/utils/countries';
import { getBanksByCountry, getBankLogo } from '@/utils/banks';
import type { Account, ExpenseCategory } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  Check, 
  X, 
  ArrowRight, 
  AlertCircle, 
  Calendar, 
  CreditCard, 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Loader2,
  Trash2,
  Volume2,
  Bot
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  isInteractive?: boolean;
  interactiveType?: 'confirm_save' | 'select_account' | 'select_category';
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

export default function VoiceTransactPage() {
  const { user, profile } = useHybridAuth();
  const { toast } = useToast();
  
  // Dynamic lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // UI & Chat states
  const [currentIntent, setCurrentIntent] = useState<'transaction' | 'account' | 'budget' | 'financial_inquiry' | 'emi_calculator' | 'financial_analysis' | 'general_help'>('general_help');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I am your Smart AI Chatbot—the central operational hub of SmartFinHub. I can help you record Transactions, add/manage Accounts, configure Budgets, simulate Loan EMIs, and answer any financial audits or spending inquiries! E.g. \"Create a new cash account named Cash Pocket with balance 500\" or \"How much did I spend on Food & Dining this month?\""
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [inputValueActive, setInputValueActive] = useState(''); // Keep track
  const [isLoading, setIsLoading] = useState(false);
  
  // Streaming text placeholder
  const [streamingText, setStreamingText] = useState('');
  
  // Voice Recognition states
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Active drafts
  const [draft, setDraft] = useState<DraftTransaction>({
    transaction_type: null,
    amount: null,
    from_account_id: null,
    to_account_id: null,
    category: null,
    income_category: null,
    description: null,
    transaction_date: null
  });

  const [draftAccount, setDraftAccount] = useState<DraftAccount>({
    account_type: null,
    account_name: null,
    balance: null,
    currency: profile?.default_currency || 'INR',
    country: profile?.default_country || null,
    institution_name: null,
    last_4_digits: null,
    credit_limit: null,
    loan_principal: null,
    loan_tenure_months: null,
    current_interest_rate: null,
    loan_start_date: null,
    due_date: null
  });

  // Automatically sync profile country/currency when loaded
  useEffect(() => {
    if (profile) {
      setDraftAccount(prev => ({
        ...prev,
        country: prev.country || profile.default_country || 'IN',
        currency: prev.currency === 'INR' && profile.default_currency ? profile.default_currency : prev.currency
      }));
    }
  }, [profile]);

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
    tenure_months: null,
    monthly_emi: null,
    total_interest: null,
    total_payable: null
  });
  
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  // For scrolling chat window
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load lists on mount
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
      console.error('Failed to load data for AI Voice Transact:', e);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Setup Web Speech API SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Default to Indian English, very flexible
      
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
        // Automatically send the command upon spoken entry
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

  // Helper: validate missing fields on the client side
  const validateCurrentDraft = (intent: string, activeDraft: any): string[] => {
    const missing: string[] = [];
    if (intent === 'transaction') {
      const d = activeDraft as DraftTransaction;
      if (!d.transaction_type) {
        missing.push('transaction_type');
        return missing; // Rest of validation depends on type
      }
      
      if (!d.amount || d.amount <= 0) {
        missing.push('amount');
      }
      
      if (!d.description || !d.description.trim()) {
        missing.push('description');
      }
      
      const type = d.transaction_type;
      
      if (type === 'expense') {
        if (!d.from_account_id) missing.push('from_account_id');
        if (!d.category) missing.push('category');
      } else if (type === 'income') {
        if (!d.to_account_id) missing.push('to_account_id');
        if (!d.income_category) missing.push('income_category');
      } else if (type === 'interest_charge') {
        if (!d.to_account_id) missing.push('to_account_id');
      } else if (['transfer', 'withdrawal', 'loan_payment', 'credit_card_repayment'].includes(type)) {
        if (!d.from_account_id) missing.push('from_account_id');
        if (!d.to_account_id) missing.push('to_account_id');
      }
    } else if (intent === 'account') {
      const d = activeDraft as DraftAccount;
      if (!d.account_type) {
        missing.push('account_type');
        return missing;
      }
      if (!d.account_name || !d.account_name.trim()) {
        missing.push('account_name');
      }
      if (d.account_type !== 'cash') {
        if (!d.country) {
          missing.push('country');
        }
        if (!d.institution_name || !d.institution_name.trim()) {
          missing.push('institution_name');
        }
      }
      if (d.account_type === 'credit_card') {
        if (d.credit_limit === null || d.credit_limit === undefined || d.credit_limit <= 0) {
          missing.push('credit_limit');
        }
      } else if (d.account_type === 'loan') {
        if (!d.loan_principal || d.loan_principal <= 0) missing.push('loan_principal');
        if (!d.loan_tenure_months || d.loan_tenure_months <= 0) missing.push('loan_tenure_months');
        if (d.current_interest_rate === null || d.current_interest_rate === undefined) missing.push('current_interest_rate');
        if (!d.loan_start_date) missing.push('loan_start_date');
        if (d.due_date === null || d.due_date === undefined || d.due_date < 1 || d.due_date > 31) missing.push('due_date');
      }
    } else if (intent === 'budget') {
      const d = activeDraft as DraftBudget;
      if (!d.month) missing.push('month');
      if (!d.year) missing.push('year');
      if (!d.budgeted_expenses && (!d.category_budgets || Object.keys(d.category_budgets).length === 0)) {
        missing.push('budget_limit');
      }
    } else if (intent === 'emi_calculator') {
      const d = activeDraft as DraftEMI;
      if (!d.principal || d.principal <= 0) missing.push('principal');
      if (!d.annual_rate || d.annual_rate <= 0) missing.push('annual_rate');
      if (!d.tenure_months || d.tenure_months <= 0) missing.push('tenure_months');
    }
    
    return missing;
  };

  const handleSendCommand = async (commandToSend?: string) => {
    const commandText = commandToSend || inputValue;
    if (!commandText.trim() || !user) return;
    
    setInputValue('');
    
    // Add user message
    const userMsgId = Math.random().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: commandText
    };
    
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setStreamingText('');
    
    try {
      const today = new Date().toISOString().slice(0, 10);
      
      const chatHistory = chatMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));
      
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
        (parsedResult: SmartChatbotResult) => {
          setIsLoading(false);
          setStreamingText('');
          
          let friendlyQuestion = parsedResult.clarificationQuestion;
          const botMsgId = Math.random().toString();
          
          // Switch current intent
          setCurrentIntent(parsedResult.intent);
          
          // Apply extracted info to state
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
              transaction_date: ext.transaction_date || draft.transaction_date || today
            };
            
            const clientMissing = validateCurrentDraft('transaction', updatedDraft);
            setDraft(updatedDraft);
            setMissingFields(clientMissing);
            
            const botMessage: ChatMessage = {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            };
            setChatMessages(prev => [...prev, botMessage]);
          }
          else if (parsedResult.intent === 'account') {
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
              due_date: ext.due_date !== undefined && ext.due_date !== null ? ext.due_date : draftAccount.due_date
            };
            
            const clientMissing = validateCurrentDraft('account', updatedAccount);
            setDraftAccount(updatedAccount);
            setMissingFields(clientMissing);
            
            const botMessage: ChatMessage = {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            };
            setChatMessages(prev => [...prev, botMessage]);
          }
          else if (parsedResult.intent === 'budget') {
            const updatedBudget: DraftBudget = {
              month: ext.month || draftBudget.month || new Date().getMonth() + 1,
              year: ext.year || draftBudget.year || new Date().getFullYear(),
              budgeted_income: ext.budgeted_income || draftBudget.budgeted_income,
              budgeted_expenses: ext.budgeted_expenses || draftBudget.budgeted_expenses,
              category_budgets: ext.category_budgets || draftBudget.category_budgets
            };
            
            const clientMissing = validateCurrentDraft('budget', updatedBudget);
            setDraftBudget(updatedBudget);
            setMissingFields(clientMissing);
            
            const botMessage: ChatMessage = {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: clientMissing.length === 0
            };
            setChatMessages(prev => [...prev, botMessage]);
          }
          else if (parsedResult.intent === 'emi_calculator') {
            const updatedEMI: DraftEMI = {
              principal: ext.principal || draftEMI.principal,
              annual_rate: ext.annual_rate || draftEMI.annual_rate,
              tenure_months: ext.tenure_months || draftEMI.tenure_months,
              monthly_emi: parsedResult.extraContext?.monthly_emi || null,
              total_interest: parsedResult.extraContext?.total_interest || null,
              total_payable: parsedResult.extraContext?.total_payable || null
            };
            
            const clientMissing = validateCurrentDraft('emi_calculator', updatedEMI);
            setDraftEMI(updatedEMI);
            setMissingFields(clientMissing);
            
            const botMessage: ChatMessage = {
              id: botMsgId,
              role: 'model',
              content: friendlyQuestion,
              isInteractive: false
            };
            setChatMessages(prev => [...prev, botMessage]);
          }
          else {
            setMissingFields([]);
            setChatMessages(prev => [
              ...prev,
              {
                id: botMsgId,
                role: 'model',
                content: friendlyQuestion
              }
            ]);
          }
        },
        (error) => {
          setIsLoading(false);
          setStreamingText('');
          toast({
            title: 'AI Parsing Failed',
            description: error,
            variant: 'destructive'
          });
        }
      );
    } catch (e) {
      setIsLoading(false);
      setStreamingText('');
      console.error(e);
    }
  };

  // Handle manual selection from Chips (interactive quick-replies)
  const handleSelectField = (
    field: string, 
    value: any, 
    displayLabel: string
  ) => {
    let friendlyQuestion = '';
    let isComplete = false;
    let fieldName = field.replace('_id', '').replace('_', ' ');

    if (currentIntent === 'transaction') {
      const updatedDraft = {
        ...draft,
        [field]: value
      };
      
      if (field === 'transaction_type') {
        if (value === 'expense') {
          updatedDraft.to_account_id = null;
          updatedDraft.income_category = null;
        } else if (value === 'income') {
          updatedDraft.from_account_id = null;
          updatedDraft.category = null;
        } else if (['transfer', 'withdrawal', 'loan_payment', 'credit_card_repayment'].includes(value)) {
          updatedDraft.category = null;
          updatedDraft.income_category = null;
        }
      }
      
      if (field === 'category' && draft.transaction_type === 'expense') {
        updatedDraft.income_category = null;
      }
      if (field === 'income_category' && draft.transaction_type === 'income') {
        updatedDraft.category = null;
      }
      
      const clientMissing = validateCurrentDraft('transaction', updatedDraft);
      isComplete = clientMissing.length === 0;
      
      setDraft(updatedDraft);
      setMissingFields(clientMissing);
      
      friendlyQuestion = isComplete 
        ? "Awesome! Everything is ready now. Would you like to confirm and save this transaction?"
        : `I've updated the ${fieldName} to ${displayLabel}. What was the details for other missing fields?`;
    }
    else if (currentIntent === 'account') {
      const updatedAccount = {
        ...draftAccount,
        [field]: value
      };
      
      const clientMissing = validateCurrentDraft('account', updatedAccount);
      isComplete = clientMissing.length === 0;
      
      setDraftAccount(updatedAccount);
      setMissingFields(clientMissing);
      
      friendlyQuestion = isComplete 
        ? "Great! The account is ready to be created. Would you like to confirm and save it now?"
        : `I've updated the ${fieldName} to ${displayLabel}. Please provide the remaining details.`;
    }
    else if (currentIntent === 'budget') {
      const updatedBudget = {
        ...draftBudget,
        [field]: value
      };
      
      const clientMissing = validateCurrentDraft('budget', updatedBudget);
      isComplete = clientMissing.length === 0;
      
      setDraftBudget(updatedBudget);
      setMissingFields(clientMissing);
      
      friendlyQuestion = isComplete 
        ? "Awesome! The budget is ready. Confirm to set it now?"
        : `I've updated the ${fieldName} to ${displayLabel}. What are the other missing details?`;
    }
    
    // Add conversational messages
    const userMsgId = Math.random().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: `Selected ${displayLabel}`
    };
    
    const botMsgId = Math.random().toString();
    const botMessage: ChatMessage = {
      id: botMsgId,
      role: 'model',
      content: friendlyQuestion,
      isInteractive: isComplete
    };
    
    setChatMessages(prev => [...prev, newUserMsg, botMessage]);
  };

  // Cancel current draft
  const handleResetDraft = () => {
    if (currentIntent === 'transaction') {
      setDraft({
        transaction_type: null,
        amount: null,
        from_account_id: null,
        to_account_id: null,
        category: null,
        income_category: null,
        description: null,
        transaction_date: null
      });
    } else if (currentIntent === 'account') {
      setDraftAccount({
        account_type: null,
        account_name: null,
        balance: null,
        currency: profile?.default_currency || 'INR',
        country: profile?.default_country || 'IN',
        institution_name: null,
        last_4_digits: null,
        credit_limit: null,
        loan_principal: null,
        loan_tenure_months: null,
        current_interest_rate: null,
        loan_start_date: null,
        due_date: null
      });
    } else if (currentIntent === 'budget') {
      setDraftBudget({
        month: null,
        year: null,
        budgeted_income: null,
        budgeted_expenses: null,
        category_budgets: null
      });
    }
    
    setMissingFields([]);
    
    const botMsgId = Math.random().toString();
    setChatMessages(prev => [
      ...prev,
      {
        id: botMsgId,
        role: 'model',
        content: `Draft for ${currentIntent} discarded. What would you like to operate next?`
      }
    ]);
    
    toast({
      title: 'Draft discarded',
      description: `The ${currentIntent} draft has been cleared.`
    });
  };

  // Save draft to database
  const handleSaveTransaction = async () => {
    if (!user || validateCurrentDraft('transaction', draft).length > 0) return;
    
    const confirmMessageIndex = chatMessages.findIndex(m => m.isInteractive);
    if (confirmMessageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[confirmMessageIndex] = {
        ...updatedMessages[confirmMessageIndex],
        isInteractive: false
      };
      setChatMessages(updatedMessages);
    }
    
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
      
      await transactionApi.createTransaction(transactionPayload);
      await loadData();
      
      setIsLoading(false);
      toast({
        title: 'Transaction Saved Successfully!',
        description: `Saved ₹${Number(draft.amount).toFixed(2)} as ${draft.transaction_type}.`,
        variant: 'default'
      });
      
      const successBotMsgId = Math.random().toString();
      setChatMessages(prev => [
        ...prev,
        {
          id: successBotMsgId,
          role: 'model',
          content: `🎉 Success! I have verified and saved your transaction of ₹${Number(draft.amount).toFixed(2)} to the database. Your balances are updated! What else can I do for you?`
        }
      ]);
      
      setDraft({
        transaction_type: null,
        amount: null,
        from_account_id: null,
        to_account_id: null,
        category: null,
        income_category: null,
        description: null,
        transaction_date: null
      });
      setMissingFields([]);
      
    } catch (e) {
      setIsLoading(false);
      console.error(e);
      toast({
        title: 'Failed to Save Transaction',
        description: e instanceof Error ? e.message : 'Unknown database error',
        variant: 'destructive'
      });
    }
  };

  const handleSaveAccount = async () => {
    if (!user || validateCurrentDraft('account', draftAccount).length > 0) return;
    
    const confirmMessageIndex = chatMessages.findIndex(m => m.isInteractive);
    if (confirmMessageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[confirmMessageIndex] = {
        ...updatedMessages[confirmMessageIndex],
        isInteractive: false
      };
      setChatMessages(updatedMessages);
    }
    
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
        institution_logo: draftAccount.account_type === 'cash' ? null : getBankLogo(draftAccount.institution_name || draftAccount.account_name!),
        last_4_digits: draftAccount.last_4_digits || null,
        credit_limit: draftAccount.account_limit || draftAccount.credit_limit || null,
        loan_principal: draftAccount.loan_principal || null,
        loan_tenure_months: draftAccount.loan_tenure_months || null,
        loan_start_date: draftAccount.account_type === 'loan' ? draftAccount.loan_start_date : null,
        current_interest_rate: draftAccount.current_interest_rate || null,
        due_date: draftAccount.account_type === 'loan' ? Number(draftAccount.due_date) : null
      };
      
      const newAccount = await accountApi.createAccount(accountPayload as any);
      
      if (draftAccount.account_type === 'loan' && draftAccount.current_interest_rate && draftAccount.loan_start_date) {
        await interestRateApi.addInterestRate({
          account_id: newAccount.id,
          interest_rate: Number(draftAccount.current_interest_rate),
          effective_date: draftAccount.loan_start_date,
        });
      }
      
      await loadData();
      
      setIsLoading(false);
      toast({
        title: 'Account Created Successfully!',
        description: `Created account "${draftAccount.account_name}" of type ${draftAccount.account_type}.`,
        variant: 'default'
      });
      
      const successBotMsgId = Math.random().toString();
      setChatMessages(prev => [
        ...prev,
        {
          id: successBotMsgId,
          role: 'model',
          content: `🎉 Success! I have successfully created your new ${draftAccount.account_type} account "${draftAccount.account_name}" with a balance of ₹${Number(draftAccount.balance || 0).toLocaleString('en-IN')}. Your database is updated! What else can I do for you?`
        }
      ]);
      
      setDraftAccount({
        account_type: null,
        account_name: null,
        balance: null,
        currency: profile?.default_currency || 'INR',
        country: profile?.default_country || 'IN',
        institution_name: null,
        last_4_digits: null,
        credit_limit: null,
        loan_principal: null,
        loan_tenure_months: null,
        current_interest_rate: null,
        loan_start_date: null,
        due_date: null
      });
      setMissingFields([]);
      
    } catch (e) {
      setIsLoading(false);
      console.error(e);
      toast({
        title: 'Failed to Create Account',
        description: e instanceof Error ? e.message : 'Unknown database error',
        variant: 'destructive'
      });
    }
  };

  const handleSaveBudget = async () => {
    if (!user || validateCurrentDraft('budget', draftBudget).length > 0) return;
    
    const confirmMessageIndex = chatMessages.findIndex(m => m.isInteractive);
    if (confirmMessageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[confirmMessageIndex] = {
        ...updatedMessages[confirmMessageIndex],
        isInteractive: false
      };
      setChatMessages(updatedMessages);
    }
    
    setIsLoading(true);
    
    try {
      const budgetPayload = {
        user_id: user.id,
        month: Number(draftBudget.month!),
        year: Number(draftBudget.year!),
        budgeted_income: Number(draftBudget.budgeted_income || 0),
        budgeted_expenses: Number(draftBudget.budgeted_expenses || 0),
        category_budgets: draftBudget.category_budgets || {}
      };
      
      await budgetApi.createOrUpdateBudget(budgetPayload);
      await loadData();
      
      setIsLoading(false);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[draftBudget.month! - 1];
      
      toast({
        title: 'Budget Saved Successfully!',
        description: `Set budget for ${monthName} ${draftBudget.year}.`,
        variant: 'default'
      });
      
      const successBotMsgId = Math.random().toString();
      setChatMessages(prev => [
        ...prev,
        {
          id: successBotMsgId,
          role: 'model',
          content: `🎉 Success! I have successfully set your budget for ${monthName} ${draftBudget.year} with overall expenses limit of ₹${Number(draftBudget.budgeted_expenses || 0).toLocaleString('en-IN')}. Your budgets are synchronized! What next?`
        }
      ]);
      
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
      console.error(e);
      toast({
        title: 'Failed to Save Budget',
        description: e instanceof Error ? e.message : 'Unknown database error',
        variant: 'destructive'
      });
    }
  };

  const handleConfirmSaveDraft = async () => {
    if (currentIntent === 'transaction') {
      await handleSaveTransaction();
    } else if (currentIntent === 'account') {
      await handleSaveAccount();
    } else if (currentIntent === 'budget') {
      await handleSaveBudget();
    }
  };

  // Determine what type of quick reply chips to show
  const renderQuickReplyChips = () => {
    if (isLoading || missingFields.length === 0) return null;
    
    const nextMissing = missingFields[0]; // Address first missing field
    
    if (currentIntent === 'transaction') {
      if (nextMissing === 'transaction_type') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select transaction type:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'expense', label: '📤 Expense', colorClass: 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' },
                { type: 'income', label: '📥 Income', colorClass: 'hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30' },
                { type: 'transfer', label: '🔄 Transfer', colorClass: 'hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30' },
                { type: 'withdrawal', label: '🪙 Withdrawal', colorClass: 'hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30' },
                { type: 'loan_payment', label: '📈 Loan Payment', colorClass: 'hover:bg-teal-500/10 hover:text-teal-400 hover:border-teal-500/30' },
                { type: 'credit_card_repayment', label: '💳 CC Repayment', colorClass: 'hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30' },
                { type: 'interest_charge', label: '📊 Interest Charge', colorClass: 'hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30' }
              ].map(item => (
                <Button
                  key={item.type}
                  variant="outline"
                  size="sm"
                  className={`bg-card text-foreground transition-all border border-muted text-xs rounded-full shadow-sm ${item.colorClass}`}
                  onClick={() => handleSelectField('transaction_type', item.type, item.label)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'from_account_id') {
        const filteredAccounts = accounts.filter(a => {
          if (draft.transaction_type === 'expense') {
            return ['cash', 'bank', 'credit_card'].includes(a.account_type);
          }
          if (draft.transaction_type === 'credit_card_repayment') {
            return ['bank', 'cash'].includes(a.account_type);
          }
          return a.account_type !== 'loan';
        });
        
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select paying account:</p>
            <div className="flex flex-wrap gap-2">
              {filteredAccounts.map(acc => (
                <Button
                  key={acc.id}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('from_account_id', acc.id, acc.account_name)}
                >
                  {acc.account_type === 'credit_card' ? '💳' : acc.account_type === 'cash' ? '💵' : '🏦'} {acc.account_name} (₹{acc.balance.toLocaleString('en-IN')})
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'to_account_id') {
        const filteredAccounts = accounts.filter(a => {
          if (draft.transaction_type === 'income') {
            return ['bank', 'cash'].includes(a.account_type);
          }
          if (draft.transaction_type === 'loan_payment') {
            return a.account_type === 'loan';
          }
          if (draft.transaction_type === 'credit_card_repayment') {
            return a.account_type === 'credit_card';
          }
          return true;
        });
        
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select receiving account:</p>
            <div className="flex flex-wrap gap-2">
              {filteredAccounts.map(acc => (
                <Button
                  key={acc.id}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('to_account_id', acc.id, acc.account_name)}
                >
                  {acc.account_type === 'credit_card' ? '💳' : acc.account_type === 'loan' ? '📈' : acc.account_type === 'cash' ? '💵' : '🏦'} {acc.account_name}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'category') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select expense category:</p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-muted/30 rounded-lg">
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('category', cat.name, cat.name)}
                >
                  {cat.icon || '📁'} {cat.name}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'income_category') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select income category:</p>
            <div className="flex flex-wrap gap-2">
              {INCOME_CATEGORIES.map(cat => (
                <Button
                  key={cat.key}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('income_category', cat.key, cat.name)}
                >
                  {cat.icon} {cat.name}
                </Button>
              ))}
            </div>
          </div>
        );
      }
    }

    if (currentIntent === 'account') {
      if (nextMissing === 'account_type') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select account type:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'cash', label: '💵 Cash Wallet', colorClass: 'hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30' },
                { type: 'bank', label: '🏦 Bank Account', colorClass: 'hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30' },
                { type: 'credit_card', label: '💳 Credit Card', colorClass: 'hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30' },
                { type: 'loan', label: '📈 Loan Account', colorClass: 'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' }
              ].map(item => (
                <Button
                  key={item.type}
                  variant="outline"
                  size="sm"
                  className={`bg-card text-foreground transition-all border border-muted text-xs rounded-full shadow-sm ${item.colorClass}`}
                  onClick={() => handleSelectField('account_type', item.type, item.label)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'country') {
        const countryOptions = [
          { code: 'IN', label: '🇮🇳 India', name: 'India' },
          { code: 'US', label: '🇺🇸 United States', name: 'United States' },
          { code: 'GB', label: '🇬🇧 United Kingdom', name: 'United Kingdom' },
          { code: 'EU', label: '🇪🇺 European Union', name: 'European Union' },
          { code: 'SG', label: '🇸🇬 Singapore', name: 'Singapore' },
          { code: 'CA', label: '🇨🇦 Canada', name: 'Canada' },
          { code: 'AU', label: '🇦🇺 Australia', name: 'Australia' }
        ];
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select Country:</p>
            <div className="flex flex-wrap gap-2">
              {countryOptions.map(c => (
                <Button
                  key={c.code}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => {
                    const matchingCountryObj = countries.find(co => co.code === c.code);
                    if (matchingCountryObj) {
                      setDraftAccount(prev => ({
                        ...prev,
                        country: c.code,
                        currency: matchingCountryObj.currency
                      }));
                    }
                    handleSelectField('country', c.code, c.name);
                  }}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'institution_name') {
        const countryBanks = getBanksByCountry(draftAccount.country || 'IN').slice(0, 10);
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select Popular Bank:</p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-muted/30 rounded-lg">
              {countryBanks.map(bank => (
                <Button
                  key={bank.name}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('institution_name', bank.name, bank.name)}
                >
                  {bank.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-dashed hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                onClick={() => {
                  const customName = prompt("Enter bank/institution name:");
                  if (customName && customName.trim()) {
                    handleSelectField('institution_name', customName.trim(), customName.trim());
                  }
                }}
              >
                ➕ Other / Custom Bank
              </Button>
            </div>
          </div>
        );
      }
      
      if (nextMissing === 'currency') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select currency:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'INR', symbol: '₹ INR (Indian Rupee)' },
                { code: 'USD', symbol: '$ USD (US Dollar)' },
                { code: 'EUR', symbol: '€ EUR (Euro)' }
              ].map(curr => (
                <Button
                  key={curr.code}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('currency', curr.code, curr.code)}
                >
                  {curr.symbol}
                </Button>
              ))}
            </div>
          </div>
        );
      }

      if (nextMissing === 'loan_start_date') {
        const todayStr = new Date().toISOString().slice(0, 10);
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select Loan Start Date:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                onClick={() => handleSelectField('loan_start_date', todayStr, `Today (${todayStr})`)}
              >
                📅 Today ({todayStr})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-dashed hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                onClick={() => {
                  const customDate = prompt("Enter Loan Start Date (YYYY-MM-DD):", todayStr);
                  if (customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
                    handleSelectField('loan_start_date', customDate, customDate);
                  } else if (customDate) {
                    alert("Invalid date format. Please use YYYY-MM-DD.");
                  }
                }}
              >
                📅 Custom Date
              </Button>
            </div>
          </div>
        );
      }

      if (nextMissing === 'due_date') {
        const dueDays = [
          { val: 1, label: '1st of month' },
          { val: 5, label: '5th of month' },
          { val: 10, label: '10th of month' },
          { val: 15, label: '15th of month' },
          { val: 20, label: '20th of month' },
          { val: 25, label: '25th of month' }
        ];
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select EMI Payment Due Day:</p>
            <div className="flex flex-wrap gap-2">
              {dueDays.map(d => (
                <Button
                  key={d.val}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('due_date', d.val, d.label)}
                >
                  📅 {d.label}
                </Button>
              ))}
            </div>
          </div>
        );
      }
    }

    if (currentIntent === 'budget') {
      if (nextMissing === 'month') {
        return (
          <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
            <p className="text-xs text-muted-foreground font-semibold">Select budget month:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-muted/30 rounded-lg">
              {[
                { val: 1, label: 'January' },
                { val: 2, label: 'February' },
                { val: 3, label: 'March' },
                { val: 4, label: 'April' },
                { val: 5, label: 'May' },
                { val: 6, label: 'June' },
                { val: 7, label: 'July' },
                { val: 8, label: 'August' },
                { val: 9, label: 'September' },
                { val: 10, label: 'October' },
                { val: 11, label: 'November' },
                { val: 12, label: 'December' }
              ].map(m => (
                <Button
                  key={m.val}
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm font-medium"
                  onClick={() => handleSelectField('month', m.val, m.label)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
        );
      }
    }
    
    return null;
  };


  // Lookup account name helper
  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '';
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.account_name : '';
  };

  // Lookup account balance helper
  const getAccountBalance = (accountId: string | null) => {
    if (!accountId) return null;
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.balance : null;
  };

  const getPanelHeader = () => {
    switch (currentIntent) {
      case 'transaction':
        return { title: 'Draft Receipt', subtitle: 'Live interactive receipt preview' };
      case 'account':
        return { title: 'Bank Passbook', subtitle: 'New account preview' };
      case 'budget':
        return { title: 'Budget Tracker', subtitle: 'Monthly limit preview' };
      case 'emi_calculator':
        return { title: 'Amortization Simulator', subtitle: 'Loan EMI simulation details' };
      default:
        return { title: 'AI Report Pad', subtitle: 'Insights and help summary' };
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Title Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-primary to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary animate-pulse" />
          Smart AI Chatbot
        </h1>
        <p className="text-muted-foreground mt-1">
          Operate each and every process in SmartFinHub instantly through voice commands or interactive chat.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Conversational UI (60% width) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] bg-card/60 backdrop-blur-md border border-muted rounded-2xl shadow-xl overflow-hidden">
          
          {/* Chat Window Container */}
          <ScrollArea className="flex-grow p-4 space-y-4">
            <div className="space-y-4">
              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? 'U' : <Sparkles className="h-4 w-4" />}
                  </div>

                  {/* Bubble Content */}
                  <div className="space-y-2">
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                          : 'bg-muted/80 text-foreground rounded-tl-none border border-muted/50'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Render Interactive Confirmation Controls IN the chat block */}
                    {msg.isInteractive && (
                      <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                          <span className="text-xs text-indigo-200 font-medium">Ready to record this draft transaction?</span>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs w-full sm:w-auto h-8 rounded-lg shadow-sm"
                            onClick={handleResetDraft}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Discard
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full sm:w-auto h-8 rounded-lg shadow-md font-semibold"
                            onClick={handleSaveTransaction}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Confirm & Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming Content Overlay */}
              {streamingText && (
                <div className="flex gap-3 max-w-[85%] mr-auto animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-muted/80 text-foreground rounded-tl-none border border-muted/50">
                    {streamingText}
                  </div>
                </div>
              )}

              {/* Loader */}
              {isLoading && !streamingText && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed bg-muted/50 text-muted-foreground rounded-tl-none flex items-center gap-2 border border-muted/30">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    AI is writing...
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Quick replies & Inputs container */}
          <div className="p-4 border-t border-muted bg-card space-y-4">
            
            {/* Quick reply chips */}
            {renderQuickReplyChips()}

            {/* Bottom input row */}
            <div className="flex items-center gap-2">
              {/* Mic trigger button */}
              {recognitionSupported ? (
                <Button
                  type="button"
                  variant={isListening ? 'destructive' : 'outline'}
                  size="icon"
                  className={`h-11 w-11 rounded-full shrink-0 relative transition-all duration-300 shadow-md ${
                    isListening 
                      ? 'animate-pulse ring-4 ring-destructive/40' 
                      : 'hover:border-primary hover:text-primary hover:bg-primary/5'
                  }`}
                  onClick={toggleListening}
                  title={isListening ? 'Stop listening' : 'Start speaking'}
                >
                  {isListening ? (
                    <div className="flex items-center justify-center">
                      <MicOff className="h-5 w-5" />
                      {/* Interactive soundwave ripples */}
                      <span className="absolute inline-flex h-full w-full rounded-full bg-destructive/30 animate-ping duration-1000"></span>
                    </div>
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-full shrink-0 opacity-50 cursor-not-allowed"
                  disabled
                  title="Speech recognition not supported in this browser"
                >
                  <MicOff className="h-5 w-5" />
                </Button>
              )}

              {/* Chat Input Text Box */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendCommand();
                }}
                className="flex-grow flex items-center gap-2"
              >
                <div className="relative flex-grow">
                  <Input
                    placeholder={
                      isListening 
                        ? "Listening... Speak now..." 
                        : "Type command... e.g. \"spent 500 on dinner\""
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isListening || isLoading}
                    className="pr-12 h-11 bg-muted/40 border-muted focus-visible:ring-primary focus-visible:border-primary/80 transition-all rounded-full"
                  />
                  {inputValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                      onClick={() => setInputValue('')}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 rounded-full shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
                  disabled={!inputValue.trim() || isLoading || isListening}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
            
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" />
              Tip: Mixed language commands are supported! Say "HDFC card se groceries pe 400 kharch kiye."
            </p>
          </div>
        </div>

        {/* Right Side: Morphing Draft & Report Panel (40% width) */}
        <div className="lg:col-span-5 flex flex-col justify-start">
          
          <Card className="border border-muted bg-card/40 backdrop-blur-lg shadow-xl overflow-hidden flex flex-col h-full rounded-2xl">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-1.5 text-foreground">
                    {getPanelHeader().title}
                  </CardTitle>
                  <CardDescription className="text-xs">{getPanelHeader().subtitle}</CardDescription>
                </div>
                <div>
                  {currentIntent === 'transaction' && (
                    draft.transaction_type ? (
                      missingFields.length === 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          READY TO SAVE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="h-3 w-3" />
                          DRAFTING ({missingFields.length} missing)
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
                        WAITING INPUT
                      </Badge>
                    )
                  )}
                  {currentIntent === 'account' && (
                    draftAccount.account_type ? (
                      missingFields.length === 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          READY TO SAVE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="h-3 w-3" />
                          DRAFTING ({missingFields.length} missing)
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
                        WAITING INPUT
                      </Badge>
                    )
                  )}
                  {currentIntent === 'budget' && (
                    draftBudget.month ? (
                      missingFields.length === 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          READY TO SAVE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="h-3 w-3" />
                          DRAFTING ({missingFields.length} missing)
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground border-muted text-xs">
                        WAITING INPUT
                      </Badge>
                    )
                  )}
                  {currentIntent === 'emi_calculator' && (
                    <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold text-xs">
                      EMI SIMULATED
                    </Badge>
                  )}
                  {!['transaction', 'account', 'budget', 'emi_calculator'].includes(currentIntent) && (
                    <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold text-xs">
                      AI REPORT
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 flex-grow flex flex-col justify-between space-y-6">
              
              {/* Intent-based Morphing Details Area */}
              <div className="space-y-6 flex-grow">
                
                {/* 1. TRANSACTION PREVIEW */}
                {currentIntent === 'transaction' && (
                  <div className="space-y-6">
                    {/* Visual Header / Amount representation */}
                    <div className="bg-gradient-to-br from-indigo-950/40 via-muted/40 to-card border border-muted/80 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden group shadow-inner">
                      {draft.transaction_type && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] capitalize">
                            {draft.transaction_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}

                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Amount</span>
                      <div className="flex items-baseline justify-center text-foreground font-bold font-mono">
                        <span className="text-2xl mr-1 text-muted-foreground font-mono">₹</span>
                        <span className={`text-4xl tracking-tight transition-all duration-300 ${draft.amount ? 'text-foreground' : 'text-muted-foreground/30 animate-pulse'}`}>
                          {draft.amount ? draft.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </div>

                      {draft.description && (
                        <p className="text-xs text-muted-foreground italic truncate max-w-[90%]">
                          "{draft.description}"
                        </p>
                      )}
                    </div>

                    {/* Line details */}
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Transaction Type</span>
                        <span className="font-semibold capitalize text-primary">
                          {draft.transaction_type ? draft.transaction_type.replace('_', ' ') : 'Unspecified'}
                        </span>
                      </div>

                      {(!draft.transaction_type || draft.transaction_type !== 'income') && (
                        <div className="flex justify-between items-center py-2 border-b border-muted/50">
                          <span className="text-muted-foreground font-medium">Paid From</span>
                          {draft.from_account_id ? (
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{getAccountName(draft.from_account_id)}</p>
                              {getAccountBalance(draft.from_account_id) !== null && (
                                <p className="text-[10px] text-muted-foreground">Bal: ₹{getAccountBalance(draft.from_account_id)?.toLocaleString('en-IN')}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium flex items-center gap-1.5 animate-pulse">
                              <CreditCard className="h-3.5 w-3.5" />
                              Needs Selection
                            </span>
                          )}
                        </div>
                      )}

                      {draft.transaction_type && draft.transaction_type !== 'expense' && (
                        <div className="flex justify-between items-center py-2 border-b border-muted/50">
                          <span className="text-muted-foreground font-medium">Received In / Destination</span>
                          {draft.to_account_id ? (
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{getAccountName(draft.to_account_id)}</p>
                              {getAccountBalance(draft.to_account_id) !== null && (
                                <p className="text-[10px] text-muted-foreground">Bal: ₹{getAccountBalance(draft.to_account_id)?.toLocaleString('en-IN')}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium flex items-center gap-1.5 animate-pulse">
                              <CreditCard className="h-3.5 w-3.5" />
                              Needs Selection
                            </span>
                          )}
                        </div>
                      )}

                      {draft.transaction_type === 'expense' && (
                        <div className="flex justify-between items-center py-2 border-b border-muted/50">
                          <span className="text-muted-foreground font-medium">Expense Category</span>
                          {draft.category ? (
                            <span className="font-semibold bg-muted/60 text-foreground px-2.5 py-1 rounded-full border text-xs shadow-sm">
                              📁 {draft.category}
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium animate-pulse">
                              📁 Select Category
                            </span>
                          )}
                        </div>
                      )}

                      {draft.transaction_type === 'income' && (
                        <div className="flex justify-between items-center py-2 border-b border-muted/50">
                          <span className="text-muted-foreground font-medium">Income Category</span>
                          {draft.income_category ? (
                            <span className="font-semibold bg-muted/60 text-foreground px-2.5 py-1 rounded-full border text-xs shadow-sm capitalize">
                              📊 {getIncomeCategoryName(draft.income_category)}
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium animate-pulse">
                              📊 Select Category
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Description</span>
                        {draft.description ? (
                          <span className="font-semibold text-foreground max-w-[60%] truncate text-right text-xs">
                            {draft.description}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium animate-pulse">
                            📝 Needs Description
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Date</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {draft.transaction_date || 'Today'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ACCOUNT PASSBOOK PREVIEW */}
                {currentIntent === 'account' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="relative h-48 w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-2xl border border-white/10 overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">
                            {draftAccount.account_type ? `${draftAccount.account_type} account` : 'new account draft'}
                          </span>
                          <h3 className="text-xl font-bold mt-1 tracking-wide truncate max-w-[200px]">
                            {draftAccount.account_name || 'Untitled Account'}
                          </h3>
                          {draftAccount.institution_name && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {draftAccount.account_type !== 'cash' && (
                                <img 
                                  src={getBankLogo(draftAccount.institution_name)} 
                                  alt={draftAccount.institution_name}
                                  className="w-4 h-4 rounded-full bg-white object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <p className="text-[10px] text-indigo-200">{draftAccount.institution_name}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-2xl font-bold bg-white/10 px-3 py-1 rounded-lg border border-white/10">
                            {draftAccount.account_type === 'credit_card' ? '💳' : draftAccount.account_type === 'loan' ? '📈' : draftAccount.account_type === 'cash' ? '💵' : '🏦'}
                          </span>
                          {draftAccount.country && (
                            <Badge className="bg-white/10 text-white border-none text-[9px] uppercase tracking-wider scale-90 origin-right">
                              {draftAccount.country === 'IN' ? '🇮🇳 IN' : 
                               draftAccount.country === 'US' ? '🇺🇸 US' : 
                               draftAccount.country === 'GB' ? '🇬🇧 GB' : 
                               draftAccount.country === 'EU' ? '🇪🇺 EU' : 
                               `${draftAccount.country}`}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[10px] text-indigo-300 block uppercase font-bold">
                            {draftAccount.account_type === 'credit_card' ? 'Credit Limit' : draftAccount.account_type === 'loan' ? 'Principal Amount' : 'Initial Balance'}
                          </span>
                          <span className="text-2xl font-mono font-bold tracking-tight">
                            {draftAccount.account_type === 'credit_card' 
                              ? `₹${(draftAccount.credit_limit || 0).toLocaleString('en-IN')}` 
                              : draftAccount.account_type === 'loan'
                                ? `₹${(draftAccount.loan_principal || 0).toLocaleString('en-IN')}` 
                                : `₹${(draftAccount.balance || 0).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        {draftAccount.last_4_digits && (
                          <div className="text-right font-mono text-xs tracking-wider text-indigo-200">
                            •••• {draftAccount.last_4_digits}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 text-sm mt-4">
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Account Type</span>
                        <span className="font-semibold capitalize text-primary">
                          {draftAccount.account_type || 'Unspecified'}
                        </span>
                      </div>
                      
                      {draftAccount.account_type !== 'cash' && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Country</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.country ? (
                                draftAccount.country === 'IN' ? '🇮🇳 India' :
                                draftAccount.country === 'US' ? '🇺🇸 United States' :
                                draftAccount.country === 'GB' ? '🇬🇧 United Kingdom' :
                                draftAccount.country === 'EU' ? '🇪🇺 European Union' :
                                draftAccount.country
                              ) : (
                                <span className="text-xs text-amber-500 font-medium animate-pulse">Needs Country</span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Bank Name</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.institution_name || (
                                <span className="text-xs text-amber-500 font-medium animate-pulse">Needs Bank Name</span>
                              )}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Currency</span>
                        <span className="font-semibold text-foreground">
                          {draftAccount.currency || 'INR'}
                        </span>
                      </div>

                      {draftAccount.account_type === 'credit_card' && (
                        <div className="flex justify-between items-center py-2 border-b border-muted/50">
                          <span className="text-muted-foreground font-medium">Credit Limit</span>
                          <span className="font-semibold text-foreground font-mono">
                            {draftAccount.credit_limit ? `₹${Number(draftAccount.credit_limit).toLocaleString('en-IN')}` : '₹0.00'}
                          </span>
                        </div>
                      )}

                      {draftAccount.account_type === 'loan' && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Principal Amount</span>
                            <span className="font-semibold text-foreground font-mono">
                              {draftAccount.loan_principal ? `₹${Number(draftAccount.loan_principal).toLocaleString('en-IN')}` : '₹0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Interest Rate</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.current_interest_rate !== null ? `${draftAccount.current_interest_rate}% p.a.` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Tenure Months</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.loan_tenure_months ? `${draftAccount.loan_tenure_months} Months (${(draftAccount.loan_tenure_months / 12).toFixed(1)} yrs)` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Loan Start Date</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.loan_start_date ? (
                                <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-muted-foreground" /> {draftAccount.loan_start_date}</span>
                              ) : (
                                <span className="text-xs text-amber-500 font-medium animate-pulse">Needs Start Date</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-muted/50">
                            <span className="text-muted-foreground font-medium">Payment Due Day</span>
                            <span className="font-semibold text-foreground">
                              {draftAccount.due_date ? (
                                `Day ${draftAccount.due_date} of month`
                              ) : (
                                <span className="text-xs text-amber-500 font-medium animate-pulse">Needs Due Day</span>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. BUDGET PLANNER PREVIEW */}
                {currentIntent === 'budget' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="bg-gradient-to-br from-teal-950/40 via-muted/40 to-card border border-muted/80 rounded-xl p-5 flex flex-col space-y-4 relative overflow-hidden group shadow-inner">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Overall Budget Limit</span>
                          <div className="flex items-baseline text-foreground font-bold mt-1">
                            <span className="text-xl mr-1 text-muted-foreground font-mono">₹</span>
                            <span className="text-3xl tracking-tight text-white font-mono">
                              {(draftBudget.budgeted_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-xl border border-teal-500/20 text-2xl">
                          📅
                        </div>
                      </div>
                      
                      <div className="border-t border-muted/50 pt-3 text-xs flex justify-between text-muted-foreground font-semibold">
                        <span>Budget Month</span>
                        <span className="text-foreground">
                          {draftBudget.month ? new Date(2000, draftBudget.month - 1).toLocaleString('default', { month: 'long' }) : 'N/A'} {draftBudget.year || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {draftBudget.category_budgets && Object.keys(draftBudget.category_budgets).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Category Limits</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {Object.entries(draftBudget.category_budgets).map(([cat, amt]) => (
                            <div key={cat} className="bg-muted/40 border border-muted/50 rounded-lg p-2.5 flex justify-between items-center text-xs">
                              <span className="font-semibold text-foreground">{cat}</span>
                              <span className="font-mono text-foreground font-bold">₹{amt.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EMI CALCULATOR SIMULATOR PREVIEW */}
                {currentIntent === 'emi_calculator' && (
                  <div className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="bg-gradient-to-br from-indigo-950/40 via-muted/40 to-card border border-muted/80 rounded-xl p-5 flex flex-col space-y-4 relative overflow-hidden group shadow-inner">
                      <div className="text-center">
                        <span className="text-xs text-indigo-300 uppercase font-semibold tracking-wider">Monthly Loan EMI</span>
                        <div className="flex items-baseline justify-center text-foreground font-bold mt-1">
                          <span className="text-xl mr-1 text-indigo-400 font-mono">₹</span>
                          <span className="text-3xl tracking-tight text-white font-mono">
                            {draftEMI.monthly_emi ? draftEMI.monthly_emi.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-muted/50">
                        <div className="text-center bg-muted/30 p-2 rounded-lg border border-muted/50">
                          <span className="text-muted-foreground block mb-0.5">Total Interest</span>
                          <span className="font-bold text-foreground font-mono">
                            {draftEMI.total_interest ? `₹${draftEMI.total_interest.toLocaleString('en-IN')}` : '₹0.00'}
                          </span>
                        </div>
                        <div className="text-center bg-muted/30 p-2 rounded-lg border border-muted/50">
                          <span className="text-muted-foreground block mb-0.5">Total Payable</span>
                          <span className="font-bold text-white font-mono">
                            {draftEMI.total_payable ? `₹${draftEMI.total_payable.toLocaleString('en-IN')}` : '₹0.00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 text-sm mt-4">
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Loan Principal</span>
                        <span className="font-semibold text-foreground font-mono">
                          {draftEMI.principal ? `₹${draftEMI.principal.toLocaleString('en-IN')}` : '₹0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Annual Interest Rate</span>
                        <span className="font-semibold text-foreground">
                          {draftEMI.annual_rate ? `${draftEMI.annual_rate}% p.a.` : '0.0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-muted-foreground font-medium">Tenure (Months)</span>
                        <span className="font-semibold text-foreground">
                          {draftEMI.tenure_months ? `${draftEMI.tenure_months} Months (${(draftEMI.tenure_months / 12).toFixed(1)} yrs)` : '0 Months'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. AI REPORT PAD / AUDIT INSIGHTS */}
                {!['transaction', 'account', 'budget', 'emi_calculator'].includes(currentIntent) && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300 flex flex-col h-full">
                    <div className="bg-gradient-to-br from-indigo-950/30 via-muted/20 to-card border border-muted/60 rounded-xl p-5 flex flex-col h-full min-h-[300px] shadow-inner">
                      <div className="flex items-center gap-2 border-b border-muted/40 pb-3 mb-3">
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">AI Financial Report Pad</span>
                      </div>
                      
                      <div className="flex-grow overflow-y-auto max-h-[320px] pr-2 text-xs leading-relaxed text-foreground select-text whitespace-pre-wrap font-medium">
                        {chatMessages.filter(m => m.role === 'model').slice(-1)[0]?.content || "No report generated yet. Type an inquiry or ask for an audit to see detailed analysis reports here!"}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Card Save / Reset Buttons for Interactive Intents */}
              {['transaction', 'account', 'budget'].includes(currentIntent) && (
                <div className="space-y-3 pt-6 border-t border-muted/40">
                  
                  {missingFields.length > 0 && (
                    <div className="text-xs text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      <span>
                        Draft cannot be saved yet. Please specify the missing details: <strong>{missingFields.map(f => f.replace('_id', '').replace('_', ' ')).join(', ')}</strong>.
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-muted hover:bg-destructive/10 hover:text-destructive shrink-0 w-12 h-12 rounded-xl text-foreground"
                      onClick={handleResetDraft}
                      title="Discard current draft"
                    >
                      <Trash2 className="h-5 w-5 animate-none text-foreground" />
                    </Button>
                    
                    <Button
                      className={`flex-grow h-12 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
                        missingFields.length === 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/30'
                          : 'bg-muted text-muted-foreground cursor-not-allowed border'
                      }`}
                      disabled={missingFields.length > 0 || isLoading}
                      onClick={handleConfirmSaveDraft}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          Saving to Database...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5 text-white">
                          <Check className="h-5 w-5 text-white" />
                          Confirm & Save Draft
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
