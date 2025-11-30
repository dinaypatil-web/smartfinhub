import React from 'react';
import { Transaction } from '../types';

interface MonthlyOverviewProps {
  transactions: Transaction[];
}

export function MonthlyOverview({ transactions }: MonthlyOverviewProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="backdrop-blur-md bg-green-400/10 p-6 rounded-xl border border-green-200/20">
        <h3 className="text-sm font-medium text-green-100">收入</h3>
        <p className="text-2xl font-bold text-green-50">¥{totalIncome.toFixed(2)}</p>
      </div>
      <div className="backdrop-blur-md bg-red-400/10 p-6 rounded-xl border border-red-200/20">
        <h3 className="text-sm font-medium text-red-100">支出</h3>
        <p className="text-2xl font-bold text-red-50">¥{totalExpenses.toFixed(2)}</p>
      </div>
      <div className="backdrop-blur-md bg-blue-400/10 p-6 rounded-xl border border-blue-200/20">
        <h3 className="text-sm font-medium text-blue-100">结余</h3>
        <p className="text-2xl font-bold text-blue-50">¥{balance.toFixed(2)}</p>
      </div>
    </div>
  );
}