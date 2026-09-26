import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  BookOpen,
  Warehouse,
  Sparkles,
  AlertTriangle,
  Boxes,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC = () => {
  const coreNav: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Products', to: '/products', icon: <Package className="w-4 h-4" /> },
    { label: 'Receipts', to: '/receipts', icon: <ArrowDownLeft className="w-4 h-4" /> },
    { label: 'Deliveries', to: '/deliveries', icon: <ArrowUpRight className="w-4 h-4" /> },
    { label: 'Transfers', to: '/transfers', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { label: 'Adjustments', to: '/adjustments', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { label: 'Stock Ledger', to: '/ledger', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const intelligenceNav: NavItem[] = [
    { label: 'Visual Warehouse', to: '/warehouse', icon: <Warehouse className="w-4 h-4" />, badge: '2D Map' },
    { label: 'Smart Reorder', to: '/reorder', icon: <Sparkles className="w-4 h-4 text-indigo-500" />, badge: 'Smart' },
    { label: 'Anomaly Review', to: '/anomalies', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, badge: 'Alerts' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/50">
          <Boxes className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base">StockSense</span>
          <span className="ml-1.5 text-[10px] uppercase font-semibold tracking-wider text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/40">
            WMS
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {/* Core Operations Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Operations & Catalog
          </p>
          <nav className="space-y-1">
            {coreNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Intelligence & Standouts Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Intelligence & Spatial
          </p>
          <nav className="space-y-1">
            {intelligenceNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 text-[11px]">System Online</span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
