import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Plus, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { Operation } from '../types/operation';
import operationService from '../services/operations';
import productService from '../services/products';
import warehouseService from '../services/warehouses';
import DataTable, { Column } from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import OperationModal from '../components/operations/OperationModal';
import OperationDetailModal from '../components/operations/OperationDetailModal';

export const Adjustments: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);

  // 1. Fetch Adjustments
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations', 'ADJUSTMENT'],
    queryFn: () => operationService.getOperations({ type: 'ADJUSTMENT' }),
  });

  // 2. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts(),
  });

  // 3. Fetch Locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehouseService.getLocations(),
  });

  const filteredOperations = operations.filter((op) => {
    if (statusFilter === 'ALL') return true;
    return op.status === statusFilter;
  });

  const positiveVariances = operations.filter((op) =>
    op.lines.some((l) => (l.variance ?? 0) > 0)
  ).length;

  const negativeVariances = operations.filter((op) =>
    op.lines.some((l) => (l.variance ?? 0) < 0)
  ).length;

  const columns: Column<Operation>[] = [
    {
      header: 'Adjustment #',
      accessorKey: 'operation_number',
      cell: (op) => (
        <button
          onClick={() => setSelectedOperation(op)}
          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-xs"
        >
          {op.operation_number}
        </button>
      ),
      className: 'w-36',
    },
    {
      header: 'Location Counted',
      accessorKey: 'source_location_name',
      cell: (op) => (
        <span className="text-slate-800 text-xs font-semibold">
          {op.source_location_name || `Location #${op.source_location_id || 'WH1-A1'}`}
        </span>
      ),
    },
    {
      header: 'Product Adjusted',
      cell: (op) => {
        const firstLine = op.lines[0];
        if (!firstLine) return <span className="text-slate-400 text-xs">No lines</span>;
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 block">
              {firstLine.product_name || `Product #${firstLine.product_id}`}
            </span>
            {firstLine.product_sku && (
              <span className="font-mono text-[11px] text-slate-400">
                {firstLine.product_sku}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Counted vs System',
      cell: (op) => {
        const firstLine = op.lines[0];
        if (!firstLine) return null;
        const variance = firstLine.variance ?? 0;
        return (
          <div className="text-xs flex items-center gap-2">
            <span className="text-slate-600 font-medium">
              Count: <strong className="text-slate-900">{firstLine.quantity}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                variance === 0
                  ? 'bg-slate-100 text-slate-600'
                  : variance > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {variance > 0 ? `+${variance}` : variance} variance
            </span>
          </div>
        );
      },
    },
    {
      header: 'Reason',
      accessorKey: 'notes',
      cell: (op) => (
        <span className="text-xs text-slate-500 truncate max-w-xs block">
          {op.notes || 'Routine physical inventory count'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (op) => <StatusBadge status={op.status} />,
      className: 'w-28',
    },
    {
      header: 'Action',
      cell: (op) => (
        <button
          onClick={() => setSelectedOperation(op)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Inspect
        </button>
      ),
      className: 'w-20 text-right',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Adjustments
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{operations.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Surplus Adjustments (+)
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{positiveVariances}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Deficit Adjustments (-)
            </p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{negativeVariances}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredOperations}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Filter adjustments by #, notes, or location..."
        searchKeys={['operation_number', 'notes']}
        emptyTitle="No adjustments recorded"
        emptyDescription="No physical count adjustments found. Log an inventory adjustment to reconcile warehouse discrepancies."
        filterComponent={
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {['ALL', 'DRAFT', 'READY', 'DONE'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === tab
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Adjustments' : tab}
              </button>
            ))}
          </div>
        }
        headerAction={
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Adjustment
          </Button>
        }
      />

      {/* Create Adjustment Modal */}
      <OperationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['operations'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        }}
        type="ADJUSTMENT"
        products={products}
        locations={locations}
      />

      {/* Detail Modal */}
      <OperationDetailModal
        operation={selectedOperation}
        onClose={() => setSelectedOperation(null)}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['operations'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        }}
      />
    </div>
  );
};

export default Adjustments;
