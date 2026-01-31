// src/api/films.ts
import apiClient from './client';
import type {
  Film,
  PaginatedResponse,
  TMDBSearchResult,
  CreateFilmFromTMDBRequest,
} from './types';

export const filmsApi = {
  list: async (search?: string): Promise<Film[]> => {
    const url = search ? `/v1/films/?search=${encodeURIComponent(search)}` : '/v1/films/';
    const response = await apiClient.get<PaginatedResponse<Film>>(url);
    return response.data.results;
  },

  get: async (id: number): Promise<Film> => {
    const response = await apiClient.get<Film>(`/v1/films/${id}/`);
    return response.data;
  },

  searchTMDB: async (query: string): Promise<TMDBSearchResult[]> => {
    const response = await apiClient.get<TMDBSearchResult[]>(
      `/v1/films/search/?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  createFromTMDB: async (tmdbId: number): Promise<Film> => {
    const response = await apiClient.post<Film>(
      '/v1/films/from-tmdb/',
      { tmdb_id: tmdbId } as CreateFilmFromTMDBRequest
    );
    return response.data;
  },
};

export default filmsApi;
