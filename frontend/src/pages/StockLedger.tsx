import React from 'react';
import { BookOpen } from 'lucide-react';

export const StockLedger: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <BookOpen className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Stock Ledger</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 4: Immutable audit log tracking timestamp, operation number, movement, and running balance.
      </p>
    </div>
  );
};

export default StockLedger;
