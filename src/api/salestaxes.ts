// src/api/salestaxes.ts
import apiClient from './client';
import type { SalesTax, SalesTaxDetail, SalesTaxCreate, PaginatedResponse } from './types';

export const salesTaxesApi = {
  list: async (): Promise<SalesTax[]> => {
    const response = await apiClient.get<PaginatedResponse<SalesTax>>('/v1/sales-taxes/');
    return response.data.results;
  },

  get: async (id: number): Promise<SalesTaxDetail> => {
    const response = await apiClient.get<SalesTaxDetail>(`/v1/sales-taxes/${id}/`);
    return response.data;
  },

  create: async (data: SalesTaxCreate): Promise<SalesTax> => {
    const response = await apiClient.post<SalesTax>('/v1/sales-taxes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<SalesTaxCreate>): Promise<SalesTax> => {
    const response = await apiClient.patch<SalesTax>(`/v1/sales-taxes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/sales-taxes/${id}/`);
  },
};

export default salesTaxesApi;
