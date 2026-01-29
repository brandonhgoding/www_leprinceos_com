// src/api/screens.ts
import apiClient from './client';
import type { Screen, PaginatedResponse } from './types';

export interface ScreenCreate {
  name: string;
  capacity: number;
  screen_type?: 'standard' | 'imax' | 'dolby_cinema';
  aspect_ratio?: 'flat' | 'scope' | 'imax_190' | 'imax_143';
  sound_system?: 'standard' | 'dolby_digital' | 'dolby_atmos';
  supports_3d?: boolean;
}

export const screensApi = {
  list: async (): Promise<Screen[]> => {
    const response = await apiClient.get<PaginatedResponse<Screen>>('/v1/screens/');
    return response.data.results;
  },

  get: async (id: number): Promise<Screen> => {
    const response = await apiClient.get<Screen>(`/v1/screens/${id}/`);
    return response.data;
  },

  create: async (data: ScreenCreate): Promise<Screen> => {
    const response = await apiClient.post<Screen>('/v1/screens/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ScreenCreate>): Promise<Screen> => {
    const response = await apiClient.patch<Screen>(`/v1/screens/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/screens/${id}/`);
  },
};

export default screensApi;
