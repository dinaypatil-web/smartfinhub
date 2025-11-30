import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Transaction, Category } from '../types';
import { availableIcons } from '../utils/categories';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  editingTransaction: Transaction | null;
  categories: Category[];
}

export function TransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingTransaction,
  categories 
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
    } else {
      setAmount('');
      setCategory('');
      setType('expense');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingTransaction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      amount: parseFloat(amount),
      category,
      type,
      description,
      date,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900/90 backdrop-blur-xl rounded-xl w-full max-w-md p-6 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {editingTransaction ? '编辑记录' : '添加记录'}
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white/80 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80">类型</label>
              <div className="mt-1 flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-500"
                    name="type"
                    value="expense"
                    checked={type === 'expense'}
                    onChange={(e) => setType(e.target.value as 'expense')}
                  />
                  <span className="ml-2 text-white/80">支出</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-500"
                    name="type"
                    value="income"
                    checked={type === 'income'}
                    onChange={(e) => setType(e.target.value as 'income')}
                  />
                  <span className="ml-2 text-white/80">收入</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80">金额</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">选择分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="请输入描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {editingTransaction ? '更新' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}