import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, RefreshCw, TrendingDown, Lightbulb } from 'lucide-react';
import { useHybridAuth } from '@/contexts/HybridAuthContext';
import { transactionApi, accountApi, budgetApi } from '@/db/api';
import { generateFinancialAnalysis, generateBudgetOptimization, type AIAnalysisData } from '@/services/aiService';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';

export default function AIAnalysisPage() {
  const { user } = useHybridAuth();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState('');
  const [analysisHtml, setAnalysisHtml] = useState('');
  const [optimization, setOptimization] = useState('');
  const [optimizationHtml, setOptimizationHtml] = useState('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingOptimization, setIsLoadingOptimization] = useState(false);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    budgetedExpenses: 0,
    savingsRate: 0,
    budgetAdherence: 0,
  });

  useEffect(() => {
    if (user) {
      loadFinancialSummary();
    }
  }, [user]);

  const loadFinancialSummary = async () => {
    if (!user) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthStr = now.toISOString().slice(0, 7);
    
    const transactions = await transactionApi.getTransactions(user.id);
    const budgets = await budgetApi.getBudgets(user.id);
    
    const monthlyTransactions = transactions.filter(t => t.transaction_date.startsWith(currentMonthStr));
    
    const totalIncome = monthlyTransactions
      .filter(t => t.transaction_type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'loan_payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBudget = budgets.find(b => b.month === currentMonth && b.year === currentYear);
    const budgetedExpenses = currentBudget?.budgeted_expenses || 0;

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
    const budgetAdherence = budgetedExpenses > 0 ? ((totalExpenses / budgetedExpenses) * 100) : 0;

    setSummary({
      totalIncome,
      totalExpenses,
      budgetedExpenses,
      savingsRate,
      budgetAdherence,
    });
  };

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

  const handleGenerateAnalysis = async () => {
    const data = await prepareAnalysisData();
    
    if (data.transactions.length === 0) {
      toast({
        title: 'No Data Available',
        description: 'Please add some transactions first to get AI analysis.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingAnalysis(true);
    setAnalysis('');
    setAnalysisHtml('');

    let fullText = '';

    await generateFinancialAnalysis(
      data,
      (chunk) => {
        fullText += chunk;
        setAnalysis(fullText);
        const html = marked.parse(fullText) as string;
        setAnalysisHtml(html);
      },
      () => {
        setIsLoadingAnalysis(false);
        toast({
          title: 'Analysis Complete',
          description: 'Your financial analysis has been generated.',
        });
      },
      (error) => {
        setIsLoadingAnalysis(false);
        toast({
          title: 'Analysis Failed',
          description: error,
          variant: 'destructive',
        });
      }
    );
  };

  const handleGenerateOptimization = async () => {
    const data = await prepareAnalysisData();
    
    if (data.transactions.length === 0) {
      toast({
        title: 'No Data Available',
        description: 'Please add some transactions first to get budget optimization.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingOptimization(true);
    setOptimization('');
    setOptimizationHtml('');

    let fullText = '';

    await generateBudgetOptimization(
      data,
      (chunk) => {
        fullText += chunk;
        setOptimization(fullText);
        const html = marked.parse(fullText) as string;
        setOptimizationHtml(html);
      },
      () => {
        setIsLoadingOptimization(false);
        toast({
          title: 'Optimization Complete',
          description: 'Your budget optimization has been generated.',
        });
      },
      (error) => {
        setIsLoadingOptimization(false);
        toast({
          title: 'Optimization Failed',
          description: error,
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Financial Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Get AI-powered insights and recommendations for your finances
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Income</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ₹{summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              ₹{summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Savings Rate</CardDescription>
            <CardTitle className="text-2xl text-primary">
              {summary.savingsRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Budget Adherence</CardDescription>
            <CardTitle className={`text-2xl ${summary.budgetAdherence > 100 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.budgetAdherence > 0 ? `${summary.budgetAdherence.toFixed(1)}%` : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Financial Analysis
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Budget Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Comprehensive Financial Analysis</CardTitle>
                  <CardDescription>
                    AI-powered insights into your spending patterns, budget adherence, and financial health
                  </CardDescription>
                </div>
                <Button
                  onClick={handleGenerateAnalysis}
                  disabled={isLoadingAnalysis || !user}
                >
                  {isLoadingAnalysis ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAnalysis && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing your financial data...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This may take up to 30 seconds
                  </p>
                </div>
              )}

              {!isLoadingAnalysis && !analysis && (
                <div className="text-center py-12 space-y-4">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Click "Generate Analysis" to get AI-powered insights
                  </p>
                </div>
              )}

              {!isLoadingAnalysis && analysis && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: analysisHtml }} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Budget Optimization Recommendations</CardTitle>
                  <CardDescription>
                    AI-generated suggestions to reduce expenses and optimize your budget
                  </CardDescription>
                </div>
                <Button
                  onClick={handleGenerateOptimization}
                  disabled={isLoadingOptimization || !user}
                >
                  {isLoadingOptimization ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Optimization
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingOptimization && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Optimizing your budget...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This may take up to 30 seconds
                  </p>
                </div>
              )}

              {!isLoadingOptimization && !optimization && (
                <div className="text-center py-12 space-y-4">
                  <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Click "Generate Optimization" to get budget recommendations
                  </p>
                </div>
              )}

              {!isLoadingOptimization && optimization && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: optimizationHtml }} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
