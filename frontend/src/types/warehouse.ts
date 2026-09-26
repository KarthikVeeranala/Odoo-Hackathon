export type LocationType = 'STORAGE' | 'RECEIVING' | 'STAGING' | 'PRODUCTION';

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string;
}

export interface Location {
  id: number;
  warehouse_id: number;
  warehouse_name?: string;
  code: string;
  name: string;
  type: LocationType;
  capacity: number;
  current_occupancy: number;
  utilization_percentage: number;
}

export interface LocationStockItem {
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  uom: string;
  is_low_stock: boolean;
}

export interface LocationStockResponse {
  location: Location;
  items: LocationStockItem[];
}
