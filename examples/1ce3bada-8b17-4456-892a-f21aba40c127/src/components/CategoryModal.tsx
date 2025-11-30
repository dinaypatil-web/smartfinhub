import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Category, CategoryType } from '../types';
import { availableIcons } from '../utils/categories';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
}

export function CategoryModal({ isOpen, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('ShoppingBag');
  const [type, setType] = useState<CategoryType>('both');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: '',
      name,
      icon,
      isCustom: true
    });
    setName('');
    setIcon('ShoppingBag');
    setType('both');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900/90 backdrop-blur-xl rounded-xl w-full max-w-md p-6 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">添加自定义分类</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white/80 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80">分类名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="请输入分类名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">选择图标</label>
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(availableIcons).map((iconName) => {
                  const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`p-2 rounded-lg flex items-center justify-center ${
                        icon === iconName 
                          ? 'bg-blue-500/50 border-blue-500'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      } border transition-colors`}
                    >
                      <IconComponent size={20} className="text-white" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80">适用类型</label>
              <div className="mt-1 flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-500"
                    name="type"
                    value="expense"
                    checked={type === 'expense'}
                    onChange={(e) => setType(e.target.value as CategoryType)}
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
                    onChange={(e) => setType(e.target.value as CategoryType)}
                  />
                  <span className="ml-2 text-white/80">收入</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-500"
                    name="type"
                    value="both"
                    checked={type === 'both'}
                    onChange={(e) => setType(e.target.value as CategoryType)}
                  />
                  <span className="ml-2 text-white/80">通用</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              添加分类
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}