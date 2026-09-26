import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '../../types/product';
import Button from '../common/Button';

export interface LineItem {
  product_id: number;
  quantity: number;
}

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  products: Product[];
  maxStockMap?: Record<number, number>; // product_id -> max available stock
  showStockWarning?: boolean;
}

export const LineItemEditor: React.FC<LineItemEditorProps> = ({
  items,
  onChange,
  products,
  maxStockMap,
  showStockWarning = false,
}) => {
  const handleAddLine = () => {
    // Pick the first product not yet in lines or first available
    const availableProduct = products.find((p) => !items.some((item) => item.product_id === p.id)) || products[0];
    if (!availableProduct) return;

    onChange([
      ...items,
      {
        product_id: availableProduct.id,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleProductChange = (index: number, newProductId: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      product_id: newProductId,
    };
    onChange(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      quantity: Math.max(1, qty),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Operation Product Lines ({items.length})
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddLine}
          icon={<Plus className="w-3.5 h-3.5" />}
          disabled={products.length === 0}
        >
          Add Item Line
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50">
          <p className="text-xs text-slate-500">No items added yet. Click &quot;Add Item Line&quot; to include products in this operation.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((line, idx) => {
            const selectedProduct = products.find((p) => p.id === line.product_id);
            const availableStock = maxStockMap ? maxStockMap[line.product_id] ?? selectedProduct?.total_on_hand ?? 0 : selectedProduct?.total_on_hand ?? 0;
            const isExceeded = showStockWarning && line.quantity > availableStock;

            return (
              <div
                key={idx}
                className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-colors hover:border-slate-300"
              >
                {/* Product Select */}
                <div className="flex-1 min-w-[200px] w-full">
                  <select
                    value={line.product_id}
                    onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg py-2 px-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} (Stock: {p.total_on_hand} {p.uom})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="w-full sm:w-32 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                    className={`w-full text-xs font-semibold text-right bg-white border rounded-lg py-2 px-2.5 focus:ring-2 focus:outline-none ${
                      isExceeded
                        ? 'border-amber-400 text-amber-900 bg-amber-50/30 focus:ring-amber-500'
                        : 'border-slate-300 text-slate-800 focus:ring-indigo-600'
                    }`}
                  />
                  <span className="text-xs text-slate-500 shrink-0 w-8">
                    {selectedProduct?.uom || 'units'}
                  </span>
                </div>

                {/* Stock Warning if applicable */}
                {isExceeded && (
                  <div className="w-full sm:w-auto text-[11px] text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Demand exceeds on-hand ({availableStock})</span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 self-end sm:self-center"
                  title="Remove Line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LineItemEditor;
