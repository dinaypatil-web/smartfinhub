import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, budgetApi } from '@/db/api';
import { generateFinancialAnalysis, type AIAnalysisData } from '@/services/aiService';
import { marked } from 'marked';

export default function AIInsights() {
  const navigate = useNavigate();
  const { user } = useHybridAuth();
  const [analysis, setAnalysis] = useState('');
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);

  const prepareAnalysisData = async (): Promise<AIAnalysisData> => {
    if (!user) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        budgetedExpenses: 0,
        transactions: [],
        accountBalances: [],
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthStr = now.toISOString().slice(0, 7);
    
    const transactions = await transactionApi.getTransactions(user.id);
    const accounts = await accountApi.getAccounts(user.id);
    const budgets = await budgetApi.getBudgets(user.id);

    const monthlyTransactions = transactions.filter(t => 
      t.transaction_date.startsWith(currentMonthStr)
    );

    const totalIncome = monthlyTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'loan_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBudget = budgets.find(b => b.month === currentMonth && b.year === currentYear);
    const budgetedExpenses = currentBudget?.budgeted_expenses || 0;

    const accountBalances = accounts.map(acc => ({
      name: acc.account_name,
      balance: acc.balance,
      type: acc.account_type,
    }));

    // Calculate historical data for last 3 months
    const historicalData = calculateHistoricalData(transactions, currentMonth, currentYear);

    return {
      totalIncome,
      totalExpenses,
      budgetedExpenses,
      transactions: monthlyTransactions.map(t => ({
        type: t.transaction_type,
        category: t.transaction_type === 'income' ? (t.income_category || 'others') : (t.category || 'uncategorized'),
        amount: t.amount,
        date: t.transaction_date,
        description: t.description,
      })),
      accountBalances,
      historicalData,
    };
  };

  const calculateHistoricalData = (transactions: any[], currentMonth: number, currentYear: number) => {
    const lastThreeMonths = [];
    const categoryTrends: Record<string, number[]> = {};
    
    for (let i = 1; i <= 3; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const monthTransactions = transactions.filter(t => t.transaction_date.startsWith(monthStr));
      
      const income = monthTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'loan_payment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      lastThreeMonths.unshift({
        month: monthStr,
        income,
        expenses,
        savings: income - expenses,
      });
      
      // Track category trends
      monthTransactions
        .filter(t => t.transaction_type === 'expense')
        .forEach(t => {
          if (!categoryTrends[t.category]) {
            categoryTrends[t.category] = [];
          }
          categoryTrends[t.category].push(t.amount);
        });
    }
    
    const monthlyAverages = {
      income: lastThreeMonths.reduce((sum, m) => sum + m.income, 0) / lastThreeMonths.length,
      expenses: lastThreeMonths.reduce((sum, m) => sum + m.expenses, 0) / lastThreeMonths.length,
      savings: lastThreeMonths.reduce((sum, m) => sum + m.savings, 0) / lastThreeMonths.length,
    };
    
    return {
      monthlyAverages,
      categoryTrends,
      lastThreeMonths,
    };
  };

  const generateAnalysis = async () => {
    const data = await prepareAnalysisData();
    
    if (data.transactions.length === 0) {
      setAnalysis('No transaction data available. Start adding transactions to get AI-powered insights.');
      setHasAnalysis(true);
      return;
    }

    setIsLoading(true);
    setAnalysis('');
    setHasAnalysis(false);

    let fullText = '';

    await generateFinancialAnalysis(
      data,
      (chunk) => {
        fullText += chunk;
        setAnalysis(fullText);
        const html = marked.parse(fullText.slice(0, 500) + '...') as string;
        setAnalysisHtml(html);
      },
      () => {
        setIsLoading(false);
        setHasAnalysis(true);
      },
      (error) => {
        setIsLoading(false);
        setAnalysis(`Error generating analysis: ${error}`);
        setAnalysisHtml(`Error generating analysis: ${error}`);
        setHasAnalysis(true);
      }
    );
  };

  // Removed auto-generation on mount to improve mobile performance
  // Users can now click "Generate Analysis" button to get insights

  const getQuickInsight = async () => {
    if (!user) return null;

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      // Only fetch current month transactions for quick insight
      const monthlyTransactions = await transactionApi.getTransactionsByDateRange(user.id, startOfMonth, endOfMonth);
      
      const totalIncome = monthlyTransactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = monthlyTransactions
        .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'loan_payment')
        .reduce((sum, t) => sum + t.amount, 0);

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

      if (savingsRate >= 20) {
        return {
          icon: <TrendingUp className="h-5 w-5 text-green-500" />,
          text: `Great job! You're saving ${savingsRate.toFixed(1)}% of your income.`,
          color: 'text-green-600',
        };
      } else if (savingsRate >= 10) {
        return {
          icon: <TrendingUp className="h-5 w-5 text-yellow-500" />,
          text: `You're saving ${savingsRate.toFixed(1)}% of your income. Let's aim for 20%!`,
          color: 'text-yellow-600',
        };
      } else {
        return {
          icon: <TrendingDown className="h-5 w-5 text-red-500" />,
          text: `Your savings rate is ${savingsRate.toFixed(1)}%. AI can help you improve!`,
          color: 'text-red-600',
        };
      }
    } catch (error) {
      console.error('Error calculating quick insight:', error);
      return null;
    }
  };

  const [quickInsight, setQuickInsight] = useState<{
    icon: React.ReactElement;
    text: string;
    color: string;
  } | null>(null);
  const [loadingQuickInsight, setLoadingQuickInsight] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingQuickInsight(true);
      getQuickInsight()
        .then(setQuickInsight)
        .finally(() => setLoadingQuickInsight(false));
    }
  }, [user]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Financial Insights</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ai-analysis')}
          >
            View Details
          </Button>
        </div>
        <CardDescription>
          AI-powered analysis of your financial health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingQuickInsight && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Skeleton className="h-5 w-5 rounded-full bg-muted" />
            <Skeleton className="h-4 flex-1 bg-muted" />
          </div>
        )}

        {!loadingQuickInsight && quickInsight && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {quickInsight.icon}
            <p className={`text-sm font-medium ${quickInsight.color}`}>
              {quickInsight.text}
            </p>
          </div>
        )}

        {!hasAnalysis && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-primary/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Get personalized financial insights and budget recommendations based on your spending patterns
            </p>
            <Button
              onClick={generateAnalysis}
              disabled={!user}
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Analysis
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analyzing your finances...
            </span>
          </div>
        )}

        {!isLoading && analysis && hasAnalysis && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div 
              className="text-sm text-muted-foreground line-clamp-6"
              dangerouslySetInnerHTML={{ __html: analysisHtml }}
            />
          </div>
        )}

        {hasAnalysis && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateAnalysis}
              disabled={isLoading || !user}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/ai-analysis')}
              className="flex-1"
            >
              Full Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
