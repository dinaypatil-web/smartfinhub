import { createParser } from 'eventsource-parser';

const APP_ID = import.meta.env.VITE_APP_ID;
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
  const prompt = buildFinancialAnalysisPrompt(data);

  const payload = {
    contents: [
      {
        role: 'user' as const,
        parts: [{ text: prompt }],
      },
    ],
  };

  try {
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

    const parser = createParser({
      onEvent: (event) => {
        try {
          const data = JSON.parse(event.data);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            onChunk(text);
          }

          const finishReason = data.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP') {
            onComplete();
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      parser.feed(buffer);
      buffer = '';
    }

    onComplete();
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to generate analysis');
  }
}

function buildFinancialAnalysisPrompt(data: AIAnalysisData): string {
  const savingsRate = data.totalIncome > 0 
    ? ((data.totalIncome - data.totalExpenses) / data.totalIncome * 100).toFixed(1)
    : '0';

  const budgetAdherence = data.budgetedExpenses > 0
    ? ((data.totalExpenses / data.budgetedExpenses) * 100).toFixed(1)
    : 'N/A';

  const categoryBreakdown = data.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
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
${lastThreeMonths.map(m => 
  `- ${m.month}: Income ₹${m.income.toFixed(2)}, Expenses ₹${m.expenses.toFixed(2)}, Savings ₹${m.savings.toFixed(2)}`
).join('\n')}

**Monthly Averages:**
- Average Income: ₹${monthlyAverages.income.toFixed(2)}
- Average Expenses: ₹${monthlyAverages.expenses.toFixed(2)}
- Average Savings: ₹${monthlyAverages.savings.toFixed(2)}`;
  }

  return `You are a professional financial advisor with expertise in personal finance management. Analyze the following financial data and provide comprehensive insights, current month advice, and future budget recommendations.

**Current Month Financial Summary:**
- Total Income: ₹${data.totalIncome.toFixed(2)}
- Total Expenses: ₹${data.totalExpenses.toFixed(2)}
- Budgeted Expenses: ₹${data.budgetedExpenses.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Budget Adherence: ${budgetAdherence}%

**Top Expense Categories:**
${topCategories || 'No expenses recorded'}

**Account Balances:**
${data.accountBalances.map(acc => `- ${acc.name} (${acc.type}): ₹${acc.balance.toFixed(2)}`).join('\n')}
${historicalSection}

**Recent Transactions (last 10):**
${data.transactions.slice(-10).map(t => {
  const desc = t.description ? ` - "${t.description}"` : '';
  return `- ${t.date}: ${t.type} - ${t.category} - ₹${t.amount.toFixed(2)}${desc}`;
}).join('\n')}

**IMPORTANT**: Pay special attention to transaction descriptions as they provide valuable context about spending patterns, merchant names, and specific purchase details. Use these descriptions to:
- Identify recurring expenses and subscriptions
- Detect unusual or one-time purchases
- Recognize specific merchants or vendors
- Understand the nature of expenses better
- Provide more personalized and actionable recommendations

Please provide a comprehensive analysis with the following sections:

## 1. Current Month Analysis & Advice
- Evaluate spending patterns for the current month
- Identify any unusual or concerning transactions (use descriptions for context)
- Provide specific recommendations for the remaining days of this month
- Highlight areas where the user is doing well

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
  const prompt = `You are a financial planning expert. Based on the following financial data, suggest an optimized monthly budget that reduces expenses while maintaining quality of life.

**Current Financial Data:**
- Monthly Income: ₹${data.totalIncome.toFixed(2)}
- Current Expenses: ₹${data.totalExpenses.toFixed(2)}
- Current Budget: ₹${data.budgetedExpenses.toFixed(2)}

**Expense Breakdown:**
${Object.entries(
  data.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
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

  try {
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

    const parser = createParser({
      onEvent: (event) => {
        try {
          const data = JSON.parse(event.data);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            onChunk(text);
          }

          const finishReason = data.candidates?.[0]?.finishReason;
          if (finishReason === 'STOP') {
            onComplete();
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      parser.feed(buffer);
      buffer = '';
    }

    onComplete();
  } catch (error) {
    console.error('AI Service Error:', error);
    onError(error instanceof Error ? error.message : 'Failed to generate optimization');
  }
}
