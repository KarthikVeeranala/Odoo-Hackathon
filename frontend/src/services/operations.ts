import apiClient from './api';
import {
  Operation,
  OperationCreatePayload,
  OperationFilterParams,
} from '../types/operation';
import { ApiResponse } from '../types/api';

// Helper to normalize backend Operation model with frontend aliases
function normalizeOperation(op: any): Operation {
  return {
    ...op,
    reference: op.reference || op.operation_number || `OP-${op.id}`,
    operation_number: op.reference || op.operation_number || `OP-${op.id}`,
    destination_location_id: op.dest_location_id ?? op.destination_location_id ?? null,
    destination_location_name: op.dest_location_name ?? op.destination_location_name ?? null,
    source_location_id: op.source_location_id ?? null,
    source_location_name: op.source_location_name ?? null,
    lines: Array.isArray(op.lines) ? op.lines : [],
  };
}

export const operationService = {
  async getOperations(params?: OperationFilterParams): Promise<Operation[]> {
    const queryParams: Record<string, any> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.status) queryParams.status = params.status;
    if (params?.warehouse_id) queryParams.warehouse_id = params.warehouse_id;

    const res = await apiClient.get<ApiResponse<Operation[]> | Operation[]>('/operations', {
      params: queryParams,
    });
    const data = (res.data as ApiResponse<Operation[]>).data || (res.data as Operation[]);
    const list = Array.isArray(data) ? data : [];

    let normalized = list.map(normalizeOperation);

    if (params?.search) {
      const q = params.search.toLowerCase();
      normalized = normalized.filter(
        (op) =>
          op.reference.toLowerCase().includes(q) ||
          (op.partner_name && op.partner_name.toLowerCase().includes(q)) ||
          (op.notes && op.notes.toLowerCase().includes(q))
      );
    }

    return normalized;
  },

  async getOperationById(id: number): Promise<Operation> {
    const res = await apiClient.get<ApiResponse<Operation> | Operation>(`/operations/${id}`);
    const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
    return normalizeOperation(data);
  },

  async createOperation(payload: OperationCreatePayload): Promise<Operation> {
    const destId = payload.dest_location_id ?? payload.destination_location_id ?? null;
    const srcId = payload.source_location_id ?? null;

    // Build payload strictly adhering to Developer 1's backend OperationCreate schema
    const backendPayload = {
      type: payload.type,
      warehouse_id: payload.warehouse_id || 1,
      source_location_id: srcId,
      dest_location_id: destId,
      partner_name: payload.partner_name || null,
      notes: payload.notes || null,
      lines: payload.lines.map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        uom: l.uom || undefined,
      })),
    };

    const res = await apiClient.post<ApiResponse<Operation> | Operation>(
      '/operations',
      backendPayload
    );
    const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
    return normalizeOperation(data);
  },

  async validateOperation(id: number): Promise<Operation> {
    const res = await apiClient.post<ApiResponse<Operation> | Operation>(
      `/operations/${id}/validate`
    );
    const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
    return normalizeOperation(data);
  },

  async cancelOperation(id: number): Promise<Operation> {
    const res = await apiClient.post<ApiResponse<Operation> | Operation>(
      `/operations/${id}/cancel`
    );
    const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
    return normalizeOperation(data);
  },
};

export default operationService;
