import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { budgetApi } from '@/db/api';
import type { BudgetAnalysis } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, getMonthName, getCurrentMonthYear } from '@/utils/format';
import { Progress } from '@/components/ui/progress';

export default function Budgets() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear().month);
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);
  const [budgetForm, setBudgetForm] = useState({
    budgeted_income: '',
    budgeted_expenses: '',
  });

  const currency = profile?.default_currency || 'USD';

  useEffect(() => {
    if (user) {
      loadBudgetAnalysis();
    }
  }, [user, selectedMonth, selectedYear]);

  const loadBudgetAnalysis = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await budgetApi.getBudgetAnalysis(user.id, selectedMonth, selectedYear);
      setAnalysis(data);
      
      if (data?.budget) {
        setBudgetForm({
          budgeted_income: data.budget.budgeted_income.toString(),
          budgeted_expenses: data.budget.budgeted_expenses.toString(),
        });
      }
    } catch (error) {
      console.error('Error loading budget analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      await budgetApi.createOrUpdateBudget({
        user_id: user.id,
        month: selectedMonth,
        year: selectedYear,
        budgeted_income: parseFloat(budgetForm.budgeted_income) || 0,
        budgeted_expenses: parseFloat(budgetForm.budgeted_expenses) || 0,
        category_budgets: {},
        currency,
      });

      toast({
        title: 'Success',
        description: 'Budget saved successfully',
      });

      loadBudgetAnalysis();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save budget',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Management</h1>
        <p className="text-muted-foreground">Plan and track your monthly budget</p>
      </div>

      <div className="flex gap-4">
        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => setSelectedMonth(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={month} value={month.toString()}>
                {getMonthName(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Set Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budgeted_income">Budgeted Income</Label>
                <Input
                  id="budgeted_income"
                  type="number"
                  step="0.01"
                  value={budgetForm.budgeted_income}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgeted_income: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgeted_expenses">Budgeted Expenses</Label>
                <Input
                  id="budgeted_expenses"
                  type="number"
                  step="0.01"
                  value={budgetForm.budgeted_expenses}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgeted_expenses: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Budget
              </Button>
            </form>
          </CardContent>
        </Card>

        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Income</span>
                  <span className={`text-sm font-semibold ${analysis.income_variance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {analysis.income_variance >= 0 ? <TrendingUp className="inline h-4 w-4" /> : <TrendingDown className="inline h-4 w-4" />}
                    {formatCurrency(Math.abs(analysis.income_variance), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Budgeted: {formatCurrency(analysis.budget.budgeted_income, currency)}</span>
                  <span>Actual: {formatCurrency(analysis.actual_income, currency)}</span>
                </div>
                <Progress 
                  value={analysis.budget.budgeted_income > 0 ? (analysis.actual_income / analysis.budget.budgeted_income) * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expenses</span>
                  <span className={`text-sm font-semibold ${analysis.expense_variance >= 0 ? 'text-success' : 'text-danger'}`}>
                    {analysis.expense_variance >= 0 ? <TrendingUp className="inline h-4 w-4" /> : <TrendingDown className="inline h-4 w-4" />}
                    {formatCurrency(Math.abs(analysis.expense_variance), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Budgeted: {formatCurrency(analysis.budget.budgeted_expenses, currency)}</span>
                  <span>Actual: {formatCurrency(analysis.actual_expenses, currency)}</span>
                </div>
                <Progress 
                  value={analysis.budget.budgeted_expenses > 0 ? (analysis.actual_expenses / analysis.budget.budgeted_expenses) * 100 : 0} 
                  className="h-2"
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Position</span>
                  <span className={`font-bold ${(analysis.actual_income - analysis.actual_expenses) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(analysis.actual_income - analysis.actual_expenses, currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
