import React from 'react';
import { Package } from 'lucide-react';

export const Products: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <Package className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Products Catalog</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 2: Product listings, total_on_hand tracking, low-stock badges, and create product modal.
      </p>
    </div>
  );
};

export default Products;
