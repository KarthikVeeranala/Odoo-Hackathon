import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckCircle2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Phase 1 Active — App Shell & Auth Foundation
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Operator'}
          </h2>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            StockSense inventory management platform is online and ready for operations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div className="text-left text-xs">
            <p className="font-semibold text-white">Auth Token Active</p>
            <p className="text-indigo-200">Session Verified</p>
          </div>
        </div>
      </div>

      {/* Placeholder Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        <LayoutDashboard className="w-12 h-12 mx-auto text-indigo-500 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Executive Dashboard Initialized</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Phase 1 Foundation & Authentication is running. The full 5 KPI metric cards and standout intelligence widgets will populate in Phase 4.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
