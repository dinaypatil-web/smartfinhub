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

export interface DraftTransactionResult {
  extractedInfo: {
    transaction_type: 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | 'interest_charge' | null;
    amount: number | null;
    from_account_id: string | null;
    to_account_id: string | null;
    category: string | null;
    income_category: 'salaries' | 'allowances' | 'family_income' | 'others' | null;
    description: string | null;
    transaction_date: string | null;
  };
  isComplete: boolean;
  missingFields: string[];
  clarificationQuestion: string;
  isQuery?: boolean;
}

export async function parseTransactionCommand(
  params: {
    command: string;
    accounts: any[];
    categories: any[];
    transactions: any[];
    chatHistory: Array<{ role: 'user' | 'model'; content: string }>;
    currentDate: string;
  },
  onChunk: (text: string) => void,
  onComplete: (result: DraftTransactionResult) => void,
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

    const prompt = `You are a professional personal finance AI assistant for SmartFinHub. Your job is to parse conversational inputs and EITHER draft a new transaction OR answer a natural language inquiry about the user's accounts, balances, and spending trends.
    
    Here is the context of the user's accounts (balances and types):
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
    
    DETERMINING USER INTENT:
    Analyze the user's input.
    1. If the user is asking a QUESTION/INQUIRY about their financial status (e.g. balance checks, spending inquiries, transaction queries):
       - Set "isQuery" to true.
       - Set all fields inside "extractedInfo" to null.
       - Set "isComplete" to true.
       - Set "missingFields" to [].
       - Formulate a highly detailed, friendly, and complete conversational answer inside "clarificationQuestion". You must perform exact mathematical calculations (sums, filters) on the transactions context or lookup account balances directly from the accounts context. Always format currency amounts in INR (e.g., ₹2,500.00).
       
       Examples of inquiries:
       - "What is my HDFC Bank balance?" -> AI scans accounts, finds HDFC, answers: "Your HDFC Bank balance is ₹45,230.50."
       - "How much did I spend on Food & Dining this month?" -> AI scans the transaction history list, filters those of type "expense", matches "Food & Dining" category, sums them for the current month, and replies: "You spent a total of ₹4,250 on Food & Dining this month."
       - "Did I buy anything yesterday?" -> scans yesterday's transactions and lists them.
       
    2. If the user is giving a COMMAND/STATEMENT to record a transaction (e.g. "spent 500 on groceries"):
       - Set "isQuery" to false.
       - Extract details into "extractedInfo" based on the parsing rules below:
         - "transaction_type": "income" | "expense" | "withdrawal" | "transfer" | "loan_payment" | "credit_card_repayment" | null
         - "amount": positive number or null
         - "from_account_id": source of funds ID (fuzzy matched from the accounts list)
         - "to_account_id": destination of funds ID (fuzzy matched from the accounts list)
         - "category": expense category name (exact match from expense categories list)
         - "income_category": income category key (salaries/allowances/family_income/others)
         - "description": text description
         - "transaction_date": date or null (defaults to today's date)
         
         Required Fields for transaction completeness:
         - A transaction description ("description") is ALWAYS required for all transaction types to provide transaction context! If the user didn't specify a description, mark "description" as missing.
         - For "expense": from_account_id, category, and description are required.
         - For "income": to_account_id, income_category, and description are required.
         - For "transfer" / "withdrawal" / "loan_payment" / "credit_card_repayment": both from_account_id, to_account_id, and description are required.
         
       - If any required fields are missing:
         - Set "isComplete" to false.
         - List them in "missingFields" (which can include "description" alongside other missing fields).
         - Write a friendly question in "clarificationQuestion" to ask for the missing fields (e.g. "What did you spend this on?" or "Could you give me a description for this transaction?").
       - If complete:
         - Set "isComplete" to true.
         - Set "missingFields" to [].
         - Set "clarificationQuestion" to a friendly confirmation bubble.
    
    Current natural language input: "${command}"
    
    You must respond with ONLY a valid JSON object in this exact schema. Do not output any markdown wrapper or explanation, just the JSON string itself.
    
    {
      "extractedInfo": {
        "transaction_type": "income" | "expense" | "withdrawal" | "transfer" | "loan_payment" | "credit_card_repayment" | null,
        "amount": number | null,
        "from_account_id": string | null,
        "to_account_id": string | null,
        "category": string | null,
        "income_category": "salaries" | "allowances" | "family_income" | "others" | null,
        "description": string | null,
        "transaction_date": "YYYY-MM-DD" | null
      },
      "isComplete": boolean,
      "missingFields": string[],
      "clarificationQuestion": string,
      "isQuery": boolean
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
      // Sometimes models wrap JSON in markdown blocks (e.g. ```json ... ```). Clean it up.
      let cleanedText = fullResponseText.trim();
      if (cleanedText.startsWith('```')) {
        const matches = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
        if (matches && matches[1]) {
          cleanedText = matches[1].trim();
        }
      }
      
      const parsedResult: DraftTransactionResult = JSON.parse(cleanedText);
      onComplete(parsedResult);
    } catch (e) {
      console.error('Failed to parse final AI output as JSON:', e, fullResponseText);
      
      // Return a structured error fallback
      onComplete({
        extractedInfo: {
          transaction_type: null,
          amount: null,
          from_account_id: null,
          to_account_id: null,
          category: null,
          income_category: null,
          description: null,
          transaction_date: null
        },
        isComplete: false,
        missingFields: ['transaction_type', 'amount'],
        clarificationQuestion: "I'm sorry, I encountered an issue parsing your request. Could you please specify your transaction type (income/expense) and the amount?"
      });
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to parse command');
  }
}
