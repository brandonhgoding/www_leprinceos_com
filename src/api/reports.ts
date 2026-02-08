// src/api/reports.ts
import apiClient from './client';
import type { ShowtimeStats, EngagementStats, ReportDateRangeParams } from './types';
import type { AxiosResponse } from 'axios';

export const reportsApi = {
  getShowtimeStats: async (showtimeId: number): Promise<ShowtimeStats> => {
    const response = await apiClient.get<ShowtimeStats>(
      `/v1/reports/showtimes/${showtimeId}/stats/`,
    );
    return response.data;
  },

  getEngagementStats: async (engagementId: number): Promise<EngagementStats> => {
    const response = await apiClient.get<EngagementStats>(
      `/v1/reports/engagements/${engagementId}/stats/`,
    );
    return response.data;
  },

  downloadTicketsCsv: async (params: ReportDateRangeParams): Promise<AxiosResponse<Blob>> => {
    return apiClient.get('/v1/reports/tickets/export/', {
      params,
      responseType: 'blob',
    });
  },

  downloadSummaryCsv: async (
    params: Omit<ReportDateRangeParams, 'engagement_id'>,
  ): Promise<AxiosResponse<Blob>> => {
    return apiClient.get('/v1/reports/summary/export/', {
      params,
      responseType: 'blob',
    });
  },

  downloadShowtimePdf: async (showtimeId: number): Promise<AxiosResponse<Blob>> => {
    return apiClient.get(`/v1/reports/showtimes/${showtimeId}/pdf/`, {
      responseType: 'blob',
    });
  },

  downloadEngagementPdf: async (engagementId: number): Promise<AxiosResponse<Blob>> => {
    return apiClient.get(`/v1/reports/engagements/${engagementId}/pdf/`, {
      responseType: 'blob',
    });
  },

  downloadTicketsPdf: async (params: ReportDateRangeParams): Promise<AxiosResponse<Blob>> => {
    return apiClient.get('/v1/reports/tickets/pdf/', {
      params,
      responseType: 'blob',
    });
  },

  downloadSummaryPdf: async (
    params: Omit<ReportDateRangeParams, 'engagement_id'>,
  ): Promise<AxiosResponse<Blob>> => {
    return apiClient.get('/v1/reports/summary/pdf/', {
      params,
      responseType: 'blob',
    });
  },
};

export default reportsApi;
