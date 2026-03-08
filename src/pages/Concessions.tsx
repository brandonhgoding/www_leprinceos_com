// src/pages/Concessions.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concessionsApi } from '../api';
import type {
  ConcessionCategory,
  ConcessionCategoryCreate,
  ConcessionItem,
  ConcessionItemCreate,
} from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Concessions.module.css';

type Tab = 'categories' | 'items';
type ModalMode = 'closed' | 'create' | 'edit';

interface CategoryFormData {
  name: string;
  display_order: string;
  is_active: boolean;
}

interface ItemFormData {
  name: string;
  category: string;
  description: string;
  tax_rate: string;
  is_active: boolean;
}

const initialCategoryFormData: CategoryFormData = {
  name: '',
  display_order: '0',
  is_active: true,
};

const initialItemFormData: ItemFormData = {
  name: '',
  category: '',
  description: '',
  tax_rate: '0.00',
  is_active: true,
};

export default function Concessions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedCategory, setSelectedCategory] = useState<ConcessionCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<ConcessionItem | null>(null);
  const [categoryFormData, setCategoryFormData] =
    useState<CategoryFormData>(initialCategoryFormData);
  const [itemFormData, setItemFormData] = useState<ItemFormData>(initialItemFormData);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['concession-categories'],
    queryFn: () => concessionsApi.listCategories(),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['concession-items'],
    queryFn: () => concessionsApi.listItems(),
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: ConcessionCategoryCreate) => concessionsApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create category.')),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConcessionCategoryCreate> }) =>
      concessionsApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update category.')),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-categories'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete category.')),
  });

  // Item Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: ConcessionItemCreate) => concessionsApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create item.')),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConcessionItemCreate> }) =>
      concessionsApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update item.')),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete item.')),
  });

  // Handlers
  const openCreateModal = () => {
    if (activeTab === 'categories') {
      setCategoryFormData(initialCategoryFormData);
      setSelectedCategory(null);
    } else {
      setItemFormData(initialItemFormData);
      setSelectedItem(null);
    }
    setModalMode('create');
  };

  const openEditCategory = (category: ConcessionCategory) => {
    setCategoryFormData({
      name: category.name,
      display_order: String(category.display_order),
      is_active: category.is_active,
    });
    setSelectedCategory(category);
    setModalMode('edit');
  };

  const openEditItem = (item: ConcessionItem) => {
    setItemFormData({
      name: item.name,
      category: String(item.category),
      description: item.description,
      tax_rate: item.tax_rate,
      is_active: item.is_active,
    });
    setSelectedItem(item);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedCategory(null);
    setSelectedItem(null);
    setCategoryFormData(initialCategoryFormData);
    setItemFormData(initialItemFormData);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryFormData.name === '') return;

    const data: ConcessionCategoryCreate = {
      name: categoryFormData.name,
      display_order: parseInt(categoryFormData.display_order, 10) || 0,
      is_active: categoryFormData.is_active,
    };

    if (modalMode === 'create') {
      createCategoryMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
    }
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemFormData.name === '' || itemFormData.category === '') return;

    const data: ConcessionItemCreate = {
      category: parseInt(itemFormData.category, 10),
      name: itemFormData.name,
      description: itemFormData.description,
      tax_rate: itemFormData.tax_rate,
      is_active: itemFormData.is_active,
    };

    if (modalMode === 'create') {
      createItemMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedItem) {
      updateItemMutation.mutate({ id: selectedItem.id, data });
    }
  };

  const handleDeleteCategory = async (category: ConcessionCategory) => {
    if (
      await confirm({
        title: 'Delete Category',
        message: `Are you sure you want to delete "${category.name}"? This will also affect any items in this category.`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleDeleteItem = async (item: ConcessionItem) => {
    if (
      await confirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteItemMutation.mutate(item.id);
    }
  };

  const getPriceRange = (item: ConcessionItem): string => {
    if (item.variations.length === 0) return '';
    const prices = item.variations.map((v) => parseFloat(v.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${min.toFixed(2)}`;
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  const isLoading = activeTab === 'categories' ? categoriesLoading : itemsLoading;
  const isMutating =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    createItemMutation.isPending ||
    updateItemMutation.isPending;

  const drawerTitle =
    activeTab === 'categories'
      ? modalMode === 'create'
        ? 'New Category'
        : 'Edit Category'
      : modalMode === 'create'
        ? 'New Item'
        : 'Edit Item';

  const submitLabel =
    activeTab === 'categories'
      ? modalMode === 'create'
        ? 'Create Category'
        : 'Save Changes'
      : modalMode === 'create'
        ? 'Create Item'
        : 'Save Changes';

  const formId = activeTab === 'categories' ? 'category-form' : 'item-form';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Concessions</h1>
          <p className={styles.subtitle}>Manage your concession menu items and categories.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            {activeTab === 'categories' ? '+ New Category' : '+ New Item'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'categories' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'items' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading {activeTab}...
        </div>
      ) : activeTab === 'categories' ? (
        categories.length === 0 ? (
          <div className={styles.empty}>
            <h3>No Categories Yet</h3>
            <p>
              Create categories to organize your concession menu items (e.g., Drinks, Snacks,
              Candy).
            </p>
            <button className={styles.primaryButton} onClick={openCreateModal}>
              Create First Category
            </button>
          </div>
        ) : (
          <>
            {/* Categories Desktop Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Display Order</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className={styles.itemName}>{category.name}</td>
                      <td>{category.display_order}</td>
                      <td>{category.items_count}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            category.is_active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => openEditCategory(category)}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Categories Mobile Cards */}
            <div className={styles.cardList}>
              {categories.map((category) => (
                <div key={category.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{category.name}</h3>
                      <span className={styles.cardDetail}>Order: {category.display_order}</span>
                    </div>
                    <div className={styles.cardBadges}>
                      <span
                        className={`${styles.statusBadge} ${
                          category.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={styles.cardDetail}>
                        {category.items_count} {category.items_count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => openEditCategory(category)}
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
              ))}
            </div>
          </>
        )
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <h3>No Items Yet</h3>
          <p>
            Add concession items to your menu. You can set up variations with different sizes and
            prices after creating an item.
          </p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Create First Item
          </button>
        </div>
      ) : (
        <>
          {/* Items Desktop Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Variations</th>
                  <th>Price Range</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.itemName}>{item.name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.variations.length}</td>
                    <td>
                      {item.variations.length > 0 ? (
                        <span className={styles.priceRange}>{getPriceRange(item)}</span>
                      ) : (
                        <span className={styles.noVariations}>No variations</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          item.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionButton} onClick={() => openEditItem(item)}>
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Items Mobile Cards */}
          <div className={styles.cardList}>
            {items.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{item.name}</h3>
                    {item.variations.length > 0 ? (
                      <span className={styles.priceRange}>{getPriceRange(item)}</span>
                    ) : (
                      <span className={styles.noVariations}>No variations</span>
                    )}
                  </div>
                  <div className={styles.cardBadges}>
                    <span
                      className={`${styles.statusBadge} ${
                        item.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={styles.cardDetail}>{item.category_name}</span>
                    <span className={styles.cardDetail}>
                      {item.variations.length}{' '}
                      {item.variations.length === 1 ? 'variation' : 'variations'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionButton} onClick={() => openEditItem(item)}>
                    Edit
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDeleteItem(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed'}
        onClose={closeModal}
        title={drawerTitle}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className={styles.submitButton}
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : submitLabel}
            </button>
          </>
        }
      >
        {activeTab === 'categories' ? (
          <form id="category-form" onSubmit={handleCategorySubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="category-name">Name</label>
                <input
                  id="category-name"
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, name: e.target.value })
                  }
                  required
                  className={styles.input}
                  placeholder="e.g., Drinks, Snacks, Candy"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="category-display-order">Display Order</label>
                <input
                  id="category-display-order"
                  type="number"
                  min="0"
                  value={categoryFormData.display_order}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, display_order: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={categoryFormData.is_active}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
          </form>
        ) : (
          <form id="item-form" onSubmit={handleItemSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-name">Name</label>
                <input
                  id="item-name"
                  type="text"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  required
                  className={styles.input}
                  placeholder="e.g., Popcorn, Soda, Nachos"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="item-category">Category</label>
                <select
                  id="item-category"
                  value={itemFormData.category}
                  onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                  required
                  className={styles.select}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="item-description">Description</label>
              <textarea
                id="item-description"
                value={itemFormData.description}
                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                className={styles.textarea}
                placeholder="Optional description for this item"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-tax-rate">Tax Rate</label>
                <input
                  id="item-tax-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemFormData.tax_rate}
                  onChange={(e) => setItemFormData({ ...itemFormData, tax_rate: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., 0.08"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={itemFormData.is_active}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, is_active: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
