// src/pages/TicketDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api';
import type { TicketTypeRule, TicketTypeRuleCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './TicketDetail.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface RuleFormData {
  name: string;
  is_active: boolean;
  priority: number | '';
  matinee_cutoff_time: string;
  days_of_week_list: number[];
  presentation_format: '2d' | '3d' | '';
  requires_3d_screen: boolean | '';
  screen_type: 'standard' | 'imax' | 'dolby_cinema' | '';
}

const initialFormData: RuleFormData = {
  name: '',
  is_active: true,
  priority: '',
  matinee_cutoff_time: '',
  days_of_week_list: [],
  presentation_format: '',
  requires_3d_screen: '',
  screen_type: '',
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const SCREEN_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  imax: 'IMAX',
  dolby_cinema: 'Dolby Cinema',
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  return isNaN(num) ? price : `$${num.toFixed(2)}`;
}

function getDaysLabel(days: number[]): string {
  if (days.length === 0) return 'All days';
  if (days.length === 7) return 'Every day';
  return days.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.slice(0, 3)).join(', ');
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketTypeId = parseInt(id || '0');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { confirm } = useConfirm();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedRule, setSelectedRule] = useState<TicketTypeRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(initialFormData);

  // Fetch ticket type with rules
  const { data: ticketType, isLoading } = useQuery({
    queryKey: ['ticket-type', ticketTypeId],
    queryFn: () => ticketsApi.get(ticketTypeId),
    enabled: ticketTypeId > 0,
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: TicketTypeRuleCreate) => ticketsApi.createRule(ticketTypeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-type', ticketTypeId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create pricing rule.')),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TicketTypeRuleCreate> }) =>
      ticketsApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-type', ticketTypeId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update pricing rule.')),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-type', ticketTypeId] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete pricing rule.')),
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedRule(null);
    setModalMode('create');
  };

  const openEditModal = (rule: TicketTypeRule) => {
    setFormData({
      name: rule.name,
      is_active: rule.is_active,
      priority: rule.priority,
      matinee_cutoff_time: rule.matinee_cutoff_time || '',
      days_of_week_list: rule.days_of_week_list || [],
      presentation_format: rule.presentation_format || '',
      requires_3d_screen: rule.requires_3d_screen ?? '',
      screen_type: rule.screen_type || '',
    });
    setSelectedRule(rule);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedRule(null);
    setFormData(initialFormData);
  };

  const handleDayToggle = (day: number) => {
    const currentDays = formData.days_of_week_list;
    if (currentDays.includes(day)) {
      setFormData({ ...formData, days_of_week_list: currentDays.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, days_of_week_list: [...currentDays, day].sort() });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name === '') return;

    const data: TicketTypeRuleCreate = {
      name: formData.name,
      is_active: formData.is_active,
      priority: formData.priority === '' ? undefined : (formData.priority as number),
      matinee_cutoff_time: formData.matinee_cutoff_time || null,
      days_of_week_list:
        formData.days_of_week_list.length > 0 ? formData.days_of_week_list : undefined,
      presentation_format: formData.presentation_format || null,
      requires_3d_screen:
        formData.requires_3d_screen === '' ? null : (formData.requires_3d_screen as boolean),
      screen_type: formData.screen_type || null,
    };

    if (modalMode === 'create') {
      createRuleMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedRule) {
      updateRuleMutation.mutate({ id: selectedRule.id, data });
    }
  };

  const handleDelete = async (rule: TicketTypeRule) => {
    if (
      await confirm({
        title: 'Delete Pricing Rule',
        message: `Are you sure you want to delete the rule "${rule.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  // Sort rules by priority
  const sortedRules = ticketType?.rules
    ? [...ticketType.rules].sort((a, b) => a.priority - b.priority)
    : [];

  if (isLoading) {
    return <div className={styles.loading}>Loading ticket type...</div>;
  }

  if (!ticketType) {
    return (
      <div className={styles.notFound}>
        <p>Ticket type not found.</p>
        <Link to="/tickets" className={styles.backLink}>
          &larr; Back to Ticket Types
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link to="/tickets" className={styles.backLink}>
            &larr; Back to Ticket Types
          </Link>
          <h1 className={styles.title}>{ticketType.name}</h1>
          <p className={styles.subtitle}>Manage pricing rules for this ticket type</p>
        </div>
      </div>

      {/* Ticket Type Info Card */}
      <div className={styles.infoCard}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Price</span>
            <span className={styles.value}>{formatPrice(ticketType.price)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Status</span>
            <span
              className={`${styles.statusBadge} ${
                ticketType.is_active ? styles.statusActive : styles.statusInactive
              }`}
            >
              {ticketType.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Active Rules</span>
            <span className={styles.value}>{ticketType.rules_count}</span>
          </div>
        </div>
        {ticketType.description && (
          <div className={styles.description}>
            <span className={styles.label}>Description</span>
            <p>{ticketType.description}</p>
          </div>
        )}
      </div>

      {/* Rules Section */}
      <section className={styles.rulesSection}>
        <div className={styles.rulesHeader}>
          <h2 className={styles.sectionTitle}>Pricing Rules</h2>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            + Add Rule
          </button>
        </div>

        <div className={styles.rulesInfo}>
          Rules determine when this ticket type is available. Rules are evaluated in priority order
          (lower number = higher priority). A showtime must match all non-null conditions of a rule
          to use this ticket type.
        </div>

        {sortedRules.length === 0 ? (
          <div className={styles.empty}>
            <p>No rules defined. This ticket type will be available for all showtimes.</p>
            <button className={styles.primaryButton} onClick={openCreateModal}>
              Add your first rule
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Name</th>
                    <th>Days</th>
                    <th>Matinee</th>
                    <th>Format</th>
                    <th>Screen Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRules.map((rule) => (
                    <tr key={rule.id} className={!rule.is_active ? styles.inactiveRow : ''}>
                      <td className={styles.priorityCell}>{rule.priority}</td>
                      <td className={styles.ruleName}>{rule.name}</td>
                      <td>{getDaysLabel(rule.days_of_week_list)}</td>
                      <td>
                        {rule.matinee_cutoff_time ? (
                          <span>Before {rule.matinee_cutoff_time}</span>
                        ) : (
                          <span className={styles.anyValue}>Any</span>
                        )}
                      </td>
                      <td>
                        {rule.presentation_format ? (
                          <span className={styles.formatBadge}>
                            {rule.presentation_format.toUpperCase()}
                          </span>
                        ) : (
                          <span className={styles.anyValue}>Any</span>
                        )}
                      </td>
                      <td>
                        {rule.screen_type ? (
                          <span>{SCREEN_TYPE_LABELS[rule.screen_type]}</span>
                        ) : (
                          <span className={styles.anyValue}>Any</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            rule.is_active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => openEditModal(rule)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => handleDelete(rule)}
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
              {sortedRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`${styles.card} ${!rule.is_active ? styles.cardInactive : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <span className={styles.cardPriority}>#{rule.priority}</span>
                      <h3 className={styles.cardTitle}>{rule.name}</h3>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        rule.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardDetail}>
                      <span className={styles.cardLabel}>Days</span>
                      <span className={styles.cardValue}>
                        {getDaysLabel(rule.days_of_week_list)}
                      </span>
                    </div>
                    <div className={styles.cardDetail}>
                      <span className={styles.cardLabel}>Matinee</span>
                      <span className={styles.cardValue}>
                        {rule.matinee_cutoff_time ? `Before ${rule.matinee_cutoff_time}` : 'Any'}
                      </span>
                    </div>
                    <div className={styles.cardDetail}>
                      <span className={styles.cardLabel}>Format</span>
                      <span className={styles.cardValue}>
                        {rule.presentation_format ? rule.presentation_format.toUpperCase() : 'Any'}
                      </span>
                    </div>
                    <div className={styles.cardDetail}>
                      <span className={styles.cardLabel}>Screen Type</span>
                      <span className={styles.cardValue}>
                        {rule.screen_type ? SCREEN_TYPE_LABELS[rule.screen_type] : 'Any'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionButton} onClick={() => openEditModal(rule)}>
                      Edit
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(rule)}
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

      {/* Create/Edit Rule Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Add Rule' : 'Edit Rule'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="rule-form"
              className={styles.submitButton}
              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
            >
              {createRuleMutation.isPending || updateRuleMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Add Rule'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="rule-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="rule-name">Rule Name</label>
              <input
                id="rule-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., Weekday Matinee, Weekend Evening"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="rule-priority">Priority</label>
              <input
                id="rule-priority"
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value ? parseInt(e.target.value) : '',
                  })
                }
                min="0"
                className={styles.input}
                placeholder="Lower = higher priority"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Days of Week</label>
            <div className={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className={styles.dayCheckbox}>
                  <input
                    type="checkbox"
                    checked={formData.days_of_week_list.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                  />
                  <span>{day.label.slice(0, 3)}</span>
                </label>
              ))}
            </div>
            <span className={styles.fieldHint}>Leave empty to apply to all days</span>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="rule-matinee-cutoff">Matinee Cutoff Time</label>
              <input
                id="rule-matinee-cutoff"
                type="time"
                value={formData.matinee_cutoff_time}
                onChange={(e) => setFormData({ ...formData, matinee_cutoff_time: e.target.value })}
                className={styles.input}
              />
              <span className={styles.fieldHint}>Applies to showtimes before this time</span>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="rule-presentation-format">Presentation Format</label>
              <select
                id="rule-presentation-format"
                value={formData.presentation_format}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    presentation_format: e.target.value as RuleFormData['presentation_format'],
                  })
                }
                className={styles.input}
              >
                <option value="">Any</option>
                <option value="2d">2D</option>
                <option value="3d">3D</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="rule-screen-type">Screen Type</label>
              <select
                id="rule-screen-type"
                value={formData.screen_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    screen_type: e.target.value as RuleFormData['screen_type'],
                  })
                }
                className={styles.input}
              >
                <option value="">Any</option>
                <option value="standard">Standard</option>
                <option value="imax">IMAX</option>
                <option value="dolby_cinema">Dolby Cinema</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="rule-requires-3d">Requires 3D Screen</label>
              <select
                id="rule-requires-3d"
                value={
                  formData.requires_3d_screen === ''
                    ? ''
                    : formData.requires_3d_screen
                      ? 'true'
                      : 'false'
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requires_3d_screen: e.target.value === '' ? '' : e.target.value === 'true',
                  })
                }
                className={styles.input}
              >
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
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
              Rule is active
            </label>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
