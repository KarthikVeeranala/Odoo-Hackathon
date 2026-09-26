import apiClient from './api';
import {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  User,
} from '../types/auth';
import { ApiResponse } from '../types/api';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse> | AuthResponse>('/auth/login', payload);
    // Handle both wrapped { success: true, data: AuthResponse } and direct AuthResponse
    const data = (res.data as ApiResponse<AuthResponse>).data || (res.data as AuthResponse);
    return data;
  },

  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const res = await apiClient.post<ApiResponse<AuthResponse> | AuthResponse>('/auth/signup', payload);
    const data = (res.data as ApiResponse<AuthResponse>).data || (res.data as AuthResponse);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User> | User>('/auth/me');
    const data = (res.data as ApiResponse<User>).data || (res.data as User);
    return data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const res = await apiClient.post<ApiResponse<{ message: string }> | { message: string }>(
      '/auth/forgot-password',
      payload
    );
    const data = (res.data as ApiResponse<{ message: string }>).data || (res.data as { message: string });
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    const res = await apiClient.post<ApiResponse<{ message: string }> | { message: string }>(
      '/auth/reset-password',
      payload
    );
    const data = (res.data as ApiResponse<{ message: string }>).data || (res.data as { message: string });
    return data;
  },
};

export default authService;
