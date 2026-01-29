import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/format";
import { calculateAllEMIBreakdowns, calculateEMI } from "@/utils/loanCalculations";
import type { Account, InterestRateHistory } from "@/types/types";
import { useMemo } from "react";

interface LoanAmortizationScheduleProps {
    account: Account;
    rateHistory: InterestRateHistory[];
    startDate?: string; // Optional override
}

export default function LoanAmortizationSchedule({
    account,
    rateHistory,
    startDate,
}: LoanAmortizationScheduleProps) {
    const schedule = useMemo(() => {
        if (
            !account.loan_principal ||
            !account.loan_tenure_months ||
            !account.current_interest_rate
        ) {
            return [];
        }

        const start = startDate || account.loan_start_date || new Date().toISOString();
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

        // Generate expected payment dates
        const payments = [];
        const loanStart = new Date(start);

        // Calculate EMI using the OPENING interest rate (rate at loan start)
        const emi = calculateEMI(principal, openingRate, tenure);

        for (let i = 1; i <= tenure; i++) {
            const date = new Date(loanStart);
            date.setMonth(date.getMonth() + i);
            if (account.due_date) {
                date.setDate(account.due_date);
            }

            payments.push({
                payment_date: date.toISOString(),
                emi_amount: emi
            });
        }

        // Calculate breakdown
        // Note: rateHistory should be passed. If empty, create a synthetic one from current rate
        const effectiveHistory = rateHistory.length > 0 ? rateHistory : [{
            effective_date: start,
            interest_rate: currentRate,
            id: 'default',
            account_id: account.id,
            created_at: start // dummy
        }];

        return calculateAllEMIBreakdowns(
            start,
            principal,
            payments,
            effectiveHistory,
            account.due_date || undefined,
            currentRate  // Pass opening rate as fallback
        );

    }, [account, rateHistory, startDate]);

    if (schedule.length === 0) {
        return <div className="text-center text-muted-foreground p-4">Unable to generate schedule. Missing loan details.</div>;
    }

    return (
        <div className="rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">EMI</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schedule.map((row) => (
                        <TableRow key={row.payment_number}>
                            <TableCell>{row.payment_number}</TableCell>
                            <TableCell>
                                {new Date(row.payment_date).toLocaleDateString(undefined, {
                                    month: "short",
                                    year: "numeric",
                                })}
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(row.emi_amount, account.currency)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600">
                                {formatCurrency(row.principal_component, account.currency)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                                {formatCurrency(row.interest_component, account.currency)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(row.outstanding_principal, account.currency)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
