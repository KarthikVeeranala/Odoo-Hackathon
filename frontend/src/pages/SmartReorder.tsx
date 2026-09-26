import React from 'react';
import { Sparkles } from 'lucide-react';

export const SmartReorder: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <Sparkles className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Smart Reorder Intelligence</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 5: Restock recommendations, Days Until Safety Stock, ADU, and urgency badges.
      </p>
    </div>
  );
};

export default SmartReorder;
