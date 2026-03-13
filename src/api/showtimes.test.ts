import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showtimesApi } from './showtimes';
import apiClient from './client';
import type { Showtime, ShowtimeCreate, BulkShowtimeCreate, PaginatedResponse } from './types';

// Mock the apiClient
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Showtimes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockShowtime: Showtime = {
    id: 1,
    engagement: 100,
    screen: 1,
    screen_name: 'Screen 1',
    starts_at: '2026-02-05T19:30:00Z',
    is_cancelled: false,
    captions: 'CC',
    film_title: 'Test Movie',
    film_poster_url: 'https://example.com/poster.jpg',
    is_outside_engagement_range: false,
    presentation_format: '2d',
    presentation_format_display: '2D',
    film_runtime_minutes: 120,
  };

  const mockPaginatedResponse: PaginatedResponse<Showtime> = {
    count: 1,
    next: null,
    previous: null,
    results: [mockShowtime],
  };

  describe('list', () => {
    it('should fetch showtimes without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const result = await showtimesApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/showtimes/');
      expect(result).toEqual([mockShowtime]);
    });

    it('should fetch showtimes with filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        engagement: 100,
        screen: 1,
        is_cancelled: false,
      };

      const result = await showtimesApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/v1/showtimes/?engagement=100&screen=1&is_cancelled=false',
      );
      expect(result).toEqual([mockShowtime]);
    });

    it('should filter out undefined and null values from query string', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        engagement: 100,
        screen: undefined,
        is_cancelled: undefined,
      };

      await showtimesApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/showtimes/?engagement=100');
    });

    it('should filter out empty strings from query string', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        date: '',
        engagement: 100,
      };

      await showtimesApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/showtimes/?engagement=100');
    });

    it('should handle date filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        date: '2026-02-05',
        starts_at_after: '2026-02-05T18:00:00Z',
        starts_at_before: '2026-02-05T23:59:59Z',
      };

      const result = await showtimesApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('date=2026-02-05');
      expect(calledUrl).toContain('starts_at_after=');
      expect(calledUrl).toContain('starts_at_before=');
      expect(result).toEqual([mockShowtime]);
    });

    it('should handle boolean filters correctly', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        is_cancelled: true,
      };

      await showtimesApi.list(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/showtimes/?is_cancelled=true');
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedResponse<Showtime> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

      const result = await showtimesApi.list();

      expect(result).toEqual([]);
    });

    it('should handle pagination metadata', async () => {
      const paginatedResponse: PaginatedResponse<Showtime> = {
        count: 100,
        next: 'http://api.example.com/v1/showtimes/?page=2',
        previous: null,
        results: [mockShowtime],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await showtimesApi.list();

      // Should only return results array
      expect(result).toEqual([mockShowtime]);
    });
  });

  describe('get', () => {
    it('should fetch a single showtime', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockShowtime });

      const result = await showtimesApi.get(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/showtimes/1/');
      expect(result).toEqual(mockShowtime);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(showtimesApi.get(999)).rejects.toThrow('Not Found');
    });
  });

  describe('create', () => {
    it('should create a showtime', async () => {
      const createData: ShowtimeCreate = {
        engagement: 100,
        screen: 1,
        starts_at: '2026-02-05T19:30:00Z',
        is_cancelled: false,
        captions: 'CC',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockShowtime });

      const result = await showtimesApi.create(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/showtimes/', createData);
      expect(result).toEqual(mockShowtime);
    });

    it('should create showtime with minimal data', async () => {
      const minimalData: ShowtimeCreate = {
        engagement: 100,
        starts_at: '2026-02-05T19:30:00Z',
      };

      const minimalShowtime = { ...mockShowtime, screen: 1, is_cancelled: false, captions: null };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalShowtime });

      const result = await showtimesApi.create(minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/showtimes/', minimalData);
      expect(result).toEqual(minimalShowtime);
    });

    it('should create showtime with captions', async () => {
      const dataWithCaptions: ShowtimeCreate = {
        engagement: 100,
        starts_at: '2026-02-05T19:30:00Z',
        captions: 'OC',
      };

      const showtimeWithCaptions = { ...mockShowtime, captions: 'OC' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: showtimeWithCaptions });

      const result = await showtimesApi.create(dataWithCaptions);

      expect(result.captions).toBe('OC');
    });

    it('should handle validation errors', async () => {
      const invalidData: ShowtimeCreate = {
        engagement: 100,
        starts_at: 'invalid-date',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(showtimesApi.create(invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('update', () => {
    it('should update a showtime', async () => {
      const updateData: Partial<ShowtimeCreate> = {
        is_cancelled: true,
        captions: 'OC',
      };

      const updatedShowtime = { ...mockShowtime, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedShowtime });

      const result = await showtimesApi.update(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/showtimes/1/', updateData);
      expect(result).toEqual(updatedShowtime);
    });

    it('should update single field', async () => {
      const updateData = { is_cancelled: true };
      const updatedShowtime = { ...mockShowtime, is_cancelled: true };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedShowtime });

      const result = await showtimesApi.update(1, updateData);

      expect(result.is_cancelled).toBe(true);
    });

    it('should update starts_at time', async () => {
      const updateData = { starts_at: '2026-02-05T21:00:00Z' };
      const updatedShowtime = { ...mockShowtime, starts_at: '2026-02-05T21:00:00Z' };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedShowtime });

      const result = await showtimesApi.update(1, updateData);

      expect(result.starts_at).toBe('2026-02-05T21:00:00Z');
    });

    it('should handle update of non-existent showtime', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(showtimesApi.update(999, { is_cancelled: true })).rejects.toThrow('Not Found');
    });
  });

  describe('delete', () => {
    it('should delete a showtime', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await showtimesApi.delete(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/showtimes/1/');
    });

    it('should handle deletion of non-existent showtime', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(showtimesApi.delete(999)).rejects.toThrow('Not Found');
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple showtimes', async () => {
      const bulkData: BulkShowtimeCreate = {
        engagement: 100,
        screen: 1,
        start_date: '2026-02-05',
        end_date: '2026-02-07',
        times: ['19:30', '21:00'],
        captions: 'CC',
      };

      const mockShowtime2 = { ...mockShowtime, id: 2, starts_at: '2026-02-05T21:00:00Z' };
      const bulkResponse = [mockShowtime, mockShowtime2];

      vi.mocked(apiClient.post).mockResolvedValue({ data: bulkResponse });

      const result = await showtimesApi.bulkCreate(bulkData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/showtimes/bulk-create/', bulkData);
      expect(result).toEqual(bulkResponse);
      expect(result).toHaveLength(2);
    });

    it('should create bulk showtimes without screen', async () => {
      const bulkData: BulkShowtimeCreate = {
        engagement: 100,
        start_date: '2026-02-05',
        end_date: '2026-02-05',
        times: ['19:30'],
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: [mockShowtime] });

      const result = await showtimesApi.bulkCreate(bulkData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/showtimes/bulk-create/', bulkData);
      expect(result).toHaveLength(1);
    });

    it('should create bulk showtimes for multiple days', async () => {
      const bulkData: BulkShowtimeCreate = {
        engagement: 100,
        screen: 1,
        start_date: '2026-02-05',
        end_date: '2026-02-09',
        times: ['19:30', '21:00'],
      };

      const mockShowtimes = Array.from({ length: 10 }, (_, i) => ({
        ...mockShowtime,
        id: i + 1,
      }));

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockShowtimes });

      const result = await showtimesApi.bulkCreate(bulkData);

      expect(result).toHaveLength(10);
    });

    it('should handle bulk creation validation errors', async () => {
      const invalidData: BulkShowtimeCreate = {
        engagement: 100,
        start_date: '2026-02-09',
        end_date: '2026-02-05', // End before start
        times: ['19:30'],
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(showtimesApi.bulkCreate(invalidData)).rejects.toThrow('Validation Error');
    });

    it('should handle empty times array', async () => {
      const dataWithNoTimes: BulkShowtimeCreate = {
        engagement: 100,
        start_date: '2026-02-05',
        end_date: '2026-02-05',
        times: [],
      };

      const error = new Error('Times array cannot be empty');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(showtimesApi.bulkCreate(dataWithNoTimes)).rejects.toThrow(
        'Times array cannot be empty',
      );
    });
  });

  describe('query string building', () => {
    it('should handle numeric zero as valid filter value', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        screen: 0,
      };

      await showtimesApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toBe('/v1/showtimes/?screen=0');
    });

    it('should handle multiple filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        engagement: 100,
        screen: 1,
        date: '2026-02-05',
        is_cancelled: false,
      };

      await showtimesApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('engagement=100');
      expect(calledUrl).toContain('screen=1');
      expect(calledUrl).toContain('date=2026-02-05');
      expect(calledUrl).toContain('is_cancelled=false');
    });

    it('should handle datetime filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });

      const filters = {
        starts_at_after: '2026-02-05T18:00:00Z',
        starts_at_before: '2026-02-05T23:59:59Z',
      };

      await showtimesApi.list(filters);

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0];
      expect(calledUrl).toContain('starts_at_after=');
      expect(calledUrl).toContain('starts_at_before=');
      expect(calledUrl).toContain('2026-02-05');
    });
  });
});
