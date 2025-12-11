/**
 * Cash Flow Calculation Utilities
 * Functions for calculating monthly cash flow projections
 */

import type { Account, Transaction, Budget } from '@/types/types';

/**
 * Calculate opening balance for cash and bank accounts at start of month
 */
export function calculateOpeningBalance(
  accounts: Account[],
  transactions: Transaction[],
  month: number,
  year: number
): number {
  const cashAndBankAccounts = accounts.filter(
    acc => acc.account_type === 'cash' || acc.account_type === 'bank'
  );

  // Get the first day of the month
  const monthStart = new Date(year, month - 1, 1);
  
  // Calculate opening balance by taking current balance and reversing this month's transactions
  let openingBalance = 0;

  for (const account of cashAndBankAccounts) {
    let accountBalance = Number(account.balance);

    // Get transactions for this account in the current month
    const accountTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.transaction_date);
      return (
        transactionDate >= monthStart &&
        (t.from_account_id === account.id || t.to_account_id === account.id)
      );
    });

    // Reverse the effect of this month's transactions
    for (const transaction of accountTransactions) {
      if (transaction.to_account_id === account.id) {
        // Money came in, so subtract to get opening balance
        accountBalance -= Number(transaction.amount);
      } else if (transaction.from_account_id === account.id) {
        // Money went out, so add back to get opening balance
        accountBalance += Number(transaction.amount);
      }
    }

    openingBalance += accountBalance;
  }

  return Math.round(openingBalance * 100) / 100;
}

/**
 * Calculate total expenses incurred in the current month till date
 */
export function calculateMonthExpenses(
  transactions: Transaction[],
  month: number,
  year: number
): number {
  const monthStart = new Date(year, month - 1, 1);
  const today = new Date();

  const expenseTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate >= monthStart &&
      transactionDate <= today &&
      (t.transaction_type === 'expense' || 
       t.transaction_type === 'withdrawal' ||
       t.category === 'Expense')
    );
  });

  const totalExpenses = expenseTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  return Math.round(totalExpenses * 100) / 100;
}

/**
 * Calculate total income received in the current month till date
 */
export function calculateMonthIncome(
  transactions: Transaction[],
  month: number,
  year: number
): number {
  const monthStart = new Date(year, month - 1, 1);
  const today = new Date();

  const incomeTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate >= monthStart &&
      transactionDate <= today &&
      (t.transaction_type === 'income' || 
       t.category === 'Income' ||
       t.category === 'Salary')
    );
  });

  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  return Math.round(totalIncome * 100) / 100;
}

/**
 * Calculate remaining budget for the month
 */
export function calculateRemainingBudget(
  budget: Budget | null,
  actualExpenses: number
): number {
  if (!budget) {
    return 0;
  }

  const remaining = budget.budgeted_expenses - actualExpenses;
  return Math.max(0, Math.round(remaining * 100) / 100);
}

/**
 * Calculate expected credit card dues for the month
 */
export function calculateCreditCardDues(
  accounts: Account[]
): number {
  const creditCardAccounts = accounts.filter(
    acc => acc.account_type === 'credit_card'
  );

  // For credit cards, the balance represents the amount due
  const totalDues = creditCardAccounts.reduce(
    (sum, acc) => sum + Math.abs(Number(acc.balance)),
    0
  );

  return Math.round(totalDues * 100) / 100;
}

/**
 * Calculate complete monthly cash flow summary
 */
export function calculateMonthlyCashFlow(
  accounts: Account[],
  transactions: Transaction[],
  budget: Budget | null,
  month: number,
  year: number
): {
  openingBalance: number;
  incomeReceived: number;
  expensesIncurred: number;
  remainingBudget: number;
  expectedBalance: number;
  creditCardDues: number;
  netAvailable: number;
} {
  const openingBalance = calculateOpeningBalance(accounts, transactions, month, year);
  const incomeReceived = calculateMonthIncome(transactions, month, year);
  const expensesIncurred = calculateMonthExpenses(transactions, month, year);
  const remainingBudget = calculateRemainingBudget(budget, expensesIncurred);
  const expectedBalance = openingBalance + incomeReceived - expensesIncurred - remainingBudget;
  const creditCardDues = calculateCreditCardDues(accounts);
  const netAvailable = expectedBalance - creditCardDues;

  return {
    openingBalance,
    incomeReceived,
    expensesIncurred,
    remainingBudget,
    expectedBalance,
    creditCardDues,
    netAvailable
  };
}
