import type { IncomeCategory, IncomeCategoryKey } from '@/types/types';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  {
    key: 'salaries',
    name: 'Salaries',
    icon: '💼',
    color: '#10B981'
  },
  {
    key: 'allowances',
    name: 'Allowances',
    icon: '💰',
    color: '#F59E0B'
  },
  {
    key: 'family_income',
    name: 'Family Income',
    icon: '👨‍👩‍👧‍👦',
    color: '#8B5CF6'
  },
  {
    key: 'others',
    name: 'Others',
    icon: '📊',
    color: '#6B7280'
  }
];

export const getIncomeCategoryName = (key: IncomeCategoryKey): string => {
  const category = INCOME_CATEGORIES.find(c => c.key === key);
  return category?.name || key;
};

export const getIncomeCategoryIcon = (key: IncomeCategoryKey): string => {
  const category = INCOME_CATEGORIES.find(c => c.key === key);
  return category?.icon || '📊';
};

export const getIncomeCategoryColor = (key: IncomeCategoryKey): string => {
  const category = INCOME_CATEGORIES.find(c => c.key === key);
  return category?.color || '#6B7280';
};
