export interface StockLedgerEntry {
  id: number;
  operation_id?: number | null;
  operation_reference?: string | null;
  operation_type?: string | null;
  product_id: number;
  product_sku?: string | null;
  product_name?: string | null;
  source_location_id?: number | null;
  source_location_name?: string | null;
  dest_location_id?: number | null;
  dest_location_name?: string | null;
  quantity: number;
  balance_after: number;
  timestamp: string;
  created_by?: number | null;
  created_by_name?: string | null;
}

export interface StockLedgerFilterParams {
  product_id?: number;
  operation_type?: string;
  location_id?: number;
  search?: string;
}
