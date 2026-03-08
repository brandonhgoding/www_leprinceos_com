// src/api/taxes.ts
import apiClient from './client';
import type {
  SalesTax,
  SalesTaxCreate,
  TaxGroup,
  TaxGroupCreate,
  PaginatedResponse,
} from './types';

export const taxesApi = {
  // Sales Taxes
  listSalesTaxes: async (): Promise<SalesTax[]> => {
    const response = await apiClient.get<PaginatedResponse<SalesTax>>('/v1/sales-taxes/');
    return response.data.results;
  },

  createSalesTax: async (data: SalesTaxCreate): Promise<SalesTax> => {
    const response = await apiClient.post<SalesTax>('/v1/sales-taxes/', data);
    return response.data;
  },

  updateSalesTax: async (id: number, data: Partial<SalesTaxCreate>): Promise<SalesTax> => {
    const response = await apiClient.patch<SalesTax>(`/v1/sales-taxes/${id}/`, data);
    return response.data;
  },

  deleteSalesTax: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/sales-taxes/${id}/`);
  },

  // Tax Groups
  listTaxGroups: async (): Promise<TaxGroup[]> => {
    const response = await apiClient.get<PaginatedResponse<TaxGroup>>('/v1/tax-groups/');
    return response.data.results;
  },

  createTaxGroup: async (data: TaxGroupCreate): Promise<TaxGroup> => {
    const response = await apiClient.post<TaxGroup>('/v1/tax-groups/', data);
    return response.data;
  },

  updateTaxGroup: async (id: number, data: Partial<TaxGroupCreate>): Promise<TaxGroup> => {
    const response = await apiClient.patch<TaxGroup>(`/v1/tax-groups/${id}/`, data);
    return response.data;
  },

  deleteTaxGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/tax-groups/${id}/`);
  },
};

export default taxesApi;
