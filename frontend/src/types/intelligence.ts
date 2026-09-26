export type ReorderUrgency = 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'COLD_START';

export interface ReorderRecommendation {
  product_id: number;
  product_name: string;
  product_sku: string;
  category_name?: string;
  uom: string;
  current_stock: number;
  safety_stock: number;
  average_daily_usage: number;
  days_until_safety_stock: number;
  reorder_quantity: number;
  urgency: ReorderUrgency;
  formula_explanation: string;
  suggested_action: string;
}

export type AnomalyType =
  | 'CYCLE_COUNT_DISCREPANCY'
  | 'RAPID_DEPLETION'
  | 'UNEXPECTED_SURGE'
  | 'NEGATIVE_BALANCE_RISK';

export type AnomalySeverity = 'CRITICAL' | 'WARNING';

export type AnomalyStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';

export interface AnomalyRecord {
  id: string | number;
  product_id: number;
  product_name: string;
  product_sku: string;
  location_name: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  timestamp: string;
  explanation: string;
  baseline_value: number;
  detected_value: number;
  variance: number;
  status: AnomalyStatus;
  operation_id?: number;
  operation_reference?: string;
  investigation_notes?: string;
}

export interface ReorderFilterParams {
  urgency?: 'ALL' | ReorderUrgency;
  search?: string;
}

export interface AnomalyFilterParams {
  severity?: 'ALL' | AnomalySeverity;
  status?: 'ALL' | AnomalyStatus;
  search?: string;
}
