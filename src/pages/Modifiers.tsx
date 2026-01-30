// src/pages/Modifiers.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modifiersApi } from '../api';
import type {
  Modifier,
  ModifierCreate,
  ModifierGroup,
  ModifierGroupCreate,
  ModifierGroupDetail,
} from '../api/types';
import Drawer from '../components/Drawer';
import styles from './Modifiers.module.css';

type ModalType = 'group' | 'modifier';
type ModalMode = 'closed' | 'create' | 'edit';

interface GroupFormData {
  name: string;
  internal_name: string;
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selections: string;
  max_selections: string;
  is_required: boolean;
  is_active: boolean;
}

interface ModifierFormData {
  name: string;
  price_adjustment: string;
  on_by_default: boolean;
  is_active: boolean;
}

const initialGroupForm: GroupFormData = {
  name: '',
  internal_name: '',
  selection_type: 'MULTIPLE',
  min_selections: '0',
  max_selections: '',
  is_required: false,
  is_active: true,
};

const initialModifierForm: ModifierFormData = {
  name: '',
  price_adjustment: '0.00',
  on_by_default: false,
  is_active: true,
};

export default function Modifiers() {
  const queryClient = useQueryClient();

  // UI State
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Modal state
  const [modalType, setModalType] = useState<ModalType>('group');
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroupDetail | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<Modifier | null>(null);

  // Form data
  const [groupForm, setGroupForm] = useState<GroupFormData>(initialGroupForm);
  const [modifierForm, setModifierForm] = useState<ModifierFormData>(initialModifierForm);

  // Context for creating modifiers
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);

  // Queries
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => modifiersApi.listGroups(),
  });

  // Fetch group details for expanded groups
  const groupQueries = useQuery({
    queryKey: ['modifier-groups-detail', Array.from(expandedGroups)],
    queryFn: async () => {
      const details = await Promise.all(
        Array.from(expandedGroups).map((id) => modifiersApi.getGroup(id))
      );
      return details.reduce(
        (acc, group) => {
          acc[group.id] = group;
          return acc;
        },
        {} as Record<number, ModifierGroupDetail>
      );
    },
    enabled: expandedGroups.size > 0,
  });

  const groupDetails = groupQueries.data || {};

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (data: ModifierGroupCreate) => modifiersApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
      closeModal();
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ModifierGroupCreate> }) =>
      modifiersApi.updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['modifier-groups-detail'] });
      closeModal();
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => modifiersApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
    },
  });

  const createModifierMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: ModifierCreate }) =>
      modifiersApi.createModifier(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['modifier-groups-detail'] });
      closeModal();
    },
  });

  const updateModifierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ModifierCreate> }) =>
      modifiersApi.updateModifier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups-detail'] });
      closeModal();
    },
  });

  const deleteModifierMutation = useMutation({
    mutationFn: (id: number) => modifiersApi.deleteModifier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
      queryClient.invalidateQueries({ queryKey: ['modifier-groups-detail'] });
    },
  });

  // Handlers
  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedGroup(null);
    setSelectedModifier(null);
    setTargetGroupId(null);
    setGroupForm(initialGroupForm);
    setModifierForm(initialModifierForm);
  };

  // Group modal handlers
  const openCreateGroupModal = () => {
    setGroupForm(initialGroupForm);
    setModalType('group');
    setModalMode('create');
  };

  const openEditGroupModal = (group: ModifierGroupDetail | ModifierGroup) => {
    setGroupForm({
      name: group.name,
      internal_name: group.internal_name,
      selection_type: group.selection_type,
      min_selections: String(group.min_selections),
      max_selections: group.max_selections !== null ? String(group.max_selections) : '',
      is_required: group.is_required,
      is_active: group.is_active,
    });
    setSelectedGroup(group as ModifierGroupDetail);
    setModalType('group');
    setModalMode('edit');
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name) return;

    const data: ModifierGroupCreate = {
      name: groupForm.name,
      internal_name: groupForm.internal_name || undefined,
      selection_type: groupForm.selection_type,
      min_selections: parseInt(groupForm.min_selections) || 0,
      max_selections: groupForm.max_selections ? parseInt(groupForm.max_selections) : null,
      is_required: groupForm.is_required,
      is_active: groupForm.is_active,
    };

    if (modalMode === 'create') {
      createGroupMutation.mutate(data);
    } else if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, data });
    }
  };

  const handleDeleteGroup = (group: ModifierGroup) => {
    if (
      window.confirm(
        `Delete modifier group "${group.name}"? This will also delete all modifiers in this group.`
      )
    ) {
      deleteGroupMutation.mutate(group.id);
    }
  };

  // Modifier modal handlers
  const openCreateModifierModal = (groupId: number) => {
    setModifierForm(initialModifierForm);
    setTargetGroupId(groupId);
    setModalType('modifier');
    setModalMode('create');
  };

  const openEditModifierModal = (modifier: Modifier) => {
    setModifierForm({
      name: modifier.name,
      price_adjustment: modifier.price_adjustment,
      on_by_default: modifier.on_by_default,
      is_active: modifier.is_active,
    });
    setSelectedModifier(modifier);
    setModalType('modifier');
    setModalMode('edit');
  };

  const handleModifierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifierForm.name) return;

    const data: ModifierCreate = {
      name: modifierForm.name,
      price_adjustment: modifierForm.price_adjustment || '0.00',
      on_by_default: modifierForm.on_by_default,
      is_active: modifierForm.is_active,
    };

    if (modalMode === 'create' && targetGroupId) {
      createModifierMutation.mutate({ groupId: targetGroupId, data });
    } else if (selectedModifier) {
      updateModifierMutation.mutate({ id: selectedModifier.id, data });
    }
  };

  const handleDeleteModifier = (modifier: Modifier) => {
    if (window.confirm(`Delete modifier "${modifier.name}"?`)) {
      deleteModifierMutation.mutate(modifier.id);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num) || num === 0) return null;
    const sign = num > 0 ? '+' : '';
    return `${sign}$${Math.abs(num).toFixed(2)}`;
  };

  const formatSelectionRule = (group: ModifierGroup) => {
    if (group.selection_type === 'SINGLE') {
      return 'Single selection';
    }
    const min = group.min_selections;
    const max = group.max_selections;
    if (min === 0 && max === null) return 'Multiple (optional)';
    if (min > 0 && max === null) return `Min ${min}`;
    if (min === 0 && max !== null) return `Max ${max}`;
    if (min === max) return `Exactly ${min}`;
    return `${min}-${max}`;
  };

  const isPending =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    createModifierMutation.isPending ||
    updateModifierMutation.isPending;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Modifier Groups</h1>
          <p className={styles.subtitle}>
            Manage modifier groups and options for your concession items.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateGroupModal}>
          + New Modifier Group
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading modifier groups...</div>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>
          <p>No modifier groups yet.</p>
          <button className={styles.primaryButton} onClick={openCreateGroupModal}>
            Add your first modifier group
          </button>
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const detail = groupDetails[group.id];

            return (
              <div key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader} onClick={() => toggleGroup(group.id)}>
                  <div className={styles.groupInfo}>
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
                    <span className={styles.groupName}>{group.name}</span>
                    <span
                      className={`${styles.statusBadge} ${group.is_active ? styles.statusActive : styles.statusInactive}`}
                    >
                      {group.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.groupMeta}>
                    <span className={styles.selectionRule}>{formatSelectionRule(group)}</span>
                    <span className={styles.modifiersCount}>
                      {group.modifiers_count}{' '}
                      {group.modifiers_count === 1 ? 'modifier' : 'modifiers'}
                    </span>
                    <div className={styles.groupActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditGroupModal(group)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDeleteGroup(group)}
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
                        <div className={styles.modifiersList}>
                          {detail.modifiers.map((modifier) => {
                            const priceDisplay = formatPrice(modifier.price_adjustment);
                            const priceNum = parseFloat(modifier.price_adjustment);

                            return (
                              <div key={modifier.id} className={styles.modifierRow}>
                                <div className={styles.modifierInfo}>
                                  <span className={styles.modifierName}>{modifier.name}</span>
                                  {modifier.on_by_default && (
                                    <span className={styles.defaultBadge}>Default</span>
                                  )}
                                  <span
                                    className={`${styles.statusBadge} ${modifier.is_active ? styles.statusActive : styles.statusInactive}`}
                                  >
                                    {modifier.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className={styles.modifierMeta}>
                                  {priceDisplay && (
                                    <span
                                      className={`${styles.priceAdjustment} ${priceNum > 0 ? styles.pricePositive : styles.priceNegative}`}
                                    >
                                      {priceDisplay}
                                    </span>
                                  )}
                                  <div className={styles.modifierActions}>
                                    <button
                                      className={`${styles.actionButton} ${styles.smallActionButton}`}
                                      onClick={() => openEditModifierModal(modifier)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className={`${styles.actionButton} ${styles.smallActionButton} ${styles.deleteButton}`}
                                      onClick={() => handleDeleteModifier(modifier)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          className={styles.addModifierButton}
                          onClick={() => openCreateModifierModal(group.id)}
                        >
                          + Add Modifier
                        </button>
                      </>
                    ) : (
                      <div className={styles.loading}>Loading modifiers...</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Group Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed' && modalType === 'group'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Modifier Group' : 'Edit Modifier Group'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitButton}
              disabled={isPending}
              onClick={() => {
                const form = document.getElementById('group-form') as HTMLFormElement;
                form?.requestSubmit();
              }}
            >
              {isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Create Group'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="group-form" onSubmit={handleGroupSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Toppings, Extras, Flavors"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Internal Name (optional)</label>
            <input
              type="text"
              value={groupForm.internal_name}
              onChange={(e) => setGroupForm({ ...groupForm, internal_name: e.target.value })}
              className={styles.input}
              placeholder="Internal notes (not shown to customers)"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Selection Type</label>
              <select
                value={groupForm.selection_type}
                onChange={(e) =>
                  setGroupForm({
                    ...groupForm,
                    selection_type: e.target.value as 'SINGLE' | 'MULTIPLE',
                  })
                }
                className={styles.select}
              >
                <option value="SINGLE">Single Selection</option>
                <option value="MULTIPLE">Multiple Selection</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={groupForm.is_required}
                  onChange={(e) => setGroupForm({ ...groupForm, is_required: e.target.checked })}
                />
                Required
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Min Selections</label>
              <input
                type="number"
                min="0"
                value={groupForm.min_selections}
                onChange={(e) => setGroupForm({ ...groupForm, min_selections: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Max Selections (blank = unlimited)</label>
              <input
                type="number"
                min="1"
                value={groupForm.max_selections}
                onChange={(e) => setGroupForm({ ...groupForm, max_selections: e.target.value })}
                className={styles.input}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={groupForm.is_active}
                onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </form>
      </Drawer>

      {/* Modifier Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed' && modalType === 'modifier'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Modifier' : 'Edit Modifier'}
        width="sm"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitButton}
              disabled={isPending}
              onClick={() => {
                const form = document.getElementById('modifier-form') as HTMLFormElement;
                form?.requestSubmit();
              }}
            >
              {isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Create Modifier'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="modifier-form" onSubmit={handleModifierSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={modifierForm.name}
              onChange={(e) => setModifierForm({ ...modifierForm, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Extra Butter, Jalapenos"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Price Adjustment</label>
            <input
              type="text"
              value={modifierForm.price_adjustment}
              onChange={(e) =>
                setModifierForm({ ...modifierForm, price_adjustment: e.target.value })
              }
              className={styles.input}
              placeholder="e.g., 0.50, -1.00, or 0.00 for free"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={modifierForm.on_by_default}
                  onChange={(e) =>
                    setModifierForm({ ...modifierForm, on_by_default: e.target.checked })
                  }
                />
                Selected by default
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={modifierForm.is_active}
                  onChange={(e) =>
                    setModifierForm({ ...modifierForm, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
