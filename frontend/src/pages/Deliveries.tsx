import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Plus, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { Operation } from '../types/operation';
import operationService from '../services/operations';
import productService from '../services/products';
import warehouseService from '../services/warehouses';
import DataTable, { Column } from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import OperationModal from '../components/operations/OperationModal';
import OperationDetailModal from '../components/operations/OperationDetailModal';

export const Deliveries: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);

  // 1. Fetch Deliveries
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations', 'DELIVERY'],
    queryFn: () => operationService.getOperations({ type: 'DELIVERY' }),
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

  const pendingCount = operations.filter((o) => o.status === 'DRAFT' || o.status === 'READY').length;
  const doneCount = operations.filter((o) => o.status === 'DONE').length;

  const columns: Column<Operation>[] = [
    {
      header: 'Delivery #',
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
      header: 'Customer / Recipient',
      accessorKey: 'partner_name',
      cell: (op) => (
        <span className="font-semibold text-slate-900 text-xs">
          {op.partner_name || 'Direct Customer'}
        </span>
      ),
    },
    {
      header: 'Source Bay',
      accessorKey: 'source_location_name',
      cell: (op) => (
        <span className="text-slate-700 text-xs font-medium">
          {op.source_location_name || `Location #${op.source_location_id || 'WH1-A1'}`}
        </span>
      ),
    },
    {
      header: 'Items Included',
      cell: (op) => (
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{op.lines.length} lines</span>
          {op.lines.length > 0 && (
            <span className="text-slate-400 block text-[11px]">
              Total Demand: {op.lines.reduce((acc, l) => acc + (l.quantity || 0), 0)} units
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      cell: (op) => (
        <span className="text-xs text-slate-500">
          {new Date(op.created_at).toLocaleDateString()}
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
              Total Deliveries
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{operations.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Shipments
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Fulfilled Deliveries
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Operations Table */}
      <DataTable
        data={filteredOperations}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Filter deliveries by #, customer, or notes..."
        searchKeys={['operation_number', 'partner_name', 'notes']}
        emptyTitle="No deliveries found"
        emptyDescription="No outbound delivery records found. Create a new delivery order to fulfill customer requests."
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
                {tab === 'ALL' ? 'All Deliveries' : tab}
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
            New Delivery
          </Button>
        }
      />

      {/* Create Delivery Modal */}
      <OperationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['operations'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        }}
        type="DELIVERY"
        products={products}
        locations={locations}
      />

      {/* Operation Detail / Validation Modal */}
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

export default Deliveries;
