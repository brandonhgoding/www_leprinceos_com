// src/api/inventory.ts
import apiClient from './client';
import type {
  ConcessionInventory,
  InventoryAdjustment,
  InventoryAdjustmentCreate,
  PaginatedResponse,
} from './types';

export const inventoryApi = {
  list: async (): Promise<ConcessionInventory[]> => {
    const response = await apiClient.get<PaginatedResponse<ConcessionInventory>>('/v1/inventory/');
    return response.data.results;
  },

  adjust: async (data: InventoryAdjustmentCreate): Promise<InventoryAdjustment> => {
    const response = await apiClient.post<InventoryAdjustment>('/v1/inventory/adjust/', data);
    return response.data;
  },

  history: async (variationId?: number): Promise<InventoryAdjustment[]> => {
    const params = variationId ? { variation_id: variationId } : {};
    const response = await apiClient.get<PaginatedResponse<InventoryAdjustment>>(
      '/v1/inventory/history/',
      { params },
    );
    return response.data.results;
  },
};

export default inventoryApi;
