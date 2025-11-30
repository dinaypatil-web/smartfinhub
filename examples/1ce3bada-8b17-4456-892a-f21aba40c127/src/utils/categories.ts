import { Category } from '../types';
import { 
  ShoppingBag, 
  Utensils, 
  Car, 
  Gamepad, 
  Home,
  DollarSign,
  Briefcase,
  Gift,
  Heart,
  Book,
  Coffee,
  Plane
} from 'lucide-react';

export const defaultCategories: Category[] = [
  { id: 'food', name: '餐饮', icon: 'Utensils' },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag' },
  { id: 'transport', name: '交通', icon: 'Car' },
  { id: 'entertainment', name: '娱乐', icon: 'Gamepad' },
  { id: 'utilities', name: '日用', icon: 'Home' },
  { id: 'salary', name: '工资', icon: 'DollarSign' },
  { id: 'business', name: '商务', icon: 'Briefcase' },
  { id: 'gift', name: '礼物', icon: 'Gift' },
  { id: 'health', name: '健康', icon: 'Heart' },
  { id: 'education', name: '教育', icon: 'Book' },
  { id: 'social', name: '社交', icon: 'Coffee' },
  { id: 'travel', name: '旅行', icon: 'Plane' }
];

export const availableIcons = {
  ShoppingBag,
  Utensils,
  Car,
  Gamepad,
  Home,
  DollarSign,
  Briefcase,
  Gift,
  Heart,
  Book,
  Coffee,
  Plane
};