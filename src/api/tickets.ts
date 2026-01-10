// src/api/tickets.ts
import apiClient from './client';
import type {
  TicketType,
  TicketTypeDetail,
  TicketTypeCreate,
  TicketTypeRule,
  TicketTypeRuleCreate,
} from './types';

export const ticketsApi = {
  // Ticket Types
  list: async (): Promise<TicketType[]> => {
    const response = await apiClient.get<TicketType[]>('/v1/ticket-types/');
    return response.data;
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

  // Ticket Type Rules
  listRules: async (ticketTypeId: number): Promise<TicketTypeRule[]> => {
    const response = await apiClient.get<TicketTypeRule[]>(
      `/v1/ticket-types/${ticketTypeId}/rules/`
    );
    return response.data;
  },

  createRule: async (ticketTypeId: number, data: TicketTypeRuleCreate): Promise<TicketTypeRule> => {
    const response = await apiClient.post<TicketTypeRule>(
      `/v1/ticket-types/${ticketTypeId}/rules/`,
      data
    );
    return response.data;
  },

  getRule: async (ruleId: number): Promise<TicketTypeRule> => {
    const response = await apiClient.get<TicketTypeRule>(`/v1/ticket-type-rules/${ruleId}/`);
    return response.data;
  },

  updateRule: async (ruleId: number, data: Partial<TicketTypeRuleCreate>): Promise<TicketTypeRule> => {
    const response = await apiClient.patch<TicketTypeRule>(
      `/v1/ticket-type-rules/${ruleId}/`,
      data
    );
    return response.data;
  },

  deleteRule: async (ruleId: number): Promise<void> => {
    await apiClient.delete(`/v1/ticket-type-rules/${ruleId}/`);
  },
};

export default ticketsApi;
