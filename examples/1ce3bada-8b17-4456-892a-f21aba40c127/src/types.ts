export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isCustom?: boolean;
}

export type CategoryType = 'income' | 'expense' | 'both';