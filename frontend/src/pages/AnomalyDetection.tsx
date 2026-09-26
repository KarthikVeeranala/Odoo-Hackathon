import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Operational Variances Requiring Review</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 5: Deterministic anomaly records, baseline vs detected variance comparisons, and investigation links.
      </p>
    </div>
  );
};

export default AnomalyDetection;
