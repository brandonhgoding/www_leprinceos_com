// src/pages/Concessions.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concessionsApi, modifiersApi, salesTaxesApi } from '../api';
import type {
  ConcessionCategory,
  ConcessionCategoryCreate,
  ConcessionCategoryDetail,
  ConcessionItemCreate,
  ConcessionItemDetail,
  ConcessionVariation,
  ConcessionVariationCreate,
} from '../api/types';
import Drawer from '../components/Drawer';
import styles from './Concessions.module.css';

type ModalType = 'category' | 'item' | 'variation';
type ModalMode = 'closed' | 'create' | 'edit';

interface CategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

interface ItemFormData {
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  modifier_group_ids: number[];
  sales_tax_ids: number[];
}

interface VariationFormData {
  name: string;
  sku: string;
  upc: string;
  price: string;
  cost: string;
  is_active: boolean;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  description: '',
  is_active: true,
};

const initialItemForm: ItemFormData = {
  name: '',
  description: '',
  image_url: '',
  is_active: true,
  modifier_group_ids: [],
  sales_tax_ids: [],
};

const initialVariationForm: VariationFormData = {
  name: '',
  sku: '',
  upc: '',
  price: '',
  cost: '',
  is_active: true,
};

export default function Concessions() {
  const queryClient = useQueryClient();

  // UI State
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Modal state
  const [modalType, setModalType] = useState<ModalType>('category');
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedCategory, setSelectedCategory] = useState<ConcessionCategoryDetail | null>(null);
  const [selectedItem, setSelectedItem] = useState<ConcessionItemDetail | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ConcessionVariation | null>(null);

  // Form data
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [itemForm, setItemForm] = useState<ItemFormData>(initialItemForm);
  const [variationForm, setVariationForm] = useState<VariationFormData>(initialVariationForm);

  // Context for creating items/variations
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(null);
  const [targetItemId, setTargetItemId] = useState<number | null>(null);

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['concession-categories'],
    queryFn: () => concessionsApi.listCategories(),
  });

  const { data: modifierGroups = [] } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => modifiersApi.listGroups(),
  });

  const { data: salesTaxes = [] } = useQuery({
    queryKey: ['sales-taxes'],
    queryFn: () => salesTaxesApi.list(),
  });

  // Fetch category details for expanded categories
  const categoryQueries = useQuery({
    queryKey: ['concession-categories-detail', Array.from(expandedCategories)],
    queryFn: async () => {
      const details = await Promise.all(
        Array.from(expandedCategories).map((id) => concessionsApi.getCategory(id))
      );
      return details.reduce(
        (acc, cat) => {
          acc[cat.id] = cat;
          return acc;
        },
        {} as Record<number, ConcessionCategoryDetail>
      );
    },
    enabled: expandedCategories.size > 0,
  });

  const categoryDetails = categoryQueries.data || {};

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: ConcessionCategoryCreate) => concessionsApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      closeModal();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConcessionCategoryCreate> }) =>
      concessionsApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      closeModal();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: ConcessionItemCreate) => concessionsApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
      closeModal();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConcessionItemCreate> }) =>
      concessionsApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
      closeModal();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
    },
  });

  const createVariationMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: ConcessionVariationCreate }) =>
      concessionsApi.createVariation(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
      closeModal();
    },
  });

  const updateVariationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConcessionVariationCreate> }) =>
      concessionsApi.updateVariation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
      closeModal();
    },
  });

  const deleteVariationMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteVariation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories-detail'] });
    },
  });

  // Handlers
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleItem = (itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedCategory(null);
    setSelectedItem(null);
    setSelectedVariation(null);
    setTargetCategoryId(null);
    setTargetItemId(null);
    setCategoryForm(initialCategoryForm);
    setItemForm(initialItemForm);
    setVariationForm(initialVariationForm);
  };

  // Category modal handlers
  const openCreateCategoryModal = () => {
    setCategoryForm(initialCategoryForm);
    setModalType('category');
    setModalMode('create');
  };

  const openEditCategoryModal = (category: ConcessionCategoryDetail | ConcessionCategory) => {
    setCategoryForm({
      name: category.name,
      description: category.description,
      is_active: category.is_active,
    });
    setSelectedCategory(category as ConcessionCategoryDetail);
    setModalType('category');
    setModalMode('edit');
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    const data: ConcessionCategoryCreate = {
      name: categoryForm.name,
      description: categoryForm.description,
      is_active: categoryForm.is_active,
    };

    if (modalMode === 'create') {
      createCategoryMutation.mutate(data);
    } else if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
    }
  };

  const handleDeleteCategory = (category: ConcessionCategory) => {
    if (window.confirm(`Delete category "${category.name}"? This will also delete all items and variations.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  // Item modal handlers
  const openCreateItemModal = (categoryId: number) => {
    setItemForm(initialItemForm);
    setTargetCategoryId(categoryId);
    setModalType('item');
    setModalMode('create');
  };

  const openEditItemModal = (item: ConcessionItemDetail) => {
    setItemForm({
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      is_active: item.is_active,
      modifier_group_ids: item.modifier_groups?.map((g) => g.id) || [],
      sales_tax_ids: item.sales_taxes?.map((t) => t.id) || [],
    });
    setSelectedItem(item);
    setModalType('item');
    setModalMode('edit');
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name) return;

    if (modalMode === 'create' && targetCategoryId) {
      const data: ConcessionItemCreate = {
        category: targetCategoryId,
        name: itemForm.name,
        description: itemForm.description,
        image_url: itemForm.image_url || undefined,
        is_active: itemForm.is_active,
        modifier_group_ids: itemForm.modifier_group_ids,
        sales_tax_ids: itemForm.sales_tax_ids,
      };
      createItemMutation.mutate(data);
    } else if (selectedItem) {
      updateItemMutation.mutate({
        id: selectedItem.id,
        data: {
          name: itemForm.name,
          description: itemForm.description,
          image_url: itemForm.image_url || undefined,
          is_active: itemForm.is_active,
          modifier_group_ids: itemForm.modifier_group_ids,
          sales_tax_ids: itemForm.sales_tax_ids,
        },
      });
    }
  };

  const handleDeleteItem = (item: ConcessionItemDetail) => {
    if (window.confirm(`Delete "${item.name}"? This will also delete all variations.`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  // Variation modal handlers
  const openCreateVariationModal = (itemId: number) => {
    setVariationForm(initialVariationForm);
    setTargetItemId(itemId);
    setModalType('variation');
    setModalMode('create');
  };

  const openEditVariationModal = (variation: ConcessionVariation) => {
    setVariationForm({
      name: variation.name,
      sku: variation.sku,
      upc: variation.upc,
      price: variation.price,
      cost: variation.cost || '',
      is_active: variation.is_active,
    });
    setSelectedVariation(variation);
    setModalType('variation');
    setModalMode('edit');
  };

  const handleVariationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variationForm.name || !variationForm.price) return;

    // Validate UPC format if provided
    if (variationForm.upc && !/^\d{12,14}$/.test(variationForm.upc)) {
      alert('UPC must be 12-14 digits if provided');
      return;
    }

    const data: ConcessionVariationCreate = {
      name: variationForm.name,
      sku: variationForm.sku || undefined,
      upc: variationForm.upc || undefined,
      price: variationForm.price,
      cost: variationForm.cost || undefined,
      is_active: variationForm.is_active,
    };

    if (modalMode === 'create' && targetItemId) {
      createVariationMutation.mutate({ itemId: targetItemId, data });
    } else if (selectedVariation) {
      updateVariationMutation.mutate({ id: selectedVariation.id, data });
    }
  };

  const handleDeleteVariation = (variation: ConcessionVariation) => {
    if (window.confirm(`Delete variation "${variation.name}"?`)) {
      deleteVariationMutation.mutate(variation.id);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  const formatPriceRange = (range: { min: string; max: string } | null) => {
    if (!range) return 'No prices';
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    if (min === max) return formatPrice(range.min);
    return `${formatPrice(range.min)} - ${formatPrice(range.max)}`;
  };

  const isPending =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    createVariationMutation.isPending ||
    updateVariationMutation.isPending;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Concessions Catalog</h1>
          <p className={styles.subtitle}>Manage your concession categories, items, and pricing.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateCategoryModal}>
          + New Category
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading catalog...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🍿
          </div>
          <h3 className="empty-state-title">No Concession Categories</h3>
          <p className="empty-state-description">
            Build your concession catalog by creating categories like Snacks, Beverages, or Combos.
            Each category can contain multiple items with variations and pricing.
          </p>
          <button className="btn btn-primary" onClick={openCreateCategoryModal}>
            Create First Category
          </button>
        </div>
      ) : (
        <div className={styles.catalog}>
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const detail = categoryDetails[category.id];

            return (
              <div key={category.id} className={styles.categoryCard}>
                <div className={styles.categoryHeader} onClick={() => toggleCategory(category.id)}>
                  <div className={styles.categoryInfo}>
                    <svg
                      className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className={styles.categoryName}>{category.name}</span>
                    <span
                      className={`${styles.statusBadge} ${category.is_active ? styles.statusActive : styles.statusInactive}`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.categoryMeta}>
                    <span className={styles.itemsCount}>
                      {category.items_count} {category.items_count === 1 ? 'item' : 'items'}
                    </span>
                    <div className={styles.categoryActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditCategoryModal(category)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDeleteCategory(category)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    {detail ? (
                      <>
                        <div className={styles.itemsList}>
                          {detail.items.map((item) => {
                            const isItemExpanded = expandedItems.has(item.id);

                            return (
                              <div key={item.id}>
                                <div
                                  className={styles.itemRow}
                                  onClick={() => toggleItem(item.id)}
                                >
                                  <div className={styles.itemInfo}>
                                    <svg
                                      className={`${styles.expandIcon} ${isItemExpanded ? styles.expandIconOpen : ''}`}
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span className={styles.itemName}>{item.name}</span>
                                    <span
                                      className={`${styles.statusBadge} ${item.is_active ? styles.statusActive : styles.statusInactive}`}
                                    >
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className={styles.itemMeta}>
                                    <span className={styles.priceRange}>
                                      {formatPriceRange(item.price_range)}
                                    </span>
                                    <span className={styles.variationsCount}>
                                      {item.variations_count}{' '}
                                      {item.variations_count === 1 ? 'variation' : 'variations'}
                                    </span>
                                    <div
                                      className={styles.itemActions}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className={`${styles.actionButton} ${styles.smallActionButton}`}
                                        onClick={() => openEditItemModal(item)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className={`${styles.actionButton} ${styles.smallActionButton} ${styles.deleteButton}`}
                                        onClick={() => handleDeleteItem(item)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {isItemExpanded && (
                                  <>
                                    {item.variations.length > 0 && (
                                      <div className={styles.variationsList}>
                                        {item.variations.map((variation) => (
                                          <div key={variation.id} className={styles.variationRow}>
                                            <div className={styles.variationInfo}>
                                              <span className={styles.variationName}>
                                                {variation.name}
                                              </span>
                                              {variation.sku && (
                                                <span className={styles.variationSku}>
                                                  SKU: {variation.sku}
                                                </span>
                                              )}
                                              {variation.upc && (
                                                <span className={styles.variationSku}>
                                                  UPC: {variation.upc}
                                                </span>
                                              )}
                                              <span
                                                className={`${styles.statusBadge} ${variation.is_active ? styles.statusActive : styles.statusInactive}`}
                                              >
                                                {variation.is_active ? 'Active' : 'Inactive'}
                                              </span>
                                            </div>
                                            <div className={styles.variationInfo}>
                                              <span className={styles.variationPrice}>
                                                {formatPrice(variation.price)}
                                              </span>
                                              <div className={styles.variationActions}>
                                                <button
                                                  className={`${styles.actionButton} ${styles.smallActionButton}`}
                                                  onClick={() => openEditVariationModal(variation)}
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  className={`${styles.actionButton} ${styles.smallActionButton} ${styles.deleteButton}`}
                                                  onClick={() => handleDeleteVariation(variation)}
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <button
                                      className={styles.addVariationButton}
                                      onClick={() => openCreateVariationModal(item.id)}
                                    >
                                      + Add Variation
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          className={styles.addItemButton}
                          onClick={() => openCreateItemModal(category.id)}
                        >
                          + Add Item
                        </button>
                      </>
                    ) : (
                      <div className={styles.loading}>Loading items...</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed' && modalType === 'category'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Category' : 'Edit Category'}
        width="sm"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="category-form"
              className={styles.submitButton}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : modalMode === 'create' ? 'Create Category' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleCategorySubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Drinks, Snacks, Combos"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className={styles.textarea}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={categoryForm.is_active}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, is_active: e.target.checked })
                }
              />
              Active
            </label>
          </div>
        </form>
      </Drawer>

      {/* Item Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed' && modalType === 'item'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Item' : 'Edit Item'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="item-form"
              className={styles.submitButton}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : modalMode === 'create' ? 'Create Item' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleItemSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Popcorn, Soda, Hot Dog"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className={styles.textarea}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Image URL</label>
            <input
              type="url"
              value={itemForm.image_url}
              onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
              className={styles.input}
              placeholder="https://..."
            />
          </div>

          {modifierGroups.length > 0 && (
            <div className={styles.formGroup}>
              <label>Modifier Groups</label>
              <div className={styles.checkboxList}>
                {modifierGroups
                  .filter((g) => g.is_active)
                  .map((group) => (
                    <label key={group.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={itemForm.modifier_group_ids.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemForm({
                              ...itemForm,
                              modifier_group_ids: [...itemForm.modifier_group_ids, group.id],
                            });
                          } else {
                            setItemForm({
                              ...itemForm,
                              modifier_group_ids: itemForm.modifier_group_ids.filter(
                                (id) => id !== group.id
                              ),
                            });
                          }
                        }}
                      />
                      {group.name}
                      <span className={styles.modifierGroupMeta}>
                        ({group.modifiers_count}{' '}
                        {group.modifiers_count === 1 ? 'option' : 'options'})
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Sales Taxes</label>
            {salesTaxes.filter((t) => t.is_active).length > 0 ? (
              <div className={styles.checkboxList}>
                {salesTaxes
                  .filter((t) => t.is_active)
                  .map((tax) => (
                    <label key={tax.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={itemForm.sales_tax_ids.includes(tax.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemForm({
                              ...itemForm,
                              sales_tax_ids: [...itemForm.sales_tax_ids, tax.id],
                            });
                          } else {
                            setItemForm({
                              ...itemForm,
                              sales_tax_ids: itemForm.sales_tax_ids.filter(
                                (id) => id !== tax.id
                              ),
                            });
                          }
                        }}
                      />
                      {tax.name}
                      <span className={styles.modifierGroupMeta}>({tax.percentage}%)</span>
                    </label>
                  ))}
              </div>
            ) : (
              <p className={styles.noTaxesMessage}>
                No taxes configured.{' '}
                <a href="/dashboard/sales-taxes" className={styles.taxLink}>
                  Add sales taxes
                </a>
              </p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={itemForm.is_active}
                onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </form>
      </Drawer>

      {/* Variation Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed' && modalType === 'variation'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Variation' : 'Edit Variation'}
        width="sm"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="variation-form"
              className={styles.submitButton}
              disabled={isPending}
            >
              {isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Create Variation'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="variation-form" onSubmit={handleVariationSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={variationForm.name}
              onChange={(e) => setVariationForm({ ...variationForm, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Small, Medium, Large"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>SKU</label>
              <input
                type="text"
                value={variationForm.sku}
                onChange={(e) => setVariationForm({ ...variationForm, sku: e.target.value })}
                className={styles.input}
                placeholder="Optional barcode/SKU"
              />
            </div>
            <div className={styles.formGroup}>
              <label>UPC (Barcode)</label>
              <input
                type="text"
                value={variationForm.upc}
                onChange={(e) => setVariationForm({ ...variationForm, upc: e.target.value })}
                className={styles.input}
                placeholder="12-14 digit barcode"
                pattern="\d{12,14}"
                title="UPC must be 12-14 digits"
              />
              <small className={styles.helpText}>
                For barcode scanner use
              </small>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Price</label>
              <input
                type="text"
                value={variationForm.price}
                onChange={(e) => setVariationForm({ ...variationForm, price: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., 5.99"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Cost (optional)</label>
              <input
                type="text"
                value={variationForm.cost}
                onChange={(e) => setVariationForm({ ...variationForm, cost: e.target.value })}
                className={styles.input}
                placeholder="For margin tracking"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={variationForm.is_active}
                onChange={(e) =>
                  setVariationForm({ ...variationForm, is_active: e.target.checked })
                }
              />
              Active
            </label>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
