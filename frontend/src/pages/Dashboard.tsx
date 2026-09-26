import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Compass,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboard';
import MetricCard from '../components/dashboard/MetricCard';
import Button from '../components/common/Button';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch live KPIs
  const { data: kpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardService.getKPIs(),
    refetchInterval: 10000,
  });

  // 2. Fetch recent movements
  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['dashboard', 'movements'],
    queryFn: () => dashboardService.getRecentMovements(),
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-indigo-900/40">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            System Online &bull; Live WMS Telemetry
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Logistics Manager'}
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
            Real-time warehouse operational overview, physical inventory balances, and workflow triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/receipts')}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            New Inbound
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/deliveries')}
            icon={<ArrowUpRight className="w-3.5 h-3.5" />}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            New Delivery
          </Button>
        </div>
      </div>

      {/* 5 Authoritative Backend KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: total_products */}
        <MetricCard
          title="Total Products in Stock"
          value={isLoadingKpis ? '...' : kpis?.total_products ?? 0}
          icon={<Package className="w-5 h-5" />}
          subtitle="Catalog SKUs"
          color="indigo"
          onClick={() => navigate('/products')}
        />

        {/* KPI 2: low_stock_count */}
        <MetricCard
          title="Low / Out of Stock"
          value={isLoadingKpis ? '...' : kpis?.low_stock_count ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Below safety stock"
          color="amber"
          badge={(kpis?.low_stock_count ?? 0) > 0 ? 'Action Needed' : 'Healthy'}
          onClick={() => navigate('/products')}
        />

        {/* KPI 3: pending_receipts */}
        <MetricCard
          title="Pending Receipts"
          value={isLoadingKpis ? '...' : kpis?.pending_receipts ?? 0}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          subtitle="Inbound shipments"
          color="emerald"
          onClick={() => navigate('/receipts')}
        />

        {/* KPI 4: pending_deliveries */}
        <MetricCard
          title="Pending Deliveries"
          value={isLoadingKpis ? '...' : kpis?.pending_deliveries ?? 0}
          icon={<ArrowUpRight className="w-5 h-5" />}
          subtitle="Outbound customer orders"
          color="blue"
          onClick={() => navigate('/deliveries')}
        />

        {/* KPI 5: internal_transfers_scheduled */}
        <MetricCard
          title="Internal Transfers Scheduled"
          value={isLoadingKpis ? '...' : kpis?.internal_transfers_scheduled ?? 0}
          icon={<ArrowLeftRight className="w-5 h-5" />}
          subtitle="In-transit relocations"
          color="purple"
          onClick={() => navigate('/transfers')}
        />
      </div>

      {/* Middle Grid: Standout Modules & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Standout Intelligence Highlights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Warehouse Modules
            </h3>
          </div>

          {/* Visual Warehouse Card */}
          <div
            onClick={() => navigate('/warehouse')}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Map <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-3">Visual Warehouse 2D Map</h4>
            <p className="text-xs text-slate-500 mt-1">
              Live spatial layout of 6 storage racks, bay capacity bars, and stored SKU drawer breakdown.
            </p>
          </div>

          {/* Stock Ledger Card */}
          <div
            onClick={() => navigate('/ledger')}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Ledger <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-3">Stock Movement Ledger</h4>
            <p className="text-xs text-slate-500 mt-1">
              Immutable chronological audit trail with running balances, locations, and transaction codes.
            </p>
          </div>

          {/* Smart Reorder & Anomaly Card */}
          <div
            onClick={() => navigate('/reorder')}
            className="p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                AI Powered
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-3">Smart Reorder Engine</h4>
            <p className="text-xs text-slate-600 mt-1">
              Automated reorder triggers, lead-time forecasting, and safety stock anomaly detection.
            </p>
          </div>
        </div>

        {/* Right Column (Span 2): Recent Movements Mini-Ledger */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Inventory Movements</h3>
                <p className="text-xs text-slate-500">Live operational ledger stream</p>
              </div>
              <button
                onClick={() => navigate('/ledger')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                View Complete Ledger &rarr;
              </button>
            </div>

            {isLoadingMovements ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading audit feed...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs">No recent inventory operations recorded.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {movements.slice(0, 6).map((m) => {
                  const isPositive = m.operation_type === 'RECEIPT' || (m.operation_type === 'ADJUSTMENT' && m.quantity > 0);
                  const isNegative = m.operation_type === 'DELIVERY' || (m.operation_type === 'ADJUSTMENT' && m.quantity < 0);

                  return (
                    <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            m.operation_type === 'RECEIPT'
                              ? 'bg-emerald-50 text-emerald-600'
                              : m.operation_type === 'DELIVERY'
                              ? 'bg-blue-50 text-blue-600'
                              : m.operation_type === 'TRANSFER'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {m.operation_type === 'RECEIPT' && <ArrowDownLeft className="w-4 h-4" />}
                          {m.operation_type === 'DELIVERY' && <ArrowUpRight className="w-4 h-4" />}
                          {m.operation_type === 'TRANSFER' && <ArrowLeftRight className="w-4 h-4" />}
                          {m.operation_type === 'ADJUSTMENT' && <ShieldAlert className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600">
                              {m.operation_reference}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase">
                              {m.operation_type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium mt-0.5">
                            {m.product_name}{' '}
                            <span className="text-slate-400 font-mono text-[11px]">[{m.product_sku}]</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-bold ${
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity} {m.uom}
                        </p>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing recent real-time movements</span>
            <span className="font-mono text-[11px] text-slate-400">Total Recorded: {movements.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
