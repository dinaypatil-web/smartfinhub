import React from 'react';
import { Trash2 } from 'lucide-react';
import { Category } from '../types';
import { availableIcons } from '../utils/categories';

interface QuickCategoriesProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function QuickCategories({ categories, onSelectCategory, onDeleteCategory }: QuickCategoriesProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {categories.map((category) => {
        const IconComponent = availableIcons[category.icon as keyof typeof availableIcons];
        return (
          <div
            key={category.id}
            className="relative group"
          >
            <button
              onClick={() => onSelectCategory(category.id)}
              className="w-full flex flex-col items-center p-4 backdrop-blur-md bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group"
            >
              <IconComponent className="w-6 h-6 mb-2 text-white/80 group-hover:text-white transition-colors" />
              <span className="text-sm text-white/80 group-hover:text-white transition-colors">{category.name}</span>
            </button>
            {category.isCustom && (
              <button
                onClick={() => onDeleteCategory(category.id)}
                className="absolute -top-2 -right-2 p-1 bg-red-500/80 hover:bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}