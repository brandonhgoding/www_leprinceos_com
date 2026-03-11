// src/pages/ConcessionItemDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concessionsApi, taxesApi } from '../api';
import type {
  ConcessionVariation,
  ConcessionVariationCreate,
  ConcessionItemCreate,
  ConcessionItem,
  SalesTax,
  ConcessionCategory,
} from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './ConcessionItemDetail.module.css';

type ModalMode = 'closed' | 'create-variation' | 'edit-variation' | 'edit-item';

interface VariationFormData {
  name: string;
  price: string;
  sku: string;
  display_order: string;
  is_active: boolean;
}

interface ItemFormData {
  name: string;
  category: string;
  description: string;
  price: string;
  tax_ids: number[];
  is_active: boolean;
}

const initialVariationForm: VariationFormData = {
  name: '',
  price: '',
  sku: '',
  display_order: '0',
  is_active: true,
};

const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
};

export default function ConcessionItemDetail() {
  const { id } = useParams<{ id: string }>();
  const itemId = parseInt(id || '0');
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedVariation, setSelectedVariation] = useState<ConcessionVariation | null>(null);
  const [variationForm, setVariationForm] = useState<VariationFormData>(initialVariationForm);
  const [itemForm, setItemForm] = useState<ItemFormData>({
    name: '',
    category: '',
    description: '',
    price: '',
    tax_ids: [],
    is_active: true,
  });

  // modifier_option_id -> variation_id -> price string (empty = use default)
  const [modifierPrices, setModifierPrices] = useState<Record<number, Record<number, string>>>({});
  const [savingModifierPrices, setSavingModifierPrices] = useState(false);

  // Queries
  const { data: item, isLoading } = useQuery({
    queryKey: ['concession-item', itemId],
    queryFn: () => concessionsApi.getItem(itemId),
    enabled: itemId > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['concession-categories'],
    queryFn: () => concessionsApi.listCategories(),
  });

  const { data: salesTaxes = [] } = useQuery({
    queryKey: ['sales-taxes'],
    queryFn: () => taxesApi.listSalesTaxes(),
  });

  // Modifier pricing helpers
  const initModifierPrices = (item: ConcessionItem): Record<number, Record<number, string>> => {
    const prices: Record<number, Record<number, string>> = {};
    for (const modifier of item.modifiers) {
      for (const option of modifier.options) {
        for (const vp of option.variation_prices) {
          if (!prices[option.id]) prices[option.id] = {};
          prices[option.id][vp.variation_id] = vp.price_adjustment;
        }
      }
    }
    return prices;
  };

  useEffect(() => {
    if (item) {
      setModifierPrices(initModifierPrices(item));
    }
  }, [item]);

  const handleSaveModifierPrices = async () => {
    if (!item) return;
    setSavingModifierPrices(true);
    try {
      const prices: {
        modifier_option_id: number;
        variation_id: number;
        price_adjustment: string;
      }[] = [];
      for (const [optionId, variations] of Object.entries(modifierPrices)) {
        for (const [variationId, price] of Object.entries(variations)) {
          if (price !== '') {
            prices.push({
              modifier_option_id: parseInt(optionId),
              variation_id: parseInt(variationId),
              price_adjustment: price,
            });
          }
        }
      }
      await concessionsApi.updateItem(itemId, { modifier_variation_prices: prices });
      queryClient.invalidateQueries({ queryKey: ['concession-item', itemId] });
      addToast('Modifier prices saved.');
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to save modifier prices.'));
    } finally {
      setSavingModifierPrices(false);
    }
  };

  // Item mutations
  const updateItemMutation = useMutation({
    mutationFn: (data: Partial<ConcessionItemCreate>) => concessionsApi.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      closeModal();
      addToast('Item updated.');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update item.')),
  });

  // Variation mutations
  const createVariationMutation = useMutation({
    mutationFn: (data: ConcessionVariationCreate) => concessionsApi.createVariation(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      closeModal();
      addToast('Variation created.');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create variation.')),
  });

  const updateVariationMutation = useMutation({
    mutationFn: ({ varId, data }: { varId: number; data: Partial<ConcessionVariationCreate> }) =>
      concessionsApi.updateVariation(itemId, varId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      closeModal();
      addToast('Variation updated.');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update variation.')),
  });

  const deleteVariationMutation = useMutation({
    mutationFn: (varId: number) => concessionsApi.deleteVariation(itemId, varId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concession-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['concession-items'] });
      addToast('Variation deleted.');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete variation.')),
  });

  // Handlers
  const closeModal = () => {
    setModalMode('closed');
    setSelectedVariation(null);
    setVariationForm(initialVariationForm);
  };

  const openEditItem = () => {
    if (!item) return;
    setItemForm({
      name: item.name,
      category: String(item.category),
      description: item.description,
      price: item.price || '',
      tax_ids: item.taxes.map((t: SalesTax) => t.id),
      is_active: item.is_active,
    });
    setModalMode('edit-item');
  };

  const openCreateVariation = () => {
    setVariationForm(initialVariationForm);
    setSelectedVariation(null);
    setModalMode('create-variation');
  };

  const openEditVariation = (variation: ConcessionVariation) => {
    setVariationForm({
      name: variation.name,
      price: variation.price,
      sku: variation.sku,
      display_order: String(variation.display_order),
      is_active: variation.is_active,
    });
    setSelectedVariation(variation);
    setModalMode('edit-variation');
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.category) return;
    updateItemMutation.mutate({
      category: parseInt(itemForm.category, 10),
      name: itemForm.name,
      description: itemForm.description,
      price: itemForm.price || null,
      tax_ids: itemForm.tax_ids,
      is_active: itemForm.is_active,
    });
  };

  const handleVariationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variationForm.name || !variationForm.price) return;

    const data: ConcessionVariationCreate = {
      name: variationForm.name,
      price: variationForm.price,
      sku: variationForm.sku,
      display_order: parseInt(variationForm.display_order, 10) || 0,
      is_active: variationForm.is_active,
    };

    if (modalMode === 'create-variation') {
      createVariationMutation.mutate(data);
    } else if (selectedVariation) {
      updateVariationMutation.mutate({ varId: selectedVariation.id, data });
    }
  };

  const handleDeleteVariation = async (variation: ConcessionVariation) => {
    if (
      await confirm({
        title: 'Delete Variation',
        message: `Are you sure you want to delete "${variation.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteVariationMutation.mutate(variation.id);
    }
  };

  const isMutating =
    updateItemMutation.isPending ||
    createVariationMutation.isPending ||
    updateVariationMutation.isPending;

  if (isLoading) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        Loading item...
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.notFound}>
        <p>Item not found.</p>
        <Link to="/concessions" className={styles.backLink}>
          &larr; Back to Concessions
        </Link>
      </div>
    );
  }

  const sortedVariations = [...item.variations].sort(
    (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
  );

  // Drawer config
  const isVariationDrawer = modalMode === 'create-variation' || modalMode === 'edit-variation';
  const drawerTitle =
    modalMode === 'edit-item'
      ? 'Edit Item'
      : modalMode === 'create-variation'
        ? 'Add Variation'
        : 'Edit Variation';
  const formId = isVariationDrawer ? 'variation-form' : 'item-edit-form';
  const submitLabel =
    modalMode === 'create-variation'
      ? 'Add Variation'
      : modalMode === 'edit-variation'
        ? 'Save Changes'
        : 'Save Changes';

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link to="/concessions" className={styles.backLink}>
            &larr; Back to Concessions
          </Link>
          <h1 className={styles.title}>{item.name}</h1>
          <p className={styles.subtitle}>Item Details & Variations</p>
        </div>
      </div>

      {/* Info Card */}
      <div className={styles.cardsGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}>Item Details</h2>
            <button className={styles.editButton} onClick={openEditItem}>
              Edit
            </button>
          </div>
          <div className={styles.itemInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Category:</span>
              <span>{item.category_name}</span>
            </div>
            {item.description && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Description:</span>
                <span>{item.description}</span>
              </div>
            )}
            {item.price && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Base Price:</span>
                <span>{formatPrice(item.price)}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.label}>Taxes:</span>
              <span>
                {item.taxes.length > 0 ? item.taxes.map((t) => t.name).join(', ') : 'None'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Status:</span>
              <span
                className={`${styles.statusBadge} ${
                  item.is_active ? styles.statusActive : styles.statusInactive
                }`}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {item.modifiers.length > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Modifiers:</span>
                <span>{item.modifiers.map((m) => m.name).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variations Section */}
      <section className={styles.variationsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Variations</h2>
          <button className={styles.primaryButton} onClick={openCreateVariation}>
            + Add Variation
          </button>
        </div>

        {sortedVariations.length === 0 ? (
          <div className={styles.empty}>
            <p>No variations yet. Add a variation to set sizes and prices.</p>
            <button className={styles.primaryButton} onClick={openCreateVariation}>
              Add First Variation
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>SKU</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVariations.map((variation) => (
                    <tr key={variation.id}>
                      <td className={styles.variationName}>{variation.name}</td>
                      <td className={styles.variationPrice}>{formatPrice(variation.price)}</td>
                      <td>{variation.sku || '—'}</td>
                      <td>{variation.display_order}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            variation.is_active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {variation.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => openEditVariation(variation)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => handleDeleteVariation(variation)}
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

            {/* Mobile Cards */}
            <div className={styles.cardList}>
              {sortedVariations.map((variation) => (
                <div key={variation.id} className={styles.variationCard}>
                  <div className={styles.variationCardHeader}>
                    <div>
                      <div className={styles.variationName}>{variation.name}</div>
                      <div className={styles.variationPrice}>{formatPrice(variation.price)}</div>
                    </div>
                    <div className={styles.cardBadges}>
                      <span
                        className={`${styles.statusBadge} ${
                          variation.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {variation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {variation.sku && (
                    <div className={styles.variationCardBody}>
                      <span className={styles.cardLabel}>SKU</span>
                      <span>{variation.sku}</span>
                    </div>
                  )}
                  <div className={styles.variationCardActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => openEditVariation(variation)}
                    >
                      Edit
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDeleteVariation(variation)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modifier Pricing by Variation */}
      {item.modifiers.length > 0 && item.variations.length > 1 && (
        <section className={styles.variationsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Modifier Pricing by Variation</h2>
            <button
              className={styles.primaryButton}
              onClick={handleSaveModifierPrices}
              disabled={savingModifierPrices}
            >
              {savingModifierPrices ? 'Saving...' : 'Save Prices'}
            </button>
          </div>
          <p className={styles.hint}>
            Override modifier prices per variation. Leave blank to use the default price.
          </p>
          {item.modifiers.map((modifier) => (
            <div key={modifier.id} className={styles.card} style={{ marginBottom: '1rem' }}>
              <h3 className={styles.cardTitle}>{modifier.name}</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Default</th>
                      {sortedVariations
                        .filter((v) => v.is_active)
                        .map((v) => (
                          <th key={v.id}>{v.name}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modifier.options.map((option) => (
                      <tr key={option.id}>
                        <td>{option.name}</td>
                        <td className={styles.variationPrice}>
                          {formatPrice(option.price_adjustment)}
                        </td>
                        {sortedVariations
                          .filter((v) => v.is_active)
                          .map((v) => (
                            <td key={v.id}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={styles.priceInput}
                                placeholder={formatPrice(option.price_adjustment)}
                                value={modifierPrices[option.id]?.[v.id] ?? ''}
                                onChange={(e) =>
                                  setModifierPrices((prev) => ({
                                    ...prev,
                                    [option.id]: {
                                      ...prev[option.id],
                                      [v.id]: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Drawer */}
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
        {isVariationDrawer ? (
          <form id="variation-form" onSubmit={handleVariationSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="variation-name">Name</label>
                <input
                  id="variation-name"
                  type="text"
                  value={variationForm.name}
                  onChange={(e) => setVariationForm({ ...variationForm, name: e.target.value })}
                  required
                  className={styles.input}
                  placeholder="e.g., Small, Medium, Large"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="variation-price">Price</label>
                <input
                  id="variation-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={variationForm.price}
                  onChange={(e) => setVariationForm({ ...variationForm, price: e.target.value })}
                  required
                  className={styles.input}
                  placeholder="e.g., 5.00"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="variation-sku">SKU</label>
                <input
                  id="variation-sku"
                  type="text"
                  value={variationForm.sku}
                  onChange={(e) => setVariationForm({ ...variationForm, sku: e.target.value })}
                  className={styles.input}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="variation-display-order">Display Order</label>
                <input
                  id="variation-display-order"
                  type="number"
                  min="0"
                  value={variationForm.display_order}
                  onChange={(e) =>
                    setVariationForm({ ...variationForm, display_order: e.target.value })
                  }
                  className={styles.input}
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
        ) : (
          <form id="item-edit-form" onSubmit={handleItemSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-edit-name">Name</label>
                <input
                  id="item-edit-name"
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="item-edit-category">Category</label>
                <select
                  id="item-edit-category"
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  required
                  className={styles.input}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat: ConcessionCategory) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="item-edit-description">Description</label>
              <textarea
                id="item-edit-description"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="item-edit-price">Base Price</label>
                <input
                  id="item-edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  className={styles.input}
                  placeholder="Optional"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Taxes</label>
                {salesTaxes.length === 0 ? (
                  <p className={styles.hint}>No tax rates created yet.</p>
                ) : (
                  <div className={styles.checkboxList}>
                    {salesTaxes
                      .filter((t: SalesTax) => t.is_active)
                      .map((tax: SalesTax) => (
                        <label key={tax.id}>
                          <input
                            type="checkbox"
                            checked={itemForm.tax_ids.includes(tax.id)}
                            onChange={() =>
                              setItemForm((prev) => ({
                                ...prev,
                                tax_ids: prev.tax_ids.includes(tax.id)
                                  ? prev.tax_ids.filter((id) => id !== tax.id)
                                  : [...prev.tax_ids, tax.id],
                              }))
                            }
                          />
                          {tax.name} ({(parseFloat(tax.rate) * 100).toFixed(2)}%)
                        </label>
                      ))}
                  </div>
                )}
              </div>
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
        )}
      </Drawer>
    </div>
  );
}
