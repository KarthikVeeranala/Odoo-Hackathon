import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { StockLedgerEntry } from '../types/ledger';
import ledgerService from '../services/ledger';
import productService from '../services/products';
import DataTable, { Column } from '../components/common/DataTable';

export const StockLedger: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

  // 1. Fetch ledger entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger', typeFilter, selectedProductId],
    queryFn: () =>
      ledgerService.getEntries({
        operation_type: typeFilter === 'ALL' ? undefined : typeFilter,
        product_id: selectedProductId ? Number(selectedProductId) : undefined,
      }),
  });

  // 2. Fetch products for filter dropdown
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  const totalInflow = entries.filter((e) => e.quantity > 0).reduce((acc, e) => acc + e.quantity, 0);
  const totalOutflow = Math.abs(
    entries.filter((e) => e.quantity < 0).reduce((acc, e) => acc + e.quantity, 0)
  );

  const columns: Column<StockLedgerEntry>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: (entry) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(entry.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
      className: 'w-36',
    },
    {
      header: 'Operation #',
      accessorKey: 'operation_reference',
      cell: (entry) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded">
          {entry.operation_reference || `OP-${entry.operation_id || 'AUD'}`}
        </span>
      ),
      className: 'w-36',
    },
    {
      header: 'Type',
      accessorKey: 'operation_type',
      cell: (entry) => {
        const typeStyles = {
          RECEIPT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          DELIVERY: 'bg-blue-50 text-blue-700 border-blue-200',
          TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
          ADJUSTMENT: 'bg-amber-50 text-amber-700 border-amber-200',
        };
        const style = typeStyles[entry.operation_type as keyof typeof typeStyles] || 'bg-slate-100 text-slate-700 border-slate-200';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${style}`}>
            {entry.operation_type || 'TRANSACTION'}
          </span>
        );
      },
      className: 'w-32',
    },
    {
      header: 'Product Details',
      cell: (entry) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900 block">
            {entry.product_name || `Product #${entry.product_id}`}
          </span>
          {entry.product_sku && (
            <span className="font-mono text-[11px] text-slate-400">
              {entry.product_sku}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Movement Route',
      cell: (entry) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="truncate max-w-[120px]">
            {entry.source_location_name || 'Vendor Inbound'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="truncate max-w-[120px] font-medium text-slate-800">
            {entry.dest_location_name || 'Customer Outbound'}
          </span>
        </div>
      ),
    },
    {
      header: 'Quantity Delta',
      cell: (entry) => {
        const isPositive = entry.quantity > 0;
        return (
          <span
            className={`font-mono text-xs font-bold ${
              isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPositive ? `+${entry.quantity}` : entry.quantity}
          </span>
        );
      },
      className: 'w-28 text-right',
    },
    {
      header: 'Balance After',
      accessorKey: 'balance_after',
      cell: (entry) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {entry.balance_after}
        </span>
      ),
      className: 'w-28 text-right',
    },
    {
      header: 'User',
      accessorKey: 'created_by_name',
      cell: (entry) => (
        <span className="text-xs text-slate-500">
          {entry.created_by_name || 'System Admin'}
        </span>
      ),
      className: 'w-28',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Audit Entries
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Inflows Received
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">+{totalInflow}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Outflows Dispatched
            </p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">-{totalOutflow}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Stock Ledger Table */}
      <DataTable
        data={entries}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Filter ledger by reference, SKU, or item..."
        searchKeys={['operation_reference', 'product_name', 'product_sku']}
        emptyTitle="No audit records found"
        emptyDescription="No movement records matched your filter criteria. Validated operations create immutable ledger entries."
        filterComponent={
          <div className="flex flex-wrap items-center gap-2">
            {/* Operation Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {['ALL', 'RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    typeFilter === type
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'ALL' ? 'All Types' : type}
                </button>
              ))}
            </div>

            {/* Product Filter Dropdown */}
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
              className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
};

export default StockLedger;
