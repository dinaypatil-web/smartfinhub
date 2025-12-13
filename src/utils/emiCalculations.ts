/**
 * EMI (Equated Monthly Installment) calculation utilities for SmartFinHub
 */

import type { Account, EMITransaction } from '@/types/types';

/**
 * Calculate monthly EMI amount
 * Formula: (Purchase Amount + Bank Charges) / Number of Months
 */
export function calculateMonthlyEMI(
  purchaseAmount: number,
  bankCharges: number,
  months: number
): number {
  if (months <= 0) return 0;
  const totalAmount = purchaseAmount + bankCharges;
  return totalAmount / months;
}

/**
 * Calculate total amount to be paid (including bank charges)
 */
export function calculateTotalEMIAmount(
  purchaseAmount: number,
  bankCharges: number
): number {
  return purchaseAmount + bankCharges;
}

/**
 * Calculate total statement amount for a credit card
 * Statement Amount = Current Balance + Sum of all monthly EMI installments
 */
export function calculateStatementAmount(
  currentBalance: number,
  activeEMIs: EMITransaction[]
): number {
  const totalMonthlyEMI = activeEMIs.reduce((sum, emi) => sum + emi.monthly_emi, 0);
  return currentBalance + totalMonthlyEMI;
}

/**
 * Calculate available credit
 * Available Credit = Credit Limit - Current Balance
 */
export function calculateAvailableCredit(
  currentBalance: number,
  creditLimit: number | null
): number {
  if (!creditLimit) return 0;
  return Math.max(0, creditLimit - currentBalance);
}

/**
 * Calculate credit utilization percentage
 * Credit Utilization = (Current Balance / Credit Limit) * 100
 */
export function calculateCreditUtilization(
  currentBalance: number,
  creditLimit: number | null
): number {
  if (!creditLimit || creditLimit === 0) return 0;
  return (currentBalance / creditLimit) * 100;
}

/**
 * Check if credit limit is being approached or exceeded
 * Returns warning level: 'safe', 'warning' (>80%), 'danger' (>100%)
 */
export function getCreditLimitWarningLevel(
  currentBalance: number,
  creditLimit: number | null
): 'safe' | 'warning' | 'danger' {
  if (!creditLimit) return 'safe';
  
  const utilization = calculateCreditUtilization(currentBalance, creditLimit);
  
  if (utilization >= 100) return 'danger';
  if (utilization >= 80) return 'warning';
  return 'safe';
}

/**
 * Get warning message based on credit utilization
 */
export function getCreditLimitWarningMessage(
  currentBalance: number,
  creditLimit: number | null,
  currency: string
): string | null {
  const level = getCreditLimitWarningLevel(currentBalance, creditLimit);
  const utilization = calculateCreditUtilization(currentBalance, creditLimit);
  
  if (level === 'danger') {
    return `⚠️ Credit limit exceeded! You are at ${utilization.toFixed(1)}% utilization.`;
  }
  
  if (level === 'warning') {
    const available = calculateAvailableCredit(creditLimit, currentBalance);
    return `⚠️ Approaching credit limit! ${utilization.toFixed(1)}% used. ${currency} ${available.toFixed(2)} available.`;
  }
  
  return null;
}

/**
 * Calculate next due date for EMI (adds one month to start date)
 */
export function calculateNextDueDate(startDate: string, monthsToAdd: number = 1): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate remaining amount to be paid for an EMI
 */
export function calculateRemainingEMIAmount(emi: EMITransaction): number {
  return emi.monthly_emi * emi.remaining_installments;
}

/**
 * Calculate total EMI amount for all active EMIs
 */
export function calculateTotalActiveEMIAmount(emis: EMITransaction[]): number {
  return emis
    .filter(emi => emi.status === 'active')
    .reduce((sum, emi) => sum + calculateRemainingEMIAmount(emi), 0);
}

/**
 * Format credit utilization as a percentage string
 */
export function formatCreditUtilization(utilization: number): string {
  return `${utilization.toFixed(1)}%`;
}

/**
 * Get color class for credit utilization display
 */
export function getCreditUtilizationColor(utilization: number): string {
  if (utilization >= 100) return 'text-red-600 dark:text-red-400';
  if (utilization >= 80) return 'text-amber-600 dark:text-amber-400';
  if (utilization >= 50) return 'text-blue-600 dark:text-blue-400';
  return 'text-green-600 dark:text-green-400';
}

/**
 * Validate if a transaction amount is within credit limit
 */
export function validateCreditLimit(
  currentBalance: number,
  transactionAmount: number,
  creditLimit: number | null
): { valid: boolean; message?: string } {
  if (!creditLimit) {
    return { valid: true };
  }
  
  const newBalance = currentBalance + transactionAmount;
  
  if (newBalance > creditLimit) {
    const excess = newBalance - creditLimit;
    return {
      valid: false,
      message: `Transaction exceeds credit limit by ${excess.toFixed(2)}. Current balance: ${currentBalance.toFixed(2)}, Credit limit: ${creditLimit.toFixed(2)}`
    };
  }
  
  return { valid: true };
}

/**
 * Calculate EMI details for display
 */
export interface EMICalculationResult {
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  effectiveRate: number;
}

export function calculateEMIDetails(
  purchaseAmount: number,
  bankCharges: number,
  months: number
): EMICalculationResult {
  const totalAmount = calculateTotalEMIAmount(purchaseAmount, bankCharges);
  const monthlyEMI = calculateMonthlyEMI(purchaseAmount, bankCharges, months);
  const totalInterest = bankCharges;
  const effectiveRate = months > 0 ? (bankCharges / purchaseAmount) * 100 : 0;
  
  return {
    monthlyEMI,
    totalAmount,
    totalInterest,
    effectiveRate
  };
}
