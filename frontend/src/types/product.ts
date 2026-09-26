export interface Category {
  id: number;
  name: string;
  code: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  category_name?: string;
  uom: string;
  safety_stock: number;
  reorder_quantity: number;
  total_on_hand: number; // Backend calculated stock. Primary quantity.
  is_low_stock: boolean;
}

export interface ProductCreatePayload {
  sku: string;
  name: string;
  category_id: number;
  uom: string;
  safety_stock: number;
  reorder_quantity: number;
}

export interface ProductLocationStock {
  location_id: number;
  location_name: string;
  location_code: string;
  warehouse_name: string;
  quantity: number;
}

export interface ProductDetail extends Product {
  locations: ProductLocationStock[];
}
