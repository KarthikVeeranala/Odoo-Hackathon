import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Building2, Bell } from 'lucide-react';
import Button from '../common/Button';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname: string): { title: string; subtitle?: string } => {
    switch (pathname) {
      case '/':
        return { title: 'Executive Dashboard', subtitle: 'Real-time inventory overview & operational KPIs' };
      case '/products':
        return { title: 'Products Catalog', subtitle: 'Manage SKUs, safety stock, and on-hand inventory' };
      case '/receipts':
        return { title: 'Inbound Receipts', subtitle: 'Process incoming vendor shipments and receive stock' };
      case '/deliveries':
        return { title: 'Outbound Deliveries', subtitle: 'Pick, pack, and validate customer dispatches' };
      case '/transfers':
        return { title: 'Internal Transfers', subtitle: 'Move goods between storage locations and racks' };
      case '/adjustments':
        return { title: 'Stock Adjustments', subtitle: 'Physical count audits and variance reconciliation' };
      case '/ledger':
        return { title: 'Stock Ledger', subtitle: 'Immutable chronological audit trail of all movements' };
      case '/warehouse':
        return { title: 'Visual Warehouse Map', subtitle: '2D spatial rack representation and capacity utilization' };
      case '/reorder':
        return { title: 'Smart Reorder Intelligence', subtitle: 'Explainable replenishment recommendations' };
      case '/anomalies':
        return { title: 'Inventory Anomaly Detection', subtitle: 'Operational Variances Requiring Review' };
      default:
        return { title: 'StockSense', subtitle: 'Inventory Management System' };
    }
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base font-semibold text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Warehouse Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700 border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Main Distribution Center</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name || 'Warehouse Operator'}</p>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">{user?.email || 'operator@stocksense.io'}</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          title="Sign out"
          icon={<LogOut className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
