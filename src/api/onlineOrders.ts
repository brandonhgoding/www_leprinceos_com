// src/api/onlineOrders.ts
import apiClient from './client';
import type { PaginatedResponse } from './types';

export type OrderStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface OnlineOrderItem {
  id: number;
  ticket_type_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface OnlineOrderSummary {
  id: number;
  uuid: string;
  confirmation_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  film_title: string;
  showtime_starts_at: string;
  screen_name: string;
  total_quantity: number;
  total_amount: string;
  created_at: string;
}

export interface OnlineOrderDetail extends OnlineOrderSummary {
  customer_phone: string;
  showtime_id: number;
  items: OnlineOrderItem[];
  subtotal: string;
  tax_amount: string;
  square_payment_id: string | null;
  sale_uuid: string | null;
  expires_at: string | null;
  updated_at: string;
  ip_address: string | null;
}

export interface OnlineOrderFilters {
  status?: OrderStatus;
  search?: string;
  created_after?: string;
  created_before?: string;
  page?: number;
}

const onlineOrdersApi = {
  list: async (filters?: OnlineOrderFilters): Promise<PaginatedResponse<OnlineOrderSummary>> => {
    const response = await apiClient.get<PaginatedResponse<OnlineOrderSummary>>('/v1/online-orders/', {
      params: filters,
    });
    return response.data;
  },

  get: async (id: number): Promise<OnlineOrderDetail> => {
    const response = await apiClient.get<OnlineOrderDetail>(`/v1/online-orders/${id}/`);
    return response.data;
  },

  refund: async (id: number, reason?: string): Promise<OnlineOrderDetail> => {
    const response = await apiClient.post<OnlineOrderDetail>(`/v1/online-orders/${id}/refund/`, {
      reason: reason ?? '',
    });
    return response.data;
  },
};

export default onlineOrdersApi;
