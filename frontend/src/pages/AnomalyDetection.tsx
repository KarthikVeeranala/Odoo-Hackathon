import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { intelligenceService } from '../services/intelligence';
import { AnomalyRecord, AnomalySeverity, AnomalyStatus } from '../types/intelligence';
import AnomalyCard from '../components/intelligence/AnomalyCard';

export const AnomalyDetection: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OPEN' | 'RESOLVED'>('ALL');

  const {
    data: anomalies = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AnomalyRecord[]>({
    queryKey: ['anomalies'],
    queryFn: () => intelligenceService.getAnomalies(),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: AnomalyStatus }) => {
      await intelligenceService.updateAnomalyStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
    },
  });

  const handleUpdateStatus = (id: string | number, status: AnomalyStatus) => {
    statusMutation.mutate({ id, status });
  };

  // Metric stats
  const stats = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
    const warning = anomalies.filter((a) => a.severity === 'WARNING' && a.status !== 'RESOLVED').length;
    const resolved = anomalies.filter((a) => a.status === 'RESOLVED').length;
    return { total, critical, warning, resolved };
  }, [anomalies]);

  // Filtering
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.product_name.toLowerCase().includes(q) ||
        item.product_sku.toLowerCase().includes(q) ||
        item.location_name.toLowerCase().includes(q) ||
        item.anomaly_type.toLowerCase().includes(q);

      let matchesFilter = true;
      if (filterType === 'CRITICAL') matchesFilter = item.severity === 'CRITICAL';
      else if (filterType === 'WARNING') matchesFilter = item.severity === 'WARNING';
      else if (filterType === 'OPEN') matchesFilter = item.status === 'OPEN' || item.status === 'INVESTIGATING';
      else if (filterType === 'RESOLVED') matchesFilter = item.status === 'RESOLVED';

      return matchesSearch && matchesFilter;
    });
  }, [anomalies, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Operational Variances Requiring Review
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Automated Variance Audit
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic reconciliation feed detecting cycle-count discrepancies, velocity spikes, and safety threshold alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Audit Feed
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Variance Events
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            <span className="text-xs text-slate-500 mt-0.5 inline-block">Cycle &amp; telemetry logs</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Critical Variances
            </p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{stats.critical}</p>
            <span className="text-xs text-rose-600/80 mt-0.5 inline-block">High priority audit</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Moderate Variances
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.warning}</p>
            <span className="text-xs text-amber-600/80 mt-0.5 inline-block">Threshold advisory</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Audited &amp; Resolved
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
            <span className="text-xs text-emerald-600/80 mt-0.5 inline-block">Supervisory sign-off</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product, location, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['ALL', 'OPEN', 'CRITICAL', 'WARNING', 'RESOLVED'] as const).map((filter) => {
            const isActive = filterType === filter;
            return (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Variances'
                  : filter === 'OPEN'
                  ? 'Active / In Review'
                  : filter === 'CRITICAL'
                  ? 'Critical'
                  : filter === 'WARNING'
                  ? 'Moderate'
                  : 'Resolved'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Scanning audit logs for inventory variances...
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-800">
              No Operational Variances Found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              All physical counts, transfers, and inventory levels are reconciled within normal operational tolerances.
            </p>
          </div>
        ) : (
          filteredAnomalies.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              onUpdateStatus={handleUpdateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AnomalyDetection;
