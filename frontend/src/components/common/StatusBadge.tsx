import React from 'react';

type BadgeVariant =
  | 'DRAFT'
  | 'WAITING'
  | 'READY'
  | 'DONE'
  | 'CANCELED'
  | 'LOW_STOCK'
  | 'IN_STOCK'
  | 'OUT_OF_STOCK'
  | 'STORAGE'
  | 'RECEIVING'
  | 'STAGING'
  | 'PRODUCTION'
  | 'CRITICAL'
  | 'WARNING'
  | 'HEALTHY'
  | 'COLD_START';

interface StatusBadgeProps {
  status: BadgeVariant | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  const getStyle = (): { bg: string; text: string; dot: string; label: string } => {
    switch (normalized) {
      case 'DONE':
      case 'HEALTHY':
      case 'IN_STOCK':
        return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: status };
      case 'WAITING':
      case 'WARNING':
      case 'LOW_STOCK':
        return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: status === 'LOW_STOCK' ? 'Low Stock' : status };
      case 'CRITICAL':
      case 'OUT_OF_STOCK':
      case 'CANCELED':
        return { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', label: status === 'OUT_OF_STOCK' ? 'Out of Stock' : status };
      case 'READY':
        return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500', label: status };
      case 'DRAFT':
      case 'COLD_START':
        return { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: status };
      case 'STORAGE':
        return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Storage' };
      case 'RECEIVING':
        return { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Receiving' };
      case 'STAGING':
        return { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500', label: 'Staging' };
      case 'PRODUCTION':
        return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Production' };
      default:
        return { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400', label: status };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{style.label}</span>
    </span>
  );
};

export default StatusBadge;
