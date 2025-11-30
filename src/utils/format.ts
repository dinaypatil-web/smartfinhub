import { getCurrencySymbol } from './countries';

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatAccountNumber(last4: string | null): string {
  if (!last4) return 'N/A';
  return `•••• ${last4}`;
}

export function calculateLoanEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths === 0 || annualRate === 0) return principal / (tenureMonths || 1);
  
  const monthlyRate = annualRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return emi;
}

export function calculateAccruedInterest(
  principal: number,
  annualRate: number,
  startDate: string,
  endDate: string = new Date().toISOString()
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dailyRate = annualRate / 365 / 100;
  
  return principal * dailyRate * days;
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}
