import apiClient from './api';
import {
  Operation,
  OperationCreatePayload,
  OperationFilterParams,
} from '../types/operation';
import { ApiResponse } from '../types/api';

// Fallback in-memory / local storage cache for seamless development before backend operations router is wired
const STORAGE_KEY = 'stocksense_operations_store';

const initialMockOperations: Operation[] = [
  {
    id: 1,
    operation_number: 'WH/IN/0001',
    type: 'RECEIPT',
    status: 'DONE',
    partner_name: 'Apex Industrial Supplies',
    source_location_id: null,
    source_location_name: null,
    destination_location_id: 3, // WH1-REC (Receiving Dock)
    destination_location_name: 'Receiving Dock (WH1-REC)',
    notes: 'Initial batch arrival of standard fasteners and motors',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    lines: [
      {
        id: 1,
        operation_id: 1,
        product_id: 1,
        product_sku: 'SKU-MOT-01',
        product_name: 'Stepper Motor NEMA 23',
        uom: 'units',
        quantity: 150,
      },
    ],
  },
  {
    id: 2,
    operation_number: 'WH/INT/0001',
    type: 'TRANSFER',
    status: 'READY',
    partner_name: null,
    source_location_id: 3, // WH1-REC
    source_location_name: 'Receiving Dock (WH1-REC)',
    destination_location_id: 1, // WH1-A1
    destination_location_name: 'Rack A1 (WH1-A1)',
    notes: 'Transfer incoming stock to storage bay A1',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    lines: [
      {
        id: 2,
        operation_id: 2,
        product_id: 1,
        product_sku: 'SKU-MOT-01',
        product_name: 'Stepper Motor NEMA 23',
        uom: 'units',
        quantity: 100,
      },
    ],
  },
  {
    id: 3,
    operation_number: 'WH/OUT/0001',
    type: 'DELIVERY',
    status: 'DRAFT',
    partner_name: 'OmniCorp Robotics Ltd',
    source_location_id: 1, // WH1-A1
    source_location_name: 'Rack A1 (WH1-A1)',
    destination_location_id: null,
    destination_location_name: null,
    notes: 'Outbound sales order SO-9942',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    lines: [
      {
        id: 3,
        operation_id: 3,
        product_id: 1,
        product_sku: 'SKU-MOT-01',
        product_name: 'Stepper Motor NEMA 23',
        uom: 'units',
        quantity: 20,
      },
    ],
  },
  {
    id: 4,
    operation_number: 'WH/ADJ/0001',
    type: 'ADJUSTMENT',
    status: 'DONE',
    partner_name: null,
    source_location_id: 1,
    source_location_name: 'Rack A1 (WH1-A1)',
    destination_location_id: null,
    destination_location_name: null,
    notes: 'Quarterly inventory physical count reconciliation',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    lines: [
      {
        id: 4,
        operation_id: 4,
        product_id: 1,
        product_sku: 'SKU-MOT-01',
        product_name: 'Stepper Motor NEMA 23',
        uom: 'units',
        quantity: 80,
        system_quantity: 85,
        variance: -5,
      },
    ],
  },
];

function getStoredOperations(): Operation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockOperations));
      return initialMockOperations;
    }
    return JSON.parse(raw);
  } catch {
    return initialMockOperations;
  }
}

function saveStoredOperations(ops: Operation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error('Failed to save operations to localStorage:', err);
  }
}

export const operationService = {
  async getOperations(params?: OperationFilterParams): Promise<Operation[]> {
    try {
      const res = await apiClient.get<ApiResponse<Operation[]> | Operation[]>('/operations', {
        params,
      });
      const data = (res.data as ApiResponse<Operation[]>).data || (res.data as Operation[]);
      if (Array.isArray(data)) return data;
    } catch (err: any) {
      // If endpoint doesn't exist yet (404/501), fallback gracefully
      if (err.response?.status !== 404 && err.response?.status !== 501 && err.response?.status !== 405) {
        console.warn('Backend /operations endpoint returned error, checking local store:', err.message);
      }
    }

    // Local store fallback
    let list = getStoredOperations();
    if (params?.type) {
      list = list.filter((op) => op.type === params.type);
    }
    if (params?.status) {
      list = list.filter((op) => op.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (op) =>
          op.operation_number.toLowerCase().includes(q) ||
          (op.partner_name && op.partner_name.toLowerCase().includes(q)) ||
          (op.notes && op.notes.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async getOperationById(id: number): Promise<Operation> {
    try {
      const res = await apiClient.get<ApiResponse<Operation> | Operation>(`/operations/${id}`);
      const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }

    const list = getStoredOperations();
    const found = list.find((op) => op.id === id);
    if (!found) throw new Error(`Operation #${id} not found`);
    return found;
  },

  async createOperation(payload: OperationCreatePayload): Promise<Operation> {
    try {
      const res = await apiClient.post<ApiResponse<Operation> | Operation>('/operations', payload);
      const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
      if (data && data.id) return data;
    } catch (err: any) {
      if (err.response?.status !== 404 && err.response?.status !== 501 && err.response?.status !== 405) {
        // Only throw if it's a real business logic or validation error from backend
        if (err.response?.data?.error?.message) {
          throw new Error(err.response.data.error.message);
        }
      }
    }

    // Fallback local store creation
    const list = getStoredOperations();
    const typePrefix =
      payload.type === 'RECEIPT'
        ? 'WH/IN'
        : payload.type === 'DELIVERY'
        ? 'WH/OUT'
        : payload.type === 'TRANSFER'
        ? 'WH/INT'
        : 'WH/ADJ';
    const nextSeq = list.filter((o) => o.type === payload.type).length + 1;
    const opNumber = `${typePrefix}/${String(nextSeq).padStart(4, '0')}`;

    const newOp: Operation = {
      id: Date.now(),
      operation_number: opNumber,
      type: payload.type,
      status: 'DRAFT',
      partner_name: payload.partner_name || null,
      source_location_id: payload.source_location_id || null,
      destination_location_id: payload.destination_location_id || null,
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      lines: payload.lines.map((l, index) => ({
        id: Date.now() + index,
        product_id: l.product_id,
        quantity: l.quantity,
      })),
    };

    list.unshift(newOp);
    saveStoredOperations(list);
    return newOp;
  },

  async validateOperation(id: number): Promise<Operation> {
    try {
      const res = await apiClient.post<ApiResponse<Operation> | Operation>(
        `/operations/${id}/validate`
      );
      const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
      if (data && data.id) return data;
    } catch (err: any) {
      if (err.response?.status !== 404 && err.response?.status !== 501 && err.response?.status !== 405) {
        if (err.response?.data?.error?.message) {
          throw new Error(err.response.data.error.message);
        }
      }
    }

    // Fallback local store validation
    const list = getStoredOperations();
    const opIndex = list.findIndex((o) => o.id === id);
    if (opIndex === -1) throw new Error(`Operation #${id} not found`);

    list[opIndex] = {
      ...list[opIndex],
      status: 'DONE',
    };
    saveStoredOperations(list);
    return list[opIndex];
  },

  async cancelOperation(id: number): Promise<Operation> {
    try {
      const res = await apiClient.post<ApiResponse<Operation> | Operation>(
        `/operations/${id}/cancel`
      );
      const data = (res.data as ApiResponse<Operation>).data || (res.data as Operation);
      if (data && data.id) return data;
    } catch {
      // Fallback
    }

    const list = getStoredOperations();
    const opIndex = list.findIndex((o) => o.id === id);
    if (opIndex === -1) throw new Error(`Operation #${id} not found`);

    list[opIndex] = {
      ...list[opIndex],
      status: 'CANCELLED',
    };
    saveStoredOperations(list);
    return list[opIndex];
  },
};

export default operationService;
