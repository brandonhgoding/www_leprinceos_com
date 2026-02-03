import { describe, it, expect, beforeEach, vi } from 'vitest';
import { concessionsApi } from './concessions';
import apiClient from './client';
import type {
  ConcessionCategory,
  ConcessionCategoryCreate,
  ConcessionCategoryDetail,
  ConcessionItem,
  ConcessionItemCreate,
  ConcessionItemDetail,
  ConcessionVariation,
  ConcessionVariationCreate,
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

describe('Concessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategory: ConcessionCategory = {
    id: 1,
    name: 'Beverages',
    description: 'All drink items',
    is_active: true,
    square_id: 'sq-cat-123',
    items_count: 5,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const mockItem: ConcessionItem = {
    id: 1,
    category: 1,
    category_name: 'Beverages',
    name: 'Soda',
    description: 'Fountain drink',
    image_url: 'https://example.com/soda.jpg',
    is_active: true,
    square_id: 'sq-item-456',
    variations_count: 3,
    price_range: { min: '4.00', max: '6.50' },
    modifier_groups: [],
    modifier_assignments: [],
    sales_taxes: [],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const mockVariation: ConcessionVariation = {
    id: 1,
    item: 1,
    name: 'Medium',
    sku: 'SODA-M',
    upc: '123456789',
    price: '5.00',
    cost: '0.75',
    is_active: true,
    square_id: 'sq-var-789',
    margin: 85.0,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  };

  const mockItemDetail: ConcessionItemDetail = {
    ...mockItem,
    variations: [mockVariation],
  };

  const mockCategoryDetail: ConcessionCategoryDetail = {
    ...mockCategory,
    items: [mockItemDetail],
  };

  describe('Categories - listCategories', () => {
    it('should fetch all categories', async () => {
      const paginatedResponse: PaginatedResponse<ConcessionCategory> = {
        count: 1,
        next: null,
        previous: null,
        results: [mockCategory],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await concessionsApi.listCategories();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/concession-categories/');
      expect(result).toEqual([mockCategory]);
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedResponse<ConcessionCategory> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

      const result = await concessionsApi.listCategories();

      expect(result).toEqual([]);
    });

    it('should handle pagination metadata', async () => {
      const paginatedResponse: PaginatedResponse<ConcessionCategory> = {
        count: 25,
        next: 'http://api.example.com/v1/concession-categories/?page=2',
        previous: null,
        results: [mockCategory],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await concessionsApi.listCategories();

      expect(result).toEqual([mockCategory]);
    });
  });

  describe('Categories - getCategory', () => {
    it('should fetch a single category with details', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockCategoryDetail });

      const result = await concessionsApi.getCategory(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/concession-categories/1/');
      expect(result).toEqual(mockCategoryDetail);
      expect(result.items).toHaveLength(1);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(concessionsApi.getCategory(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Categories - createCategory', () => {
    it('should create a category', async () => {
      const createData: ConcessionCategoryCreate = {
        name: 'Snacks',
        description: 'Popcorn, candy, etc.',
        is_active: true,
        square_id: 'sq-cat-new',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockCategory });

      const result = await concessionsApi.createCategory(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-categories/', createData);
      expect(result).toEqual(mockCategory);
    });

    it('should create category with minimal data', async () => {
      const minimalData: ConcessionCategoryCreate = {
        name: 'Food',
      };

      const minimalCategory = { ...mockCategory, description: '', square_id: '' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalCategory });

      const result = await concessionsApi.createCategory(minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-categories/', minimalData);
      expect(result).toEqual(minimalCategory);
    });

    it('should handle validation errors', async () => {
      const invalidData: ConcessionCategoryCreate = {
        name: '',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(concessionsApi.createCategory(invalidData)).rejects.toThrow(
        'Validation Error'
      );
    });
  });

  describe('Categories - updateCategory', () => {
    it('should update a category', async () => {
      const updateData: Partial<ConcessionCategoryCreate> = {
        description: 'Updated description',
        is_active: false,
      };

      const updatedCategory = { ...mockCategory, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedCategory });

      const result = await concessionsApi.updateCategory(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/concession-categories/1/', updateData);
      expect(result).toEqual(updatedCategory);
    });

    it('should update single field', async () => {
      const updateData = { is_active: false };
      const updatedCategory = { ...mockCategory, is_active: false };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedCategory });

      const result = await concessionsApi.updateCategory(1, updateData);

      expect(result.is_active).toBe(false);
    });

    it('should handle update of non-existent category', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(concessionsApi.updateCategory(999, { name: 'Test' })).rejects.toThrow(
        'Not Found'
      );
    });
  });

  describe('Categories - deleteCategory', () => {
    it('should delete a category', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await concessionsApi.deleteCategory(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/concession-categories/1/');
    });

    it('should handle deletion of non-existent category', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(concessionsApi.deleteCategory(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Items - listItems', () => {
    it('should fetch all items', async () => {
      const paginatedResponse: PaginatedResponse<ConcessionItem> = {
        count: 1,
        next: null,
        previous: null,
        results: [mockItem],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await concessionsApi.listItems();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/concession-items/');
      expect(result).toEqual([mockItem]);
    });

    it('should handle empty results', async () => {
      const emptyResponse: PaginatedResponse<ConcessionItem> = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

      const result = await concessionsApi.listItems();

      expect(result).toEqual([]);
    });

    it('should handle pagination', async () => {
      const paginatedResponse: PaginatedResponse<ConcessionItem> = {
        count: 100,
        next: 'http://api.example.com/v1/concession-items/?page=2',
        previous: null,
        results: [mockItem],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: paginatedResponse });

      const result = await concessionsApi.listItems();

      expect(result).toEqual([mockItem]);
    });
  });

  describe('Items - getItem', () => {
    it('should fetch a single item with details', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockItemDetail });

      const result = await concessionsApi.getItem(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/concession-items/1/');
      expect(result).toEqual(mockItemDetail);
      expect(result.variations).toHaveLength(1);
    });

    it('should handle not found error', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(concessionsApi.getItem(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Items - createItem', () => {
    it('should create an item', async () => {
      const createData: ConcessionItemCreate = {
        category: 1,
        name: 'Popcorn',
        description: 'Fresh popped corn',
        image_url: 'https://example.com/popcorn.jpg',
        is_active: true,
        square_id: 'sq-item-pop',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockItem });

      const result = await concessionsApi.createItem(createData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-items/', createData);
      expect(result).toEqual(mockItem);
    });

    it('should create item with minimal data', async () => {
      const minimalData: ConcessionItemCreate = {
        category: 1,
        name: 'Candy',
      };

      const minimalItem = { ...mockItem, description: '', image_url: '' };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalItem });

      const result = await concessionsApi.createItem(minimalData);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-items/', minimalData);
      expect(result).toEqual(minimalItem);
    });

    it('should create item with modifier groups', async () => {
      const dataWithModifiers: ConcessionItemCreate = {
        category: 1,
        name: 'Hot Dog',
        modifier_group_ids: [1, 2, 3],
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockItem });

      const result = await concessionsApi.createItem(dataWithModifiers);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-items/', dataWithModifiers);
      expect(result).toEqual(mockItem);
    });

    it('should create item with sales taxes', async () => {
      const dataWithTaxes: ConcessionItemCreate = {
        category: 1,
        name: 'Nachos',
        sales_tax_ids: [1, 2],
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockItem });

      const result = await concessionsApi.createItem(dataWithTaxes);

      expect(apiClient.post).toHaveBeenCalledWith('/v1/concession-items/', dataWithTaxes);
      expect(result).toEqual(mockItem);
    });

    it('should handle validation errors', async () => {
      const invalidData: ConcessionItemCreate = {
        category: 0,
        name: '',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(concessionsApi.createItem(invalidData)).rejects.toThrow('Validation Error');
    });
  });

  describe('Items - updateItem', () => {
    it('should update an item', async () => {
      const updateData: Partial<ConcessionItemCreate> = {
        description: 'Updated description',
        is_active: false,
      };

      const updatedItem = { ...mockItem, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedItem });

      const result = await concessionsApi.updateItem(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/concession-items/1/', updateData);
      expect(result).toEqual(updatedItem);
    });

    it('should update single field', async () => {
      const updateData = { is_active: false };
      const updatedItem = { ...mockItem, is_active: false };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedItem });

      const result = await concessionsApi.updateItem(1, updateData);

      expect(result.is_active).toBe(false);
    });

    it('should update image URL', async () => {
      const updateData = { image_url: 'https://example.com/new-image.jpg' };
      const updatedItem = { ...mockItem, image_url: 'https://example.com/new-image.jpg' };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedItem });

      const result = await concessionsApi.updateItem(1, updateData);

      expect(result.image_url).toBe('https://example.com/new-image.jpg');
    });

    it('should handle update of non-existent item', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(concessionsApi.updateItem(999, { name: 'Test' })).rejects.toThrow(
        'Not Found'
      );
    });
  });

  describe('Items - deleteItem', () => {
    it('should delete an item', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await concessionsApi.deleteItem(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/concession-items/1/');
    });

    it('should handle deletion of non-existent item', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(concessionsApi.deleteItem(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Variations - listVariations', () => {
    it('should fetch variations for an item', async () => {
      const variations = [mockVariation];
      vi.mocked(apiClient.get).mockResolvedValue({ data: variations });

      const result = await concessionsApi.listVariations(1);

      expect(apiClient.get).toHaveBeenCalledWith('/v1/concession-items/1/variations/');
      expect(result).toEqual(variations);
    });

    it('should handle empty variations list', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      const result = await concessionsApi.listVariations(1);

      expect(result).toEqual([]);
    });

    it('should handle multiple variations', async () => {
      const variations = [
        mockVariation,
        { ...mockVariation, id: 2, name: 'Large', price: '6.50' },
        { ...mockVariation, id: 3, name: 'Small', price: '4.00' },
      ];
      vi.mocked(apiClient.get).mockResolvedValue({ data: variations });

      const result = await concessionsApi.listVariations(1);

      expect(result).toHaveLength(3);
    });
  });

  describe('Variations - createVariation', () => {
    it('should create a variation', async () => {
      const createData: ConcessionVariationCreate = {
        name: 'Large',
        sku: 'SODA-L',
        upc: '987654321',
        price: '6.50',
        cost: '1.00',
        is_active: true,
        square_id: 'sq-var-large',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockVariation });

      const result = await concessionsApi.createVariation(1, createData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/concession-items/1/variations/',
        createData
      );
      expect(result).toEqual(mockVariation);
    });

    it('should create variation with minimal data', async () => {
      const minimalData: ConcessionVariationCreate = {
        name: 'Small',
        price: '4.00',
      };

      const minimalVariation = { ...mockVariation, sku: '', upc: '', cost: null };
      vi.mocked(apiClient.post).mockResolvedValue({ data: minimalVariation });

      const result = await concessionsApi.createVariation(1, minimalData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/concession-items/1/variations/',
        minimalData
      );
      expect(result).toEqual(minimalVariation);
    });

    it('should create variation without cost', async () => {
      const dataWithoutCost: ConcessionVariationCreate = {
        name: 'Medium',
        price: '5.00',
        cost: null,
      };

      const variationNoCost = { ...mockVariation, cost: null, margin: null };
      vi.mocked(apiClient.post).mockResolvedValue({ data: variationNoCost });

      const result = await concessionsApi.createVariation(1, dataWithoutCost);

      expect(result.cost).toBeNull();
      expect(result.margin).toBeNull();
    });

    it('should handle validation errors', async () => {
      const invalidData: ConcessionVariationCreate = {
        name: '',
        price: 'invalid',
      };

      const error = new Error('Validation Error');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(concessionsApi.createVariation(1, invalidData)).rejects.toThrow(
        'Validation Error'
      );
    });
  });

  describe('Variations - updateVariation', () => {
    it('should update a variation', async () => {
      const updateData: Partial<ConcessionVariationCreate> = {
        price: '5.50',
        cost: '0.80',
      };

      const updatedVariation = { ...mockVariation, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedVariation });

      const result = await concessionsApi.updateVariation(1, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/v1/concession-variations/1/', updateData);
      expect(result).toEqual(updatedVariation);
    });

    it('should update single field', async () => {
      const updateData = { is_active: false };
      const updatedVariation = { ...mockVariation, is_active: false };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedVariation });

      const result = await concessionsApi.updateVariation(1, updateData);

      expect(result.is_active).toBe(false);
    });

    it('should update price only', async () => {
      const updateData = { price: '7.00' };
      const updatedVariation = { ...mockVariation, price: '7.00' };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedVariation });

      const result = await concessionsApi.updateVariation(1, updateData);

      expect(result.price).toBe('7.00');
    });

    it('should update SKU and UPC', async () => {
      const updateData = {
        sku: 'SODA-M-V2',
        upc: '111222333',
      };
      const updatedVariation = { ...mockVariation, ...updateData };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedVariation });

      const result = await concessionsApi.updateVariation(1, updateData);

      expect(result.sku).toBe('SODA-M-V2');
      expect(result.upc).toBe('111222333');
    });

    it('should handle update of non-existent variation', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.patch).mockRejectedValue(error);

      await expect(concessionsApi.updateVariation(999, { price: '5.00' })).rejects.toThrow(
        'Not Found'
      );
    });
  });

  describe('Variations - deleteVariation', () => {
    it('should delete a variation', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

      await concessionsApi.deleteVariation(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/v1/concession-variations/1/');
    });

    it('should handle deletion of non-existent variation', async () => {
      const error = new Error('Not Found');
      vi.mocked(apiClient.delete).mockRejectedValue(error);

      await expect(concessionsApi.deleteVariation(999)).rejects.toThrow('Not Found');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(concessionsApi.listCategories()).rejects.toThrow('Network Error');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Internal Server Error');
      vi.mocked(apiClient.post).mockRejectedValue(serverError);

      const createData: ConcessionCategoryCreate = {
        name: 'Test',
      };

      await expect(concessionsApi.createCategory(createData)).rejects.toThrow(
        'Internal Server Error'
      );
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Forbidden');
      vi.mocked(apiClient.delete).mockRejectedValue(permissionError);

      await expect(concessionsApi.deleteCategory(1)).rejects.toThrow('Forbidden');
    });
  });
});
