import React from 'react';
import { Product } from '../../types/product';

interface ProductSelectProps {
  products: Product[];
  value?: number;
  onChange: (productId: number) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
  products,
  value,
  onChange,
  label,
  error,
  placeholder = 'Select a product...',
  disabled = false,
}) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`block w-full rounded-lg border text-sm text-slate-900 bg-white py-2 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-rose-300 bg-rose-50/20' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            [{p.sku}] {p.name} (Stock: {p.total_on_hand} {p.uom})
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};

export default ProductSelect;
