import { useEffect, useState } from 'react';
import { interestRateApi } from '@/db/api';
import type { InterestRateHistory } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface InterestRateChartProps {
  accountId: string;
  accountName: string;
}

export default function InterestRateChart({ accountId, accountName }: InterestRateChartProps) {
  const [history, setHistory] = useState<InterestRateHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [accountId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await interestRateApi.getInterestRateHistory(accountId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading interest rate history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Interest Rate History - {accountName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Interest Rate History - {accountName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No interest rate changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = history
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
    .map((entry) => ({
      date: format(new Date(entry.effective_date), 'MMM dd, yyyy'),
      rate: Number(entry.interest_rate),
      fullDate: entry.effective_date,
    }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-primary font-semibold">{payload[0].value.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Interest Rate History - {accountName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Interest Rate (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="stepAfter"
              dataKey="rate"
              name="Interest Rate (%)"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Total rate changes: {history.length}</p>
          <p>Current rate: {history[history.length - 1]?.interest_rate.toFixed(2)}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
