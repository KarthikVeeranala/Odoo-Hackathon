import React from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';

export const Warehouse: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
      <WarehouseIcon className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
      <h3 className="text-base font-semibold text-slate-800">Visual Warehouse Map</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Scheduled for Phase 4: 2D responsive CSS grid showing rack capacity utilization heatmaps and inspect drawer.
      </p>
    </div>
  );
};

export default Warehouse;
