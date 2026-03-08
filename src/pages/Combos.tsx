// src/pages/Combos.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concessionsApi } from '../api';
import type { ComboTemplate, ComboTemplateCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Combos.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  name: string;
  description: string;
  price: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  price: '',
  is_active: true,
};

export default function Combos() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedCombo, setSelectedCombo] = useState<ComboTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos'],
    queryFn: () => concessionsApi.listCombos(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ComboTemplateCreate) => concessionsApi.createCombo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create combo.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ComboTemplateCreate> }) =>
      concessionsApi.updateCombo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update combo.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteCombo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete combo.')),
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedCombo(null);
    setModalMode('create');
  };

  const openEditModal = (combo: ComboTemplate) => {
    setFormData({
      name: combo.name,
      description: combo.description,
      price: combo.price,
      is_active: combo.is_active,
    });
    setSelectedCombo(combo);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedCombo(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name === '' || formData.price === '') return;

    const data: ComboTemplateCreate = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      is_active: formData.is_active,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedCombo) {
      updateMutation.mutate({ id: selectedCombo.id, data });
    }
  };

  const handleDelete = async (combo: ComboTemplate) => {
    if (
      await confirm({
        title: 'Delete Combo',
        message: `Are you sure you want to delete "${combo.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteMutation.mutate(combo.id);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Combos</h1>
          <p className={styles.subtitle}>Create combo deals with bundled items.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            + New Combo
          </button>
        </div>
      </div>

      {/* Combos List */}
      {isLoading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading combos...
        </div>
      ) : combos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🎁
          </div>
          <h3 className="empty-state-title">No Combos Defined</h3>
          <p className="empty-state-description">
            Create combo deals that bundle concession items and tickets together at a discounted
            price.
          </p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Create First Combo
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Slots</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((combo) => (
                  <tr key={combo.id}>
                    <td className={styles.comboName}>{combo.name}</td>
                    <td className={styles.price}>{formatPrice(combo.price)}</td>
                    <td>
                      <span className={styles.slotsCount}>
                        {combo.slots.length} {combo.slots.length === 1 ? 'slot' : 'slots'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          combo.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {combo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditModal(combo)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDelete(combo)}
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

          {/* Mobile Card View */}
          <div className={styles.cardList}>
            {combos.map((combo) => (
              <div key={combo.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{combo.name}</h3>
                    <span className={styles.cardPrice}>{formatPrice(combo.price)}</span>
                  </div>
                  <div className={styles.cardBadges}>
                    <span
                      className={`${styles.statusBadge} ${
                        combo.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {combo.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className={styles.slotsCount}>
                      {combo.slots.length} {combo.slots.length === 1 ? 'slot' : 'slots'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionButton} onClick={() => openEditModal(combo)}>
                    Edit
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(combo)}
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
        title={modalMode === 'create' ? 'New Combo' : 'Edit Combo'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="combo-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Create Combo'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="combo-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="combo-name">Name</label>
            <input
              id="combo-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Movie Night Bundle"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="combo-price">Price</label>
            <input
              id="combo-price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., 19.99"
            />
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

          <div className={styles.formGroup}>
            <label htmlFor="combo-description">Description</label>
            <textarea
              id="combo-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Optional description for this combo deal"
              rows={3}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
