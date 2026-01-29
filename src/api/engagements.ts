// src/api/engagements.ts
import apiClient from './client';
import type { Engagement, EngagementCreate, EngagementFilters, PaginatedResponse } from './types';

const buildQueryString = (filters: EngagementFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

export const engagementsApi = {
  list: async (filters: EngagementFilters = {}): Promise<Engagement[]> => {
    const query = buildQueryString(filters);
    const url = query ? `/v1/engagements/?${query}` : '/v1/engagements/';
    const response = await apiClient.get<PaginatedResponse<Engagement>>(url);
    return response.data.results;
  },

  get: async (id: number): Promise<Engagement> => {
    const response = await apiClient.get<Engagement>(`/v1/engagements/${id}/`);
    return response.data;
  },

  create: async (data: EngagementCreate): Promise<Engagement> => {
    const response = await apiClient.post<Engagement>('/v1/engagements/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<EngagementCreate>): Promise<Engagement> => {
    const response = await apiClient.patch<Engagement>(`/v1/engagements/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/engagements/${id}/`);
  },
};

export default engagementsApi;
