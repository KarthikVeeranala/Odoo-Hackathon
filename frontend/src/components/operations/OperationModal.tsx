import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sliders, AlertCircle } from 'lucide-react';
import { OperationType, OperationCreatePayload } from '../../types/operation';
import { Product } from '../../types/product';
import { Location } from '../../types/warehouse';
import operationService from '../../services/operations';
import LineItemEditor, { LineItem } from './LineItemEditor';
import Input from '../common/Input';
import Button from '../common/Button';

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: OperationType;
  products: Product[];
  locations: Location[];
}

export const OperationModal: React.FC<OperationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  type,
  products,
  locations,
}) => {
  const [partnerName, setPartnerName] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState<number | ''>('');
  const [destinationLocationId, setDestinationLocationId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>(() => {
    return products.length > 0 ? [{ product_id: products[0].id, quantity: 1 }] : [];
  });

  // Specific state for single-product fast Adjustments
  const [adjustmentProductId, setAdjustmentProductId] = useState<number>(
    products.length > 0 ? products[0].id : 0
  );
  const [countedQuantity, setCountedQuantity] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getTitleAndIcon = () => {
    switch (type) {
      case 'RECEIPT':
        return {
          title: 'Receive Inbound Stock',
          subtitle: 'Create incoming goods receipt from supplier',
          icon: <ArrowDownRight className="w-4 h-4 text-emerald-600" />,
          badgeBg: 'bg-emerald-50 border-emerald-100',
        };
      case 'DELIVERY':
        return {
          title: 'Fulfill Outbound Delivery',
          subtitle: 'Issue stock shipment to customer or work order',
          icon: <ArrowUpRight className="w-4 h-4 text-blue-600" />,
          badgeBg: 'bg-blue-50 border-blue-100',
        };
      case 'TRANSFER':
        return {
          title: 'Internal Stock Transfer',
          subtitle: 'Relocate inventory between warehouse bays',
          icon: <ArrowLeftRight className="w-4 h-4 text-purple-600" />,
          badgeBg: 'bg-purple-50 border-purple-100',
        };
      case 'ADJUSTMENT':
        return {
          title: 'Inventory Count Adjustment',
          subtitle: 'Reconcile physical floor count with system record',
          icon: <Sliders className="w-4 h-4 text-amber-600" />,
          badgeBg: 'bg-amber-50 border-amber-100',
        };
    }
  };

  const { title, subtitle, icon, badgeBg } = getTitleAndIcon();

  // For adjustments: calculate system vs counted variance
  const selectedAdjProduct = products.find((p) => p.id === adjustmentProductId);
  const systemQty = selectedAdjProduct?.total_on_hand ?? 0;
  const variance = countedQuantity - systemQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validations per operation type
    if (type === 'RECEIPT') {
      if (!destinationLocationId) {
        setError('Please select a destination bay for incoming goods.');
        return;
      }
      if (lines.length === 0) {
        setError('Please add at least one product line.');
        return;
      }
    } else if (type === 'DELIVERY') {
      if (!sourceLocationId) {
        setError('Please select the source bay to pick from.');
        return;
      }
      if (lines.length === 0) {
        setError('Please add at least one product line.');
        return;
      }
    } else if (type === 'TRANSFER') {
      if (!sourceLocationId || !destinationLocationId) {
        setError('Please select both source and destination locations.');
        return;
      }
      if (sourceLocationId === destinationLocationId) {
        setError('Source and Destination cannot be the same location.');
        return;
      }
      if (lines.length === 0) {
        setError('Please add at least one product line.');
        return;
      }
    } else if (type === 'ADJUSTMENT') {
      if (!sourceLocationId) {
        setError('Please select the location being counted.');
        return;
      }
      if (!adjustmentProductId) {
        setError('Please select a product for adjustment.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: OperationCreatePayload = {
        type,
        partner_name: partnerName.trim() || undefined,
        source_location_id: sourceLocationId ? Number(sourceLocationId) : null,
        destination_location_id: destinationLocationId ? Number(destinationLocationId) : null,
        notes: notes.trim() || undefined,
        lines:
          type === 'ADJUSTMENT'
            ? [{ product_id: adjustmentProductId, quantity: countedQuantity }]
            : lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
      };

      await operationService.createOperation(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create operation:', err);
      setError(err.message || 'Operation creation failed. Please check field inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${badgeBg} border flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Conditional Header Fields based on Type */}
          {type === 'RECEIPT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Supplier / Vendor"
                placeholder="e.g. Acme Components LLC"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Destination Bay <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                  required
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>
                    Select destination location...
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'DELIVERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer / Client"
                placeholder="e.g. TechCorp Solutions"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Source Bay <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(Number(e.target.value))}
                  required
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>
                    Select picking location...
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'TRANSFER' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Source Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(Number(e.target.value))}
                  required
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>
                    Source location...
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Destination Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(Number(e.target.value))}
                  required
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>
                    Destination location...
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'ADJUSTMENT' ? (
            /* Special Single-Product Adjustment Flow with Variance Calculation */
            <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Storage Location <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(Number(e.target.value))}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg py-2 px-2.5 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select location...
                    </option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Product Being Counted <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjustmentProductId}
                    onChange={(e) => setAdjustmentProductId(Number(e.target.value))}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg py-2 px-2.5 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Physical Count & Live Variance Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-400 block uppercase">
                    System Record
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {systemQty} {selectedAdjProduct?.uom || 'units'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 uppercase">
                    Physical Count <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={countedQuantity}
                    onChange={(e) => setCountedQuantity(Number(e.target.value))}
                    className="w-full text-sm font-semibold bg-white border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    variance === 0
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : variance > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <span className="text-[11px] font-semibold block uppercase">
                    Computed Variance
                  </span>
                  <span className="text-base font-bold">
                    {variance > 0 ? `+${variance}` : variance} {selectedAdjProduct?.uom || 'units'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-line editor for RECEIPT, DELIVERY, TRANSFER */
            <LineItemEditor
              items={lines}
              onChange={setLines}
              products={products}
              showStockWarning={type === 'DELIVERY'}
            />
          )}

          {/* Notes Input */}
          <Input
            label={type === 'ADJUSTMENT' ? 'Adjustment Reason *' : 'Reference Notes'}
            placeholder={
              type === 'ADJUSTMENT'
                ? 'e.g. Broken packaging discovered during shelf check'
                : 'e.g. PO #10492 / Carrier Track #88412'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required={type === 'ADJUSTMENT'}
          />

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create {type}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationModal;
