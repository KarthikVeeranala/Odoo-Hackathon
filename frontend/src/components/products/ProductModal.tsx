import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle } from 'lucide-react';
import { Category, ProductCreatePayload } from '../../types/product';
import productService from '../../services/products';
import Input from '../common/Input';
import Button from '../common/Button';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [uom, setUom] = useState('units');
  const [safetyStock, setSafetyStock] = useState<number>(10);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim() || categoryId === '') {
      setError('Please fill in SKU, Name, and select a Category.');
      return;
    }

    if (safetyStock < 0 || reorderQuantity < 0) {
      setError('Safety Stock and Reorder Quantity must be non-negative.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const payload: ProductCreatePayload = {
        sku: sku.trim(),
        name: name.trim(),
        category_id: Number(categoryId),
        uom: uom.trim() || 'units',
        safety_stock: Number(safetyStock),
        reorder_quantity: Number(reorderQuantity),
      };

      await productService.createProduct(payload);
      onSuccess();
      onClose();
      // Reset form
      setSku('');
      setName('');
      setCategoryId('');
      setUom('units');
      setSafetyStock(10);
      setReorderQuantity(50);
    } catch (err: any) {
      console.error('Failed to create product:', err);
      const apiMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to create product. Check SKU uniqueness.';
      setError(typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add New Product</h3>
              <p className="text-xs text-slate-500">Register a new inventory SKU</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Barcode"
              placeholder="e.g. SKU-MOT-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                required
                className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="" disabled>
                  Select Category...
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Product Name"
            placeholder="e.g. Stepper Motor NEMA 23"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Unit of Measure"
              placeholder="units, pcs, kg"
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              required
            />

            <Input
              label="Safety Stock"
              type="number"
              min={0}
              step="any"
              value={safetyStock}
              onChange={(e) => setSafetyStock(Number(e.target.value))}
              required
            />

            <Input
              label="Reorder Qty"
              type="number"
              min={0}
              step="any"
              value={reorderQuantity}
              onChange={(e) => setReorderQuantity(Number(e.target.value))}
              required
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} icon={<PackagePlus className="w-4 h-4" />}>
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
