import apiClient from './api';
import { Warehouse, Location, LocationStockResponse, LocationType } from '../types/warehouse';
import { ApiResponse } from '../types/api';

export const warehouseService = {
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await apiClient.get<ApiResponse<Warehouse[]> | Warehouse[]>('/warehouses');
    const data = (res.data as ApiResponse<Warehouse[]>).data || (res.data as Warehouse[]);
    return Array.isArray(data) ? data : [];
  },

  async getLocations(params?: {
    warehouse_id?: number;
    type?: LocationType;
  }): Promise<Location[]> {
    const queryParams: Record<string, string | number> = {};
    if (params?.warehouse_id) queryParams.warehouse_id = params.warehouse_id;
    if (params?.type) queryParams.type = params.type;

    const res = await apiClient.get<ApiResponse<Location[]> | Location[]>('/locations', {
      params: queryParams,
    });
    const data = (res.data as ApiResponse<Location[]>).data || (res.data as Location[]);
    return Array.isArray(data) ? data : [];
  },

  async getLocationStock(locationId: number): Promise<LocationStockResponse> {
    const res = await apiClient.get<ApiResponse<LocationStockResponse> | LocationStockResponse>(
      `/locations/${locationId}/stock`
    );
    const data = (res.data as ApiResponse<LocationStockResponse>).data || (res.data as LocationStockResponse);
    return data;
  },
};

export default warehouseService;
