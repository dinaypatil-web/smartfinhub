import React, { useState } from 'react';
import { Transaction, Category } from './types';
import { AddTransactionButton } from './components/AddTransactionButton';
import { TransactionModal } from './components/TransactionModal';
import { MonthlyOverview } from './components/MonthlyOverview';
import { QuickCategories } from './components/QuickCategories';
import { TransactionList } from './components/TransactionList';
import { CategoryModal } from './components/CategoryModal';
import { defaultCategories } from './utils/categories';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleSaveTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id 
          ? { ...newTransaction, id: editingTransaction.id }
          : t
      ));
      setEditingTransaction(null);
    } else {
      const transaction: Transaction = {
        ...newTransaction,
        id: Date.now().toString(),
      };
      setTransactions([...transactions, transaction]);
    }
    setIsModalOpen(false);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleQuickCategory = (category: string) => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleSaveCategory = (category: Category) => {
    if (category.isCustom) {
      setCategories([...categories, { ...category, id: Date.now().toString() }]);
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('确定要删除这个分类吗？')) {
      setCategories(categories.filter(c => c.id !== categoryId));
    }
  };

  return (
    <div className="min-h-screen dynamic-bg">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-4xl font-bold text-white mb-8 text-center tracking-wider">
          个人记账本
        </h1>

        <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 mb-8">
          <MonthlyOverview transactions={transactions} />
        </div>
        
        <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">快捷分类</h2>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 bg-blue-600/80 hover:bg-blue-700/80 text-white rounded-lg transition-colors text-sm"
            >
              添加分类
            </button>
          </div>
          <QuickCategories 
            categories={categories}
            onSelectCategory={handleQuickCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </div>

        <div className="backdrop-blur-md bg-white/10 rounded-xl p-6 mb-8">
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            categories={categories}
          />
        </div>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          editingTransaction={editingTransaction}
          categories={categories}
        />

        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={handleSaveCategory}
        />

        <AddTransactionButton onClick={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }} />
      </div>
    </div>
  );
}