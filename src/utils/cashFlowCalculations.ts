/**
 * Cash Flow Calculation Utilities
 * Functions for calculating monthly cash flow projections
 */

import type { Account, Transaction, Budget, EMITransaction } from '@/types/types';
import { calculateCreditCardStatementAmount, shouldDisplayDueAmount } from './statementCalculations';

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
 * Excludes expenses paid through credit cards (those are shown in credit card dues)
 */
export function calculateMonthExpenses(
  transactions: Transaction[],
  accounts: Account[],
  month: number,
  year: number
): number {
  const monthStart = new Date(year, month - 1, 1);
  const today = new Date();

  // Get all credit card account IDs
  const creditCardAccountIds = new Set(
    accounts
      .filter(acc => acc.account_type === 'credit_card')
      .map(acc => acc.id)
  );

  const expenseTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    const isInDateRange = transactionDate >= monthStart && transactionDate <= today;
    const isExpenseType = (
      t.transaction_type === 'expense' || 
      t.transaction_type === 'withdrawal' ||
      t.transaction_type === 'loan_payment' ||
      t.category === 'Expense'
    );
    
    // Exclude expenses paid from credit cards
    const isPaidFromCreditCard = t.from_account_id && creditCardAccountIds.has(t.from_account_id);
    
    return isInDateRange && isExpenseType && !isPaidFromCreditCard;
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
 * Returns the amount of budget still allocated for spending (positive value)
 * Returns 0 if over budget (no remaining allocation)
 */
export function calculateRemainingBudget(
  budget: Budget | null,
  actualExpenses: number
): number {
  if (!budget || !budget.budgeted_expenses) {
    return 0;
  }

  const remaining = budget.budgeted_expenses - actualExpenses;
  // Only return positive remaining budget (money still allocated to spend)
  // If over budget, return 0 (no remaining allocation)
  return Math.max(0, Math.round(remaining * 100) / 100);
}

/**
 * Get next statement date for a credit card
 */
export function getNextStatementDate(statementDay: number | null, referenceDate: Date = new Date()): Date | null {
  if (!statementDay || statementDay < 1 || statementDay > 31) {
    return null;
  }

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  // Try current month first
  let statementDate = new Date(year, month, statementDay);
  
  // If the statement date has passed, get next month's date
  if (statementDate <= referenceDate) {
    statementDate = new Date(year, month + 1, statementDay);
  }
  
  return statementDate;
}

/**
 * Get next due date for a credit card
 */
export function getNextDueDate(
  statementDay: number | null,
  dueDay: number | null,
  referenceDate: Date = new Date()
): Date | null {
  if (!statementDay || !dueDay || statementDay < 1 || statementDay > 31 || dueDay < 1 || dueDay > 31) {
    return null;
  }

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();
  
  // Determine which statement period we're in
  let dueDate: Date;
  
  if (day >= statementDay) {
    // We're after the statement date, so next due date is in current/next month
    if (dueDay >= statementDay) {
      // Due date is in the same month as statement
      dueDate = new Date(year, month, dueDay);
      // If due date has passed, get next month's due date
      if (dueDate <= referenceDate) {
        dueDate = new Date(year, month + 1, dueDay);
      }
    } else {
      // Due date is in the next month after statement
      dueDate = new Date(year, month + 1, dueDay);
    }
  } else {
    // We're before the statement date, so due date is based on last statement
    if (dueDay >= statementDay) {
      // Due date is in the same month as statement (current month)
      dueDate = new Date(year, month, dueDay);
      // If due date has passed, get next month's due date
      if (dueDate <= referenceDate) {
        dueDate = new Date(year, month + 1, dueDay);
      }
    } else {
      // Due date is in the month after statement
      dueDate = new Date(year, month, dueDay);
      // If due date has passed, get next month's due date
      if (dueDate <= referenceDate) {
        dueDate = new Date(year, month + 1, dueDay);
      }
    }
  }
  
  return dueDate;
}

/**
 * Calculate expected credit card dues for the month
 * Uses statement amount calculation to exclude transactions after statement date
 */
export function calculateCreditCardDues(
  accounts: Account[],
  accountTransactions: Record<string, Transaction[]>,
  accountEMIs: Record<string, EMITransaction[]>,
  month?: number,
  year?: number
): number {
  const creditCardAccounts = accounts.filter(
    acc => acc.account_type === 'credit_card'
  );

  // If month/year provided, only include cards with statement in that month
  if (month && year) {
    const filteredAccounts = creditCardAccounts.filter(acc => {
      if (!acc.statement_day) return true; // Include cards without statement day
      
      const statementDate = new Date(year, month - 1, acc.statement_day);
      return statementDate.getMonth() === month - 1;
    });
    
    const totalDues = filteredAccounts.reduce((sum, acc) => {
      // Use statement amount calculation if statement day is configured
      if (acc.statement_day && shouldDisplayDueAmount(acc.statement_day)) {
        const transactions = accountTransactions[acc.id] || [];
        const emis = accountEMIs[acc.id] || [];
        const statementCalc = calculateCreditCardStatementAmount(
          acc.id,
          acc.statement_day,
          transactions,
          emis
        );
        return sum + Math.abs(statementCalc.statementAmount);
      }
      // Fallback to balance for cards without statement day
      return sum + Math.abs(Number(acc.balance));
    }, 0);
    
    return Math.round(totalDues * 100) / 100;
  }

  // For credit cards, calculate statement amount or use balance
  const totalDues = creditCardAccounts.reduce((sum, acc) => {
    // Use statement amount calculation if statement day is configured
    if (acc.statement_day && shouldDisplayDueAmount(acc.statement_day)) {
      const transactions = accountTransactions[acc.id] || [];
      const emis = accountEMIs[acc.id] || [];
      const statementCalc = calculateCreditCardStatementAmount(
        acc.id,
        acc.statement_day,
        transactions,
        emis
      );
      return sum + Math.abs(statementCalc.statementAmount);
    }
    // Fallback to balance for cards without statement day
    return sum + Math.abs(Number(acc.balance));
  }, 0);

  return Math.round(totalDues * 100) / 100;
}

/**
 * Get detailed credit card dues with statement dates
 * Returns all credit cards with their respective upcoming due dates
 * Uses statement amount calculation to exclude transactions after statement date
 */
export function getCreditCardDuesDetails(
  accounts: Account[],
  accountTransactions: Record<string, Transaction[]>,
  accountEMIs: Record<string, EMITransaction[]>
): Array<{
  account: Account;
  dueAmount: number;
  nextStatementDate: Date | null;
  nextDueDate: Date | null;
}> {
  const creditCardAccounts = accounts.filter(
    acc => acc.account_type === 'credit_card' && Math.abs(Number(acc.balance)) > 0
  );

  if (creditCardAccounts.length === 0) {
    return [];
  }

  // Calculate due dates for all credit cards and return them
  const cardsWithDueDates = creditCardAccounts.map(acc => {
    let dueAmount = Math.abs(Number(acc.balance));
    
    // Use statement amount calculation if statement day is configured
    if (acc.statement_day && shouldDisplayDueAmount(acc.statement_day)) {
      const transactions = accountTransactions[acc.id] || [];
      const emis = accountEMIs[acc.id] || [];
      const statementCalc = calculateCreditCardStatementAmount(
        acc.id,
        acc.statement_day,
        transactions,
        emis
      );
      dueAmount = Math.abs(statementCalc.statementAmount);
    }
    
    return {
      account: acc,
      dueAmount,
      nextStatementDate: getNextStatementDate(acc.statement_day),
      nextDueDate: getNextDueDate(acc.statement_day, acc.due_day)
    };
  });

  // Sort by due date (nearest first)
  return cardsWithDueDates.sort((a, b) => {
    if (!a.nextDueDate && !b.nextDueDate) return 0;
    if (!a.nextDueDate) return 1;
    if (!b.nextDueDate) return -1;
    return a.nextDueDate.getTime() - b.nextDueDate.getTime();
  });
}

/**
 * Calculate total credit card repayments made in the current month till date
 */
export function calculateCreditCardRepayments(
  transactions: Transaction[],
  month: number,
  year: number
): number {
  const monthStart = new Date(year, month - 1, 1);
  const today = new Date();

  const repaymentTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate >= monthStart &&
      transactionDate <= today &&
      t.transaction_type === 'credit_card_repayment'
    );
  });

  const totalRepayments = repaymentTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  return Math.round(totalRepayments * 100) / 100;
}

/**
 * Calculate complete monthly cash flow summary
 */
export function calculateMonthlyCashFlow(
  accounts: Account[],
  transactions: Transaction[],
  accountTransactions: Record<string, Transaction[]>,
  accountEMIs: Record<string, EMITransaction[]>,
  budget: Budget | null,
  month: number,
  year: number
): {
  openingBalance: number;
  incomeReceived: number;
  expensesIncurred: number;
  creditCardRepayments: number;
  remainingBudget: number;
  expectedBalance: number;
  creditCardDues: number;
  netAvailable: number;
} {
  const openingBalance = calculateOpeningBalance(accounts, transactions, month, year);
  const incomeReceived = calculateMonthIncome(transactions, month, year);
  const expensesIncurred = calculateMonthExpenses(transactions, accounts, month, year);
  const creditCardRepayments = calculateCreditCardRepayments(transactions, month, year);
  const remainingBudget = calculateRemainingBudget(budget, expensesIncurred);
  const expectedBalance = openingBalance + incomeReceived - expensesIncurred - creditCardRepayments - remainingBudget;
  const creditCardDues = calculateCreditCardDues(accounts, accountTransactions, accountEMIs, month, year);
  const netAvailable = expectedBalance - creditCardDues;

  return {
    openingBalance,
    incomeReceived,
    expensesIncurred,
    creditCardRepayments,
    remainingBudget,
    expectedBalance,
    creditCardDues,
    netAvailable
  };
}
