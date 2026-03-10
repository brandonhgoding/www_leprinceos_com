// src/api/concessions.ts
import apiClient from './client';
import type {
  ConcessionCategory,
  ConcessionCategoryCreate,
  ConcessionItem,
  ConcessionItemCreate,
  ConcessionVariation,
  ConcessionVariationCreate,
  Modifier,
  ModifierWrite,
  PaginatedResponse,
} from './types';

export const concessionsApi = {
  // Categories
  listCategories: async (): Promise<ConcessionCategory[]> => {
    const response = await apiClient.get<PaginatedResponse<ConcessionCategory>>(
      '/v1/concession-categories/',
    );
    return response.data.results;
  },

  getCategory: async (id: number): Promise<ConcessionCategory> => {
    const response = await apiClient.get<ConcessionCategory>(`/v1/concession-categories/${id}/`);
    return response.data;
  },

  createCategory: async (data: ConcessionCategoryCreate): Promise<ConcessionCategory> => {
    const response = await apiClient.post<ConcessionCategory>('/v1/concession-categories/', data);
    return response.data;
  },

  updateCategory: async (
    id: number,
    data: Partial<ConcessionCategoryCreate>,
  ): Promise<ConcessionCategory> => {
    const response = await apiClient.patch<ConcessionCategory>(
      `/v1/concession-categories/${id}/`,
      data,
    );
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/concession-categories/${id}/`);
  },

  // Items
  listItems: async (): Promise<ConcessionItem[]> => {
    const response =
      await apiClient.get<PaginatedResponse<ConcessionItem>>('/v1/concession-items/');
    return response.data.results;
  },

  getItem: async (id: number): Promise<ConcessionItem> => {
    const response = await apiClient.get<ConcessionItem>(`/v1/concession-items/${id}/`);
    return response.data;
  },

  createItem: async (data: ConcessionItemCreate): Promise<ConcessionItem> => {
    const response = await apiClient.post<ConcessionItem>('/v1/concession-items/', data);
    return response.data;
  },

  updateItem: async (id: number, data: Partial<ConcessionItemCreate>): Promise<ConcessionItem> => {
    const response = await apiClient.patch<ConcessionItem>(`/v1/concession-items/${id}/`, data);
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/concession-items/${id}/`);
  },

  // Variations
  listVariations: async (itemId: number): Promise<ConcessionVariation[]> => {
    const response = await apiClient.get<ConcessionVariation[]>(
      `/v1/concession-items/${itemId}/variations/`,
    );
    return response.data;
  },

  createVariation: async (
    itemId: number,
    data: ConcessionVariationCreate,
  ): Promise<ConcessionVariation> => {
    const response = await apiClient.post<ConcessionVariation>(
      `/v1/concession-items/${itemId}/variations/`,
      data,
    );
    return response.data;
  },

  updateVariation: async (
    itemId: number,
    variationId: number,
    data: Partial<ConcessionVariationCreate>,
  ): Promise<ConcessionVariation> => {
    const response = await apiClient.patch<ConcessionVariation>(
      `/v1/concession-items/${itemId}/variations/${variationId}/`,
      data,
    );
    return response.data;
  },

  deleteVariation: async (itemId: number, variationId: number): Promise<void> => {
    await apiClient.delete(`/v1/concession-items/${itemId}/variations/${variationId}/`);
  },

  // Modifiers
  listModifiers: async (): Promise<Modifier[]> => {
    const response = await apiClient.get<PaginatedResponse<Modifier>>('/v1/modifiers/');
    return response.data.results;
  },

  getModifier: async (id: number): Promise<Modifier> => {
    const response = await apiClient.get<Modifier>(`/v1/modifiers/${id}/`);
    return response.data;
  },

  createModifier: async (data: ModifierWrite): Promise<Modifier> => {
    const response = await apiClient.post<Modifier>('/v1/modifiers/', data);
    return response.data;
  },

  updateModifier: async (id: number, data: Partial<ModifierWrite>): Promise<Modifier> => {
    const response = await apiClient.patch<Modifier>(`/v1/modifiers/${id}/`, data);
    return response.data;
  },

  deleteModifier: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/modifiers/${id}/`);
  },
};

export default concessionsApi;
