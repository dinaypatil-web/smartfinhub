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
    transaction_type: 'income' | 'expense' | 'withdrawal' | 'transfer' | 'loan_payment' | 'credit_card_repayment' | null;
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
}

export async function parseTransactionCommand(
  params: {
    command: string;
    accounts: any[];
    categories: any[];
    chatHistory: Array<{ role: 'user' | 'model'; content: string }>;
    currentDate: string;
  },
  onChunk: (text: string) => void,
  onComplete: (result: DraftTransactionResult) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const { command, accounts, categories, chatHistory, currentDate } = params;

    const accountsContext = accounts.map(a => `- ID: "${a.id}", Name: "${a.account_name}", Type: "${a.account_type}", Balance: ${a.balance}, Currency: "${a.currency}"`).join('\n');
    const categoriesContext = categories.map(c => `- Name: "${c.name}", Icon: "${c.icon}"`).join('\n');

    const prompt = `You are a financial parsing assistant for SmartFinHub. Your job is to parse a natural language command (typed or spoken) into a structured transaction draft.
    
    Here is the context of the user's accounts:
    ${accountsContext}
    
    Here is the context of the user's available expense categories:
    ${categoriesContext}
    
    Static Income Categories are:
    - key: "salaries", Name: "Salaries"
    - key: "allowances", Name: "Allowances"
    - key: "family_income", Name: "Family Income"
    - key: "others", Name: "Others"
    
    Today's date is: ${currentDate}
    Default currency is INR.
    
    Rules for matching accounts:
    - "from_account_id" is the source of funds (e.g. from HDFC bank, cash, credit card).
    - "to_account_id" is the destination of funds (e.g. into bank account for income, to loan account for loan payment, to credit card for cc repayment).
    - If the user specifies an account, fuzzy match it to one of their accounts. If it matches, put the exact ID in "from_account_id" or "to_account_id". If they mention an account but you are not sure or it's not in the list, leave it null.
    
    Rules for Transaction Types:
    1. "expense": Spent money. "from_account_id" is required (source account), "to_account_id" is null. "category" should match one of the expense categories. "income_category" is null.
    2. "income": Received money. "to_account_id" is required (destination bank/cash account), "from_account_id" is null. "income_category" should be one of "salaries", "allowances", "family_income", "others". "category" is null.
    3. "transfer": Transfer between user's own bank/cash accounts. Both "from_account_id" and "to_account_id" are required.
    4. "withdrawal": Withdrawing cash from bank/card to cash. "from_account_id" is the bank, "to_account_id" is the cash account. Both are required.
    5. "loan_payment": Paying a loan. "from_account_id" (bank/cash) and "to_account_id" (loan account) are both required.
    6. "credit_card_repayment": Paying credit card bill. "from_account_id" (bank/cash) and "to_account_id" (credit card account) are both required.
    
    Required Fields validation:
    - A transaction is complete ("isComplete": true) ONLY if we have:
      - transaction_type
      - amount (must be positive number)
      - For "expense": from_account_id and category
      - For "income": to_account_id and income_category
      - For "transfer" / "withdrawal" / "loan_payment" / "credit_card_repayment": both from_account_id and to_account_id
    
    If any required fields are missing:
    - Set "isComplete" to false.
    - List the missing fields in the "missingFields" array. The possible missing fields are: ["transaction_type", "amount", "from_account_id", "to_account_id", "category", "income_category"].
    - Formulate a clear, friendly, and brief conversational question in "clarificationQuestion" to ask the user for the missing fields (e.g. "Which account did you spend this from?" or "What category should we use for this expense?").
    
    If the transaction is complete:
    - Set "isComplete" to true.
    - Set "missingFields" to [].
    - Set "clarificationQuestion" to a friendly success message (e.g. "I've drafted your transaction! Everything looks complete. Would you like to confirm and save it?").
    
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
      "clarificationQuestion": string
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
