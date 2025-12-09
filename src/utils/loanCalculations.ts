/**
 * Loan Calculation Utilities
 * Functions for calculating EMI, accrued interest, and other loan metrics
 */

import type { InterestRateHistory } from '@/types/types';

/**
 * Calculate EMI (Equated Monthly Installment)
 * Formula: EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
 * where P = principal, R = monthly interest rate, N = tenure in months
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi * 100) / 100;
}

/**
 * Calculate accrued interest based on rate history
 * Takes into account different interest rates over different periods
 */
export function calculateAccruedInterest(
  loanStartDate: string,
  currentBalance: number,
  rateHistory: InterestRateHistory[],
  currentRate: number
): number {
  if (!loanStartDate || currentBalance <= 0) {
    return 0;
  }

  const startDate = new Date(loanStartDate);
  const today = new Date();
  
  // If loan hasn't started yet
  if (startDate > today) {
    return 0;
  }

  // Sort rate history by effective date
  const sortedHistory = [...rateHistory].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  let totalInterest = 0;
  let periodStartDate = startDate;

  // Calculate interest for each rate period
  for (let i = 0; i < sortedHistory.length; i++) {
    const rateEntry = sortedHistory[i];
    const effectiveDate = new Date(rateEntry.effective_date);
    
    // Skip if effective date is before loan start
    if (effectiveDate < startDate) {
      continue;
    }

    // Calculate interest for the period before this rate change
    if (i === 0 && effectiveDate > startDate) {
      // Use current rate for period from start to first rate change
      const days = Math.floor((effectiveDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const interest = (currentBalance * currentRate * days) / (365 * 100);
      totalInterest += interest;
    }

    // Set up for next period
    periodStartDate = effectiveDate;
  }

  // Calculate interest from last rate change (or start) to today
  if (sortedHistory.length > 0) {
    const lastRate = sortedHistory[sortedHistory.length - 1];
    const lastEffectiveDate = new Date(lastRate.effective_date);
    
    if (lastEffectiveDate <= today) {
      const days = Math.floor((today.getTime() - lastEffectiveDate.getTime()) / (1000 * 60 * 60 * 24));
      const interest = (currentBalance * lastRate.interest_rate * days) / (365 * 100);
      totalInterest += interest;
    }
  } else {
    // No rate history, use current rate for entire period
    const days = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interest = (currentBalance * currentRate * days) / (365 * 100);
    totalInterest += interest;
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculate total interest payable over loan tenure
 */
export function calculateTotalInterest(
  principal: number,
  emi: number,
  tenureMonths: number
): number {
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;
  return Math.round(totalInterest * 100) / 100;
}

/**
 * Calculate remaining tenure based on payments made
 */
export function calculateRemainingTenure(
  principal: number,
  currentBalance: number,
  tenureMonths: number
): number {
  if (principal <= 0 || currentBalance <= 0) {
    return 0;
  }
  
  const paidAmount = principal - currentBalance;
  const paidPercentage = paidAmount / principal;
  const monthsPaid = Math.floor(tenureMonths * paidPercentage);
  const remainingMonths = tenureMonths - monthsPaid;
  
  return Math.max(0, remainingMonths);
}

/**
 * Format currency for display
 */
export function formatLoanAmount(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate monthly interest for current month
 */
export function calculateMonthlyInterest(
  balance: number,
  annualRate: number
): number {
  const monthlyRate = annualRate / 12 / 100;
  const interest = balance * monthlyRate;
  return Math.round(interest * 100) / 100;
}

/**
 * Calculate EMI payment breakdown (principal and interest components)
 * Uses reducing balance method
 */
export function calculateEMIBreakdown(
  outstandingPrincipal: number,
  emiAmount: number,
  annualInterestRate: number
): {
  principalComponent: number;
  interestComponent: number;
  newOutstandingPrincipal: number;
} {
  if (outstandingPrincipal <= 0 || emiAmount <= 0 || annualInterestRate < 0) {
    return {
      principalComponent: 0,
      interestComponent: 0,
      newOutstandingPrincipal: 0
    };
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const interestComponent = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;
  const principalComponent = Math.round((emiAmount - interestComponent) * 100) / 100;
  const newOutstandingPrincipal = Math.max(0, Math.round((outstandingPrincipal - principalComponent) * 100) / 100);

  return {
    principalComponent,
    interestComponent,
    newOutstandingPrincipal
  };
}

/**
 * Calculate EMI payment breakdown considering interest rate history
 * This function calculates interest from day 1 of loan, considering rate changes
 */
/**
 * Helper function to calculate interest for a period with rate history
 */
function calculateInterestForPeriod(
  startDate: Date,
  endDate: Date,
  principal: number,
  rateHistory: Array<{ effective_date: string; interest_rate: number }>
): number {
  const sortedRates = [...rateHistory].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  let totalInterest = 0;
  let periodStartDate = startDate;

  for (let i = 0; i < sortedRates.length; i++) {
    const rateEntry = sortedRates[i];
    const rateEffectiveDate = new Date(rateEntry.effective_date);
    
    if (rateEffectiveDate <= periodStartDate) {
      continue;
    }

    if (rateEffectiveDate >= endDate) {
      break;
    }

    const periodEndDate = rateEffectiveDate;
    const days = Math.floor((periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const applicableRate = i > 0 ? sortedRates[i - 1].interest_rate : sortedRates[0].interest_rate;
    const periodInterest = (principal * applicableRate * days) / (365 * 100);
    totalInterest += periodInterest;

    periodStartDate = periodEndDate;
  }

  const remainingDays = Math.floor((endDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
  if (remainingDays > 0) {
    const lastRate = sortedRates.length > 0 
      ? sortedRates[sortedRates.length - 1].interest_rate 
      : 0;
    const remainingInterest = (principal * lastRate * remainingDays) / (365 * 100);
    totalInterest += remainingInterest;
  }

  return totalInterest;
}

/**
 * Calculate the due date for an EMI payment based on the due day of month
 */
function calculateDueDate(referenceDate: Date, dueDayOfMonth: number): Date {
  const dueDate = new Date(referenceDate);
  dueDate.setDate(dueDayOfMonth);
  
  // If the due day has already passed in the reference month, move to next month
  if (dueDate <= referenceDate) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  return dueDate;
}

export function calculateEMIBreakdownWithHistory(
  loanStartDate: string,
  previousPaymentDate: string | null,
  currentPaymentDate: string,
  outstandingPrincipal: number,
  emiAmount: number,
  rateHistory: Array<{ effective_date: string; interest_rate: number }>,
  dueDayOfMonth?: number
): {
  principalComponent: number;
  interestComponent: number;
  newOutstandingPrincipal: number;
} {
  if (outstandingPrincipal <= 0 || emiAmount <= 0) {
    return {
      principalComponent: 0,
      interestComponent: 0,
      newOutstandingPrincipal: 0
    };
  }

  const startDate = new Date(previousPaymentDate || loanStartDate);
  const paymentDate = new Date(currentPaymentDate);
  
  let totalInterest = 0;
  let principalComponent = 0;

  // If due day is provided and payment is made before due date, use split calculation
  if (dueDayOfMonth) {
    const dueDate = calculateDueDate(startDate, dueDayOfMonth);
    
    if (paymentDate < dueDate) {
      // Split calculation: payment made before due date
      
      // Period 1: From last payment to current payment on full principal
      const interest1 = calculateInterestForPeriod(startDate, paymentDate, outstandingPrincipal, rateHistory);
      
      // Estimate principal component (EMI - interest for period 1)
      const estimatedPrincipal = emiAmount - interest1;
      
      // Period 2: From current payment to due date on reduced principal
      const reducedPrincipal = outstandingPrincipal - estimatedPrincipal;
      const interest2 = calculateInterestForPeriod(paymentDate, dueDate, reducedPrincipal, rateHistory);
      
      // Total interest is sum of both periods
      totalInterest = interest1 + interest2;
      
      // Actual principal component
      principalComponent = emiAmount - totalInterest;
    } else {
      // Payment made on or after due date, calculate normally till payment date
      totalInterest = calculateInterestForPeriod(startDate, paymentDate, outstandingPrincipal, rateHistory);
      principalComponent = emiAmount - totalInterest;
    }
  } else {
    // No due day provided, calculate normally
    totalInterest = calculateInterestForPeriod(startDate, paymentDate, outstandingPrincipal, rateHistory);
    principalComponent = emiAmount - totalInterest;
  }

  const interestComponent = Math.round(totalInterest * 100) / 100;
  principalComponent = Math.round(principalComponent * 100) / 100;
  const newOutstandingPrincipal = Math.max(0, Math.round((outstandingPrincipal - principalComponent) * 100) / 100);

  return {
    principalComponent,
    interestComponent,
    newOutstandingPrincipal
  };
}

/**
 * Calculate all EMI payment breakdowns in batch considering interest rate history
 */
export function calculateAllEMIBreakdowns(
  loanStartDate: string,
  loanPrincipal: number,
  payments: Array<{ payment_date: string; emi_amount: number }>,
  rateHistory: Array<{ effective_date: string; interest_rate: number }>,
  dueDayOfMonth?: number
): Array<{
  payment_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  outstanding_principal: number;
  payment_number: number;
}> {
  const results = [];
  let outstandingPrincipal = loanPrincipal;
  let previousPaymentDate: string | null = null;

  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    
    const breakdown = calculateEMIBreakdownWithHistory(
      loanStartDate,
      previousPaymentDate,
      payment.payment_date,
      outstandingPrincipal,
      payment.emi_amount,
      rateHistory,
      dueDayOfMonth
    );

    results.push({
      payment_date: payment.payment_date,
      emi_amount: payment.emi_amount,
      principal_component: breakdown.principalComponent,
      interest_component: breakdown.interestComponent,
      outstanding_principal: breakdown.newOutstandingPrincipal,
      payment_number: i + 1
    });

    outstandingPrincipal = breakdown.newOutstandingPrincipal;
    previousPaymentDate = payment.payment_date;
  }

  return results;
}
