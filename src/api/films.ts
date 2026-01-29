// src/api/films.ts
import apiClient from './client';
import type { Film } from './types';

export const filmsApi = {
  list: async (search?: string): Promise<Film[]> => {
    const url = search ? `/v1/films/?search=${encodeURIComponent(search)}` : '/v1/films/';
    const response = await apiClient.get<Film[]>(url);
    return response.data;
  },

  get: async (id: number): Promise<Film> => {
    const response = await apiClient.get<Film>(`/v1/films/${id}/`);
    return response.data;
  },
};

export default filmsApi;
