import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { AnomalySeverity } from '../../types/intelligence';

interface SeverityBadgeProps {
  severity: AnomalySeverity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  if (severity === 'CRITICAL') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        Critical Discrepancy
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      Variance Warning
    </span>
  );
};

export default SeverityBadge;
