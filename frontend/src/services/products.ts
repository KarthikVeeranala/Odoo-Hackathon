import apiClient from './api';
import { Product, ProductCreatePayload, ProductDetail, Category } from '../types/product';
import { ApiResponse } from '../types/api';

export const productService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get<ApiResponse<Category[]> | Category[]>('/categories');
    const data = (res.data as ApiResponse<Category[]>).data || (res.data as Category[]);
    return Array.isArray(data) ? data : [];
  },

  async getProducts(params?: {
    search?: string;
    category_id?: number;
    low_stock?: boolean;
  }): Promise<Product[]> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.category_id) queryParams.category_id = params.category_id;
    if (params?.low_stock !== undefined) queryParams.low_stock = params.low_stock;

    const res = await apiClient.get<ApiResponse<Product[]> | Product[]>('/products', {
      params: queryParams,
    });
    const data = (res.data as ApiResponse<Product[]>).data || (res.data as Product[]);
    return Array.isArray(data) ? data : [];
  },

  async getProductById(id: number): Promise<ProductDetail> {
    const res = await apiClient.get<ApiResponse<ProductDetail> | ProductDetail>(`/products/${id}`);
    const data = (res.data as ApiResponse<ProductDetail>).data || (res.data as ProductDetail);
    return data;
  },

  async createProduct(payload: ProductCreatePayload): Promise<Product> {
    const res = await apiClient.post<ApiResponse<Product> | Product>('/products', payload);
    const data = (res.data as ApiResponse<Product>).data || (res.data as Product);
    return data;
  },
};

export default productService;
