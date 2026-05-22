import { useEffect, useState, useMemo, useCallback, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHybridAuth as useAuth } from '@/contexts/HybridAuthContext';
import { accountApi, loanEMIPaymentApi } from '@/db/api';
import type { Account, LoanEMIPayment } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  TrendingDown,
  Info,
  Calendar,
  AlertCircle,
  PiggyBank,
  Hourglass,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Pencil,
  RotateCcw
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { calculateEMI } from '@/utils/loanCalculations';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CombinedScheduleItem {
  month: number;
  paymentDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  outstandingPrincipal: number;
  isActual: boolean;
}

export default function LoanEMISimulator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State to track if SheetJS is loaded
  const [xlsxLoaded, setXlsxLoaded] = useState(typeof window !== 'undefined' && !!(window as any).XLSX);

  // Dynamic script loader for SheetJS client-side Excel export
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.18.5/package/xlsx.full.min.js';
      script.async = true;
      script.onload = () => {
        console.log('SheetJS loaded');
        setXlsxLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      setXlsxLoaded(true);
    }
  }, []);

  // Active Loan Accounts
  const [loanAccounts, setLoanAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('manual');
  const [loading, setLoading] = useState(true);

  // Actual EMI Payments for Selected Account
  const [actualPayments, setActualPayments] = useState<LoanEMIPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Original Loan Parameters (for EMI calculation)
  const [originalPrincipal, setOriginalPrincipal] = useState<number>(500000);
  const [originalTenure, setOriginalTenure] = useState<number>(120);

  // Current Outstanding & Remaining Parameters (for simulation start point)
  const [outstandingPrincipal, setOutstandingPrincipal] = useState<number>(500000);
  const [annualRate, setAnnualRate] = useState<number>(9.5);
  const [remainingTenureMonths, setRemainingTenureMonths] = useState<number>(120);
  const [simulatedEMI, setSimulatedEMI] = useState<number>(0);

  // Per-month EMI overrides for projected installments (key = projected month index starting at 1)
  const [emiOverrides, setEmiOverrides] = useState<Record<number, number>>({});
  
  // Custom outstanding date starting point
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Currency
  const currency = useMemo(() => {
    if (selectedAccountId !== 'manual') {
      const acc = loanAccounts.find(a => a.id === selectedAccountId);
      if (acc) return acc.currency;
    }
    return 'INR';
  }, [selectedAccountId, loanAccounts]);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const accounts = await accountApi.getAccounts(user.id);
        const loans = accounts.filter((a: Account) => a.account_type === 'loan');
        setLoanAccounts(loans);
        
        if (loans.length > 0) {
          // Default to first active loan account
          setSelectedAccountId(loans[0].id);
        } else {
          setSelectedAccountId('manual');
        }
      } catch (error) {
        console.error('Error fetching loan accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [user]);

  // Fetch actual payments when selected account changes
  useEffect(() => {
    const fetchActuals = async () => {
      if (selectedAccountId === 'manual') {
        setActualPayments([]);
        return;
      }
      try {
        setLoadingPayments(true);
        const payments = await loanEMIPaymentApi.getPaymentsByAccount(selectedAccountId);
        // Sort chronologically by payment date or payment number
        const sorted = [...payments].sort((a, b) => a.payment_number - b.payment_number);
        setActualPayments(sorted);
      } catch (error) {
        console.error('Error fetching EMI payments:', error);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchActuals();
  }, [selectedAccountId]);

  // Populate inputs based on selected account
  useEffect(() => {
    if (selectedAccountId !== 'manual' && loanAccounts.length > 0) {
      const account = loanAccounts.find(a => a.id === selectedAccountId);
      if (account) {
        // Coerce types defensively
        const origLoanAmount = Number(account.loan_principal || account.balance || 0);
        const outstandingBal = Number(account.balance || 0);
        const interestRate = Number(account.current_interest_rate || 9.5);
        const totalTenure = Number(account.loan_tenure_months || 120);
        const remainingMonths = Math.max(1, totalTenure - actualPayments.length);
        
        // Original loan parameters (for EMI calculation)
        setOriginalPrincipal(origLoanAmount);
        setOriginalTenure(totalTenure);
        
        // Current outstanding & remaining (for simulation start point)
        setOutstandingPrincipal(outstandingBal);
        setAnnualRate(interestRate);
        setRemainingTenureMonths(remainingMonths);
        
        // Determine start date based on last payment or today
        if (actualPayments.length > 0) {
          const lastPayment = actualPayments[actualPayments.length - 1];
          setStartDate(lastPayment.payment_date);
        } else if (account.loan_start_date) {
          setStartDate(account.loan_start_date.split('T')[0]);
        } else {
          setStartDate(new Date().toISOString().split('T')[0]);
        }
      }
    }
  }, [selectedAccountId, loanAccounts, actualPayments]);

  // Standard/Original EMI calculation — based on ORIGINAL loan amount, rate & tenure
  const originalEMI = useMemo(() => {
    if (originalPrincipal > 0 && annualRate > 0 && originalTenure > 0) {
      return calculateEMI(originalPrincipal, annualRate, originalTenure);
    }
    return 0;
  }, [originalPrincipal, annualRate, originalTenure]);

  // Sync Simulated EMI with standard EMI when parameters load
  useEffect(() => {
    if (originalEMI > 0) {
      setSimulatedEMI(Math.round(originalEMI));
    }
  }, [originalEMI]);

  // Project original standard amortization schedule for remaining balance
  const standardRemainingSchedule = useMemo(() => {
    if (outstandingPrincipal <= 0 || annualRate <= 0 || originalEMI <= 0 || remainingTenureMonths <= 0) return [];
    
    const results: CombinedScheduleItem[] = [];
    let currentPrincipal = outstandingPrincipal;
    let month = 1;
    const start = new Date(startDate);

    while (currentPrincipal > 0 && month <= remainingTenureMonths) {
      const interest = Math.round(currentPrincipal * (annualRate / 12 / 100) * 100) / 100;
      const emi = Math.min(originalEMI, currentPrincipal + interest);
      const principalComponent = Math.round((emi - interest) * 100) / 100;
      const nextPrincipal = Math.max(0, Math.round((currentPrincipal - principalComponent) * 100) / 100);

      const paymentDate = new Date(start);
      paymentDate.setMonth(start.getMonth() + month);

      results.push({
        month,
        paymentDate: paymentDate.toISOString().split('T')[0],
        emiAmount: emi,
        principalComponent,
        interestComponent: interest,
        outstandingPrincipal: nextPrincipal,
        isActual: false
      });

      currentPrincipal = nextPrincipal;
      month++;
    }
    return results;
  }, [outstandingPrincipal, annualRate, originalEMI, remainingTenureMonths, startDate]);

  // Handler to update a single projected month's EMI override
  const handleEmiOverride = useCallback((projectedMonth: number, value: number) => {
    setEmiOverrides(prev => {
      const next = { ...prev };
      if (value <= 0 || Math.round(value) === Math.round(simulatedEMI)) {
        delete next[projectedMonth];
      } else {
        next[projectedMonth] = value;
      }
      return next;
    });
  }, [simulatedEMI]);

  // Clear all per-month overrides
  const clearAllOverrides = useCallback(() => {
    setEmiOverrides({});
  }, []);

  const overrideCount = Object.keys(emiOverrides).length;

  // Project simulated future amortization schedule starting from current outstanding balance
  const simulatedFutureSchedule = useMemo(() => {
    if (outstandingPrincipal <= 0 || annualRate <= 0 || simulatedEMI <= 0) return [];
    
    const results: CombinedScheduleItem[] = [];
    let currentPrincipal = outstandingPrincipal;
    let month = 1;
    const start = new Date(startDate);

    // Limit to 600 months (50 years) to prevent infinite loops if EMI is set too low
    while (currentPrincipal > 0 && month <= 600) {
      const interest = Math.round(currentPrincipal * (annualRate / 12 / 100) * 100) / 100;
      
      // Use per-month override if set, otherwise fall back to global simulatedEMI
      const monthEMI = emiOverrides[month] ?? simulatedEMI;

      // If effective EMI cannot cover interest, break early
      if (monthEMI <= interest + 0.05 && currentPrincipal > 100) {
        break; 
      }

      const emi = Math.min(monthEMI, currentPrincipal + interest);
      const principalComponent = Math.round((emi - interest) * 100) / 100;
      const nextPrincipal = Math.max(0, Math.round((currentPrincipal - principalComponent) * 100) / 100);

      const paymentDate = new Date(start);
      paymentDate.setMonth(start.getMonth() + month);

      results.push({
        month: actualPayments.length + month,
        paymentDate: paymentDate.toISOString().split('T')[0],
        emiAmount: emi,
        principalComponent,
        interestComponent: interest,
        outstandingPrincipal: nextPrincipal,
        isActual: false
      });

      currentPrincipal = nextPrincipal;
      month++;
    }
    return results;
  }, [outstandingPrincipal, annualRate, simulatedEMI, startDate, actualPayments, emiOverrides]);

  // Combine Actual Payments (if any) and Simulated Projections into a single list
  const unifiedRepaymentSchedule = useMemo(() => {
    const combined: CombinedScheduleItem[] = [];
    
    // 1. Add actual paid records
    actualPayments.forEach((p) => {
      combined.push({
        month: p.payment_number,
        paymentDate: p.payment_date,
        emiAmount: Number(p.emi_amount),
        principalComponent: Number(p.principal_component),
        interestComponent: Number(p.interest_component),
        outstandingPrincipal: Number(p.outstanding_principal),
        isActual: true
      });
    });

    // 2. Add simulated projections
    simulatedFutureSchedule.forEach((p) => {
      combined.push(p);
    });

    return combined;
  }, [actualPayments, simulatedFutureSchedule]);

  // Summary Metrics
  const totalInterestStandard = useMemo(() => {
    return standardRemainingSchedule.reduce((sum, item) => sum + item.interestComponent, 0);
  }, [standardRemainingSchedule]);

  const totalInterestSimulated = useMemo(() => {
    return simulatedFutureSchedule.reduce((sum, item) => sum + item.interestComponent, 0);
  }, [simulatedFutureSchedule]);

  const interestSaved = useMemo(() => {
    return Math.max(0, totalInterestStandard - totalInterestSimulated);
  }, [totalInterestStandard, totalInterestSimulated]);

  const monthsSaved = useMemo(() => {
    return Math.max(0, standardRemainingSchedule.length - simulatedFutureSchedule.length);
  }, [standardRemainingSchedule, simulatedFutureSchedule]);

  const newCompletionDateStr = useMemo(() => {
    if (unifiedRepaymentSchedule.length === 0) return '-';
    const lastItem = unifiedRepaymentSchedule[unifiedRepaymentSchedule.length - 1];
    return new Date(lastItem.paymentDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long'
    });
  }, [unifiedRepaymentSchedule]);

  // Export Simulated Schedule as CSV
  const exportToCSV = () => {
    if (unifiedRepaymentSchedule.length === 0) return;

    const headers = [
      'Month/Inst. No',
      'Payment Date',
      'Payment Status',
      'EMI Amount',
      'Principal Component',
      'Interest Component',
      'Outstanding Principal'
    ];

    const rows = unifiedRepaymentSchedule.map((r) => [
      r.month.toString(),
      r.paymentDate,
      r.isActual ? 'Paid (Actual)' : 'Projected (Simulated)',
      r.emiAmount.toFixed(2),
      r.principalComponent.toFixed(2),
      r.interestComponent.toFixed(2),
      r.outstandingPrincipal.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Loan_Repayment_Simulation_${selectedAccountId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV Exported',
      description: 'The simulation schedule has been downloaded successfully.',
    });
  };

  // Export to XLSX using SheetJS (client-side)
  const exportToXLSX = () => {
    const xlsx = (window as any).XLSX;
    if (!xlsx) {
      toast({ title: 'Export Failed', description: 'SheetJS library not loaded yet.' });
      return;
    }
    if (unifiedRepaymentSchedule.length === 0) return;

    const data = unifiedRepaymentSchedule.map((r) => ({
      'Month/Inst. No': r.month,
      'Payment Date': r.paymentDate,
      'Payment Status': r.isActual ? 'Paid (Actual)' : 'Projected (Simulated)',
      'EMI Amount': r.emiAmount,
      'Principal Component': r.principalComponent,
      'Interest Component': r.interestComponent,
      'Outstanding Principal': r.outstandingPrincipal,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Schedule');
    const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Loan_Repayment_Simulation_${selectedAccountId}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Excel Exported',
      description: 'The simulation schedule has been downloaded as an .xlsx file.',
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/loan-emi-history')}
              className="h-10 w-10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                Loan EMI Simulator & Prepayment Analyzer
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Simulate early repayment strategies, adjust simulated EMIs, and visualize your complete principal-to-interest payoff timeline.
              </p>
            </div>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={unifiedRepaymentSchedule.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 font-semibold shadow-md transition-all self-start md:self-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Schedule (CSV)
          </Button>
          <Button
            variant="outline"
            className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={exportToXLSX}
            disabled={unifiedRepaymentSchedule.length === 0 || !xlsxLoaded}
          >
            {!xlsxLoaded && <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />}
            Export Schedule (XLSX)
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Fetching loan parameters...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* INPUT CONTROLS - LEFT COLUMN */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="shadow-lg border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Loan Configuration
                  </CardTitle>
                  <CardDescription>Select account or enter custom values</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  
                  {/* Account Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Select Loan Account</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Manual Entry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">✨ Manual Simulation (From scratch)</SelectItem>
                        {loanAccounts.map((account: Account) => (
                          <SelectItem key={account.id} value={account.id}>
                            🏦 {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Original Loan Amount */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="originalPrincipal" className="text-sm font-semibold">Original Loan Amount</Label>
                      {selectedAccountId !== 'manual' && (
                        <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 border-slate-300">
                          Synced
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="originalPrincipal"
                        type="number"
                        disabled={selectedAccountId !== 'manual'}
                        value={originalPrincipal || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const val = Math.max(0, Number(e.target.value));
                          setOriginalPrincipal(val);
                          setOutstandingPrincipal(val);
                        }}
                        className="pl-8 border-slate-200 dark:border-slate-800"
                        placeholder="e.g. 500000"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                    </div>
                    {selectedAccountId !== 'manual' ? (
                      <p className="text-xs text-muted-foreground italic">
                        Original sanctioned loan amount from your account.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Enter the original sanctioned loan amount.
                      </p>
                    )}
                  </div>

                  {/* Current Outstanding Principal */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="outstandingPrincipal" className="text-sm font-semibold">Current Outstanding</Label>
                      {selectedAccountId !== 'manual' && (
                        <Badge variant="outline" className="text-xs bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                          Live Balance
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="outstandingPrincipal"
                        type="number"
                        disabled={selectedAccountId !== 'manual'}
                        value={outstandingPrincipal || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setOutstandingPrincipal(Math.max(0, Number(e.target.value)))}
                        className="pl-8 border-slate-200 dark:border-slate-800"
                        placeholder="e.g. 350000"
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                    </div>
                    {selectedAccountId !== 'manual' && (
                      <p className="text-xs text-muted-foreground italic">
                        Current outstanding balance — simulation projects from here.
                      </p>
                    )}
                  </div>

                  {/* Annual Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="annualRate" className="text-sm font-semibold">Annual Interest Rate (%)</Label>
                    <div className="relative">
                      <Input
                        id="annualRate"
                        type="number"
                        step="0.01"
                        value={annualRate || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setAnnualRate(Math.max(0, Number(e.target.value)))}
                        className="pr-8 border-slate-200 dark:border-slate-800"
                        placeholder="e.g. 8.5"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm">%</span>
                    </div>
                  </div>

                  {/* Original Loan Tenure */}
                  <div className="space-y-2">
                    <Label htmlFor="originalTenure" className="text-sm font-semibold">Original Tenure (Months)</Label>
                    <Input
                      id="originalTenure"
                      type="number"
                      disabled={selectedAccountId !== 'manual'}
                      value={originalTenure || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const val = Math.max(1, Math.round(Number(e.target.value)));
                        setOriginalTenure(val);
                        setRemainingTenureMonths(val);
                      }}
                      className="border-slate-200 dark:border-slate-800"
                      placeholder="e.g. 120"
                    />
                    {selectedAccountId !== 'manual' && (
                      <p className="text-xs text-muted-foreground italic">
                        Original loan tenure. Remaining: {remainingTenureMonths} months ({actualPayments.length} paid).
                      </p>
                    )}
                  </div>

                  {/* Calculated Std EMI */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Standard Monthly EMI:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(originalEMI, currency)}</span>
                  </div>

                  {/* Dynamic Simulation EMI Controller */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="simulatedEMI" className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        Simulated Monthly EMI
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSimulatedEMI(Math.round(originalEMI)); clearAllOverrides(); }}
                        className="h-8 text-xs font-semibold text-slate-500 hover:text-blue-600"
                        title="Reset to standard rate and clear all per-month overrides"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reset All
                      </Button>
                    </div>

                    <div className="relative">
                      <Input
                        id="simulatedEMI"
                        type="number"
                        className="pl-8 border-blue-300 dark:border-blue-700 bg-blue-50/20 focus:ring-blue-500 text-lg font-bold text-blue-700 dark:text-blue-400"
                        value={simulatedEMI || ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSimulatedEMI(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="absolute left-3 top-3 text-blue-400 text-sm">₹</span>
                    </div>

                    {/* Quick Prepayment Slider */}
                    {originalEMI > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Standard (₹{Math.round(originalEMI)})</span>
                          <span>Double (₹{Math.round(originalEMI * 2)})</span>
                        </div>
                        <Slider
                          min={Math.round(originalEMI)}
                          max={Math.round(originalEMI * 2)}
                          step={100}
                          value={[simulatedEMI]}
                          onValueChange={(val) => setSimulatedEMI(val[0])}
                          className="py-1 cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground italic text-center">
                          Increase EMI to simulate prepayments and see interest/tenure savings.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warning if simulated EMI is too low to cover interest */}
              {simulatedEMI > 0 && annualRate > 0 && outstandingPrincipal > 0 && simulatedEMI <= Math.round(outstandingPrincipal * (annualRate / 12 / 100)) && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>EMI too low!</strong> The simulated EMI of {formatCurrency(simulatedEMI, currency)} is lower than or equal to the monthly interest charged ({formatCurrency(outstandingPrincipal * (annualRate / 12 / 100), currency)}). The loan balance will never reduce. Please increase your Simulated EMI.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* ANALYTICS & TIMELINE - RIGHT COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* SAVINGS KPI BLOCK */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Interest Saved */}
                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <PiggyBank className="h-4 w-4 text-emerald-600" />
                      Total Interest Saved
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(interestSaved, currency)}
                    </div>
                    <div className="mt-2 text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      {interestSaved > 0 ? (
                        <>
                          <TrendingDown className="h-3.5 w-3.5" />
                          <span>{((interestSaved / Math.max(1, totalInterestStandard)) * 100).toFixed(1)}% interest saved</span>
                        </>
                      ) : (
                        <span>No extra prepayments simulated</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tenure Reduced */}
                <Card className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <Hourglass className="h-4 w-4 text-blue-600" />
                      Tenure Reduced By
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {monthsSaved} Months
                    </div>
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Remaining Tenure: {simulatedFutureSchedule.length} months
                    </p>
                  </CardContent>
                </Card>

                {/* Payoff Date */}
                <Card className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      New Payoff Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {newCompletionDateStr}
                    </div>
                    <p className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      Repayment completes {monthsSaved} months faster
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* UNIFIED AMORTIZATION TABLE */}
              <Card className="shadow-lg border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>Unified Amortization Schedule</CardTitle>
                      <CardDescription>
                        Timeline combining historical <span className="text-emerald-600 font-semibold">Paid EMIs</span> and projected <span className="text-blue-600 font-semibold">Simulated EMIs</span>.
                      </CardDescription>
                    </div>
                    
                    {/* Status indicator badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400">
                        Paid (Actual)
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400">
                        Projected (Future)
                      </Badge>
                      {overrideCount > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 cursor-pointer" onClick={clearAllOverrides}>
                          <RotateCcw className="h-3 w-3 mr-1 inline" />
                          {overrideCount} Custom EMI{overrideCount > 1 ? 's' : ''} — Reset
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingPayments ? (
                    <div className="flex justify-center items-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="ml-2 text-sm text-slate-500">Loading historical data...</span>
                    </div>
                  ) : unifiedRepaymentSchedule.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40 text-slate-400" />
                      <p className="font-semibold">No Simulation Generated</p>
                      <p className="text-sm">Verify outstanding principal, interest rate, and simulated EMI are greater than zero.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 border-b z-10">
                          <TableRow>
                            <TableHead className="w-[80px]">Month</TableHead>
                            <TableHead>Repayment Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">EMI Amount</TableHead>
                            <TableHead className="text-right">Principal Component</TableHead>
                            <TableHead className="text-right">Interest Component</TableHead>
                            <TableHead className="text-right">Outstanding Principal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unifiedRepaymentSchedule.map((row) => (
                            <TableRow
                              key={row.month}
                              className={`transition-colors border-b ${
                                row.isActual
                                  ? 'bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-950/5 dark:hover:bg-emerald-950/10'
                                  : 'bg-blue-50/10 hover:bg-blue-50/20 dark:bg-blue-950/5 dark:hover:bg-blue-950/10'
                              }`}
                            >
                              {/* Month number */}
                              <TableCell className="font-semibold">{row.month}</TableCell>
                              
                              {/* Date */}
                              <TableCell className="text-xs">
                                {new Date(row.paymentDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </TableCell>
                              
                              {/* Status Badge */}
                              <TableCell>
                                {row.isActual ? (
                                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-2xs px-2 py-0.5">
                                    <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Paid
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium text-2xs px-2 py-0.5">
                                    <Calendar className="h-3 w-3 mr-1 inline" /> Projected
                                  </Badge>
                                )}
                              </TableCell>
                              
                              {/* EMI Amount — editable for projected rows */}
                              <TableCell className={`text-right font-bold ${row.isActual ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                {row.isActual ? (
                                  formatCurrency(row.emiAmount, currency)
                                ) : (() => {
                                  const projectedMonth = row.month - actualPayments.length;
                                  const hasOverride = emiOverrides[projectedMonth] !== undefined;
                                  return (
                                    <div className="flex items-center justify-end gap-1 group">
                                      <Pencil className={`h-3 w-3 flex-shrink-0 transition-opacity ${
                                        hasOverride ? 'text-amber-500 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-60'
                                      }`} />
                                      <input
                                        type="number"
                                        className={`w-[100px] text-right font-bold bg-transparent border-b transition-colors focus:outline-none focus:ring-0 ${
                                          hasOverride
                                            ? 'border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-400'
                                            : 'border-transparent hover:border-blue-300 dark:hover:border-blue-600 text-blue-700 dark:text-blue-400'
                                        } focus:border-blue-500 dark:focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        value={emiOverrides[projectedMonth] ?? Math.round(row.emiAmount)}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                          handleEmiOverride(projectedMonth, Math.max(0, Number(e.target.value)));
                                        }}
                                        title="Edit this month's EMI to simulate a custom prepayment"
                                      />
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              
                              {/* Principal */}
                              <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                {formatCurrency(row.principalComponent, currency)}
                              </TableCell>
                              
                              {/* Interest */}
                              <TableCell className="text-right text-orange-600 dark:text-orange-400 font-semibold text-xs">
                                {formatCurrency(row.interestComponent, currency)}
                              </TableCell>
                              
                              {/* Outstanding */}
                              <TableCell className="text-right font-extrabold text-sm">
                                {formatCurrency(row.outstandingPrincipal, currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Legend & Guide */}
              <Alert className="bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>Standard vs. Simulated EMI</strong>: The amortization calculations are compiled using the reducing balance method. 
                  Increasing your Simulated EMI above standard payments applies the excess directly toward reducing outstanding principal. 
                  This reduces the base principal for subsequent interest calculations, yielding compounding interest savings and accelerating loan closure.
                  <br /><br />
                  <strong>Per-Month Editing</strong>: Click any projected EMI amount in the schedule to customize that specific month's payment. 
                  Changes cascade forward — all subsequent months recalculate based on the updated outstanding principal. 
                  Customized amounts are highlighted in amber. Use the "Reset" badge above the table to clear all overrides.
                </AlertDescription>
              </Alert>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
