'use client';

import React from 'react';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORIES = [
  { id: 'todo', label: 'Todo', icon: '✨' },
  { id: 'hogar', label: 'Hogar', icon: '🏠' },
  { id: 'cocina', label: 'Cocina', icon: '🍳' },
  { id: 'belleza', label: 'Belleza', icon: '💄' },
  { id: 'navidad', label: 'Navidad', icon: '🎄' },
  { id: 'herramientas', label: 'Herramientas', icon: '🔧' },
  { id: 'tecnologia', label: 'Tecnología', icon: '📱' },
  { id: 'accesorios', label: 'Accesorios', icon: '🕶️' },
];

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="bg-white border-b border-slate-100 py-2.5 px-4 sticky top-[98px] z-30 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
      <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
