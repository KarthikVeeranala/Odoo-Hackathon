export type OperationType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

export type OperationStatus = 'DRAFT' | 'READY' | 'DONE' | 'CANCELLED';

export interface OperationLine {
  id?: number;
  operation_id?: number;
  product_id: number;
  product_sku?: string;
  product_name?: string;
  uom?: string;
  quantity: number;
  system_quantity?: number; // Used for ADJUSTMENT (system on-hand count)
  variance?: number; // Used for ADJUSTMENT (counted - system)
}

export interface Operation {
  id: number;
  operation_number: string;
  type: OperationType;
  status: OperationStatus;
  partner_name?: string | null;
  source_location_id?: number | null;
  source_location_name?: string | null;
  destination_location_id?: number | null;
  destination_location_name?: string | null;
  notes?: string | null;
  created_at: string;
  lines: OperationLine[];
}

export interface OperationCreatePayload {
  type: OperationType;
  partner_name?: string;
  source_location_id?: number | null;
  destination_location_id?: number | null;
  notes?: string;
  lines: {
    product_id: number;
    quantity: number;
  }[];
}

export interface OperationFilterParams {
  type?: OperationType;
  status?: OperationStatus;
  search?: string;
}
