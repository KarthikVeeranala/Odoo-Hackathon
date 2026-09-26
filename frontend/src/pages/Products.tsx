import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, AlertTriangle, Layers, Filter } from 'lucide-react';
import productService from '../services/products';
import { Product } from '../types/product';
import DataTable, { Column } from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import ProductModal from '../components/products/ProductModal';

export const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories(),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', selectedCategory, lowStockOnly],
    queryFn: () =>
      productService.getProducts({
        category_id: selectedCategory,
        low_stock: lowStockOnly ? true : undefined,
      }),
  });

  // Calculate metrics
  const totalProductsCount = products.length;
  const lowStockCount = products.filter((p) => p.is_low_stock).length;

  const columns: Column<Product>[] = [
    {
      header: 'SKU / Code',
      accessorKey: 'sku',
      cell: (p) => (
        <span className="font-mono font-medium text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded text-xs border border-indigo-100">
          {p.sku}
        </span>
      ),
      className: 'w-36',
    },
    {
      header: 'Product Name',
      accessorKey: 'name',
      cell: (p) => (
        <div>
          <span className="font-semibold text-slate-900 block">{p.name}</span>
          <span className="text-xs text-slate-400">ID #{p.id}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category_name',
      cell: (p) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          {p.category_name || 'Uncategorized'}
        </span>
      ),
    },
    {
      header: 'Current Stock (On Hand)',
      accessorKey: 'total_on_hand',
      cell: (p) => (
        <div className="font-medium text-slate-800">
          <span className="text-sm font-semibold">{p.total_on_hand}</span>{' '}
          <span className="text-xs text-slate-500 font-normal">{(p.uom || 'units').replace(/unitsunits/gi, 'units')}</span>
        </div>
      ),
    },
    {
      header: 'Safety Stock',
      accessorKey: 'safety_stock',
      cell: (p) => (
        <span className="text-slate-600 text-xs">
          {p.safety_stock} {(p.uom || 'units').replace(/unitsunits/gi, 'units')}
        </span>
      ),
    },
    {
      header: 'Reorder Qty',
      accessorKey: 'reorder_quantity',
      cell: (p) => (
        <span className="text-slate-600 text-xs">
          {p.reorder_quantity} {(p.uom || 'units').replace(/unitsunits/gi, 'units')}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (p) => {
        if (p.total_on_hand <= 0) {
          return <StatusBadge status="OUT_OF_STOCK" />;
        }
        if (p.is_low_stock) {
          return <StatusBadge status="LOW_STOCK" />;
        }
        return <StatusBadge status="IN_STOCK" />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total SKUs</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalProductsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Categories</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <DataTable
        data={products}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Filter products by SKU or Name..."
        searchKeys={['sku', 'name', 'category_name']}
        emptyTitle="No products found"
        emptyDescription="No inventory products matched your filter criteria."
        filterComponent={
          <div className="flex items-center gap-2">
            {/* Category Dropdown Filter */}
            <select
              value={selectedCategory || ''}
              onChange={(e) =>
                setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)
              }
              className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Low Stock Filter Button */}
            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                lowStockOnly
                  ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Low Stock Only</span>
            </button>
          </div>
        }
        headerAction={
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        }
      />

      {/* Product Creation Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
        categories={categories}
      />
    </div>
  );
};

export default Products;
