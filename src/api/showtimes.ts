// src/api/showtimes.ts
import apiClient from './client';
import type {
  Showtime,
  ShowtimeCreate,
  ShowtimeFilters,
  BulkShowtimeCreate,
  PaginatedResponse,
} from './types';

const buildQueryString = (filters: ShowtimeFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

export const showtimesApi = {
  list: async (filters: ShowtimeFilters = {}): Promise<Showtime[]> => {
    const query = buildQueryString(filters);
    const url = query ? `/v1/showtimes/?${query}` : '/v1/showtimes/';
    const response = await apiClient.get<PaginatedResponse<Showtime>>(url);
    return response.data.results;
  },

  get: async (id: number): Promise<Showtime> => {
    const response = await apiClient.get<Showtime>(`/v1/showtimes/${id}/`);
    return response.data;
  },

  create: async (data: ShowtimeCreate): Promise<Showtime> => {
    const response = await apiClient.post<Showtime>('/v1/showtimes/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ShowtimeCreate>): Promise<Showtime> => {
    const response = await apiClient.patch<Showtime>(`/v1/showtimes/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/showtimes/${id}/`);
  },

  bulkCreate: async (data: BulkShowtimeCreate): Promise<Showtime[]> => {
    const response = await apiClient.post<Showtime[]>('/v1/showtimes/bulk-create/', data);
    return response.data;
  },

};

export default showtimesApi;
