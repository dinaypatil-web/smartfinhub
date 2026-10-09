// Custom robust SSE parser implementation

const APP_ID = import.meta.env.VITE_APP_ID || 'smartfinhub';
const AI_API_URL = 'https://api-integrations.appmedo.com/app-7wraacwkpcld/api-rLob8RdzAOl9/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

export interface AIMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface AIAnalysisData {
  totalIncome: number;
  totalExpenses: number;
  budgetedExpenses: number;
  transactions: Array<{
    type: string;
    category: string;
    amount: number;
    date: string;
    description?: string;
  }>;
  accountBalances: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
  historicalData?: {
    monthlyAverages: {
      income: number;
      expenses: number;
      savings: number;
    };
    categoryTrends: Record<string, number[]>;
    lastThreeMonths: Array<{
      month: string;
      income: number;
      expenses: number;
      savings: number;
    }>;
  };
}

export async function generateFinancialAnalysis(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const prompt = buildFinancialAnalysisPrompt(data);

    const payload = {
      contents: [
        {
          role: 'user' as const,
          parts: [{ text: prompt }],
        },
      ],
    };

    if (!APP_ID) {
      throw new Error('AI service not configured. Please set VITE_APP_ID in your .env file.');
    }

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.status === 999) {
        throw new Error(errorData.msg || 'API request failed');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          completed = true;
          onComplete();
          break;
        }

        try {
          const parsedData = JSON.parse(dataStr);
          const text = parsedData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            onChunk(text);
          }

          const finishReason = parsedData.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP' && !completed) {
            completed = true;
            onComplete();
            break;
          }
        } catch (e) {
          console.error('Error parsing SSE line:', e, dataStr);
        }
      }

      if (completed) {
        break;
      }
    }

    if (!completed) {
      onComplete();
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to generate analysis');
  }
}

function buildFinancialAnalysisPrompt(data: AIAnalysisData): string {
  const totalIncomeNum = Number(data.totalIncome || 0);
  const totalExpensesNum = Number(data.totalExpenses || 0);
  const budgetedExpensesNum = Number(data.budgetedExpenses || 0);

  const savingsRate = totalIncomeNum > 0
    ? ((totalIncomeNum - totalExpensesNum) / totalIncomeNum * 100).toFixed(1)
    : '0';

  const budgetAdherence = budgetedExpensesNum > 0
    ? ((totalExpensesNum / budgetedExpensesNum) * 100).toFixed(1)
    : 'N/A';

  const categoryBreakdown = data.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const amt = Number(t.amount || 0);
      acc[t.category] = (acc[t.category] || 0) + amt;
      return acc;
    }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
    .join(', ');

  let historicalSection = '';
  if (data.historicalData) {
    const { monthlyAverages, lastThreeMonths } = data.historicalData;
    historicalSection = `

**Historical Trends (Last 3 Months):**
${lastThreeMonths.map(m => {
      const inc = Number(m.income || 0);
      const exp = Number(m.expenses || 0);
      const sav = Number(m.savings || 0);
      return `- ${m.month}: Income ₹${inc.toFixed(2)}, Expenses ₹${exp.toFixed(2)}, Savings ₹${sav.toFixed(2)}`;
    }).join('\n')}

**Monthly Averages:**
- Average Income: ₹${Number(monthlyAverages.income || 0).toFixed(2)}
- Average Expenses: ₹${Number(monthlyAverages.expenses || 0).toFixed(2)}
- Average Savings: ₹${Number(monthlyAverages.savings || 0).toFixed(2)}`;
  }

  return `You are a professional financial advisor with expertise in personal finance management. Analyze the following financial data and provide comprehensive insights, current month advice, and future budget recommendations.

**Current Month Financial Summary:**
- Total Income: ₹${totalIncomeNum.toFixed(2)}
- Total Expenses: ₹${totalExpensesNum.toFixed(2)}
- Budgeted Expenses: ₹${budgetedExpensesNum.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Budget Adherence: ${budgetAdherence}%

**Top Expense Categories:**
${topCategories || 'No expenses recorded'}

**Account Balances:**
${data.accountBalances.map(acc => {
    const bal = Number(acc.balance || 0);
    let note = '';
    if (acc.type === 'credit_card' && bal < 0) {
      note = ' (Note: This negative balance represents a positive advance payment/credit surplus - the user has paid ahead)';
    }
    return `- ${acc.name} (${acc.type}): ₹${bal.toFixed(2)}${note}`;
  }).join('\n')}
${historicalSection}

**Recent Transactions (last 10):**
${data.transactions.slice(-10).map(t => {
    const desc = t.description ? ` - "${t.description}"` : '';
    const amt = Number(t.amount || 0);
    return `- ${t.date}: ${t.type} - ${t.category} - ₹${amt.toFixed(2)}${desc}`;
  }).join('\n')}

**IMPORTANT**: Pay special attention to transaction descriptions as they provide valuable context about spending patterns, merchant names, and specific purchase details. Use these descriptions to:
- Identify recurring expenses and subscriptions
- Detect unusual or one-time purchases
- Recognize specific merchants or vendors
- Understand the nature of expenses better
- Provide more personalized and actionable recommendations

**Credit Card Advance Payments**: Pay close attention to credit card balances. A negative credit card balance represents an **advance payment (credit surplus)**, meaning the user has proactively paid ahead. This is a highly positive financial habit. If you detect any negative credit card balances:
- Explicitly commend the user for this proactive advance payment habit.
- Treat it as a credit surplus/asset rather than a debt liability in your analysis.
- Highlight it as a major strength in the 'Financial Health Assessment' section.

Please provide a comprehensive analysis with the following sections:

## 1. Current Month Analysis & Advice
- Evaluate spending patterns for the current month
- Identify any unusual or concerning transactions (use descriptions for context)
- Provide specific recommendations for the remaining days of this month
- Highlight areas where the user is doing well (including commendation for credit card advance payments/pre-payments)

## 2. Financial Health Assessment
- Overall evaluation of current financial situation
- Comparison with historical trends (if available)
- Strengths and areas for improvement

## 3. Budget Analysis
- How well expenses align with the budget
- Categories that are over/under budget
- Areas of concern and opportunities

## 4. Future Budget Recommendations
Based on historical data and current trends, suggest:
- Recommended budget for next month (category-wise breakdown)
- Realistic savings targets
- Adjustments to current spending patterns
- Expected outcomes if recommendations are followed

## 5. Expense Optimization Strategies
- Specific, actionable recommendations to reduce expenses
- Category-wise suggestions for the top spending categories
- Use transaction descriptions to identify specific merchants or services that could be optimized
- Quick wins vs. long-term changes

## 6. Savings & Investment Opportunities
- Ways to increase savings based on spending patterns
- Suggestions for emergency fund building
- Investment recommendations based on savings capacity

## 7. Action Plan
- Prioritized steps to improve financial health
- Timeline for implementing changes
- Metrics to track progress

Format your response in clear sections with bullet points and specific numbers. Be practical, encouraging, and data-driven. Use emojis sparingly for visual appeal.`;
}

export async function generateBudgetOptimization(
  data: AIAnalysisData,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const prompt = `You are a financial planning expert. Based on the following financial data, suggest an optimized monthly budget that reduces expenses while maintaining quality of life.

**Current Financial Data:**
- Monthly Income: ₹${Number(data.totalIncome || 0).toFixed(2)}
- Current Expenses: ₹${Number(data.totalExpenses || 0).toFixed(2)}
- Current Budget: ₹${Number(data.budgetedExpenses || 0).toFixed(2)}

**Expense Breakdown:**
${Object.entries(
    data.transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const amt = Number(t.amount || 0);
        acc[t.category] = (acc[t.category] || 0) + amt;
        return acc;
      }, {} as Record<string, number>)
  )
      .map(([cat, amt]) => `- ${cat}: ₹${amt.toFixed(2)}`)
      .join('\n')}

Please provide:
1. **Optimized Budget Allocation**: Suggested budget for each category
2. **Reduction Targets**: Specific percentage or amount to reduce in each category
3. **Priority Areas**: Which expenses to tackle first
4. **Practical Tips**: How to achieve these reductions without sacrificing essentials
5. **Expected Savings**: Total monthly savings from the optimized budget

Be realistic and practical. Focus on sustainable changes.`;

    const payload = {
      contents: [
        {
          role: 'user' as const,
          parts: [{ text: prompt }],
        },
      ],
    };

    if (!APP_ID) {
      throw new Error('AI service not configured. Please set VITE_APP_ID in your .env file.');
    }

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.status === 999) {
        throw new Error(errorData.msg || 'API request failed');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          completed = true;
          onComplete();
          break;
        }

        try {
          const parsedData = JSON.parse(dataStr);
          const text = parsedData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            onChunk(text);
          }

          const finishReason = parsedData.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP' && !completed) {
            completed = true;
            onComplete();
            break;
          }
        } catch (e) {
          console.error('Error parsing SSE line:', e, dataStr);
        }
      }

      if (completed) {
        break;
      }
    }

    if (!completed) {
      onComplete();
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to generate optimization');
  }
}

export interface BatchTransactionItem {
  transaction_type: 'income' | 'expense';
  amount: number;
  from_account_id?: string | null;
  to_account_id?: string | null;
  account_name?: string | null;
  category?: string | null;
  income_category?: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
  description?: string | null;
  transaction_date?: string | null;
}

export interface SmartChatbotResult {
  intent: 'transaction' | 'account' | 'budget' | 'financial_inquiry' | 'emi_calculator' | 'financial_analysis' | 'general_help';
  extractedInfo: {
    // For transaction
    transaction_type?: 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | 'interest_charge' | null;
    amount?: number | null;
    from_account_id?: string | null;
    to_account_id?: string | null;
    category?: string | null;
    income_category?: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
    description?: string | null;
    transaction_date?: string | null;
    is_emi?: boolean | null;
    emi_months?: number | null;
    bank_charges?: number | null;

    // For account
    account_type?: 'cash' | 'bank' | 'credit_card' | 'loan' | null;
    account_name?: string | null;
    balance?: number | null;
    currency?: string | null;
    country?: string | null;
    institution_name?: string | null;
    last_4_digits?: string | null;
    credit_limit?: number | null;
    loan_principal?: number | null;
    loan_tenure_months?: number | null;
    current_interest_rate?: number | null;
    loan_start_date?: string | null;
    due_date?: number | null;
    statement_day?: number | null;
    due_day?: number | null;
    web_url?: string | null;
    ios_app_url?: string | null;
    android_app_url?: string | null;
    institution_logo?: string | null;

    // For budget
    month?: number | null;
    year?: number | null;
    budgeted_income?: number | null;
    budgeted_expenses?: number | null;
    category_budgets?: Record<string, number> | null;

    // For emi_calculator
    principal?: number | null;
    annual_rate?: number | null;
    tenure_months?: number | null;
  };
  batchTransactions?: BatchTransactionItem[];
  isComplete: boolean;
  missingFields: string[];
  reply?: string;
  clarificationQuestion: string;
  extraContext?: any;
}

// Local heuristic fallback for common queries or when API is unreachable
function tryLocalHeuristicFallback(
  command: string,
  accounts: any[],
  categories: any[],
  currentDate: string
): SmartChatbotResult | null {
  const text = command.trim().toLowerCase();

  // 1. Show bank balances
  if (text.includes('balance') || text === 'show my bank balances' || text === 'balances') {
    const list = accounts.length > 0
      ? accounts.map(a => `• **${a.account_name}** (${a.account_type}): ₹${Number(a.balance).toLocaleString('en-IN')}`).join('\n')
      : 'No accounts recorded yet.';
    const reply = `Here are your current account balances:\n\n${list}`;
    return {
      intent: 'financial_inquiry',
      extractedInfo: {},
      isComplete: true,
      missingFields: [],
      reply,
      clarificationQuestion: reply,
      extraContext: { accounts }
    };
  }

  // 2. What categories do I have
  if (text.includes('category') || text.includes('categories')) {
    const catList = categories.length > 0
      ? categories.map(c => `• ${c.name}`).join('\n')
      : '• Food & Dining\n• Groceries\n• Transportation\n• Utilities\n• Entertainment';
    const reply = `Here are your available expense categories:\n\n${catList}\n\n**Income Categories:**\n• Salaries\n• Allowances\n• Family Income\n• Others`;
    return {
      intent: 'financial_inquiry',
      extractedInfo: {},
      isComplete: true,
      missingFields: [],
      reply,
      clarificationQuestion: reply,
      extraContext: { categories }
    };
  }

  // 3. Quick transaction extraction fallback (supporting both single and multi-transaction)
  // Check if multiple transactions are present (separated by 'and', commas, or newlines)
  const segments = command.split(/\r?\n|(?:\s+and\s+)|(?:\s*,\s*(?=(?:spent|paid|received|got|salary|income|\d+)))/i).map(s => s.trim()).filter(Boolean);
  
  const extractedBatch: any[] = [];
  
  for (const seg of segments) {
    const segText = seg.toLowerCase();
    const segAmtMatch = seg.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
    if (!segAmtMatch) continue;

    const segAmt = parseFloat(segAmtMatch[1].replace(/,/g, ''));
    if (isNaN(segAmt) || segAmt <= 0) continue;

    const isInc = segText.includes('salary') || segText.includes('income') || segText.includes('credit') || segText.includes('received') || segText.includes('deposit');
    const matchedAcc = accounts.find(a => segText.includes(a.account_name.toLowerCase()));
    const matchedCat = categories.find(c => segText.includes(c.name.toLowerCase()));

    // Date check
    let segDate = currentDate;
    if (segText.includes('yesterday')) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      segDate = d.toISOString().slice(0, 10);
    }

    if (isInc) {
      extractedBatch.push({
        transaction_type: 'income',
        amount: segAmt,
        to_account_id: matchedAcc?.id || null,
        income_category: 'others',
        category: 'Others',
        description: seg.trim(),
        transaction_date: segDate
      });
    } else {
      // Expense - category must NEVER remain blank
      extractedBatch.push({
        transaction_type: 'expense',
        amount: segAmt,
        from_account_id: matchedAcc?.id || null,
        category: matchedCat ? matchedCat.name : (segText.includes('grocer') ? 'Groceries' : (segText.includes('petrol') || segText.includes('fuel') ? 'Transportation' : (categories[0]?.name || 'Others'))),
        description: seg.trim(),
        transaction_date: segDate
      });
    }
  }

  if (extractedBatch.length > 1) {
    const reply = `I've prepared a batch of **${extractedBatch.length} transactions** (${extractedBatch.filter(b => b.transaction_type === 'expense').length} expenses, ${extractedBatch.filter(b => b.transaction_type === 'income').length} income). All categories are assigned and ready for review!`;
    return {
      intent: 'transaction',
      extractedInfo: extractedBatch[0],
      batchTransactions: extractedBatch,
      isComplete: true,
      missingFields: [],
      reply,
      clarificationQuestion: reply
    };
  }

  // Single transaction extraction
  const amountMatch = command.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    const amountVal = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(amountVal) && amountVal > 0) {
      // Check for salary / income
      const isIncome = text.includes('salary') || text.includes('income') || text.includes('credit') || text.includes('received');
      const isCCRepay = text.includes('repay') || text.includes('bill') || text.includes('credit card');

      // Date check
      let dateVal = currentDate;
      if (text.includes('yesterday')) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        dateVal = d.toISOString().slice(0, 10);
      }

      // Matched account
      const matchedAcc = accounts.find(a => text.includes(a.account_name.toLowerCase()));
      // Matched category
      const matchedCat = categories.find(c => text.includes(c.name.toLowerCase()));

      const extractedInfo: any = {
        amount: amountVal,
        transaction_date: dateVal,
        description: command.trim()
      };

      if (isCCRepay) {
        extractedInfo.transaction_type = 'credit_card_repayment';
        extractedInfo.to_account_id = accounts.find(a => a.account_type === 'credit_card')?.id || null;
        extractedInfo.from_account_id = matchedAcc?.id || null;
      } else if (isIncome) {
        extractedInfo.transaction_type = 'income';
        extractedInfo.income_category = text.includes('salary') ? 'salaries' : 'others';
        extractedInfo.to_account_id = matchedAcc?.id || null;
      } else {
        extractedInfo.transaction_type = 'expense';
        // Category must NEVER remain blank
        extractedInfo.category = matchedCat ? matchedCat.name : (text.includes('grocer') ? 'Groceries' : (text.includes('petrol') || text.includes('fuel') ? 'Transportation' : (categories[0]?.name || 'Others')));
        extractedInfo.from_account_id = matchedAcc?.id || null;
      }

      const missing: string[] = [];
      if (!extractedInfo.from_account_id && extractedInfo.transaction_type === 'expense') {
        missing.push('from_account_id');
      }

      const reply = `I've prepared a ${extractedInfo.transaction_type} of ₹${amountVal.toLocaleString('en-IN')}${extractedInfo.category ? ` for ${extractedInfo.category}` : ''} on ${dateVal}.${missing.length > 0 ? ' Which account did you pay from?' : ' Form is auto-filled and ready!'}`;

      return {
        intent: 'transaction',
        extractedInfo,
        batchTransactions: [extractedInfo],
        isComplete: missing.length === 0,
        missingFields: missing,
        reply,
        clarificationQuestion: reply
      };
    }
  }

  return null;
}

export async function parseSmartChatbotCommand(
  params: {
    command: string;
    accounts: any[];
    categories: any[];
    transactions: any[];
    chatHistory: Array<{ role: 'user' | 'model'; content: string }>;
    currentDate: string;
  },
  onChunk: (text: string) => void,
  onComplete: (result: SmartChatbotResult) => void,
  onError: (error: string) => void
): Promise<void> {
  const { command, accounts, categories, transactions, chatHistory, currentDate } = params;

  try {
    const accountsContext = accounts.map(a => `- ID: "${a.id}", Name: "${a.account_name}", Type: "${a.account_type}", Balance: ${a.balance}, Currency: "${a.currency}"`).join('\n');
    const categoriesContext = categories.map(c => `- Name: "${c.name}", Icon: "${c.icon}"`).join('\n');
    
    // Map transactions list to highly readable text for the LLM
    const transactionsContext = transactions.slice(0, 100).map(t => {
      const fromName = accounts.find(a => a.id === t.from_account_id)?.account_name || 'N/A';
      const toName = accounts.find(a => a.id === t.to_account_id)?.account_name || 'N/A';
      const catName = t.category || t.income_category || 'Uncategorized';
      return `- Date: ${t.transaction_date}, Type: ${t.transaction_type}, Amount: ₹${t.amount}, Category: ${catName}, Description: "${t.description || ''}", From: "${fromName}", To: "${toName}"`;
    }).join('\n');

    const prompt = `You are a highly intelligent Smart AI Chatbot for the SmartFinHub personal finance app.
    Your job is to parse the user's natural language input (chat or voice) and perform one of the following operations:
    1. Manage Transactions (intent: "transaction")
    2. Manage Accounts (intent: "account")
    3. Manage Budgets (intent: "budget")
    4. Solve Loan EMI Payment Calculations (intent: "emi_calculator")
    5. Answer Financial Inquiries about balances, spending, or audits (intent: "financial_inquiry")
    6. Generate Financial Analysis reports (intent: "financial_analysis")
    7. Provide general support instructions (intent: "general_help")
    
    Here is the context of the user's existing accounts:
    ${accountsContext || 'No accounts recorded yet.'}
    
    Here is the context of the user's available expense categories:
    ${categoriesContext || 'No expense categories recorded yet.'}
    
    Static Income Categories are:
    - key: "salaries", Name: "Salaries"
    - key: "allowances", Name: "Allowances"
    - key: "family_income", Name: "Family Income"
    - key: "others", Name: "Others"
    
    Here is the context of the user's recent transactions (last 100):
    ${transactionsContext || 'No recent transactions recorded.'}
    
    Today's date is: ${currentDate}
    Default currency is INR (₹).

    LEARNING & PREFERENCE RULES:
    - Carefully analyze the provided context of the user's recent transactions (last 100) to learn their spending patterns, preferred accounts, and category mappings.
    - If the user provides a brief command (e.g., "spent 250 at Starbucks" or "McDonald's 500"), use the history to resolve the most likely "category" (e.g., matching "Starbucks" to "Food & Dining" because of previous transactions) and "from_account_id" (e.g., HDFC Bank account if they typically pay HDFC there).
    - Leverage this history to auto-fill missing details seamlessly, so the bot gets smarter with every transaction the user records!

    CRITICAL RULES FOR "reply" AND "clarificationQuestion":
    You MUST ALWAYS provide a friendly, helpful, natural conversational message in "reply" (and duplicate it in "clarificationQuestion").
    - NEVER leave "reply" or "clarificationQuestion" empty or null!
    - For intent "transaction":
      - When complete: Confirm what was auto-filled (e.g., "Got it! I have set up an income of ₹50,000 for Salary deposited into HDFC Bank on 2026-09-19.").
      - When incomplete: Acknowledge what was extracted, and gently prompt for what is still needed (e.g., "I've recorded ₹350 for Groceries on 2026-09-18. Which account was used for this payment?").
    - For intent "financial_inquiry":
      - Answer the user's question directly and thoroughly with clean markdown formatting. For example, for "Show my bank balances", list each account, its type, and its balance in INR (₹). For "What categories do I have?", list all categories.
    - For intent "emi_calculator":
      - Provide a clear summary with the monthly EMI amount, total interest payable, and total cost.
    - For intent "general_help":
      - Provide a friendly, concise list of examples of what you can do (recording expenses, checking balances, budget tracking, calculating EMIs).

    RULES FOR DETECTING INTENTS & REQUIRED FIELDS:
    
    1. intent: "transaction"
       - Triggered if the user wants to record spent money, salary received, transfer funds, cash withdrawal, credit card bill repayment, or loan payment.
       - Required fields: "transaction_type", "amount" (positive number), "description".
       - Specific required fields by type:
         - expense: from_account_id (matched from accounts), category (matched from categories).
         - income: to_account_id (matched from accounts), income_category (salaries/allowances/family_income/others).
         - transfer / withdrawal / loan_payment / credit_card_repayment: both from_account_id and to_account_id.
         - interest_charge: to_account_id.
       - MULTI-TRANSACTION BATCH POSTING RULES:
         * If the user specifies multiple transactions in the input (e.g. "spent 500 on groceries and 200 on petrol", pasted SMS/statements, or comma/newline separated items), set intent: "transaction".
         * Multi-transaction batch posting ALLOWS ONLY "income" OR "expense" transactions. Transfers, withdrawals, loans, and repayments are NOT allowed in batch mode (omit or classify as expense/income).
         * Populate "batchTransactions": an array of items with { transaction_type: "expense" | "income", amount: number, category: string, income_category: string, from_account_id: string | null, to_account_id: string | null, description: string, transaction_date: "YYYY-MM-DD" }.
         * Also populate "extractedInfo" with the first transaction in the batch for backwards compatibility.
         * CRITICAL CATEGORY RULE: Expense/Income Category SHALL NEVER REMAIN BLANK OR NULL.
           - For each expense: "category" is STRICTLY REQUIRED. Match with the user's available expense categories (e.g., "Groceries", "Food & Dining", "Utilities", etc.). If no category fits, use "Others". Never leave it empty or null!
           - For each income: "income_category" is STRICTLY REQUIRED. Must be one of ["salaries", "allowances", "family_income", "others"]. Default to "others" if unspecified. Never leave it empty or null!
         * Reply clearly summarizing the batch count (e.g. "I have prepared 3 transactions (2 expenses, 1 income) for your review. Please verify the accounts and click Submit to post them!").
       - Special Credit Card EMI extraction (single transaction): If the user mentions converting a credit card transaction or expense to EMI (e.g., "convert to 12 months EMI with 500 charges"), extract:
         - "is_emi": true (boolean)
         - "emi_months": total number of months (integer, e.g., 6 or 12)
         - "bank_charges": processing fee or bank charges amount (number, default 0 if not mentioned)
       - Missing fields go in "missingFields".
       
    2. intent: "account"
       - Triggered if the user wants to add/create a new account, card, cash wallet, or loan profile. E.g. "Create a new bank account named HDFC Savings with balance 10000" or "Add a new credit card named SBI Card with limit 150000".
       - Required fields by type:
         - cash: "account_type", "account_name".
         - bank: "account_type", "account_name", "country", "currency", "institution_name".
         - credit_card: "account_type", "account_name", "country", "currency", "institution_name", "credit_limit", "statement_day", "due_day".
         - loan: "account_type", "account_name", "country", "currency", "institution_name", "loan_principal", "loan_tenure_months", "current_interest_rate", "loan_start_date", "due_date".
       
    3. intent: "budget"
       - Triggered if the user wants to set a monthly budget or category budget.
       - Extracted fields: "month", "year", "budgeted_income", "budgeted_expenses", "category_budgets".
       
    4. intent: "emi_calculator"
       - Triggered if the user wants to calculate or simulate loan payments.
       - Calculation: If all fields are complete, perform the exact monthly EMI calculation: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1] where P = principal, r = annual_rate/12/100, n = tenure_months. Put the calculated EMI, total interest, and a friendly summary inside "reply" and return calculation details inside "extraContext" as: {"monthly_emi": X, "total_interest": Y, "total_payable": Z}.
       
    5. intent: "financial_inquiry"
       - Triggered if the user asks a question about balances, spent totals, or available categories.
       - Return the calculated answer directly in "reply". Set "isComplete" to true.
       
    6. intent: "financial_analysis"
       - Return a markdown analysis report in "reply".
       
    7. intent: "general_help"
       - Explain how the user can operate transactions, accounts, budgets, and EMI calculations in "reply".

    Current natural language input: "${command}"
    
    You must respond with ONLY a valid JSON object in this exact schema. Do not output any markdown wrapper or explanation, just the JSON string itself.
    
    {
      "intent": "transaction" | "account" | "budget" | "financial_inquiry" | "emi_calculator" | "financial_analysis" | "general_help",
      "extractedInfo": {
        "transaction_type": "income" | "expense" | "withdrawal" | "transfer" | "loan_payment" | "credit_card_repayment" | "interest_charge" | null,
        "amount": number | null,
        "from_account_id": string | null,
        "to_account_id": string | null,
        "category": string | null,
        "income_category": "salaries" | "allowances" | "family_income" | "others" | null,
        "description": string | null,
        "transaction_date": "YYYY-MM-DD" | null,
        "is_emi": boolean | null,
        "emi_months": number | null,
        "bank_charges": number | null,
        
        "account_type": "cash" | "bank" | "credit_card" | "loan" | null,
        "account_name": string | null,
        "balance": number | null,
        "currency": string | null,
        "country": string | null,
        "institution_name": string | null,
        "last_4_digits": string | null,
        "credit_limit": number | null,
        "loan_principal": number | null,
        "loan_tenure_months": number | null,
        "current_interest_rate": number | null,
        "loan_start_date": "YYYY-MM-DD" | null,
        "due_date": number | null,
        "statement_day": number | null,
        "due_day": number | null,
        "web_url": string | null,
        "ios_app_url": string | null,
        "android_app_url": string | null,
        "institution_logo": string | null,
        
        "month": number | null,
        "year": number | null,
        "budgeted_income": number | null,
        "budgeted_expenses": number | null,
        "category_budgets": object | null,
        
        "principal": number | null,
        "annual_rate": number | null,
        "tenure_months": number | null
      },
      "batchTransactions": [
        {
          "transaction_type": "income" | "expense",
          "amount": number,
          "from_account_id": string | null,
          "to_account_id": string | null,
          "category": string,
          "income_category": "salaries" | "allowances" | "family_income" | "others",
          "description": string,
          "transaction_date": "YYYY-MM-DD"
        }
      ],
      "isComplete": boolean,
      "missingFields": string[],
      "reply": string,
      "clarificationQuestion": string,
      "extraContext": any
    }
    `;

    // Incorporate chat history if available to understand context/clarifications
    const contentsPayload = [];
    for (const msg of chatHistory) {
      contentsPayload.push({
        role: msg.role,
        parts: [{ text: msg.content }]
      });
    }
    contentsPayload.push({
      role: 'user' as const,
      parts: [{ text: prompt }]
    });

    const payload = {
      contents: contentsPayload,
    };

    if (!APP_ID) {
      throw new Error('AI service not configured. Please set VITE_APP_ID in your .env file.');
    }

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.status === 999) {
        throw new Error(errorData.msg || 'API request failed');
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    let fullResponseText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          completed = true;
          break;
        }

        try {
          const parsedData = JSON.parse(dataStr);
          const text = parsedData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullResponseText += text;
            onChunk(text);
          }

          const finishReason = parsedData.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP' && !completed) {
            completed = true;
            break;
          }
        } catch (e) {
          console.error('Error parsing SSE line:', e, dataStr);
        }
      }

      if (completed) {
        break;
      }
    }

    // Try to parse the accumulated full text as a JSON object
    try {
      // Clean up JSON block formatting if present
      let cleanedText = fullResponseText.trim();
      if (cleanedText.startsWith('```')) {
        const matches = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
        if (matches && matches[1]) {
          cleanedText = matches[1].trim();
        }
      }
      
      const parsedResult: SmartChatbotResult = JSON.parse(cleanedText);

      // Sanitize & enforce non-blank categories for batch transactions
      if (parsedResult.batchTransactions && Array.isArray(parsedResult.batchTransactions)) {
        parsedResult.batchTransactions = parsedResult.batchTransactions
          .filter(t => t && Number(t.amount) > 0)
          .map(t => {
            const isInc = t.transaction_type === 'income';
            const matchedCat = categories.find(c => c.name.toLowerCase() === (t.category || '').toLowerCase());
            return {
              transaction_type: isInc ? 'income' : 'expense',
              amount: Number(t.amount),
              from_account_id: isInc ? null : (t.from_account_id || null),
              to_account_id: isInc ? (t.to_account_id || null) : null,
              // Expense category must NEVER remain blank
              category: isInc ? null : (matchedCat ? matchedCat.name : (t.category && t.category.trim() ? t.category.trim() : (categories[0]?.name || 'Others'))),
              // Income category must NEVER remain blank
              income_category: isInc ? (['salaries', 'allowances', 'family_income', 'others'].includes(t.income_category as any) ? t.income_category : 'others') : null,
              description: t.description || (isInc ? 'Income' : 'Expense'),
              transaction_date: t.transaction_date || currentDate
            };
          });

        if (parsedResult.batchTransactions.length > 0 && !parsedResult.extractedInfo?.amount) {
          parsedResult.extractedInfo = parsedResult.batchTransactions[0] as any;
        }
      }

      // Enforce non-blank category for single extractedInfo transaction as well
      if (parsedResult.intent === 'transaction' && parsedResult.extractedInfo) {
        if (parsedResult.extractedInfo.transaction_type === 'expense') {
          if (!parsedResult.extractedInfo.category || !parsedResult.extractedInfo.category.trim()) {
            parsedResult.extractedInfo.category = categories[0]?.name || 'Others';
          }
        } else if (parsedResult.extractedInfo.transaction_type === 'income') {
          if (!parsedResult.extractedInfo.income_category) {
            parsedResult.extractedInfo.income_category = 'others';
          }
        }
      }

      // Normalize reply and clarificationQuestion so neither is ever blank/null
      let finalReply = parsedResult.reply || parsedResult.clarificationQuestion || '';

      if (!finalReply || !finalReply.trim()) {
        if (parsedResult.intent === 'transaction') {
          if (parsedResult.batchTransactions && parsedResult.batchTransactions.length > 1) {
            const count = parsedResult.batchTransactions.length;
            const expCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'expense').length;
            const incCount = parsedResult.batchTransactions.filter(b => b.transaction_type === 'income').length;
            finalReply = `I've prepared a batch of **${count} transactions** (${expCount} expense${expCount !== 1 ? 's' : ''}, ${incCount} income). Categories are assigned and ready for review. Click **Submit** to post them!`;
          } else {
            const ext = parsedResult.extractedInfo || {};
            const parts: string[] = [];
            if (ext.amount) parts.push(`₹${Number(ext.amount).toLocaleString('en-IN')}`);
            if (ext.category) parts.push(`for ${ext.category}`);
            if (ext.transaction_type) parts.push(`(${ext.transaction_type})`);
            if (ext.transaction_date) parts.push(`on ${ext.transaction_date}`);

            if (parsedResult.missingFields && parsedResult.missingFields.length > 0) {
              const readableMissing = parsedResult.missingFields.map(f => f.replace(/_/g, ' ')).join(', ');
              finalReply = parts.length > 0
                ? `I've prepared ${parts.join(' ')}. Please specify: ${readableMissing}.`
                : `Please specify the missing details: ${readableMissing}.`;
            } else {
              finalReply = parts.length > 0
                ? `I've auto-filled the transaction form with ${parts.join(' ')}. Ready to submit!`
                : `Transaction details have been applied to the form!`;
            }
          }
        } else if (parsedResult.intent === 'financial_inquiry') {
          const fallbackInquiry = tryLocalHeuristicFallback(command, accounts, categories, currentDate);
          finalReply = fallbackInquiry?.reply || "Here are your financial inquiry results based on your accounts and records.";
        } else {
          finalReply = "I've processed your request. Let me know if you need to adjust any transaction or account details!";
        }
      }

      parsedResult.reply = finalReply;
      parsedResult.clarificationQuestion = finalReply;
      onComplete(parsedResult);
    } catch (e) {
      console.error('Failed to parse final AI output as JSON:', e, fullResponseText);
      
      // Check if heuristic fallback can handle it
      const fallback = tryLocalHeuristicFallback(command, accounts, categories, currentDate);
      if (fallback) {
        onComplete(fallback);
        return;
      }

      // Return a structured error fallback
      onComplete({
        intent: 'general_help',
        extractedInfo: {},
        isComplete: false,
        missingFields: [],
        reply: "I'm here to help you manage Transactions, Accounts, Budgets, and simulate EMIs! What would you like to operate today?",
        clarificationQuestion: "I'm here to help you manage Transactions, Accounts, Budgets, and simulate EMIs! What would you like to operate today?"
      });
    }
  } catch (error) {
    console.error('AI Service Error:', error);

    // If API failed (network error, app ID, rate limit), attempt heuristic fallback first
    const fallback = tryLocalHeuristicFallback(command, accounts, categories, currentDate);
    if (fallback) {
      onComplete(fallback);
      return;
    }

    onError(error instanceof Error ? error.message : 'Failed to parse command');
  }
}

export interface TransactionInsightParams {
  transaction: {
    isEdit: boolean;
    transaction_type: string;
    amount: number;
    currency: string;
    category?: string;
    income_category?: string;
    description?: string;
    transaction_date: string;
  };
  accounts: Array<{
    id?: string;
    name: string;
    type: string;
    roleLabel: string;
    previousBalance?: number;
    postBalance: number;
    currency: string;
    credit_limit?: number | null;
    changeAmount?: number;
  }>;
  categoryBudgets?: Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    hasBudget: boolean;
    percentageUsed: number;
    transactionAmount?: number;
  }>;
}

export interface PostPostingAIInsight {
  status: 'positive' | 'warning' | 'caution' | 'neutral';
  statusBadge: string;
  headline: string;
  budgetInsight?: string;
  cashFlowInsight?: string;
  smartTip?: string;
  generatedVia?: 'ai' | 'heuristic';
}

const formatInsightCurrency = (amount: number, currency = 'INR'): string => {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';
  return `${sym}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export function generateHeuristicTransactionInsight(params: TransactionInsightParams): PostPostingAIInsight {
  const { transaction: tx, accounts, categoryBudgets } = params;
  const curr = tx.currency || 'INR';
  const txAmt = Number(tx.amount || 0);

  // 1. Expense analysis
  if (tx.transaction_type === 'expense') {
    const overBudget = categoryBudgets?.find(b => b.hasBudget && b.remaining < 0);
    const nearBudget = categoryBudgets?.find(b => b.hasBudget && b.remaining >= 0 && b.percentageUsed >= 80);
    const normalBudget = categoryBudgets?.find(b => b.hasBudget && b.percentageUsed < 80);
    const primaryCat = tx.category || categoryBudgets?.[0]?.category || 'General Spending';

    // Credit card check
    const ccAccount = accounts.find(a => a.type === 'credit_card');
    let cashFlowInsight = '';
    if (ccAccount && ccAccount.credit_limit) {
      const util = (ccAccount.postBalance / ccAccount.credit_limit) * 100;
      const avail = Math.max(0, ccAccount.credit_limit - ccAccount.postBalance);
      if (util > 50) {
        cashFlowInsight = `Credit card utilization is high at ${util.toFixed(0)}% (${formatInsightCurrency(ccAccount.postBalance, curr)} of ${formatInsightCurrency(ccAccount.credit_limit, curr)} limit). Available credit is ${formatInsightCurrency(avail, curr)}.`;
      } else {
        cashFlowInsight = `Credit card utilization is at a safe ${util.toFixed(0)}%. Available credit is ${formatInsightCurrency(avail, curr)}.`;
      }
    } else {
      const debitedAcc = accounts.find(a => a.roleLabel.toLowerCase().includes('debit') || a.roleLabel.toLowerCase().includes('paid'));
      if (debitedAcc) {
        cashFlowInsight = `Post-transaction balance in ${debitedAcc.name} is ${formatInsightCurrency(debitedAcc.postBalance, curr)}.`;
      }
    }

    if (overBudget) {
      const overAmt = Math.abs(overBudget.remaining);
      return {
        status: 'warning',
        statusBadge: 'Budget Exceeded',
        headline: `Budget alert: Spending in ${overBudget.category} has exceeded your monthly limit by ${formatInsightCurrency(overAmt, curr)} (${overBudget.percentageUsed.toFixed(0)}% spent).`,
        budgetInsight: `Allocated budget was ${formatInsightCurrency(overBudget.budgeted, curr)}, while cumulative spend now totals ${formatInsightCurrency(overBudget.spent, curr)}.`,
        cashFlowInsight: cashFlowInsight || `This expense directly impacts your end-of-month discretionary cash reserves.`,
        smartTip: `Consider pausing non-essential purchases in ${overBudget.category} or reallocating surplus from an under-utilized budget category to restore balance.`,
        generatedVia: 'heuristic'
      };
    }

    if (nearBudget) {
      return {
        status: 'caution',
        statusBadge: 'Approaching Budget',
        headline: `Heads up: You have consumed ${nearBudget.percentageUsed.toFixed(0)}% of your monthly ${nearBudget.category} budget.`,
        budgetInsight: `Only ${formatInsightCurrency(nearBudget.remaining, curr)} remains available for ${nearBudget.category} for the remainder of this cycle.`,
        cashFlowInsight: cashFlowInsight || `Account liquidity remains sufficient, but category pacing needs attention.`,
        smartTip: `Pace discretionary spending in ${nearBudget.category} over the remaining days of this month to stay within your target.`,
        generatedVia: 'heuristic'
      };
    }

    if (normalBudget) {
      return {
        status: 'positive',
        statusBadge: 'Within Budget',
        headline: `Healthy spending: ${normalBudget.category} is at a comfortable ${normalBudget.percentageUsed.toFixed(0)}% of your monthly budget.`,
        budgetInsight: `You still have ${formatInsightCurrency(normalBudget.remaining, curr)} in remaining budget buffer for this category.`,
        cashFlowInsight: cashFlowInsight || `Your spending pace is sustainable and aligned with your savings plan.`,
        smartTip: `Consistent budget discipline like this maximizes your monthly savings rate for investments!`,
        generatedVia: 'heuristic'
      };
    }

    return {
      status: 'neutral',
      statusBadge: 'Spend Recorded',
      headline: `Transaction of ${formatInsightCurrency(txAmt, curr)} recorded under ${primaryCat}.`,
      budgetInsight: `No active monthly budget cap is configured for ${primaryCat}.`,
      cashFlowInsight: cashFlowInsight || `Associated account balances have been synchronized.`,
      smartTip: `Setting a monthly target for ${primaryCat} in Budgets will give you proactive burn-rate tracking!`,
      generatedVia: 'heuristic'
    };
  }

  // 2. Income analysis
  if (tx.transaction_type === 'income') {
    const creditedAcc = accounts.find(a => a.roleLabel.toLowerCase().includes('credit') || a.roleLabel.toLowerCase().includes('received')) || accounts[0];
    return {
      status: 'positive',
      statusBadge: 'Income Boost',
      headline: `Inflow of ${formatInsightCurrency(txAmt, curr)} successfully credited to ${creditedAcc ? creditedAcc.name : 'your account'}.`,
      budgetInsight: `New income elevates your monthly cash flow buffer and widens your savings margin.`,
      cashFlowInsight: creditedAcc ? `Updated balance in ${creditedAcc.name} is now ${formatInsightCurrency(creditedAcc.postBalance, curr)}.` : `Liquid wealth increased.`,
      smartTip: `Pro-tip: Allocate at least 20% of fresh income immediately toward emergency savings or mutual funds before spending!`,
      generatedVia: 'heuristic'
    };
  }

  // 3. Loan Payment analysis
  if (tx.transaction_type === 'loan_payment') {
    const loanAcc = accounts.find(a => a.type === 'loan');
    return {
      status: 'positive',
      statusBadge: 'Debt Reduced',
      headline: `Loan installment of ${formatInsightCurrency(txAmt, curr)} posted successfully.`,
      budgetInsight: `EMI payments systematically lower outstanding liability and build long-term net worth.`,
      cashFlowInsight: loanAcc ? `Remaining loan principal balance reduced to ${formatInsightCurrency(loanAcc.postBalance, curr)}.` : `Principal reduced.`,
      smartTip: `Every on-time EMI enhances your CIBIL/credit score and saves compounding interest charges!`,
      generatedVia: 'heuristic'
    };
  }

  // 4. Credit Card Repayment analysis
  if (tx.transaction_type === 'credit_card_repayment') {
    const cardAcc = accounts.find(a => a.type === 'credit_card');
    return {
      status: 'positive',
      statusBadge: 'Credit Restored',
      headline: `Card repayment of ${formatInsightCurrency(txAmt, curr)} processed successfully.`,
      budgetInsight: `Clearing credit card dues protects you from steep APR finance charges (up to 42% p.a.).`,
      cashFlowInsight: cardAcc ? `Outstanding card balance dropped to ${formatInsightCurrency(cardAcc.postBalance, curr)}. Available limit refreshed.` : `Card debt paid down.`,
      smartTip: `Paying credit card bills before the due date builds a sterling credit score and guarantees zero interest charges.`,
      generatedVia: 'heuristic'
    };
  }

  // 5. Transfer / Withdrawal
  return {
    status: 'neutral',
    statusBadge: 'Funds Reallocated',
    headline: `Internal transfer of ${formatInsightCurrency(txAmt, curr)} successfully completed between accounts.`,
    budgetInsight: `Transfer transactions do not alter your net monthly expense or income totals.`,
    cashFlowInsight: `Liquidity has been re-balanced across your accounts post-transaction.`,
    smartTip: `Distributing liquid funds between high-yield bank accounts and daily operating accounts maximizes interest earnings.`,
    generatedVia: 'heuristic'
  };
}

export async function generateTransactionAIInsight(
  params: TransactionInsightParams
): Promise<PostPostingAIInsight> {
  const fallback = generateHeuristicTransactionInsight(params);

  try {
    const { transaction: tx, accounts, categoryBudgets } = params;

    const accountsText = accounts.map(a => {
      let text = `- ${a.name} (${a.type.replace('_', ' ')}): Balance ₹${Number(a.postBalance).toLocaleString('en-IN')}`;
      if (a.previousBalance !== undefined) {
        text += `, Previous: ₹${Number(a.previousBalance).toLocaleString('en-IN')}`;
      }
      if (a.changeAmount !== undefined) {
        text += `, Net Change: ${a.changeAmount >= 0 ? '+' : ''}₹${Number(a.changeAmount).toLocaleString('en-IN')}`;
      }
      if (a.type === 'credit_card' && a.credit_limit) {
        const util = ((a.postBalance / a.credit_limit) * 100).toFixed(1);
        text += `, Limit: ₹${Number(a.credit_limit).toLocaleString('en-IN')} (Utilization: ${util}%)`;
      }
      return text;
    }).join('\n');

    const budgetsText = (categoryBudgets && categoryBudgets.length > 0)
      ? categoryBudgets.map(b => {
          return `- Category "${b.category}": Spent Now ₹${Number(b.spent).toLocaleString('en-IN')}, Budgeted: ${b.hasBudget ? `₹${Number(b.budgeted).toLocaleString('en-IN')}` : 'No limit'}, Remaining: ${b.hasBudget ? `₹${Number(b.remaining).toLocaleString('en-IN')} (${b.percentageUsed.toFixed(1)}% used)` : 'N/A'}`;
        }).join('\n')
      : 'No monthly category budget cap active for this transaction.';

    const prompt = `You are an expert personal finance coach and transaction analyst for SmartFinHub.
A user just submitted the following financial transaction:
- Action: ${tx.isEdit ? 'Updated Transaction' : 'New Transaction'}
- Type: ${tx.transaction_type}
- Amount: ₹${Number(tx.amount).toLocaleString('en-IN')} (${tx.currency})
- Category: ${tx.category || tx.income_category || 'N/A'}
- Description: "${tx.description || 'N/A'}"
- Date: ${tx.transaction_date}

Post-Posting Account Balances:
${accountsText || 'None'}

Post-Posting Category Budget Status:
${budgetsText}

Provide an ultra-concise, high-impact financial insight on this transaction.
Respond strictly in JSON format matching this schema:
{
  "status": "positive" | "warning" | "caution" | "neutral",
  "statusBadge": "2-4 words badge (e.g., 'Budget Healthy', 'Budget Exceeded', 'High Credit Utilization', 'Income Boost', 'Debt Reduced')",
  "headline": "1 punchy sentence summarizing this specific transaction's financial impact.",
  "budgetInsight": "1-2 concise sentences analyzing the budget impact, category pace, or burn rate.",
  "cashFlowInsight": "1-2 concise sentences on liquidity, cash reserves, debt reduction, or credit card utilization.",
  "smartTip": "1 practical, actionable, encouraging tip for the user going forward."
}

Do not include any extra text, commentary, or markdown formatting outside the JSON object.`;

    const payload = {
      contents: [
        {
          role: 'user' as const,
          parts: [{ text: prompt }],
        },
      ],
    };

    if (!APP_ID) {
      return fallback;
    }

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return fallback;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return fallback;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    let fullResponseText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          completed = true;
          break;
        }

        try {
          const parsedData = JSON.parse(dataStr);
          const text = parsedData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullResponseText += text;
          }

          const finishReason = parsedData.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP' && !completed) {
            completed = true;
            break;
          }
        } catch {
          // ignore chunk parse error
        }
      }

      if (completed) {
        break;
      }
    }

    // Clean JSON text
    let cleanJson = fullResponseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed.headline === 'string') {
      const validStatuses = ['positive', 'warning', 'caution', 'neutral'];
      const status = validStatuses.includes(parsed.status) ? parsed.status : fallback.status;
      return {
        status,
        statusBadge: parsed.statusBadge || fallback.statusBadge,
        headline: parsed.headline || fallback.headline,
        budgetInsight: parsed.budgetInsight || fallback.budgetInsight,
        cashFlowInsight: parsed.cashFlowInsight || fallback.cashFlowInsight,
        smartTip: parsed.smartTip || fallback.smartTip,
        generatedVia: 'ai'
      };
    }

    return fallback;
  } catch (error) {
    console.warn('generateTransactionAIInsight failed, using heuristic fallback:', error);
    return fallback;
  }
}
