import React, { useState } from 'react';
import { X, CheckCircle2, Ban, Calendar, User, MapPin, FileText } from 'lucide-react';
import { Operation } from '../../types/operation';
import operationService from '../../services/operations';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

interface OperationDetailModalProps {
  operation: Operation | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const OperationDetailModal: React.FC<OperationDetailModalProps> = ({
  operation,
  onClose,
  onUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!operation) return null;

  const handleValidate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await operationService.validateOperation(operation.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to validate operation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await operationService.cancelOperation(operation.id);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel operation');
    } finally {
      setIsLoading(false);
    }
  };

  const canAction = operation.status !== 'DONE' && operation.status !== 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
              {operation.operation_number}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-700">
              {operation.type}
            </span>
            <StatusBadge status={operation.status} />
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {operation.partner_name && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {operation.type === 'RECEIPT' ? 'Supplier' : 'Customer'}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {operation.partner_name}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Created At
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {new Date(operation.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {operation.source_location_name && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Source Location
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {operation.source_location_name}
                  </span>
                </div>
              </div>
            )}

            {operation.destination_location_name && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Destination Location
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {operation.destination_location_name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {operation.notes && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Reference Notes
                </span>
                <p className="text-xs text-slate-700 mt-0.5">{operation.notes}</p>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Operation Items ({operation.lines.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Item Details</th>
                    <th className="py-2.5 px-4 text-right">Quantity</th>
                    {operation.type === 'ADJUSTMENT' && (
                      <>
                        <th className="py-2.5 px-4 text-right">System Qty</th>
                        <th className="py-2.5 px-4 text-right">Variance</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operation.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {line.product_name || `Product ID #${line.product_id}`}
                        </span>
                        {line.product_sku && (
                          <span className="font-mono text-[11px] text-indigo-600">
                            {line.product_sku}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {line.quantity} <span className="text-slate-400 font-normal">{line.uom || 'units'}</span>
                      </td>
                      {operation.type === 'ADJUSTMENT' && (
                        <>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {line.system_quantity ?? 0} {line.uom || 'units'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              (line.variance ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {(line.variance ?? 0) > 0 ? `+${line.variance}` : line.variance ?? 0}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {canAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                isLoading={isLoading}
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                icon={<Ban className="w-4 h-4 text-rose-500" />}
              >
                Cancel Operation
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Close
            </Button>
            {canAction && (
              <Button
                size="sm"
                onClick={handleValidate}
                isLoading={isLoading}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Validate & Complete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationDetailModal;
