import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  Package,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Layers,
  Search,
} from 'lucide-react';
import { AnomalyRecord, AnomalyStatus } from '../../types/intelligence';
import SeverityBadge from './SeverityBadge';

interface AnomalyCardProps {
  anomaly: AnomalyRecord;
  onUpdateStatus: (id: string | number, status: AnomalyStatus) => void;
}

export const AnomalyCard: React.FC<AnomalyCardProps> = ({ anomaly, onUpdateStatus }) => {
  const isResolved = anomaly.status === 'RESOLVED';
  const isInvestigating = anomaly.status === 'INVESTIGATING';

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CYCLE_COUNT_DISCREPANCY':
        return 'Cycle Count Discrepancy';
      case 'RAPID_DEPLETION':
        return 'Rapid Buffer Depletion';
      case 'UNEXPECTED_SURGE':
        return 'Outflow Surge Anomaly';
      case 'NEGATIVE_BALANCE_RISK':
        return 'Negative Balance Risk';
      default:
        return 'Operational Variance';
    }
  };

  const formattedDate = new Date(anomaly.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 shadow-sm ${
        isResolved
          ? 'border-slate-200 opacity-75'
          : anomaly.severity === 'CRITICAL'
          ? 'border-rose-300 shadow-rose-50'
          : 'border-amber-300 shadow-amber-50'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isResolved
                ? 'bg-slate-100 text-slate-500'
                : anomaly.severity === 'CRITICAL'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isResolved ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {getTypeLabel(anomaly.anomaly_type)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <span>{anomaly.product_name}</span>
              <span className="text-xs font-mono font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {anomaly.product_sku}
              </span>
            </h4>
          </div>
        </div>

        {/* Badges & Status */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SeverityBadge severity={anomaly.severity} />
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              isResolved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isInvestigating
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {anomaly.status}
          </span>
        </div>
      </div>

      {/* Body: Location, Baseline vs Detected Grid, and Explanation */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Location & Context */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Observed Location:</span>
          <span className="text-slate-900 font-semibold">{anomaly.location_name}</span>
          {anomaly.operation_reference && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-indigo-600 font-medium">
                Ref: {anomaly.operation_reference}
              </span>
            </>
          )}
        </div>

        {/* Variance Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
          <div>
            <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
              Expected Baseline
            </span>
            <p className="text-lg font-bold text-slate-700 mt-0.5">
              {anomaly.baseline_value}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
              Detected / Count
            </span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {anomaly.detected_value}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
              Net Variance
            </span>
            <p
              className={`text-lg font-bold mt-0.5 ${
                anomaly.variance < 0
                  ? 'text-rose-600'
                  : anomaly.variance > 0
                  ? 'text-emerald-600'
                  : 'text-slate-700'
              }`}
            >
              {anomaly.variance > 0 ? `+${anomaly.variance}` : anomaly.variance}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </p>
          </div>
        </div>

        {/* Neutral Audit Narrative */}
        <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900 block mb-0.5">Audit Observation:</span>
          {anomaly.explanation}
        </div>
      </div>

      {/* Footer: Investigation Actions */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Navigation Deep Links */}
        <div className="flex items-center gap-3">
          <Link
            to="/ledger"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Audit in Stock Ledger
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            Inspect Catalog
          </Link>
        </div>

        {/* Resolution Buttons */}
        <div className="flex items-center gap-2">
          {!isResolved && (
            <>
              {anomaly.status !== 'INVESTIGATING' && (
                <button
                  onClick={() => onUpdateStatus(anomaly.id, 'INVESTIGATING')}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Mark In Review
                </button>
              )}
              <button
                onClick={() => onUpdateStatus(anomaly.id, 'RESOLVED')}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Sign Off &amp; Resolve
              </button>
            </>
          )}
          {isResolved && (
            <button
              onClick={() => onUpdateStatus(anomaly.id, 'OPEN')}
              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Reopen Discrepancy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnomalyCard;
