import { describe, it, expect, beforeEach, vi } from 'vitest';
import { engagementsApi } from './engagements';
import apiClient from './client';
import type { Engagement, EngagementCreate, PaginatedResponse } from './types';

// Mock the apiClient
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Engagements API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEngagement: Engagement = {
    id: 1,
    film: 101,
    film_title: 'Test Movie',
    film_poster_url: 'https://example.com/poster.jpg',
    screen: 1,
    screen_name: 'Screen 1',
    start_date: '2026-02-01',
    end_date: '2026-02-07',
    presentation_format: '2d',
    status: 'CONFIRMED',
    notes: 'Test notes',
    is_active: true,
    created_at: '2026-01-20T10:00:00Z',
  };

  const mockPaginatedResponse: PaginatedResponse<Engagement> = {
    count: 1,
    next: null,
    previous: null,
    results: [mockEngagement],
  };

  describe('list', () => {
    it('should fetch engagements without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const result = await engagementsApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/engagements/');
      expect(result).toEqual([mockEngagement]);
    });

    it('should fetch engagements with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        status: 'CONFIRMED',
        film: 101,
        screen: 1,
      };

      const result = await engagementsApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/v1/engagements/?status=CONFIRMED&film=101&screen=1'
      );
      expect(result).toEqual([mockEngagement]);
    });

    it('should filter out undefined and null values from query string', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        status: 'CONFIRMED',
        film: undefined,
        screen: undefined,
      };

      await engagementsApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/engagements/?status=CONFIRMED');
    });

    it('should filter out empty strings from query string', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        status: '',
        film: 101,
      };

      await engagementsApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/engagements/?film=101');
    });

    it('should handle date filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        start_date_after: '2026-02-01',
        end_date_before: '2026-02-28',
      };

      const result = await engagementsApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/v1/engagements/?start_date_after=2026-02-01&end_date_before=2026-02-28'
      );
      expect(result).toEqual([mockEngagement]);
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedResponse<Engagement> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

      const result = await engagementsApi.list();

      expect(result).toEqual([]);
    });

    it('should handle pagination metadata', async () => {
      const paginatedResponse: PaginatedResponse<Engagement> = {
        count: 100,
        next: 'http://api.example.com/v1/engagements/?page=2',
        previous: null,
        results: [mockEngagement],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await engagementsApi.list();

      // Should only return results array
      expect(result).toEqual([mockEngagement]);
    });
  });

  describe('get', () => {
    it('should fetch a single engagement', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockEngagement });

      const result = await engagementsApi.get(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/engagements/1/');
      expect(result).toEqual(mockEngagement);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(engagementsApi.get(999)).rejects.toThrow('Not Found');
    });
  });

  describe('create', () => {
    it('should create an engagement', async () => {
      const createData: EngagementCreate = {
        film: 101,
        screen: 1,
        start_date: '2026-02-01',
        end_date: '2026-02-07',
        presentation_format: '2d',
        status: 'CONFIRMED',
        notes: 'Test notes',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockEngagement });

      const result = await engagementsApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/engagements/', createData);
      expect(result).toEqual(mockEngagement);
    });

    it('should create engagement with minimal data', async () => {
      const minimalData: EngagementCreate = {
        film: 101,
        screen: 1,
        start_date: '2026-02-01',
        end_date: '2026-02-07',
      };

      const minimalEngagement = { ...mockEngagement, notes: '', status: 'DRAFT' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalEngagement });

      const result = await engagementsApi.create(minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/engagements/', minimalData);
      expect(result).toEqual(minimalEngagement);
    });

    it('should handle validation errors', async () => {
      const invalidData: EngagementCreate = {
        film: 101,
        screen: 1,
        start_date: '2026-02-07',
        end_date: '2026-02-01', // End before start
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(engagementsApi.create(invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('update', () => {
    it('should update an engagement', async () => {
      const updateData: Partial<EngagementCreate> = {
        notes: 'Updated notes',
        status: 'CANCELLED',
      };

      const updatedEngagement = { ...mockEngagement, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedEngagement });

      const result = await engagementsApi.update(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/engagements/1/', updateData);
      expect(result).toEqual(updatedEngagement);
    });

    it('should update single field', async () => {
      const updateData = { status: 'ENDED' as const };
      const updatedEngagement = { ...mockEngagement, status: 'ENDED' as const };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedEngagement });

      const result = await engagementsApi.update(1, updateData);

      expect(result.status).toBe('ENDED');
    });

    it('should handle update of non-existent engagement', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(engagementsApi.update(999, { notes: 'test' })).rejects.toThrow(
        'Not Found'
      );
    });
  });

  describe('delete', () => {
    it('should delete an engagement', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await engagementsApi.delete(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/engagements/1/');
    });

    it('should handle deletion of non-existent engagement', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(engagementsApi.delete(999)).rejects.toThrow('Not Found');
    });
  });

  describe('query string building', () => {
    it('should handle special characters in filter values', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        status: 'CONFIRMED',
      };

      await engagementsApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toBe('/v1/engagements/?status=CONFIRMED');
    });

    it('should handle multiple filters of same type', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        start_date_after: '2026-02-01',
        start_date_before: '2026-02-28',
      };

      await engagementsApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('start_date_after=2026-02-01');
      expect(calledUrl).toContain('start_date_before=2026-02-28');
    });

    it('should handle numeric zero as valid filter value', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        screen: 0, // Valid ID
      };

      await engagementsApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toBe('/v1/engagements/?screen=0');
    });
  });
});
