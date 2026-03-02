import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ticketsApi } from './tickets';
import apiClient from './client';
import type {
  TicketType,
  TicketTypeDetail,
  TicketTypeCreate,
  TicketTypeRule,
  TicketTypeRuleCreate,
  PaginatedResponse,
} from './types';

// Mock the apiClient
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Tickets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTicketType: TicketType = {
    id: 1,
    name: 'Adult',
    price: '12.50',
    is_active: true,
    is_archived: false,
    description: 'Standard adult admission',
    rules_count: 2,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const mockTicketTypeRule: TicketTypeRule = {
    id: 1,
    ticket_type: 1,
    name: 'Weekday Matinee',
    is_active: true,
    priority: 1,
    matinee_cutoff_time: '17:00:00',
    days_of_week: '1,2,3,4,5',
    days_of_week_list: [1, 2, 3, 4, 5],
    presentation_format: '2d',
    requires_3d_screen: false,
    screen_type: 'standard',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const mockTicketTypeDetail: TicketTypeDetail = {
    ...mockTicketType,
    rules: [mockTicketTypeRule],
  };

  const mockPaginatedResponse: PaginatedResponse<TicketType> = {
    count: 1,
    next: null,
    previous: null,
    results: [mockTicketType],
  };

  describe('Ticket Types - list', () => {
    it('should fetch all ticket types', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const result = await ticketsApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/ticket-types/');
      expect(result).toEqual([mockTicketType]);
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedResponse<TicketType> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

      const result = await ticketsApi.list();

      expect(result).toEqual([]);
    });

    it('should handle pagination metadata', async () => {
      const paginatedResponse: PaginatedResponse<TicketType> = {
        count: 50,
        next: 'http://api.example.com/v1/ticket-types/?page=2',
        previous: null,
        results: [mockTicketType],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await ticketsApi.list();

      // Should only return results array
      expect(result).toEqual([mockTicketType]);
    });
  });

  describe('Ticket Types - get', () => {
    it('should fetch a single ticket type with details', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTicketTypeDetail });

      const result = await ticketsApi.get(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/ticket-types/1/');
      expect(result).toEqual(mockTicketTypeDetail);
      expect(result.rules).toHaveLength(1);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(ticketsApi.get(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Ticket Types - create', () => {
    it('should create a ticket type', async () => {
      const createData: TicketTypeCreate = {
        name: 'Senior',
        price: '9.00',
        is_active: true,
        description: 'Senior citizen discount',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTicketType });

      const result = await ticketsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/ticket-types/', createData);
      expect(result).toEqual(mockTicketType);
    });

    it('should create ticket type with minimal data', async () => {
      const minimalData: TicketTypeCreate = {
        name: 'Child',
        price: '8.00',
      };

      const minimalTicketType = { ...mockTicketType, description: '' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalTicketType });

      const result = await ticketsApi.create(minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/ticket-types/', minimalData);
      expect(result).toEqual(minimalTicketType);
    });

    it('should handle validation errors', async () => {
      const invalidData: TicketTypeCreate = {
        name: '',
        price: 'invalid',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(ticketsApi.create(invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('Ticket Types - update', () => {
    it('should update a ticket type', async () => {
      const updateData: Partial<TicketTypeCreate> = {
        price: '13.00',
        description: 'Updated description',
      };

      const updatedTicketType = { ...mockTicketType, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedTicketType });

      const result = await ticketsApi.update(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/ticket-types/1/', updateData);
      expect(result).toEqual(updatedTicketType);
    });

    it('should update single field', async () => {
      const updateData = { is_active: false };
      const updatedTicketType = { ...mockTicketType, is_active: false };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedTicketType });

      const result = await ticketsApi.update(1, updateData);

      expect(result.is_active).toBe(false);
    });

    it('should handle update of non-existent ticket type', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(ticketsApi.update(999, { price: '10.00' })).rejects.toThrow('Not Found');
    });
  });

  describe('Ticket Types - delete', () => {
    it('should delete a ticket type', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await ticketsApi.delete(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/ticket-types/1/');
    });

    it('should handle deletion of non-existent ticket type', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(ticketsApi.delete(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Ticket Type Rules - listRules', () => {
    it('should fetch rules for a ticket type', async () => {
      const rules = [mockTicketTypeRule];
      vi.mocked(apiClient.get).mockResolvedValue({ data: rules });

      const result = await ticketsApi.listRules(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/ticket-types/1/rules/');
      expect(result).toEqual(rules);
    });

    it('should handle empty rules list', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const result = await ticketsApi.listRules(1);

      expect(result).toEqual([]);
    });

    it('should handle multiple rules', async () => {
      const rules = [mockTicketTypeRule, { ...mockTicketTypeRule, id: 2, name: 'Weekend Evening' }];
      vi.mocked(apiClient.get).mockResolvedValue({ data: rules });

      const result = await ticketsApi.listRules(1);

      expect(result).toHaveLength(2);
    });
  });

  describe('Ticket Type Rules - createRule', () => {
    it('should create a ticket type rule', async () => {
      const createData: TicketTypeRuleCreate = {
        name: 'Weekend Premium',
        is_active: true,
        priority: 2,
        days_of_week_list: [6, 7],
        presentation_format: '3d',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTicketTypeRule });

      const result = await ticketsApi.createRule(1, createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/ticket-types/1/rules/', createData);
      expect(result).toEqual(mockTicketTypeRule);
    });

    it('should create rule with minimal data', async () => {
      const minimalData: TicketTypeRuleCreate = {
        name: 'Simple Rule',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockTicketTypeRule });

      const result = await ticketsApi.createRule(1, minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/ticket-types/1/rules/', minimalData);
      expect(result).toEqual(mockTicketTypeRule);
    });

    it('should create rule with matinee cutoff', async () => {
      const dataWithCutoff: TicketTypeRuleCreate = {
        name: 'Matinee',
        matinee_cutoff_time: '16:00:00',
        days_of_week_list: [1, 2, 3, 4, 5],
      };

      const ruleWithCutoff = { ...mockTicketTypeRule, matinee_cutoff_time: '16:00:00' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: ruleWithCutoff });

      const result = await ticketsApi.createRule(1, dataWithCutoff);

      expect(result.matinee_cutoff_time).toBe('16:00:00');
    });

    it('should create rule with screen type', async () => {
      const dataWithScreenType: TicketTypeRuleCreate = {
        name: 'IMAX Premium',
        screen_type: 'imax',
        presentation_format: '2d',
      };

      const ruleWithScreenType = { ...mockTicketTypeRule, screen_type: 'imax' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: ruleWithScreenType });

      const result = await ticketsApi.createRule(1, dataWithScreenType);

      expect(result.screen_type).toBe('imax');
    });

    it('should handle validation errors', async () => {
      const invalidData: TicketTypeRuleCreate = {
        name: '',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(ticketsApi.createRule(1, invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('Ticket Type Rules - getRule', () => {
    it('should fetch a single rule', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTicketTypeRule });

      const result = await ticketsApi.getRule(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/ticket-type-rules/1/');
      expect(result).toEqual(mockTicketTypeRule);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(ticketsApi.getRule(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Ticket Type Rules - updateRule', () => {
    it('should update a ticket type rule', async () => {
      const updateData: Partial<TicketTypeRuleCreate> = {
        is_active: false,
        priority: 5,
      };

      const updatedRule = { ...mockTicketTypeRule, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedRule });

      const result = await ticketsApi.updateRule(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/ticket-type-rules/1/', updateData);
      expect(result).toEqual(updatedRule);
    });

    it('should update single field', async () => {
      const updateData = { is_active: false };
      const updatedRule = { ...mockTicketTypeRule, is_active: false };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedRule });

      const result = await ticketsApi.updateRule(1, updateData);

      expect(result.is_active).toBe(false);
    });

    it('should update days of week', async () => {
      const updateData = { days_of_week_list: [6, 7] };
      const updatedRule = {
        ...mockTicketTypeRule,
        days_of_week_list: [6, 7],
        days_of_week: '6,7',
      };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedRule });

      const result = await ticketsApi.updateRule(1, updateData);

      expect(result.days_of_week_list).toEqual([6, 7]);
    });

    it('should update presentation format', async () => {
      const updateData = { presentation_format: '3d' as const };
      const updatedRule = { ...mockTicketTypeRule, presentation_format: '3d' as const };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedRule });

      const result = await ticketsApi.updateRule(1, updateData);

      expect(result.presentation_format).toBe('3d');
    });

    it('should handle update of non-existent rule', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(ticketsApi.updateRule(999, { priority: 1 })).rejects.toThrow('Not Found');
    });
  });

  describe('Ticket Type Rules - deleteRule', () => {
    it('should delete a ticket type rule', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await ticketsApi.deleteRule(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/ticket-type-rules/1/');
    });

    it('should handle deletion of non-existent rule', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(ticketsApi.deleteRule(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(ticketsApi.list()).rejects.toThrow('Network Error');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal Server Error');
      vi.mocked(apiClient.post).mockRejectedValue(serverError);

      const createData: TicketTypeCreate = {
        name: 'Test',
        price: '10.00',
      };

      await expect(ticketsApi.create(createData)).rejects.toThrow('Internal Server Error');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Forbidden');
      vi.mocked(apiClient.delete).mockRejectedValue(permissionError);

      await expect(ticketsApi.delete(1)).rejects.toThrow('Forbidden');
    });
  });
});
