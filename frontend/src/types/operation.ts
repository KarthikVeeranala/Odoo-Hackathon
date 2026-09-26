export type OperationType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

export type OperationStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED' | 'CANCELLED';

export interface OperationLine {
  id?: number;
  operation_id?: number;
  product_id: number;
  product_sku?: string;
  product_name?: string;
  uom?: string;
  quantity: number;
  system_quantity?: number;
  variance?: number;
}

export interface Operation {
  id: number;
  reference: string;
  operation_number?: string; // Compatibility alias for reference
  type: OperationType;
  status: OperationStatus;
  warehouse_id?: number;
  warehouse_name?: string | null;
  partner_name?: string | null;
  source_location_id?: number | null;
  source_location_name?: string | null;
  dest_location_id?: number | null;
  dest_location_name?: string | null;
  destination_location_id?: number | null; // Compatibility alias
  destination_location_name?: string | null; // Compatibility alias
  notes?: string | null;
  line_count?: number;
  total_quantity?: number;
  created_at: string;
  validated_at?: string | null;
  lines: OperationLine[];
}

export interface OperationCreatePayload {
  type: OperationType;
  warehouse_id?: number;
  partner_name?: string;
  source_location_id?: number | null;
  dest_location_id?: number | null;
  destination_location_id?: number | null;
  notes?: string;
  lines: {
    product_id: number;
    quantity: number;
    uom?: string;
  }[];
}

export interface OperationFilterParams {
  type?: OperationType;
  status?: OperationStatus;
  warehouse_id?: number;
  search?: string;
}
