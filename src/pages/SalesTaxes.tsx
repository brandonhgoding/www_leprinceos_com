// src/pages/SalesTaxes.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesTaxesApi } from '../api';
import type { SalesTax, SalesTaxCreate, TaxType, InclusionType } from '../api/types';
import styles from './SalesTaxes.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  name: string;
  percentage: string;
  tax_type: TaxType;
  inclusion_type: InclusionType;
  is_active: boolean;
}

const initialFormData: FormData = {
  name: '',
  percentage: '',
  tax_type: 'state',
  inclusion_type: 'additive',
  is_active: true,
};

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  state: 'State',
  local: 'Local',
  county: 'County',
  city: 'City',
  other: 'Other',
};

const INCLUSION_TYPE_LABELS: Record<InclusionType, string> = {
  additive: 'Additive (added to price)',
  inclusive: 'Inclusive (included in price)',
};

export default function SalesTaxes() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedTax, setSelectedTax] = useState<SalesTax | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const { data: salesTaxes = [], isLoading } = useQuery({
    queryKey: ['sales-taxes'],
    queryFn: () => salesTaxesApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: SalesTaxCreate) => salesTaxesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SalesTaxCreate> }) =>
      salesTaxesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => salesTaxesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-taxes'] });
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedTax(null);
    setModalMode('create');
  };

  const openEditModal = (tax: SalesTax) => {
    setFormData({
      name: tax.name,
      percentage: tax.percentage,
      tax_type: tax.tax_type,
      inclusion_type: tax.inclusion_type,
      is_active: tax.is_active,
    });
    setSelectedTax(tax);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedTax(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name === '' || formData.percentage === '') return;

    const data: SalesTaxCreate = {
      name: formData.name,
      percentage: formData.percentage,
      tax_type: formData.tax_type,
      inclusion_type: formData.inclusion_type,
      is_active: formData.is_active,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedTax) {
      updateMutation.mutate({ id: selectedTax.id, data });
    }
  };

  const handleDelete = (tax: SalesTax) => {
    if (window.confirm(`Are you sure you want to delete "${tax.name}"?`)) {
      deleteMutation.mutate(tax.id);
    }
  };

  const formatPercentage = (percentage: string) => {
    const num = parseFloat(percentage);
    return isNaN(num) ? percentage : `${num}%`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Sales Taxes</h1>
          <p className={styles.subtitle}>Manage sales taxes for tickets and concessions.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Sales Tax
        </button>
      </div>

      {/* Sales Taxes List */}
      {isLoading ? (
        <div className={styles.loading}>Loading sales taxes...</div>
      ) : salesTaxes.length === 0 ? (
        <div className={styles.empty}>
          <p>No sales taxes found.</p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Add your first sales tax
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rate</th>
                <th>Type</th>
                <th>Application</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesTaxes.map((tax) => (
                <tr key={tax.id}>
                  <td className={styles.taxName}>{tax.name}</td>
                  <td className={styles.percentage}>{formatPercentage(tax.percentage)}</td>
                  <td>
                    <span className={styles.typeBadge}>{TAX_TYPE_LABELS[tax.tax_type]}</span>
                  </td>
                  <td className={styles.inclusionType}>
                    {tax.inclusion_type === 'additive' ? 'Added to price' : 'Included in price'}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${tax.is_active ? styles.statusActive : styles.statusInactive}`}
                    >
                      {tax.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className={styles.usageCount}>
                    {tax.concession_items_count} items, {tax.ticket_types_count} tickets
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionButton} onClick={() => openEditModal(tax)}>
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(tax)}
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
      )}

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === 'create' ? 'New Sales Tax' : 'Edit Sales Tax'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className={styles.input}
                    placeholder="e.g., Maine State Tax"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Rate (%)</label>
                  <input
                    type="text"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    required
                    className={styles.input}
                    placeholder="e.g., 5.5"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tax Type</label>
                  <select
                    value={formData.tax_type}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_type: e.target.value as TaxType })
                    }
                    className={styles.select}
                  >
                    {Object.entries(TAX_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Application</label>
                  <select
                    value={formData.inclusion_type}
                    onChange={(e) =>
                      setFormData({ ...formData, inclusion_type: e.target.value as InclusionType })
                    }
                    className={styles.select}
                  >
                    {Object.entries(INCLUSION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : modalMode === 'create'
                      ? 'Create Sales Tax'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
