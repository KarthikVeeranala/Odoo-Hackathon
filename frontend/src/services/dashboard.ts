import apiClient from './api';
import { DashboardKPIs, RecentMovement } from '../types/dashboard';
import { ApiResponse } from '../types/api';
import productService from './products';
import operationService from './operations';

export const dashboardService = {
  async getKPIs(): Promise<DashboardKPIs> {
    try {
      const res = await apiClient.get<ApiResponse<DashboardKPIs> | DashboardKPIs>('/dashboard/kpis');
      const data = (res.data as ApiResponse<DashboardKPIs>).data || (res.data as DashboardKPIs);
      if (data && typeof data.total_products === 'number') {
        return data;
      }
    } catch {
      // Graceful fallback to real-time client computation from live product & operation endpoints
    }

    // Dynamic fallback using live products and operations endpoints
    const [products, operations] = await Promise.all([
      productService.getProducts().catch(() => []),
      operationService.getOperations().catch(() => []),
    ]);

    const totalProducts = products.length;
    const lowStockCount = products.filter((p) => p.is_low_stock).length;
    const pendingReceipts = operations.filter(
      (o) => o.type === 'RECEIPT' && (o.status === 'DRAFT' || o.status === 'READY')
    ).length;
    const pendingDeliveries = operations.filter(
      (o) => o.type === 'DELIVERY' && (o.status === 'DRAFT' || o.status === 'READY')
    ).length;
    const internalTransfers = operations.filter(
      (o) => o.type === 'TRANSFER' && (o.status === 'DRAFT' || o.status === 'READY')
    ).length;

    return {
      total_products: totalProducts,
      low_stock_count: lowStockCount,
      pending_receipts: pendingReceipts,
      pending_deliveries: pendingDeliveries,
      internal_transfers_scheduled: internalTransfers,
    };
  },

  async getRecentMovements(): Promise<RecentMovement[]> {
    try {
      const res = await apiClient.get<ApiResponse<RecentMovement[]> | RecentMovement[]>(
        '/dashboard/recent-movements'
      );
      const data = (res.data as ApiResponse<RecentMovement[]>).data || (res.data as RecentMovement[]);
      if (Array.isArray(data)) return data;
    } catch {
      // Graceful fallback
    }

    // Derive from recent operations
    const operations = await operationService.getOperations().catch(() => []);
    const movements: RecentMovement[] = [];

    operations.slice(0, 10).forEach((op) => {
      const firstLine = op.lines[0];
      movements.push({
        id: op.id,
        operation_reference: op.reference || op.operation_number || `OP-${op.id}`,
        operation_type: op.type,
        product_name: firstLine?.product_name || `Product #${firstLine?.product_id || 1}`,
        product_sku: firstLine?.product_sku || 'SKU-GEN',
        quantity: firstLine?.quantity || 1,
        uom: firstLine?.uom || 'units',
        timestamp: op.created_at,
        source_location: op.source_location_name || undefined,
        dest_location: op.dest_location_name || op.destination_location_name || undefined,
      });
    });

    return movements;
  },
};

export default dashboardService;
