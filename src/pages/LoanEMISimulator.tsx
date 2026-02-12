import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi } from '@/db/api';
import type { Account } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, RefreshCw, TrendingDown, Info } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { calculateEMI, calculateEMIBreakdown } from '@/utils/loanCalculations';

interface SimulationResult {
    month: number;
    paymentDate: string;
    emiAmount: number;
    principalComponent: number;
    interestComponent: number;
    outstandingPrincipal: number;
}

export default function LoanEMISimulator() {
    console.log('LoanEMISimulator rendering...');
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [loanAccounts, setLoanAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // Loan details (Manual or from selected account)
    const [principal, setPrincipal] = useState<number>(0);
    const [annualRate, setAnnualRate] = useState<number>(0);
    const [tenureMonths, setTenureMonths] = useState<number>(0);
    const [simulatedEMI, setSimulatedEMI] = useState<number>(0);
    const [startDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const currency = profile?.default_currency || 'INR';

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;

            try {
                const accounts = await accountApi.getAccounts(user.id);
                const loans = accounts.filter((a: Account) => a.account_type === 'loan');
                setLoanAccounts(loans);

                if (loans.length > 0) {
                    // Default to "Manual Entry"
                    setSelectedAccountId('manual');
                } else {
                    setSelectedAccountId('manual');
                }
            } catch (error) {
                console.error('Error fetching loan accounts:', error);
            }
        };

        fetchData();
    }, [user]);

    useEffect(() => {
        if (selectedAccountId && selectedAccountId !== 'manual') {
            const account = loanAccounts.find(a => a.id === selectedAccountId);
            if (account) {
                setPrincipal(Number(account.balance));
                // Note: Interest rate and tenure might not be directly on account object in all systems
                // but often we might have them or we can let user fill them.
                // Assuming we might have some defaults or they are 0 for now.
                setAnnualRate(0); // User might need to enter this if not in account meta
                setTenureMonths(0);
                setSimulatedEMI(0);
            }
        }
    }, [selectedAccountId, loanAccounts]);

    const originalEMI = useMemo(() => {
        if (principal > 0 && annualRate > 0 && tenureMonths > 0) {
            return calculateEMI(principal, annualRate, tenureMonths);
        }
        return 0;
    }, [principal, annualRate, tenureMonths]);

    useEffect(() => {
        if (originalEMI > 0 && simulatedEMI === 0) {
            setSimulatedEMI(originalEMI);
        }
    }, [originalEMI]);

    const simulationData = useMemo(() => {
        if (principal <= 0 || annualRate <= 0 || simulatedEMI <= 0) return [];

        const results: SimulationResult[] = [];
        let currentPrincipal = principal;
        let month = 1;
        const start = new Date(startDate);

        while (currentPrincipal > 0 && month <= 600) { // Safety break at 50 years
            const emi = Math.min(simulatedEMI, currentPrincipal + (currentPrincipal * annualRate / 12 / 100));
            const breakdown = calculateEMIBreakdown(currentPrincipal, emi, annualRate);

            const paymentDate = new Date(start);
            paymentDate.setMonth(start.getMonth() + month);

            results.push({
                month,
                paymentDate: paymentDate.toISOString().split('T')[0],
                emiAmount: emi,
                principalComponent: breakdown.principalComponent,
                interestComponent: breakdown.interestComponent,
                outstandingPrincipal: breakdown.newOutstandingPrincipal,
            });

            currentPrincipal = breakdown.newOutstandingPrincipal;
            month++;
        }

        return results;
    }, [principal, annualRate, simulatedEMI, startDate]);

    const originalData = useMemo(() => {
        if (principal <= 0 || annualRate <= 0 || originalEMI <= 0) return [];

        const results: SimulationResult[] = [];
        let currentPrincipal = principal;
        let month = 1;
        const start = new Date(startDate);

        while (currentPrincipal > 0 && month <= tenureMonths) {
            const emi = Math.min(originalEMI, currentPrincipal + (currentPrincipal * annualRate / 12 / 100));
            const breakdown = calculateEMIBreakdown(currentPrincipal, emi, annualRate);

            const paymentDate = new Date(start);
            paymentDate.setMonth(start.getMonth() + month);

            results.push({
                month,
                paymentDate: paymentDate.toISOString().split('T')[0],
                emiAmount: emi,
                principalComponent: breakdown.principalComponent,
                interestComponent: breakdown.interestComponent,
                outstandingPrincipal: breakdown.newOutstandingPrincipal,
            });

            currentPrincipal = breakdown.newOutstandingPrincipal;
            month++;
        }

        return results;
    }, [principal, annualRate, originalEMI, tenureMonths, startDate]);

    const totalInterestSimulated = simulationData.reduce((sum: number, r: SimulationResult) => sum + r.interestComponent, 0);
    const totalInterestOriginal = originalData.reduce((sum: number, r: SimulationResult) => sum + r.interestComponent, 0);
    const interestSaved = Math.max(0, totalInterestOriginal - totalInterestSimulated);
    const monthsSaved = Math.max(0, originalData.length - simulationData.length);

    const exportToExcel = () => {
        const headers = ['Month', 'Payment Date', 'EMI Amount', 'Principal', 'Interest', 'Outstanding Principal'];
        const rows = simulationData.map((r: SimulationResult) => [
            r.month.toString(),
            r.paymentDate,
            r.emiAmount.toFixed(2),
            r.principalComponent.toFixed(2),
            r.interestComponent.toFixed(2),
            r.outstandingPrincipal.toFixed(2),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EMI_Simulation_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold">Loan EMI Simulator</h1>
                    </div>
                    <Button onClick={exportToExcel} disabled={simulationData.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Excel
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Inputs Section */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Loan Parameters</CardTitle>
                            <CardDescription>Enter details to start simulation</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Account (Optional)</Label>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Manual Entry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual Entry</SelectItem>
                                        {loanAccounts.map((account: Account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.account_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="principal">Outstanding Principal</Label>
                                <Input
                                    id="principal"
                                    type="number"
                                    value={principal || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPrincipal(Number(e.target.value))}
                                    placeholder="e.g. 500000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="annualRate">Annual Interest Rate (%)</Label>
                                <Input
                                    id="annualRate"
                                    type="number"
                                    step="0.01"
                                    value={annualRate || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAnnualRate(Number(e.target.value))}
                                    placeholder="e.g. 8.5"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tenureMonths">Balance Tenure (Months)</Label>
                                <Input
                                    id="tenureMonths"
                                    type="number"
                                    value={tenureMonths || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTenureMonths(Number(e.target.value))}
                                    placeholder="e.g. 120"
                                />
                            </div>

                            <div className="pt-4 border-t space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Calculated Std. EMI:</span>
                                    <span className="font-bold">{formatCurrency(originalEMI, currency)}</span>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="simulatedEMI" className="text-blue-600 dark:text-blue-400">
                                        Simulated Monthly EMI Amount
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="simulatedEMI"
                                            type="number"
                                            className="border-blue-200 focus:ring-blue-500"
                                            value={simulatedEMI || ''}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSimulatedEMI(Number(e.target.value))}
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setSimulatedEMI(originalEMI)}
                                            title="Reset to Standard EMI"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">
                                        Pay more than your EMI to see the impact on interest and tenure.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Summary Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                        Total Interest Saved
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-emerald-600">
                                        {formatCurrency(interestSaved, currency)}
                                    </div>
                                    <div className="mt-2 text-xs flex items-center gap-1 text-emerald-600">
                                        <TrendingDown className="h-3 w-3" />
                                        {totalInterestOriginal > 0 && (
                                            <span className="font-medium">
                                                {((interestSaved / totalInterestOriginal) * 100).toFixed(1)}% reduction
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                        Tenure Reduced By
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {monthsSaved} Months
                                    </div>
                                    <p className="mt-2 text-xs text-blue-600 font-medium">
                                        New Tenure: {simulationData.length} months
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Amortization Schedule (Simulated)</CardTitle>
                                <CardDescription>Projected monthly breakdown with enhanced EMI</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[400px] overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-[80px]">Month</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">EMI</TableHead>
                                                <TableHead className="text-right">Principal</TableHead>
                                                <TableHead className="text-right">Interest</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {simulationData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        Enter valid loan details to see the schedule
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                simulationData.map((row: SimulationResult) => (
                                                    <TableRow key={row.month} className={row.month % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}>
                                                        <TableCell>{row.month}</TableCell>
                                                        <TableCell className="text-xs">{row.paymentDate}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(row.emiAmount, currency)}</TableCell>
                                                        <TableCell className="text-right text-emerald-600">{formatCurrency(row.principalComponent, currency)}</TableCell>
                                                        <TableCell className="text-right text-orange-600">{formatCurrency(row.interestComponent, currency)}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(row.outstandingPrincipal, currency)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
                                This simulator uses the reducing balance method. Actual bank calculations may vary slightly due to day-count conventions and interest capitalization.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </div>
        </div>
    );
}
