import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Warehouse as WarehouseIcon,
  Building2,
  MapPin,
  Package,
  X,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import warehouseService from '../services/warehouses';
import { Location } from '../types/warehouse';
import StatusBadge from '../components/common/StatusBadge';

export const Warehouse: React.FC = () => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [inspectLocationId, setInspectLocationId] = useState<number | null>(null);

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseService.getWarehouses(),
  });

  const activeWarehouse =
    warehouses.find((w) => w.id === selectedWarehouseId) || warehouses[0];

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', selectedWarehouseId],
    queryFn: () => warehouseService.getLocations({ warehouse_id: selectedWarehouseId }),
  });

  // Filter locations by type
  const filteredLocations = locations.filter((loc) => {
    if (selectedType === 'ALL') return true;
    return loc.type === selectedType;
  });

  // Query location stock when clicked
  const { data: locationStockData, isLoading: isLoadingStock } = useQuery({
    queryKey: ['location-stock', inspectLocationId],
    queryFn: () => (inspectLocationId ? warehouseService.getLocationStock(inspectLocationId) : null),
    enabled: !!inspectLocationId,
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectLocationId) {
        setInspectLocationId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectLocationId]);

  // Aggregate metrics
  const totalLocations = filteredLocations.length;
  const avgUtilization =
    totalLocations > 0
      ? Math.round(
          filteredLocations.reduce((acc, l) => acc + l.utilization_percentage, 0) / totalLocations
        )
      : 0;

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getBadgeStyle = (pct: number) => {
    if (pct >= 90) return 'text-rose-700 bg-rose-50 border-rose-200';
    if (pct >= 70) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Warehouse Overview Toolbar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {activeWarehouse?.name || 'Main Distribution Center'}
              </h2>
              {warehouses.length > 1 && (
                <select
                  value={selectedWarehouseId || ''}
                  onChange={(e) =>
                    setSelectedWarehouseId(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {activeWarehouse?.code || 'WH-MAIN'} &bull;{' '}
                {activeWarehouse?.address || 'Primary Storage Hub'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              Average Utilization
            </span>
            <span className="text-xl font-bold text-slate-800">{avgUtilization}%</span>
          </div>

          <div className="text-right pl-4 border-l border-slate-200">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">
              Storage Locations
            </span>
            <span className="text-xl font-bold text-slate-800">{totalLocations}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Location Type */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {['ALL', 'STORAGE', 'RECEIVING', 'STAGING', 'PRODUCTION'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedType === t
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All Bays' : t}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing {filteredLocations.length} locations &bull; Click card to inspect stored inventory
        </span>
      </div>

      {/* 2D Responsive Grid of Warehouse Locations */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <WarehouseIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No warehouse locations matched</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting &quot;All Bays&quot; or check warehouse assignment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((loc) => {
              const isSelected = inspectLocationId === loc.id;
              return (
                <div
                  key={loc.id}
                  onClick={() => setInspectLocationId(loc.id)}
                  className={`bg-white rounded-xl p-5 border transition-all cursor-pointer relative overflow-hidden select-none hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Row: Code, Name, Type */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {loc.code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{loc.name}</h4>
                    </div>
                    <StatusBadge status={loc.type} />
                  </div>

                  {/* Occupancy and Capacity */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                      <span>Occupancy</span>
                      <span className="text-slate-900 font-semibold">
                        {loc.current_occupancy} / {loc.capacity} units
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getBarColor(
                          loc.utilization_percentage
                        )}`}
                        style={{ width: `${Math.min(loc.utilization_percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2.5 text-xs">
                      <span className="text-slate-400">Utilization Rate</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${getBadgeStyle(
                          loc.utilization_percentage
                        )}`}
                      >
                        {loc.utilization_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Stock Inspection Drawer / Modal */}
      {inspectLocationId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {locationStockData?.location.name || 'Location Stock Breakdown'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {locationStockData?.location.code} &bull; {locationStockData?.location.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectLocationId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6">
              {isLoadingStock ? (
                <div className="py-8 text-center text-slate-400">Loading stored items...</div>
              ) : locationStockData?.items.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Location is currently empty</p>
                  <p className="text-xs text-slate-400 mt-1">No products stored in this location.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Stored Inventory ({locationStockData?.items.length} SKUs)
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {locationStockData?.items.map((item) => (
                      <div key={item.product_id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                          <span className="font-mono text-xs text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100">
                            {item.product_sku}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">
                            {item.quantity} <span className="text-xs font-normal text-slate-500">{item.uom}</span>
                          </p>
                          {item.is_low_stock && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setInspectLocationId(null)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
