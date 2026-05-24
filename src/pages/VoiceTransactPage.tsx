import { useState, useEffect, useRef } from 'react';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, categoryApi } from '@/db/api';
import { parseTransactionCommand, type DraftTransactionResult } from '@/services/aiService';
import { INCOME_CATEGORIES, getIncomeCategoryName } from '@/constants/incomeCategories';
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
  Volume2
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

export default function VoiceTransactPage() {
  const { user } = useHybridAuth();
  const { toast } = useToast();
  
  // Dynamic lists
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // UI & Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I am your SmartFinHub AI Assistant. Tell or speak to me about any financial transaction, and I'll draft it for you instantly! E.g. \"Spent 450 on dinner from HDFC Bank\" or \"Received salary of 50000\"."
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
  
  // Transaction Draft State
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
  const validateDraft = (currentDraft: DraftTransaction): string[] => {
    const missing: string[] = [];
    if (!currentDraft.transaction_type) {
      missing.push('transaction_type');
      return missing; // Rest of validation depends on type
    }
    
    if (!currentDraft.amount || currentDraft.amount <= 0) {
      missing.push('amount');
    }
    
    if (!currentDraft.description || !currentDraft.description.trim()) {
      missing.push('description');
    }
    
    const type = currentDraft.transaction_type;
    
    if (type === 'expense') {
      if (!currentDraft.from_account_id) missing.push('from_account_id');
      if (!currentDraft.category) missing.push('category');
    } else if (type === 'income') {
      if (!currentDraft.to_account_id) missing.push('to_account_id');
      if (!currentDraft.income_category) missing.push('income_category');
    } else if (type === 'interest_charge') {
      if (!currentDraft.to_account_id) missing.push('to_account_id');
    } else if (['transfer', 'withdrawal', 'loan_payment', 'credit_card_repayment'].includes(type)) {
      if (!currentDraft.from_account_id) missing.push('from_account_id');
      if (!currentDraft.to_account_id) missing.push('to_account_id');
    }
    
    return missing;
  };

  const handleSendCommand = async (commandToSend?: string) => {
    const commandText = commandToSend || inputValue;
    if (!commandText.trim() || !user) return;
    
    setInputValue('');
    
    // 1. Add user message
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
      // Setup currentDate
      const today = new Date().toISOString().slice(0, 10);
      
      // Feed chat history (max 6 items for context speed)
      const chatHistory = chatMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      let gatheredText = '';
      
      await parseTransactionCommand(
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
        (parsedResult: DraftTransactionResult) => {
          setIsLoading(false);
          setStreamingText('');
          
          let friendlyQuestion = parsedResult.clarificationQuestion;
          const botMsgId = Math.random().toString();
          
          // If the AI processed this as a conversational query (balance, spending check)
          if (parsedResult.isQuery) {
            setChatMessages(prev => [
              ...prev,
              {
                id: botMsgId,
                role: 'model',
                content: friendlyQuestion
              }
            ]);
            return;
          }
          
          // Apply extracted info to state
          const ext = parsedResult.extractedInfo;
          
          // Deep merge or update draft
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
          
          // Re-validate strictly on client-side
          const clientMissing = validateDraft(updatedDraft);
          const isComplete = clientMissing.length === 0;
          
          setDraft(updatedDraft);
          setMissingFields(clientMissing);
          
          // If complete, enable the interactive confirmation bubble
          const botMessage: ChatMessage = {
            id: botMsgId,
            role: 'model',
            content: friendlyQuestion,
            isInteractive: isComplete
          };
          
          setChatMessages(prev => [...prev, botMessage]);
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
    field: 'transaction_type' | 'from_account_id' | 'to_account_id' | 'category' | 'income_category', 
    value: string, 
    displayLabel: string
  ) => {
    const updatedDraft = {
      ...draft,
      [field]: value
    };
    
    // Adjust related parameters if type requires it
    if (field === 'transaction_type') {
      if (value === 'expense') {
        updatedDraft.to_account_id = null;
        updatedDraft.income_category = null;
      } else if (value === 'income') {
        updatedDraft.from_account_id = null;
        updatedDraft.category = null;
      } else if (value === 'transfer' || value === 'withdrawal' || value === 'loan_payment' || value === 'credit_card_repayment') {
        // Keeps both accounts, clear category/income_category
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
    
    const clientMissing = validateDraft(updatedDraft as any);
    const isComplete = clientMissing.length === 0;
    
    setDraft(updatedDraft as any);
    setMissingFields(clientMissing);
    
    // Add conversational messages
    const userMsgId = Math.random().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: `Selected ${displayLabel}`
    };
    
    const botMsgId = Math.random().toString();
    
    let fieldName = field.toString();
    if (field === 'transaction_type') fieldName = 'transaction type';
    else if (field === 'from_account_id' || field === 'to_account_id') fieldName = 'account';
    else if (field === 'category' || field === 'income_category') fieldName = 'category';
    
    const friendlyQuestion = isComplete 
      ? "Awesome! Everything is ready now. Would you like to confirm and save this transaction?"
      : `I've updated the ${fieldName} to ${displayLabel}. What was the details for other missing fields?`;
      
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
    
    const botMsgId = Math.random().toString();
    setChatMessages(prev => [
      ...prev,
      {
        id: botMsgId,
        role: 'model',
        content: "Draft discarded. What transaction would you like to record next?"
      }
    ]);
    
    toast({
      title: 'Draft discarded',
      description: 'The transaction draft has been cleared.'
    });
  };

  // Save draft to database
  const handleSaveTransaction = async () => {
    if (!user || missingFields.length > 0) return;
    
    // Mark as saving in chat history to disable double clicking
    const confirmMessageIndex = chatMessages.findIndex(m => m.isInteractive);
    if (confirmMessageIndex !== -1) {
      const updatedMessages = [...chatMessages];
      updatedMessages[confirmMessageIndex] = {
        ...updatedMessages[confirmMessageIndex],
        isInteractive: false // Clear interactive
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
      
      // Reload accounts balances and recent transactions to ensure inquiries use updated figures
      await loadData();
      
      setIsLoading(false);
      toast({
        title: 'Transaction Saved Successfully!',
        description: `Saved ₹${Number(draft.amount).toFixed(2)} as ${draft.transaction_type}.`,
        variant: 'default'
      });
      
      // Push success message into chat
      const successBotMsgId = Math.random().toString();
      setChatMessages(prev => [
        ...prev,
        {
          id: successBotMsgId,
          role: 'model',
          content: `🎉 Success! I have verified and saved your transaction of ₹${Number(draft.amount).toFixed(2)} to the database. Your balances are updated! What else can I do for you?`
        }
      ]);
      
      // Clear draft
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

  // Determine what type of quick reply chips to show
  const renderQuickReplyChips = () => {
    if (isLoading || missingFields.length === 0) return null;
    
    const nextMissing = missingFields[0]; // Address first missing field
    
    if (nextMissing === 'transaction_type') {
      return (
        <div className="space-y-2 mt-2 animate-in fade-in-50 duration-300">
          <p className="text-xs text-muted-foreground font-semibold">Select transaction type:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-red-500/10 hover:text-red-400 transition-all border border-muted hover:border-red-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'expense', 'Expense')}
            >
              📤 Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-emerald-500/10 hover:text-emerald-400 transition-all border border-muted hover:border-emerald-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'income', 'Income')}
            >
              📥 Income
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-blue-500/10 hover:text-blue-400 transition-all border border-muted hover:border-blue-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'transfer', 'Transfer')}
            >
              🔄 Transfer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-orange-500/10 hover:text-orange-400 transition-all border border-muted hover:border-orange-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'withdrawal', 'Withdrawal')}
            >
              🪙 Withdrawal
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-teal-500/10 hover:text-teal-400 transition-all border border-muted hover:border-teal-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'loan_payment', 'Loan Payment')}
            >
              📈 Loan Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-purple-500/10 hover:text-purple-400 transition-all border border-muted hover:border-purple-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'credit_card_repayment', 'Credit Card Repayment')}
            >
              💳 CC Repayment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card text-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-all border border-muted hover:border-indigo-500/30 text-xs rounded-full shadow-sm"
              onClick={() => handleSelectField('transaction_type', 'interest_charge', 'Interest Charge')}
            >
              📊 Interest Charge
            </Button>
          </div>
        </div>
      );
    }
    
    if (nextMissing === 'from_account_id') {
      const filteredAccounts = accounts.filter(a => {
        // Filter logical accounts for expenses, CC repayment sources, transfers
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
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm"
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
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm"
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
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm"
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
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary transition-all border border-muted hover:border-primary/50 text-xs rounded-full shadow-sm"
                onClick={() => handleSelectField('income_category', cat.key, cat.name)}
              >
                {cat.icon} {cat.name}
              </Button>
            ))}
          </div>
        </div>
      );
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

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Title Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 via-primary to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          AI Voice & Chat Transact
        </h1>
        <p className="text-muted-foreground mt-1">
          Draft and save transactions instantly by typing or speaking in natural language.
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

        {/* Right Side: Receipt/Credit Card Draft Preview (40% width) */}
        <div className="lg:col-span-5 flex flex-col justify-start">
          
          <Card className="border border-muted bg-card/40 backdrop-blur-lg shadow-xl overflow-hidden flex flex-col h-full rounded-2xl">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-1.5 text-foreground">
                    Draft Receipt
                  </CardTitle>
                  <CardDescription className="text-xs">Live interactive preview</CardDescription>
                </div>
                <div>
                  {draft.transaction_type ? (
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
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 flex-grow flex flex-col justify-between space-y-6">
              
              {/* Main Receipt Details Area */}
              <div className="space-y-6">
                
                {/* Visual Header / Amount representation */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-muted/40 to-card border border-muted/80 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden group shadow-inner">
                  {/* Transaction Type Indicator */}
                  {draft.transaction_type && (
                    <div className="absolute top-2 right-2">
                      {draft.transaction_type === 'expense' && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">Expense</Badge>}
                      {draft.transaction_type === 'income' && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Income</Badge>}
                      {draft.transaction_type === 'transfer' && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">Transfer</Badge>}
                      {draft.transaction_type === 'withdrawal' && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">Withdrawal</Badge>}
                      {draft.transaction_type === 'loan_payment' && <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px]">Loan Payment</Badge>}
                      {draft.transaction_type === 'credit_card_repayment' && <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">CC Repayment</Badge>}
                    </div>
                  )}

                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Amount</span>
                  <div className="flex items-baseline justify-center text-foreground font-bold">
                    <span className="text-2xl mr-1 text-muted-foreground">₹</span>
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
                  
                  {/* Transaction Type Row */}
                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Transaction Type</span>
                    <span className={`font-semibold capitalize flex items-center gap-1.5 ${
                      draft.transaction_type === 'income' ? 'text-emerald-400' : draft.transaction_type === 'expense' ? 'text-red-400' : 'text-primary'
                    }`}>
                      {draft.transaction_type ? (
                        <>
                          {draft.transaction_type === 'expense' && <ArrowUpRight className="h-4 w-4" />}
                          {draft.transaction_type === 'income' && <ArrowDownLeft className="h-4 w-4" />}
                          {draft.transaction_type === 'transfer' && <ArrowLeftRight className="h-4 w-4" />}
                          {draft.transaction_type === 'withdrawal' && <Coins className="h-4 w-4" />}
                          {draft.transaction_type === 'loan_payment' && <ArrowUpRight className="h-4 w-4" />}
                          {draft.transaction_type === 'credit_card_repayment' && <ArrowUpRight className="h-4 w-4" />}
                          {draft.transaction_type.replace('_', ' ')}
                        </>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1 font-normal text-xs animate-pulse">
                          <AlertCircle className="h-3 w.5" />
                          Unspecified
                        </span>
                      )}
                    </span>
                  </div>

                  {/* From Account Row */}
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
                        <span className={`text-xs px-2.5 py-1 rounded-md border border-dashed font-medium flex items-center gap-1.5 transition-all ${
                          draft.transaction_type ? 'border-amber-500/50 text-amber-500 bg-amber-500/5 animate-pulse' : 'border-muted text-muted-foreground'
                        }`}>
                          <CreditCard className="h-3.5 w-3.5" />
                          Needs Selection
                        </span>
                      )}
                    </div>
                  )}

                  {/* To Account Row */}
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

                  {/* Category / Income Category Row */}
                  {draft.transaction_type === 'expense' && (
                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-muted-foreground font-medium">Expense Category</span>
                      {draft.category ? (
                        <span className="font-semibold bg-muted/60 text-foreground px-2.5 py-1 rounded-full border text-xs flex items-center gap-1 shadow-sm">
                          📁 {draft.category}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium flex items-center gap-1 animate-pulse">
                          📁 Select Category
                        </span>
                      )}
                    </div>
                  )}

                  {draft.transaction_type === 'income' && (
                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-muted-foreground font-medium">Income Category</span>
                      {draft.income_category ? (
                        <span className="font-semibold bg-muted/60 text-foreground px-2.5 py-1 rounded-full border text-xs flex items-center gap-1 shadow-sm capitalize">
                          📊 {getIncomeCategoryName(draft.income_category)}
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium flex items-center gap-1 animate-pulse">
                          📊 Select Category
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description Row */}
                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Description</span>
                    {draft.description ? (
                      <span className="font-semibold text-foreground max-w-[60%] truncate text-right text-xs" title={draft.description}>
                        {draft.description}
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-md border border-dashed border-amber-500/50 text-amber-500 bg-amber-500/5 font-medium flex items-center gap-1 animate-pulse">
                        📝 Needs Description
                      </span>
                    )}
                  </div>

                  {/* Transaction Date Row */}
                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Date</span>
                    <span className="font-semibold flex items-center gap-1.5 text-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {draft.transaction_date ? new Date(draft.transaction_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Today'}
                    </span>
                  </div>

                </div>

              </div>

              {/* Card Save Buttons */}
              <div className="space-y-3 pt-6">
                
                {missingFields.length > 0 && draft.transaction_type && (
                  <div className="text-xs text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>
                      Draft cannot be saved yet. Please specify the missing details: <strong>{missingFields.map(f => f.replace('_id', '').replace('_', ' ')).join(', ')}</strong>.
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  {draft.transaction_type && (
                    <Button
                      variant="outline"
                      className="border-muted hover:bg-destructive/10 hover:text-destructive shrink-0 w-12 h-12 rounded-xl"
                      onClick={handleResetDraft}
                      title="Discard current draft"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    className={`flex-grow h-12 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
                      missingFields.length === 0 && draft.transaction_type
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/30'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border'
                    }`}
                    disabled={missingFields.length > 0 || !draft.transaction_type || isLoading}
                    onClick={handleSaveTransaction}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving to Database...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="h-5 w-5" />
                        Confirm & Save Draft
                      </span>
                    )}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
