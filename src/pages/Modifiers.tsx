import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { concessionsApi } from '../api';
import type { Modifier, ModifierWrite, ModifierOptionWrite } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Modifiers.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface OptionFormRow {
  key: string;
  id?: number;
  name: string;
  price_adjustment: string;
  is_default: boolean;
}

interface ModifierFormData {
  name: string;
  is_required: boolean;
  max_selections: string;
  display_order: string;
  options: OptionFormRow[];
}

let optionKeyCounter = 0;

const newOptionRow = (): OptionFormRow => ({
  key: `opt-${++optionKeyCounter}`,
  name: '',
  price_adjustment: '0.00',
  is_default: false,
});

const initialFormData: ModifierFormData = {
  name: '',
  is_required: false,
  max_selections: '0',
  display_order: '0',
  options: [newOptionRow()],
};

export default function Modifiers() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);
  const [formData, setFormData] = useState<ModifierFormData>(initialFormData);

  // Query
  const { data: modifiers = [], isLoading } = useQuery({
    queryKey: ['modifiers'],
    queryFn: () => concessionsApi.listModifiers(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ModifierWrite) => concessionsApi.createModifier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      addToast('Modifier created successfully.', 'success');
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create modifier.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ModifierWrite> }) =>
      concessionsApi.updateModifier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      addToast('Modifier updated successfully.', 'success');
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update modifier.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => concessionsApi.deleteModifier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifiers'] });
      addToast('Modifier deleted.', 'success');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete modifier.')),
  });

  // Handlers
  const openCreate = () => {
    setFormData(initialFormData);
    setSelectedModifier(null);
    setModalMode('create');
  };

  const openEdit = (modifier: Modifier) => {
    setFormData({
      name: modifier.name,
      is_required: modifier.is_required,
      max_selections: String(modifier.max_selections),
      display_order: String(modifier.display_order),
      options: modifier.options.map((opt) => ({
        key: `opt-${++optionKeyCounter}`,
        id: opt.id,
        name: opt.name,
        price_adjustment: opt.price_adjustment,
        is_default: opt.is_default,
      })),
    });
    setSelectedModifier(modifier);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedModifier(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const options: ModifierOptionWrite[] = formData.options
      .filter((opt) => opt.name.trim() !== '')
      .map((opt, index) => ({
        ...(opt.id ? { id: opt.id } : {}),
        name: opt.name,
        price_adjustment: opt.price_adjustment || '0.00',
        is_default: opt.is_default,
        display_order: index,
      }));

    const data: ModifierWrite = {
      name: formData.name,
      is_required: formData.is_required,
      max_selections: parseInt(formData.max_selections, 10) || 0,
      display_order: parseInt(formData.display_order, 10) || 0,
      options,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedModifier) {
      updateMutation.mutate({ id: selectedModifier.id, data });
    }
  };

  const handleDelete = async (modifier: Modifier) => {
    if (
      await confirm({
        title: 'Delete Modifier',
        message: `Are you sure you want to delete "${modifier.name}"? This will remove it from any items using it.`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteMutation.mutate(modifier.id);
    }
  };

  // Option row handlers
  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, newOptionRow()],
    }));
  };

  const removeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, field: keyof OptionFormRow, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    }));
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setFormData((prev) => {
      const options = [...prev.options];
      [options[index], options[newIndex]] = [options[newIndex], options[index]];
      return { ...prev, options };
    });
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const drawerTitle = modalMode === 'create' ? 'New Modifier' : 'Edit Modifier';
  const submitLabel = modalMode === 'create' ? 'Create Modifier' : 'Save Changes';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Modifiers</h1>
          <p className={styles.subtitle}>
            Manage modifier groups and options for your concession items.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={openCreate}>
            + New Modifier
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading} role="status" aria-live="polite">
          Loading modifiers...
        </div>
      ) : modifiers.length === 0 ? (
        <div className={styles.empty}>
          <h3>No Modifiers Yet</h3>
          <p>
            Create modifier groups to add customizable options to your concession items (e.g.,
            Butter, Toppings, Size Upgrades).
          </p>
          <button className={styles.primaryButton} onClick={openCreate}>
            Create First Modifier
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
                  <th>Required</th>
                  <th>Max Selections</th>
                  <th>Options</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modifiers.map((modifier) => (
                  <tr key={modifier.id}>
                    <td className={styles.modifierName}>{modifier.name}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          modifier.is_required ? styles.statusYes : styles.statusNo
                        }`}
                      >
                        {modifier.is_required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{modifier.max_selections === 0 ? 'Unlimited' : modifier.max_selections}</td>
                    <td className={styles.optionsList}>
                      {modifier.options.map((o) => o.name).join(', ') || 'None'}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionButton} onClick={() => openEdit(modifier)}>
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDelete(modifier)}
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
            {modifiers.map((modifier) => (
              <div key={modifier.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{modifier.name}</h3>
                    <span
                      className={`${styles.statusBadge} ${
                        modifier.is_required ? styles.statusYes : styles.statusNo
                      }`}
                    >
                      {modifier.is_required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <div className={styles.cardBadges}>
                    <span className={styles.cardDetail}>
                      {modifier.max_selections === 0
                        ? 'Unlimited'
                        : `Max ${modifier.max_selections}`}
                    </span>
                    <span className={styles.cardDetail}>
                      {modifier.options.length}{' '}
                      {modifier.options.length === 1 ? 'option' : 'options'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionButton} onClick={() => openEdit(modifier)}>
                    Edit
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(modifier)}
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
              form="modifier-form"
              className={styles.submitButton}
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : submitLabel}
            </button>
          </>
        }
      >
        <form id="modifier-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="modifier-name">Name</label>
            <input
              id="modifier-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Butter, Toppings, Size"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="modifier-max-selections">Max Selections</label>
              <input
                id="modifier-max-selections"
                type="number"
                min="0"
                value={formData.max_selections}
                onChange={(e) => setFormData({ ...formData, max_selections: e.target.value })}
                className={styles.input}
              />
              <span className={styles.hint}>0 = unlimited</span>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                />
                Required
              </label>
            </div>
          </div>

          {/* Options Section */}
          <div className={styles.optionsSection}>
            <div className={styles.optionsSectionHeader}>
              <h3 className={styles.optionsSectionTitle}>Options</h3>
              <button type="button" className={styles.addOptionButton} onClick={addOption}>
                + Add Option
              </button>
            </div>

            {formData.options.length === 0 ? (
              <p className={styles.noOptions}>
                No options yet. Add options to this modifier group.
              </p>
            ) : (
              <div className={styles.optionRows}>
                {formData.options.map((option, index) => (
                  <div key={option.key} className={styles.optionRow}>
                    <div className={styles.optionOrderButtons}>
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveOption(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        className={styles.orderButton}
                        onClick={() => moveOption(index, 'down')}
                        disabled={index === formData.options.length - 1}
                        title="Move down"
                      >
                        &#9660;
                      </button>
                    </div>
                    <div className={styles.optionNameInput}>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => updateOption(index, 'name', e.target.value)}
                        placeholder="Option name"
                      />
                    </div>
                    <div className={styles.optionPriceInput}>
                      <input
                        type="number"
                        step="0.01"
                        value={option.price_adjustment}
                        onChange={(e) => updateOption(index, 'price_adjustment', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <label className={styles.optionDefault}>
                      <input
                        type="checkbox"
                        checked={option.is_default}
                        onChange={(e) => updateOption(index, 'is_default', e.target.checked)}
                      />
                      Default
                    </label>
                    <button
                      type="button"
                      className={styles.removeOptionButton}
                      onClick={() => removeOption(index)}
                      title="Remove option"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Drawer>
    </div>
  );
}
