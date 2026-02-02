import { format } from "date-fns";
import {
	CheckCircle2,
	Clock,
	Minus,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	Account,
	InterestRateHistory,
	LoanEMIPayment,
} from "@/types/types";
import { formatCurrency } from "@/utils/format";
import {
	calculateAllEMIBreakdowns,
	calculateEMI,
} from "@/utils/loanCalculations";

interface LoanScheduleComparisonProps {
    account: Account;
    rateHistory: InterestRateHistory[];
    actualPayments: LoanEMIPayment[];
}

interface ComparisonRow {
    paymentNumber: number;
    // Projected
    projectedDate: string;
    projectedEMI: number;
    projectedPrincipal: number;
    projectedInterest: number;
    projectedBalance: number;
    // Actual
    actualDate: string | null;
    actualEMI: number | null;
    actualPrincipal: number | null;
    actualInterest: number | null;
    actualBalance: number | null;
    // Status
    status: 'paid' | 'pending' | 'overdue';
    // Variance
    emiVariance: number | null;
    principalVariance: number | null;
    interestVariance: number | null;
}

export default function LoanScheduleComparison({
    account,
    rateHistory,
    actualPayments,
}: LoanScheduleComparisonProps) {
    const comparison = useMemo(() => {
        if (
            !account.loan_principal ||
            !account.loan_tenure_months ||
            !account.current_interest_rate
        ) {
            return [];
        }

        const start = account.loan_start_date || new Date().toISOString();
        const principal = Number(account.loan_principal);
        const tenure = Number(account.loan_tenure_months);
        const currentRate = Number(account.current_interest_rate);

        // Determine the opening interest rate (first entry in history, or current if no history)
        const sortedHistory = [...rateHistory].sort(
            (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
        );
        const openingRate = sortedHistory.length > 0
            ? Number(sortedHistory[0].interest_rate)
            : currentRate;

        // Generate projected payment dates
        const projectedPayments = [];
        const loanStart = new Date(start);
        const emi = calculateEMI(principal, openingRate, tenure);

        for (let i = 1; i <= tenure; i++) {
            const date = new Date(loanStart);
            date.setMonth(date.getMonth() + i);
            if (account.due_date) {
                date.setDate(account.due_date);
            }

            projectedPayments.push({
                payment_date: date.toISOString(),
                emi_amount: emi
            });
        }

        // Calculate projected breakdown
        const effectiveHistory = rateHistory.length > 0 ? rateHistory : [{
            effective_date: start,
            interest_rate: openingRate,
            id: 'default',
            account_id: account.id,
            created_at: start
        }];

        const projectedSchedule = calculateAllEMIBreakdowns(
            start,
            principal,
            projectedPayments,
            effectiveHistory,
            account.due_date || undefined,
            openingRate
        );

        // Sort actual payments by payment number
        const sortedActual = [...actualPayments].sort(
            (a, b) => a.payment_number - b.payment_number
        );

        // Create comparison rows
        const rows: ComparisonRow[] = [];
        const today = new Date();

        for (let i = 0; i < projectedSchedule.length; i++) {
            const projected = projectedSchedule[i];
            const actual = sortedActual.find(p => p.payment_number === projected.payment_number);
            const projectedDate = new Date(projected.payment_date);

            let status: 'paid' | 'pending' | 'overdue' = 'pending';
            if (actual) {
                status = 'paid';
            } else if (projectedDate < today) {
                status = 'overdue';
            }

            rows.push({
                paymentNumber: projected.payment_number,
                // Projected
                projectedDate: projected.payment_date,
                projectedEMI: projected.emi_amount,
                projectedPrincipal: projected.principal_component,
                projectedInterest: projected.interest_component,
                projectedBalance: projected.outstanding_principal,
                // Actual
                actualDate: actual?.payment_date || null,
                actualEMI: actual?.emi_amount ?? null,
                actualPrincipal: actual?.principal_component ?? null,
                actualInterest: actual?.interest_component ?? null,
                actualBalance: actual?.outstanding_principal ?? null,
                // Status
                status,
                // Variance (actual - projected, positive means paid more)
                emiVariance: actual ? actual.emi_amount - projected.emi_amount : null,
                principalVariance: actual ? actual.principal_component - projected.principal_component : null,
                interestVariance: actual ? actual.interest_component - projected.interest_component : null,
            });
        }

        return rows;
    }, [account, rateHistory, actualPayments]);

    if (comparison.length === 0) {
        return <div className="text-center text-muted-foreground p-4">Unable to generate comparison. Missing loan details.</div>;
    }

    // Calculate summary stats
    const paidCount = comparison.filter(r => r.status === 'paid').length;
    const overdueCount = comparison.filter(r => r.status === 'overdue').length;
    
    // Only calculate interest savings from PAID EMIs
    // Interest Saved = (Projected Interest for paid EMIs) - (Actual Interest paid)
    const paidRows = comparison.filter(r => r.status === 'paid');
    const totalProjectedInterestPaid = paidRows.reduce((sum, r) => sum + r.projectedInterest, 0);
    const totalActualInterestPaid = paidRows.reduce((sum, r) => sum + (r.actualInterest || 0), 0);
    const interestSavings = totalProjectedInterestPaid - totalActualInterestPaid;
    
    // Total projected for entire loan (for reference)
    const totalProjectedInterest = comparison.reduce((sum, r) => sum + r.projectedInterest, 0);

    const getStatusBadge = (status: 'paid' | 'pending' | 'overdue') => {
        switch (status) {
            case 'paid':
                return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
            case 'overdue':
                return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Overdue</Badge>;
            case 'pending':
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        }
    };

    const getVarianceIndicator = (variance: number | null) => {
        if (variance === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
        if (Math.abs(variance) < 1) return <Minus className="h-4 w-4 text-muted-foreground" />;
        if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
        return <TrendingDown className="h-4 w-4 text-green-500" />;
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">{paidCount}</div>
                        <p className="text-xs text-muted-foreground">EMIs Paid</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-amber-600">{comparison.length - paidCount}</div>
                        <p className="text-xs text-muted-foreground">EMIs Remaining</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
                        <p className="text-xs text-muted-foreground">Overdue</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className={`text-2xl font-bold ${interestSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(interestSavings), account.currency)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Interest {interestSavings >= 0 ? 'Saved' : 'Extra'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Comparison Table */}
            <div className="rounded-md border max-h-[500px] overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Projected Date</TableHead>
                            <TableHead>Actual Date</TableHead>
                            <TableHead className="text-right">Projected EMI</TableHead>
                            <TableHead className="text-right">Actual EMI</TableHead>
                            <TableHead className="text-right">Principal (P/A)</TableHead>
                            <TableHead className="text-right">Interest (P/A)</TableHead>
                            <TableHead className="text-right">Balance (P/A)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {comparison.map((row) => {
                            // For pending rows, show projected EMI as actual EMI in blue until balance is 0
                            const isPendingWithProjection = row.status === 'pending' && row.actualEMI === null;
                            
                            return (
                                <TableRow 
                                    key={row.paymentNumber} 
                                    className={`${row.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20' : ''} ${isPendingWithProjection ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                                >
                                    <TableCell>{row.paymentNumber}</TableCell>
                                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                                    <TableCell>
                                        {format(new Date(row.projectedDate), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        {row.actualDate
                                            ? format(new Date(row.actualDate), "MMM dd, yyyy")
                                            : <span className="text-muted-foreground">-</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(row.projectedEMI, account.currency)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {row.actualEMI !== null ? (
                                                <>
                                                    {formatCurrency(row.actualEMI, account.currency)}
                                                    {getVarianceIndicator(row.emiVariance)}
                                                </>
                                            ) : isPendingWithProjection ? (
                                                <span className="text-blue-600 font-semibold">
                                                    {formatCurrency(row.projectedEMI, account.currency)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end text-xs">
                                            <span className="text-emerald-600">{formatCurrency(row.projectedPrincipal, account.currency)}</span>
                                            <span className={isPendingWithProjection ? 'text-blue-600 font-semibold' : row.actualPrincipal !== null ? 'text-emerald-800 font-medium' : 'text-muted-foreground'}>
                                                {row.actualPrincipal !== null
                                                    ? formatCurrency(row.actualPrincipal, account.currency)
                                                    : isPendingWithProjection
                                                    ? formatCurrency(row.projectedPrincipal, account.currency)
                                                    : '-'
                                                }
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end text-xs">
                                            <span className="text-red-600">{formatCurrency(row.projectedInterest, account.currency)}</span>
                                            <span className={isPendingWithProjection ? 'text-blue-600 font-semibold' : row.actualInterest !== null ? 'text-red-800 font-medium' : 'text-muted-foreground'}>
                                                {row.actualInterest !== null
                                                    ? formatCurrency(row.actualInterest, account.currency)
                                                    : isPendingWithProjection
                                                    ? formatCurrency(row.projectedInterest, account.currency)
                                                    : '-'
                                                }
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end text-xs">
                                            <span>{formatCurrency(row.projectedBalance, account.currency)}</span>
                                            <span className={isPendingWithProjection ? 'text-blue-600 font-semibold' : row.actualBalance !== null ? 'font-medium' : 'text-muted-foreground'}>
                                                {row.actualBalance !== null
                                                    ? formatCurrency(row.actualBalance, account.currency)
                                                    : isPendingWithProjection
                                                    ? formatCurrency(row.projectedBalance, account.currency)
                                                    : '-'
                                                }
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Legend */}
            <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>P/A</strong> = Projected / Actual</p>
                <p>• <TrendingUp className="h-3 w-3 inline text-red-500" /> Paid more than projected | <TrendingDown className="h-3 w-3 inline text-green-500" /> Paid less than projected</p>
                <p>• <span className="text-blue-600 font-semibold">Blue text</span> in pending rows shows projected values as a forecast (useful for analyzing early repayment scenarios)</p>
                <p>• Interest Saved/Extra is calculated based on actual payments vs projected schedule</p>
            </div>
        </div>
    );
}
