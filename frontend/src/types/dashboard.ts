export interface DashboardKPIs {
  total_products: number;
  low_stock_count: number;
  pending_receipts: number;
  pending_deliveries: number;
  internal_transfers_scheduled: number;
}

export interface RecentMovement {
  id: number;
  operation_reference: string;
  operation_type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';
  product_name: string;
  product_sku: string;
  quantity: number;
  uom: string;
  timestamp: string;
  source_location?: string;
  dest_location?: string;
}
