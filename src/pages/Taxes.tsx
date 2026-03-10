// src/pages/Taxes.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxesApi } from '../api';
import type { SalesTax, SalesTaxCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Taxes.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

const TAX_TYPE_OPTIONS = [
  { value: 'STATE', label: 'State' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'COUNTY', label: 'County' },
  { value: 'CITY', label: 'City' },
  { value: 'OTHER', label: 'Other' },
];

// --- Tax Rate form ---

interface TaxRateFormData {
  name: string;
  rate: string;
  tax_type: string;
  is_inclusive: boolean;
  is_active: boolean;
}

const initialTaxRateFormData: TaxRateFormData = {
  name: '',
  rate: '',
  tax_type: 'STATE',
  is_inclusive: false,
  is_active: true,
};

export default function Taxes() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedTax, setSelectedTax] = useState<SalesTax | null>(null);
  const [taxRateFormData, setTaxRateFormData] = useState<TaxRateFormData>(initialTaxRateFormData);

  // Queries
  const { data: salesTaxes = [], isLoading: taxesLoading } = useQuery({
    queryKey: ['sales-taxes'],
    queryFn: () => taxesApi.listSalesTaxes(),
  });

  // Tax Rate mutations
  const createTaxMutation = useMutation({
    mutationFn: (data: SalesTaxCreate) => taxesApi.createSalesTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create tax rate.')),
  });

  const updateTaxMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SalesTaxCreate> }) =>
      taxesApi.updateSalesTax(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update tax rate.')),
  });

  const deleteTaxMutation = useMutation({
    mutationFn: (id: number) => taxesApi.deleteSalesTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete tax rate.')),
  });

  // Handlers
  const closeModal = () => {
    setModalMode('closed');
    setSelectedTax(null);
    setTaxRateFormData(initialTaxRateFormData);
  };

  const openCreateTax = () => {
    setTaxRateFormData(initialTaxRateFormData);
    setSelectedTax(null);
    setModalMode('create');
  };

  const openEditTax = (tax: SalesTax) => {
    setTaxRateFormData({
      name: tax.name,
      rate: tax.rate,
      tax_type: tax.tax_type,
      is_inclusive: tax.is_inclusive,
      is_active: tax.is_active,
    });
    setSelectedTax(tax);
    setModalMode('edit');
  };

  const handleTaxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taxRateFormData.name === '' || taxRateFormData.rate === '') return;

    const data: SalesTaxCreate = {
      name: taxRateFormData.name,
      rate: taxRateFormData.rate,
      tax_type: taxRateFormData.tax_type,
      is_inclusive: taxRateFormData.is_inclusive,
      is_active: taxRateFormData.is_active,
    };

    if (modalMode === 'create') {
      createTaxMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedTax) {
      updateTaxMutation.mutate({ id: selectedTax.id, data });
    }
  };

  const handleDeleteTax = async (tax: SalesTax) => {
    if (
      await confirm({
        title: 'Delete Tax Rate',
        message: `Are you sure you want to delete "${tax.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteTaxMutation.mutate(tax.id);
    }
  };

  const formatRate = (rate: string) => {
    const pct = parseFloat(rate) * 100;
    return isNaN(pct) ? rate : `${pct.toFixed(2)}%`;
  };

  const isLoading = taxesLoading;
  const isMutating = createTaxMutation.isPending || updateTaxMutation.isPending;

  const drawerTitle = modalMode === 'create' ? 'New Tax Rate' : 'Edit Tax Rate';
  const submitLabel = modalMode === 'create' ? 'Create Tax Rate' : 'Save Changes';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Taxes</h1>
          <p className={styles.subtitle}>Manage tax rates for your cinema.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={openCreateTax}>
            + New Tax Rate
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading tax rates...
        </div>
      ) : salesTaxes.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state-title">No Tax Rates</h3>
          <p className="empty-state-description">
            Create tax rates to apply to your concession items.
          </p>
          <button className="btn btn-primary" onClick={openCreateTax}>
            Create First Tax Rate
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rate</th>
                  <th>Type</th>
                  <th>Inclusive</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesTaxes.map((tax) => (
                  <tr key={tax.id}>
                    <td>{tax.name}</td>
                    <td>{formatRate(tax.rate)}</td>
                    <td>{tax.tax_type}</td>
                    <td>{tax.is_inclusive ? 'Yes' : 'No'}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          tax.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {tax.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionButton} onClick={() => openEditTax(tax)}>
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteTax(tax)}
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

          {/* Mobile cards */}
          <div className={styles.cardList}>
            {salesTaxes.map((tax) => (
              <div key={tax.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{tax.name}</h3>
                    <span className={styles.cardPrice}>{formatRate(tax.rate)}</span>
                  </div>
                  <div className={styles.cardBadges}>
                    <span
                      className={`${styles.statusBadge} ${
                        tax.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {tax.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span>{tax.tax_type}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionButton} onClick={() => openEditTax(tax)}>
                    Edit
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDeleteTax(tax)}
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
              form="tax-rate-form"
              className={styles.submitButton}
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : submitLabel}
            </button>
          </>
        }
      >
        <form id="tax-rate-form" onSubmit={handleTaxSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="tax-name">Name</label>
            <input
              id="tax-name"
              type="text"
              value={taxRateFormData.name}
              onChange={(e) => setTaxRateFormData({ ...taxRateFormData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Maine State Sales Tax"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="tax-rate">Rate (decimal)</label>
              <input
                id="tax-rate"
                type="number"
                min="0"
                max="1"
                step="0.0001"
                value={taxRateFormData.rate}
                onChange={(e) => setTaxRateFormData({ ...taxRateFormData, rate: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., 0.0550"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="tax-type">Type</label>
              <select
                id="tax-type"
                value={taxRateFormData.tax_type}
                onChange={(e) =>
                  setTaxRateFormData({ ...taxRateFormData, tax_type: e.target.value })
                }
                className={styles.input}
              >
                {TAX_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={taxRateFormData.is_inclusive}
                onChange={(e) =>
                  setTaxRateFormData({ ...taxRateFormData, is_inclusive: e.target.checked })
                }
              />
              Tax is included in displayed price
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={taxRateFormData.is_active}
                onChange={(e) =>
                  setTaxRateFormData({ ...taxRateFormData, is_active: e.target.checked })
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
