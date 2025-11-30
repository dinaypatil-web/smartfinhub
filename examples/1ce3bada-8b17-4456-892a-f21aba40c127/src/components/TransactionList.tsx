import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      food: '餐饮',
      shopping: '购物',
      transport: '交通',
      entertainment: '娱乐',
      utilities: '日用',
      salary: '工资',
      other: '其他'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10">
      <h2 className="text-xl font-semibold text-white p-4 border-b border-white/10">账单列表</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">日期</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">描述</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-white/80">金额</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-white/80">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm text-white/80">{transaction.date}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type === 'income' ? 'bg-green-400/20 text-green-200' : 'bg-red-400/20 text-red-200'
                  }`}>
                    {transaction.type === 'income' ? '收入' : '支出'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-white/80">{getCategoryName(transaction.category)}</td>
                <td className="px-4 py-3 text-sm text-white/80">{transaction.description}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={transaction.type === 'income' ? 'text-green-200' : 'text-red-200'}>
                    ¥{transaction.amount.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => onEdit(transaction)}
                      className="text-blue-200 hover:text-blue-100 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(transaction.id)}
                      className="text-red-200 hover:text-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/60">
                  暂无账单记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}