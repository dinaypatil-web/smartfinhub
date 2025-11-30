import React from 'react';
import { Plus } from 'lucide-react';

interface AddTransactionButtonProps {
  onClick: () => void;
}

export function AddTransactionButton({ onClick }: AddTransactionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-2 shadow-lg hover:bg-blue-700 transition-colors"
      aria-label="Add transaction"
    >
      <Plus size={20} />
    </button>
  );
}