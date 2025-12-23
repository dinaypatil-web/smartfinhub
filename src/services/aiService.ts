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
  }>;
  accountBalances: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
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

  return `You are a professional financial advisor. Analyze the following financial data and provide actionable insights and recommendations.

**Financial Summary:**
- Total Income: ₹${data.totalIncome.toFixed(2)}
- Total Expenses: ₹${data.totalExpenses.toFixed(2)}
- Budgeted Expenses: ₹${data.budgetedExpenses.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Budget Adherence: ${budgetAdherence}%

**Top Expense Categories:**
${topCategories || 'No expenses recorded'}

**Account Balances:**
${data.accountBalances.map(acc => `- ${acc.name} (${acc.type}): ₹${acc.balance.toFixed(2)}`).join('\n')}

**Recent Transactions (last 10):**
${data.transactions.slice(-10).map(t => 
  `- ${t.date}: ${t.type} - ${t.category} - ₹${t.amount.toFixed(2)}`
).join('\n')}

Please provide:
1. **Financial Health Assessment**: Overall evaluation of the current financial situation
2. **Budget Analysis**: How well expenses align with the budget, areas of concern
3. **Expense Reduction Suggestions**: Specific, actionable recommendations to reduce expenses
4. **Savings Opportunities**: Ways to increase savings based on spending patterns
5. **Category-wise Recommendations**: Detailed suggestions for top spending categories
6. **Action Plan**: Prioritized steps to improve financial health

Format your response in clear sections with bullet points. Be specific, practical, and encouraging.`;
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
