import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Filter,
  Info,
  ShoppingCart,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { intelligenceService } from '../services/intelligence';
import { ReorderRecommendation, ReorderUrgency } from '../types/intelligence';
import UrgencyBadge from '../components/intelligence/UrgencyBadge';

export const SmartReorder: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | ReorderUrgency>('ALL');
  const [activePopoverSku, setActivePopoverSku] = useState<string | null>(null);
  const [lastCreatedDraft, setLastCreatedDraft] = useState<{
    reference: string;
    productName: string;
  } | null>(null);

  const {
    data: recommendations = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ReorderRecommendation[]>({
    queryKey: ['reorder-recommendations'],
    queryFn: () => intelligenceService.getReorderRecommendations(),
  });

  const draftMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
      productName,
    }: {
      productId: number;
      quantity: number;
      productName: string;
    }) => {
      const res = await intelligenceService.createReorderDraft(productId, quantity);
      return { res, productName };
    },
    onSuccess: (data) => {
      const ref = data.res.reference || data.res.operation_number || `OP-${data.res.id}`;
      setLastCreatedDraft({
        reference: ref,
        productName: data.productName,
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['reorder-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
  });

  // KPI calculations
  const stats = useMemo(() => {
    const total = recommendations.length;
    const critical = recommendations.filter((r) => r.urgency === 'CRITICAL').length;
    const warning = recommendations.filter((r) => r.urgency === 'WARNING').length;
    const healthy = recommendations.filter((r) => r.urgency === 'HEALTHY').length;
    return { total, critical, warning, healthy };
  }, [recommendations]);

  // Filtering
  const filteredItems = useMemo(() => {
    return recommendations.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.product_sku.toLowerCase().includes(search.toLowerCase()) ||
        (item.category_name && item.category_name.toLowerCase().includes(search.toLowerCase()));

      const matchesUrgency = urgencyFilter === 'ALL' || item.urgency === urgencyFilter;

      return matchesSearch && matchesUrgency;
    });
  }, [recommendations, search, urgencyFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Smart Reorder Intelligence</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Automated Forecasting
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Data-driven replenishment based on Days Until Safety Stock (DUS) and Average Daily Usage (ADU).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {/* Success Notification for Created Draft */}
      {lastCreatedDraft && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Replenishment Draft Created: {lastCreatedDraft.reference}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Draft inward receipt logged for {lastCreatedDraft.productName}. Awaiting receipt validation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/receipts"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              View in Receipts
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setLastCreatedDraft(null)}
              className="text-xs text-emerald-600 hover:text-emerald-900 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              SKUs Analyzed
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            <span className="text-xs text-slate-500 mt-0.5 inline-block">Active catalog items</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Critical Restock
            </p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{stats.critical}</p>
            <span className="text-xs text-rose-600/80 mt-0.5 inline-block">&le; 3 Days or Below Safety</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Approaching Limit
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.warning}</p>
            <span className="text-xs text-amber-600/80 mt-0.5 inline-block">4 to 7 Days Remaining</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Healthy Buffer
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.healthy}</p>
            <span className="text-xs text-emerald-600/80 mt-0.5 inline-block">&gt; 7 Days of Safety Stock</span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Formula & Explainability Callout */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 p-4 rounded-xl border border-indigo-100/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-indigo-950">
            Explainable Reorder Logic &amp; Forecasting Formula:
          </p>
          <p className="text-slate-600">
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-semibold">
              Days Until Safety Stock = (Current Stock - Safety Stock) / Average Daily Usage (ADU)
            </code>
            . When stock reaches or drops below safety stock boundary, reorder urgency escalates to{' '}
            <strong className="text-rose-700">CRITICAL</strong> with recommended batch replenishment.
          </p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Urgency Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['ALL', 'CRITICAL', 'WARNING', 'HEALTHY', 'COLD_START'] as const).map((urgency) => {
            const isActive = urgencyFilter === urgency;
            return (
              <button
                key={urgency}
                onClick={() => setUrgencyFilter(urgency)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {urgency === 'ALL'
                  ? 'All Statuses'
                  : urgency === 'CRITICAL'
                  ? 'Critical'
                  : urgency === 'WARNING'
                  ? 'Approaching Limit'
                  : urgency === 'HEALTHY'
                  ? 'Healthy'
                  : 'Cold Start'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Product &amp; SKU</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Safety Stock</th>
                <th className="py-3 px-4 text-right">Avg Daily Usage</th>
                <th className="py-3 px-4 text-center">Days to Safety</th>
                <th className="py-3 px-4 text-right">Reorder Qty</th>
                <th className="py-3 px-4 text-center">Urgency</th>
                <th className="py-3 px-4 text-center">Explainability</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Calculating replenishment projections...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <TrendingDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No products matching your search or urgency criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isCritical = item.urgency === 'CRITICAL';
                  const isWarning = item.urgency === 'WARNING';
                  const isDrafting =
                    draftMutation.isPending &&
                    draftMutation.variables?.productId === item.product_id;

                  return (
                    <tr
                      key={item.product_sku}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCritical ? 'bg-rose-50/30' : isWarning ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product_name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono">{item.product_sku}</span>
                          <span>•</span>
                          <span>{item.category_name}</span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        <span
                          className={`font-semibold ${
                            item.current_stock <= item.safety_stock
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.current_stock}
                        </span>{' '}
                        <span className="text-xs text-slate-400">{item.uom}</span>
                      </td>

                      {/* Safety Stock */}
                      <td className="py-3 px-4 text-right text-slate-600">
                        {item.safety_stock} <span className="text-xs text-slate-400">{item.uom}</span>
                      </td>

                      {/* Average Daily Usage */}
                      <td className="py-3 px-4 text-right text-slate-600">
                        <span className="font-mono font-medium">{item.average_daily_usage}</span>{' '}
                        <span className="text-xs text-slate-400">/day</span>
                      </td>

                      {/* Days Until Safety Stock */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.days_until_safety_stock === 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.days_until_safety_stock <= 3
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.days_until_safety_stock <= 7
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.days_until_safety_stock} {item.days_until_safety_stock === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Reorder Quantity */}
                      <td className="py-3 px-4 text-right font-semibold text-indigo-700">
                        +{item.reorder_quantity} <span className="text-xs text-slate-400 font-normal">{item.uom}</span>
                      </td>

                      {/* Urgency Badge */}
                      <td className="py-3 px-4 text-center">
                        <UrgencyBadge urgency={item.urgency} />
                      </td>

                      {/* Explainability Popover / Tooltip */}
                      <td className="py-3 px-4 text-center relative">
                        <button
                          onClick={() =>
                            setActivePopoverSku(
                              activePopoverSku === item.product_sku ? null : item.product_sku
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View mathematical calculation"
                        >
                          <Info className="w-4 h-4" />
                        </button>

                        {activePopoverSku === item.product_sku && (
                          <div className="absolute right-0 top-10 z-20 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-700 text-left">
                            <div className="font-semibold text-indigo-300 mb-1 flex items-center justify-between">
                              <span>Calculation Breakdown</span>
                              <button
                                onClick={() => setActivePopoverSku(null)}
                                className="text-slate-400 hover:text-white text-xs"
                              >
                                &times;
                              </button>
                            </div>
                            <p className="text-slate-300 font-mono text-[11px] bg-slate-800 p-2 rounded border border-slate-700 mb-2">
                              {item.formula_explanation}
                            </p>
                            <p className="text-slate-300 text-[11px]">
                              {item.suggested_action}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            draftMutation.mutate({
                              productId: item.product_id,
                              quantity: item.reorder_quantity,
                              productName: item.product_name,
                            })
                          }
                          disabled={isDrafting}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                            isCritical
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          } disabled:opacity-50`}
                        >
                          {isDrafting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5" />
                          )}
                          <span>Draft PO</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SmartReorder;
