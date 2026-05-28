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
  isComplete: boolean;
  missingFields: string[];
  clarificationQuestion: string;
  extraContext?: any;
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
  try {
    const { command, accounts, categories, transactions, chatHistory, currentDate } = params;

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
    ${accountsContext}
    
    Here is the context of the user's available expense categories:
    ${categoriesContext}
    
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

    RULES FOR DETECTING INTENTS & REQUIRED FIELDS:
    
    1. intent: "transaction"
       - Triggered if the user wants to record spent money, salary received, transfer funds, cash withdrawal, credit card bill repayment, or loan payment.
       - Required fields: "transaction_type", "amount" (positive number), "description".
       - Specific required fields by type:
         - expense: from_account_id (matched from accounts), category (matched from categories).
         - income: to_account_id (matched from accounts), income_category (salaries/allowances/family_income/others).
         - transfer / withdrawal / loan_payment / credit_card_repayment: both from_account_id and to_account_id.
         - interest_charge: to_account_id.
       - Special Credit Card EMI extraction: If the user mentions converting a credit card transaction or expense to EMI (e.g., "convert to 12 months EMI with 500 charges" or "make it a 6-month EMI"), extract:
         - "is_emi": true (boolean)
         - "emi_months": total number of months (integer, e.g., 6 or 12)
         - "bank_charges": processing fee or bank charges amount (number, default 0 if not mentioned)
       - Missing fields go in "missingFields". Ask for them in "clarificationQuestion".
       
    2. intent: "account"
       - Triggered if the user wants to add/create a new account, card, cash wallet, or loan profile. E.g. "Create a new bank account named HDFC Savings with balance 10000" or "Add a new credit card named SBI Card with limit 150000".
       - Extracted fields:
         - "account_type" ('cash' | 'bank' | 'credit_card' | 'loan')
         - "account_name" (e.g. HDFC Savings)
         - "balance" (initial balance, default 0)
         - "currency" (default "INR")
         - "country" (e.g. 'IN', 'US', 'GB', 'EU'. Default to 'IN' if Indian banks like SBI/HDFC are mentioned, or 'US' if US banks are mentioned, otherwise ask).
         - "institution_name" (e.g. HDFC Bank, SBI Bank, Chase, Citibank. Required for bank/credit_card/loan).
         - "last_4_digits" (4 digit string or null, optional)
         - "credit_limit" (number, required if card/credit_card)
         - "loan_principal" (number, required if loan)
         - "loan_tenure_months" (number, required if loan)
         - "current_interest_rate" (number, required if loan)
         - "loan_start_date" (string 'YYYY-MM-DD', required if loan)
         - "due_date" (number, day of month 1-31, required if loan indicating EMI payment due day)
         - "statement_day" (number, day of month 1-31, required if credit_card indicating the statement generation day)
         - "due_day" (number, day of month 1-31, required if credit_card indicating the payment due day)
         - "web_url" (standard website or login URL specified by user, e.g. "https://www.hdfcbank.com")
         - "ios_app_url" (Apple app store link if mentioned)
         - "android_app_url" (Google play store link if mentioned)
         - "institution_logo" (custom logo image URL if specified)
       - Required fields by type:
         - cash: "account_type", "account_name".
         - bank: "account_type", "account_name", "country", "currency", "institution_name".
         - credit_card: "account_type", "account_name", "country", "currency", "institution_name", "credit_limit", "statement_day", "due_day".
         - loan: "account_type", "account_name", "country", "currency", "institution_name", "loan_principal", "loan_tenure_months", "current_interest_rate", "loan_start_date", "due_date".
       - If any required fields are missing: set isComplete to false, list them in missingFields, and prompt for them conversationally in clarificationQuestion.
       
    3. intent: "budget"
       - Triggered if the user wants to set a monthly budget or category budget. E.g. "Set a budget of 5000 for groceries in June 2026" or "Setup monthly expenses budget of 40000 for next month".
       - Extracted fields: "month" (number 1-12, default to current month), "year" (4-digit number, default to current year), "budgeted_income" (number), "budgeted_expenses" (overall monthly expense budget), "category_budgets" (JSON object representing category name keys and budget numbers, e.g. {"Groceries": 5000}).
       - Required fields: "month", "year". Must specify at least one budget limit (overall budgeted_expenses or category_budgets).
       
    4. intent: "emi_calculator"
       - Triggered if the user wants to calculate, simulate, or compare loan payments. E.g. "What is the monthly payment for a loan of 500000 at 9.5% interest for 5 years?".
       - Extracted fields: "principal" (loan amount), "annual_rate" (annual interest rate percentage), "tenure_months" (total loan tenure in months. Note: convert "5 years" to "60 months").
       - Required fields: "principal", "annual_rate", "tenure_months".
       - Calculation: If all fields are complete, perform the exact monthly EMI calculation: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1] where P = principal, r = annual_rate/12/100, n = tenure_months. Put the calculated EMI, total interest, and a friendly summary inside "clarificationQuestion" and return the calculation details inside "extraContext" as: {"monthly_emi": X, "total_interest": Y, "total_payable": Z}.
       
    5. intent: "financial_inquiry"
       - Triggered if the user asks a question about balances, spent totals, or recent audits. E.g. "What is my ICICI Bank balance?" or "How much did I spend on Food & Dining this month?".
       - Scan the accounts context or filter and sum transactions context for the current month. Return the calculated answer in "clarificationQuestion". Set "isComplete" to true.
       
    6. intent: "financial_analysis"
       - Triggered if the user wants a full AI analysis, budget report, or optimization advice. Perform the summary, and return a beautiful markdown analysis report in "clarificationQuestion".
       
    7. intent: "general_help"
       - Triggered if the user asks "What can you do?" or general help. Explain in a detailed, friendly way how they can operate transactions, accounts, budgets, and EMI calculations in "clarificationQuestion".

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
      "isComplete": boolean,
      "missingFields": string[],
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
      onComplete(parsedResult);
    } catch (e) {
      console.error('Failed to parse final AI output as JSON:', e, fullResponseText);
      
      // Return a structured error fallback
      onComplete({
        intent: 'general_help',
        extractedInfo: {},
        isComplete: false,
        missingFields: [],
        clarificationQuestion: fullResponseText || "I'm here to help you manage Transactions, Accounts, Budgets, and simulate EMIs! What would you like to operate today?"
      });
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to parse command');
  }
}
