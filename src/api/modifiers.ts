// src/api/modifiers.ts
import apiClient from './client';
import type {
  Modifier,
  ModifierCreate,
  ModifierGroup,
  ModifierGroupCreate,
  ModifierGroupDetail,
  PaginatedResponse,
} from './types';

export const modifiersApi = {
  // Modifier Groups
  listGroups: async (): Promise<ModifierGroup[]> => {
    const response = await apiClient.get<PaginatedResponse<ModifierGroup>>('/v1/modifier-groups/');
    return response.data.results;
  },

  getGroup: async (id: number): Promise<ModifierGroupDetail> => {
    const response = await apiClient.get<ModifierGroupDetail>(`/v1/modifier-groups/${id}/`);
    return response.data;
  },

  createGroup: async (data: ModifierGroupCreate): Promise<ModifierGroup> => {
    const response = await apiClient.post<ModifierGroup>('/v1/modifier-groups/', data);
    return response.data;
  },

  updateGroup: async (
    id: number,
    data: Partial<ModifierGroupCreate>
  ): Promise<ModifierGroup> => {
    const response = await apiClient.patch<ModifierGroup>(`/v1/modifier-groups/${id}/`, data);
    return response.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/modifier-groups/${id}/`);
  },

  // Modifiers
  listModifiers: async (groupId: number): Promise<Modifier[]> => {
    const response = await apiClient.get<Modifier[]>(
      `/v1/modifier-groups/${groupId}/modifiers/`
    );
    return response.data;
  },

  createModifier: async (groupId: number, data: ModifierCreate): Promise<Modifier> => {
    const response = await apiClient.post<Modifier>(
      `/v1/modifier-groups/${groupId}/modifiers/`,
      data
    );
    return response.data;
  },

  updateModifier: async (id: number, data: Partial<ModifierCreate>): Promise<Modifier> => {
    const response = await apiClient.patch<Modifier>(`/v1/modifiers/${id}/`, data);
    return response.data;
  },

  deleteModifier: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/modifiers/${id}/`);
  },
};

export default modifiersApi;
