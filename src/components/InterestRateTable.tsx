import { useEffect, useState } from 'react';
import { interestRateApi } from '@/db/api';
import type { InterestRateHistory } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInDays } from 'date-fns';
import { TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface InterestRateTableProps {
  accountId: string;
  accountName: string;
  loanPrincipal: number;
  loanStartDate: string;
  currency: string;
}

interface RatePeriod {
  rate: number;
  startDate: string;
  endDate: string | null;
  days: number;
  accruedInterest: number;
}

export default function InterestRateTable({ 
  accountId, 
  accountName, 
  loanPrincipal, 
  loanStartDate,
  currency 
}: InterestRateTableProps) {
  const [history, setHistory] = useState<InterestRateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratePeriods, setRatePeriods] = useState<RatePeriod[]>([]);

  useEffect(() => {
    loadHistory();
  }, [accountId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await interestRateApi.getInterestRateHistory(accountId);
      setHistory(data);
      calculateRatePeriods(data);
    } catch (error) {
      console.error('Error loading interest rate history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRatePeriods = (historyData: InterestRateHistory[]) => {
    if (historyData.length === 0) {
      setRatePeriods([]);
      return;
    }

    // Sort by effective date
    const sortedHistory = [...historyData].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    const periods: RatePeriod[] = [];
    const today = new Date();

    for (let i = 0; i < sortedHistory.length; i++) {
      const currentRate = sortedHistory[i];
      const nextRate = sortedHistory[i + 1];

      const startDate = new Date(currentRate.effective_date);
      // Use the earlier of: loan start date or rate effective date
      const effectiveStartDate = new Date(Math.max(startDate.getTime(), new Date(loanStartDate).getTime()));
      
      // End date is either the next rate's effective date or today
      const endDate = nextRate ? new Date(nextRate.effective_date) : today;
      
      // Calculate days in this period
      const days = differenceInDays(endDate, effectiveStartDate);
      
      // Calculate accrued interest for this period
      // Formula: (Principal × Rate × Days) / (365 × 100)
      const accruedInterest = (loanPrincipal * Number(currentRate.interest_rate) * days) / (365 * 100);

      periods.push({
        rate: Number(currentRate.interest_rate),
        startDate: format(effectiveStartDate, 'yyyy-MM-dd'),
        endDate: nextRate ? format(new Date(nextRate.effective_date), 'yyyy-MM-dd') : null,
        days,
        accruedInterest,
      });
    }

    setRatePeriods(periods);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Interest Rate History - {accountName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Interest Rate History - {accountName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No interest rate changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalAccruedInterest = ratePeriods.reduce((sum, period) => sum + period.accruedInterest, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Interest Rate History - {accountName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Accrued Interest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratePeriods.map((period, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {period.rate.toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(period.startDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {period.endDate ? (
                      format(new Date(period.endDate), 'MMM dd, yyyy')
                    ) : (
                      <span className="text-primary font-medium">Current</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{period.days}</TableCell>
                  <TableCell className="text-right font-medium text-amber-600">
                    {formatCurrency(period.accruedInterest, currency)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-right">Total Accrued Interest:</TableCell>
                <TableCell className="text-right text-amber-600">
                  {formatCurrency(totalAccruedInterest, currency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground space-y-1">
          <p>• Interest is calculated based on the number of days at each rate</p>
          <p>• Formula: (Principal × Rate × Days) / (365 × 100)</p>
          <p>• Current period shows accrued interest till today</p>
        </div>
      </CardContent>
    </Card>
  );
}
