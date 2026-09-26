import React from 'react';
import { ArrowDownLeft } from 'lucide-react';

export const Receipts: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <ArrowDownLeft className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Inbound Receipts</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 3: Process incoming shipments, line items, and validate stock receipts.
      </p>
    </div>
  );
};

export default Receipts;
