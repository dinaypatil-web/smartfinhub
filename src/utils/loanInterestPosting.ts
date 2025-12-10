import { accountApi, transactionApi, interestRateApi } from '@/db/api';
import type { Account, Transaction } from '@/types/types';

/**
 * Calculate interest for a loan account for a given period
 * Considers transactions during the period that affect the principal
 */
async function calculateLoanInterestForPeriod(
  account: Account,
  startDate: Date,
  endDate: Date
): Promise<number> {
  if (!account.loan_principal || !account.current_interest_rate) {
    return 0;
  }

  // Get interest rate history if floating rate
  let rateHistory: Array<{ effective_date: string; interest_rate: number }> = [];
  if (account.interest_rate_type === 'floating' && account.id) {
    const history = await interestRateApi.getInterestRateHistory(account.id);
    rateHistory = history.map(h => ({
      effective_date: h.effective_date,
      interest_rate: h.interest_rate
    }));
  } else {
    // For fixed rate, create a single entry
    rateHistory = [{
      effective_date: account.loan_start_date || startDate.toISOString().split('T')[0],
      interest_rate: account.current_interest_rate
    }];
  }

  // Get all transactions for this account in the period
  const allTransactions = await transactionApi.getTransactions(account.user_id);
  const accountTransactions = allTransactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate >= startDate &&
      transactionDate <= endDate &&
      (t.from_account_id === account.id || t.to_account_id === account.id)
    );
  });

  // Sort transactions by date
  accountTransactions.sort((a, b) => 
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  // Calculate interest day by day, considering balance changes
  let totalInterest = 0;
  let currentBalance = Number(account.balance);
  let currentDate = new Date(startDate);

  // Build a map of daily balance changes
  const balanceChanges = new Map<string, number>();
  for (const transaction of accountTransactions) {
    const dateKey = transaction.transaction_date;
    const change = balanceChanges.get(dateKey) || 0;
    
    // For loan accounts, payments reduce balance, charges increase it
    if (transaction.from_account_id === account.id) {
      // Payment from loan account (reduces balance)
      balanceChanges.set(dateKey, change - transaction.amount);
    } else if (transaction.to_account_id === account.id) {
      // Credit to loan account (increases balance)
      balanceChanges.set(dateKey, change + transaction.amount);
    }
  }

  // Calculate interest for each day
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Get applicable interest rate for this date
    const applicableRate = getApplicableRate(dateKey, rateHistory);
    
    // Calculate daily interest
    const dailyInterest = (currentBalance * applicableRate) / (365 * 100);
    totalInterest += dailyInterest;

    // Apply any balance changes at end of day
    const balanceChange = balanceChanges.get(dateKey);
    if (balanceChange) {
      currentBalance += balanceChange;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Math.round(totalInterest * 100) / 100;
}

/**
 * Get the applicable interest rate for a given date from rate history
 */
function getApplicableRate(
  date: string,
  rateHistory: Array<{ effective_date: string; interest_rate: number }>
): number {
  const sortedRates = [...rateHistory].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  let applicableRate = sortedRates[0]?.interest_rate || 0;
  
  for (const rate of sortedRates) {
    if (rate.effective_date <= date) {
      applicableRate = rate.interest_rate;
    } else {
      break;
    }
  }

  return applicableRate;
}

/**
 * Get the last interest posting date for a loan account
 */
async function getLastInterestPostingDate(account: Account): Promise<Date | null> {
  const allTransactions = await transactionApi.getTransactions(account.user_id);
  
  // Find the most recent interest_charge transaction for this account
  const interestTransactions = allTransactions
    .filter(t => 
      t.transaction_type === 'interest_charge' && 
      t.to_account_id === account.id
    )
    .sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

  if (interestTransactions.length > 0) {
    return new Date(interestTransactions[0].transaction_date);
  }

  // If no interest posted yet, use loan start date
  if (account.loan_start_date) {
    return new Date(account.loan_start_date);
  }

  return null;
}

/**
 * Check if interest should be posted for a loan account today
 */
export async function shouldPostInterest(account: Account): Promise<boolean> {
  if (account.account_type !== 'loan' || !account.due_date) {
    return false;
  }

  const today = new Date();
  const todayDay = today.getDate();

  // Check if today is the due date
  if (todayDay !== account.due_date) {
    return false;
  }

  // Check if interest was already posted this month
  const lastPostingDate = await getLastInterestPostingDate(account);
  if (lastPostingDate) {
    const lastPostingMonth = lastPostingDate.getMonth();
    const lastPostingYear = lastPostingDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // If already posted this month, don't post again
    if (lastPostingMonth === currentMonth && lastPostingYear === currentYear) {
      return false;
    }
  }

  return true;
}

/**
 * Post monthly interest for a loan account
 */
export async function postMonthlyInterest(account: Account, userId: string): Promise<{
  success: boolean;
  interestAmount: number;
  message: string;
}> {
  try {
    if (account.account_type !== 'loan') {
      return {
        success: false,
        interestAmount: 0,
        message: 'Account is not a loan account'
      };
    }

    // Get the last interest posting date
    const lastPostingDate = await getLastInterestPostingDate(account);
    if (!lastPostingDate) {
      return {
        success: false,
        interestAmount: 0,
        message: 'Cannot determine last interest posting date'
      };
    }

    // Calculate interest from last posting to today
    const today = new Date();
    const interestAmount = await calculateLoanInterestForPeriod(
      account,
      lastPostingDate,
      today
    );

    if (interestAmount <= 0) {
      return {
        success: false,
        interestAmount: 0,
        message: 'No interest to post'
      };
    }

    // Create interest charge transaction
    const transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      transaction_type: 'interest_charge',
      from_account_id: null,
      to_account_id: account.id,
      amount: interestAmount,
      currency: account.currency,
      category: 'Interest',
      description: `Monthly interest charge for ${account.account_name}`,
      transaction_date: today.toISOString().split('T')[0]
    };

    await transactionApi.createTransaction(transaction);

    // Update account balance
    const newBalance = Number(account.balance) + interestAmount;
    await accountApi.updateAccount(account.id, { balance: newBalance });

    return {
      success: true,
      interestAmount,
      message: `Interest of ${interestAmount} posted successfully`
    };
  } catch (error) {
    console.error('Error posting monthly interest:', error);
    return {
      success: false,
      interestAmount: 0,
      message: error instanceof Error ? error.message : 'Failed to post interest'
    };
  }
}

/**
 * Check and post interest for all loan accounts that are due
 */
export async function checkAndPostInterestForAllLoans(
  accounts: Account[],
  userId: string
): Promise<{
  totalPosted: number;
  results: Array<{ accountName: string; interestAmount: number; success: boolean; message: string }>;
}> {
  const results = [];
  let totalPosted = 0;

  for (const account of accounts) {
    if (account.account_type === 'loan') {
      const shouldPost = await shouldPostInterest(account);
      
      if (shouldPost) {
        const result = await postMonthlyInterest(account, userId);
        results.push({
          accountName: account.account_name,
          interestAmount: result.interestAmount,
          success: result.success,
          message: result.message
        });

        if (result.success) {
          totalPosted += result.interestAmount;
        }
      }
    }
  }

  return { totalPosted, results };
}
