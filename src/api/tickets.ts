// src/api/tickets.ts
import apiClient from './client';
import type {
  TicketType,
  TicketTypeDetail,
  TicketTypeCreate,
  TicketTypeRule,
  TicketTypeRuleCreate,
  PaginatedResponse,
} from './types';

export const ticketsApi = {
  // Ticket Types
  list: async (params?: { include_archived?: boolean }): Promise<TicketType[]> => {
    const response = await apiClient.get<PaginatedResponse<TicketType>>('/v1/ticket-types/', {
      params,
    });
    return response.data.results;
  },

  get: async (id: number): Promise<TicketTypeDetail> => {
    const response = await apiClient.get<TicketTypeDetail>(`/v1/ticket-types/${id}/`);
    return response.data;
  },

  create: async (data: TicketTypeCreate): Promise<TicketType> => {
    const response = await apiClient.post<TicketType>('/v1/ticket-types/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TicketTypeCreate>): Promise<TicketType> => {
    const response = await apiClient.patch<TicketType>(`/v1/ticket-types/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/ticket-types/${id}/`);
  },

  archive: async (id: number): Promise<TicketType> => {
    const response = await apiClient.post<TicketType>(`/v1/ticket-types/${id}/archive/`);
    return response.data;
  },

  unarchive: async (id: number): Promise<TicketType> => {
    const response = await apiClient.post<TicketType>(`/v1/ticket-types/${id}/unarchive/`);
    return response.data;
  },

  // Ticket Type Rules
  listRules: async (ticketTypeId: number): Promise<TicketTypeRule[]> => {
    const response = await apiClient.get<TicketTypeRule[]>(
      `/v1/ticket-types/${ticketTypeId}/rules/`,
    );
    // Rules endpoint returns array directly (custom action, not paginated)
    return response.data;
  },

  createRule: async (ticketTypeId: number, data: TicketTypeRuleCreate): Promise<TicketTypeRule> => {
    const response = await apiClient.post<TicketTypeRule>(
      `/v1/ticket-types/${ticketTypeId}/rules/`,
      data,
    );
    return response.data;
  },

  getRule: async (ruleId: number): Promise<TicketTypeRule> => {
    const response = await apiClient.get<TicketTypeRule>(`/v1/ticket-type-rules/${ruleId}/`);
    return response.data;
  },

  updateRule: async (
    ruleId: number,
    data: Partial<TicketTypeRuleCreate>,
  ): Promise<TicketTypeRule> => {
    const response = await apiClient.patch<TicketTypeRule>(
      `/v1/ticket-type-rules/${ruleId}/`,
      data,
    );
    return response.data;
  },

  deleteRule: async (ruleId: number): Promise<void> => {
    await apiClient.delete(`/v1/ticket-type-rules/${ruleId}/`);
  },

  // Ticket printing
  markPrinted: async (ticketUuids: string[]): Promise<{ marked: number }> => {
    const response = await apiClient.post<{ marked: number }>('/v1/tickets/mark-printed/', {
      ticket_uuids: ticketUuids,
    });
    return response.data;
  },
};

export default ticketsApi;
