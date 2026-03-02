// src/api/square.ts
import apiClient from './client';
import type {
  SquareCredentials,
  SquareCredentialsCreate,
  SquareConnectionTest,
  SquareSyncLog,
  SquareSyncRequest,
} from './types';

export const squareApi = {
  // Credentials
  getCredentials: async (): Promise<SquareCredentials | null> => {
    try {
      const response = await apiClient.get<SquareCredentials>('/v1/square/credentials/');
      return response.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  saveCredentials: async (data: SquareCredentialsCreate): Promise<SquareCredentials> => {
    const response = await apiClient.post<SquareCredentials>('/v1/square/credentials/', data);
    return response.data;
  },

  deleteCredentials: async (): Promise<void> => {
    await apiClient.delete('/v1/square/credentials/');
  },

  testConnection: async (): Promise<SquareConnectionTest> => {
    const response = await apiClient.post<SquareConnectionTest>('/v1/square/credentials/test/');
    return response.data;
  },

  // Sync
  triggerSync: async (data?: SquareSyncRequest): Promise<SquareSyncLog> => {
    const response = await apiClient.post<SquareSyncLog>('/v1/square/sync/', data || {});
    return response.data;
  },

  getSyncHistory: async (): Promise<SquareSyncLog[]> => {
    const response = await apiClient.get<SquareSyncLog[]>('/v1/square/sync/history/');
    return response.data;
  },

  getLatestSync: async (): Promise<SquareSyncLog | null> => {
    try {
      const response = await apiClient.get<SquareSyncLog>('/v1/square/sync/latest/');
      return response.data;
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

export default squareApi;
