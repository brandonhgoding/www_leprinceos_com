// src/pages/TierDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipTiersApi, benefitRulesApi, benefitConditionsApi } from '../api/memberships';
import { ticketsApi } from '../api/tickets';
import type {
  MembershipTierCreate,
  BenefitRuleCreate,
  BenefitType,
  BenefitScope,
  ConditionType,
  BenefitRule,
  BenefitCondition,
} from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './TierDetail.module.css';

const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const CONDITION_TYPES_BY_SCOPE: Record<string, { value: ConditionType; label: string }[]> = {
  TICKET: [
    { value: 'TIME_BEFORE', label: 'Time Before' },
    { value: 'TIME_AFTER', label: 'Time After' },
    { value: 'DAY_OF_WEEK', label: 'Day of Week' },
    { value: 'TICKET_TYPE', label: 'Ticket Type' },
    { value: 'BIRTHDAY_MONTH', label: 'Birthday Month' },
    { value: 'COMPANION', label: 'Companion Required' },
  ],
  RENTAL: [{ value: 'BIRTHDAY_MONTH', label: 'Birthday Month' }],
};

type ModalMode = 'closed' | 'edit-tier' | 'create-rule' | 'edit-rule';

interface TierFormData {
  name: string;
  description: string;
  price: string;
  duration_months: string;
  is_family_tier: boolean;
  max_family_members: string;
  display_order: string;
  is_active: boolean;
}

interface RuleFormData {
  name: string;
  description: string;
  benefit_type: BenefitType | '';
  benefit_scope: BenefitScope | '';
  value: string;
  monthly_limit: string;
  daily_limit: string;
  priority: string;
  is_active: boolean;
}

interface ConditionFormData {
  condition_type: ConditionType | '';
  reference_value: string;
}

const initialRuleFormData: RuleFormData = {
  name: '',
  description: '',
  benefit_type: '',
  benefit_scope: '',
  value: '',
  monthly_limit: '',
  daily_limit: '',
  priority: '0',
  is_active: true,
};

const initialConditionFormData: ConditionFormData = {
  condition_type: '',
  reference_value: '',
};

export default function TierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const tierId = parseInt(id!);

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [tierFormData, setTierFormData] = useState<TierFormData>({
    name: '',
    description: '',
    price: '',
    duration_months: '12',
    is_family_tier: false,
    max_family_members: '0',
    display_order: '0',
    is_active: true,
  });
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>(initialRuleFormData);
  const [selectedRule, setSelectedRule] = useState<BenefitRule | null>(null);
  const [conditionFormData, setConditionFormData] =
    useState<ConditionFormData>(initialConditionFormData);
  const [activeRuleForCondition, setActiveRuleForCondition] = useState<number | null>(null);

  // Helper to check if a condition type needs a reference value input
  const conditionNeedsInput = (type: ConditionType | '') => {
    return type !== '' && type !== 'BIRTHDAY_MONTH' && type !== 'COMPANION';
  };

  // Helper to format condition reference_value for display
  const formatConditionValue = (condition: BenefitCondition): string => {
    const { condition_type, reference_value } = condition;

    // For no-input conditions
    if (condition_type === 'BIRTHDAY_MONTH') {
      return "Member's birthday month";
    }
    if (condition_type === 'COMPANION') {
      return 'With companion';
    }

    // For day of week, show the day name
    if (condition_type === 'DAY_OF_WEEK') {
      const day = DAYS_OF_WEEK.find((d) => d.value === reference_value);
      return day ? day.label : reference_value;
    }

    // For ticket type, show the ticket type name
    if (condition_type === 'TICKET_TYPE') {
      const ticketType = ticketTypes.find((tt) => String(tt.id) === reference_value);
      return ticketType ? ticketType.name : reference_value;
    }

    // For time values, return as-is (already in HH:MM format)
    return reference_value;
  };

  // Queries
  const { data: tier, isLoading } = useQuery({
    queryKey: ['membership-tiers', tierId],
    queryFn: () => membershipTiersApi.get(tierId),
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => ticketsApi.list(),
  });


  // Mutations
  const updateTierMutation = useMutation({
    mutationFn: (data: Partial<MembershipTierCreate>) => membershipTiersApi.update(tierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      queryClient.invalidateQueries({ queryKey: ['membership-tiers'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update tier.')),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: BenefitRuleCreate) => benefitRulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create benefit rule.')),
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BenefitRuleCreate> }) =>
      benefitRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update benefit rule.')),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => benefitRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete benefit rule.')),
  });

  const addConditionMutation = useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: number;
      data: { condition_type: ConditionType; reference_value: string };
    }) => benefitRulesApi.addCondition(ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      setConditionFormData(initialConditionFormData);
      setActiveRuleForCondition(null);
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to add condition.')),
  });

  const deleteConditionMutation = useMutation({
    mutationFn: (id: number) => benefitConditionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete condition.')),
  });

  // Handlers
  const openEditTierModal = () => {
    if (!tier) return;
    setTierFormData({
      name: tier.name,
      description: tier.description,
      price: tier.price,
      duration_months: String(tier.duration_months),
      is_family_tier: tier.is_family_tier,
      max_family_members: String(tier.max_family_members),
      display_order: String(tier.display_order),
      is_active: tier.is_active,
    });
    setModalMode('edit-tier');
  };

  const openCreateRuleModal = () => {
    setRuleFormData(initialRuleFormData);
    setSelectedRule(null);
    setModalMode('create-rule');
  };

  const openEditRuleModal = (rule: BenefitRule) => {
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      benefit_type: rule.benefit_type,
      benefit_scope: rule.benefit_scope,
      value: rule.value,
      monthly_limit: rule.monthly_limit !== null ? String(rule.monthly_limit) : '',
      daily_limit: rule.daily_limit !== null ? String(rule.daily_limit) : '',
      priority: String(rule.priority),
      is_active: rule.is_active,
    });
    setSelectedRule(rule);
    setModalMode('edit-rule');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedRule(null);
  };

  const handleTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierFormData.name || !tierFormData.price || !tierFormData.duration_months) return;

    const data: Partial<MembershipTierCreate> = {
      name: tierFormData.name,
      description: tierFormData.description || undefined,
      price: tierFormData.price,
      duration_months: parseInt(tierFormData.duration_months),
      is_family_tier: tierFormData.is_family_tier,
      max_family_members: tierFormData.is_family_tier
        ? parseInt(tierFormData.max_family_members)
        : undefined,
      display_order: tierFormData.display_order ? parseInt(tierFormData.display_order) : undefined,
      is_active: tierFormData.is_active,
    };

    updateTierMutation.mutate(data);
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !ruleFormData.name ||
      !ruleFormData.benefit_type ||
      !ruleFormData.benefit_scope ||
      !ruleFormData.value
    )
      return;

    const data: BenefitRuleCreate = {
      tier: tierId,
      name: ruleFormData.name,
      description: ruleFormData.description || undefined,
      benefit_type: ruleFormData.benefit_type as BenefitType,
      benefit_scope: ruleFormData.benefit_scope as BenefitScope,
      value: ruleFormData.value,
      monthly_limit: ruleFormData.monthly_limit ? parseInt(ruleFormData.monthly_limit) : undefined,
      daily_limit: ruleFormData.daily_limit ? parseInt(ruleFormData.daily_limit) : undefined,
      priority: ruleFormData.priority ? parseInt(ruleFormData.priority) : undefined,
      is_active: ruleFormData.is_active,
    };

    if (modalMode === 'create-rule') {
      createRuleMutation.mutate(data);
    } else if (modalMode === 'edit-rule' && selectedRule) {
      updateRuleMutation.mutate({ id: selectedRule.id, data });
    }
  };

  const handleDeleteRule = async (rule: BenefitRule) => {
    if (
      await confirm({
        title: 'Delete Benefit Rule',
        message: `Are you sure you want to delete "${rule.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  const handleAddCondition = (ruleId: number) => {
    if (!conditionFormData.condition_type) {
      alert('Please select a condition type');
      return;
    }

    // Determine the reference value based on condition type
    let referenceValue = conditionFormData.reference_value;

    // For conditions that don't need user input, set a default value
    if (conditionFormData.condition_type === 'BIRTHDAY_MONTH') {
      referenceValue = 'true';
    } else if (conditionFormData.condition_type === 'COMPANION') {
      referenceValue = 'true';
    } else if (!referenceValue) {
      alert('Please fill in the condition value');
      return;
    }

    addConditionMutation.mutate({
      ruleId,
      data: {
        condition_type: conditionFormData.condition_type as ConditionType,
        reference_value: referenceValue,
      },
    });
  };

  const handleDeleteCondition = async (conditionId: number) => {
    if (
      await confirm({
        title: 'Delete Condition',
        message: 'Are you sure you want to delete this condition?',
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteConditionMutation.mutate(conditionId);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        Loading tier details...
      </div>
    );
  }

  if (!tier) {
    return <div className={styles.error}>Tier not found</div>;
  }

  // Sort rules by priority (ascending)
  const sortedRules = [...tier.benefit_rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} onClick={() => navigate('/membership-tiers')}>
            ← Back to Tiers
          </button>
          <h1 className={styles.title}>{tier.name}</h1>
          <p className={styles.subtitle}>
            {formatPrice(tier.price)} / {tier.duration_months} months
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={openEditTierModal}>
            Edit Tier
          </button>
          <button className={styles.primaryButton} onClick={openCreateRuleModal}>
            + New Benefit Rule
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Tier Info Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Tier Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Type</div>
              <div className={styles.infoValue}>
                {tier.is_family_tier ? `Family (max ${tier.max_family_members})` : 'Individual'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Display Order</div>
              <div className={styles.infoValue}>{tier.display_order}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Status</div>
              <div className={styles.infoValue}>
                {tier.is_active ? (
                  <span className={styles.statusActive}>Active</span>
                ) : (
                  <span className={styles.statusInactive}>Inactive</span>
                )}
              </div>
            </div>
          </div>
          {tier.description && (
            <div className={styles.description}>
              <div className={styles.infoLabel}>Description</div>
              <p>{tier.description}</p>
            </div>
          )}
        </div>

        {/* Benefit Rules Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Benefit Rules ({sortedRules.length})</h2>
          {sortedRules.length === 0 ? (
            <p className={styles.emptyMessage}>
              No benefit rules defined yet. Create one to get started.
            </p>
          ) : (
            <div className={styles.rulesList}>
              {sortedRules.map((rule) => (
                <div key={rule.id} className={styles.ruleItem}>
                  <div className={styles.ruleHeader}>
                    <div>
                      <div className={styles.ruleName}>{rule.name}</div>
                      <div className={styles.ruleType}>
                        {rule.benefit_type_display} • {rule.benefit_scope_display} • Value:{' '}
                        {rule.value}
                      </div>
                      {rule.description && (
                        <div className={styles.ruleDescription}>{rule.description}</div>
                      )}
                    </div>
                    <div className={styles.ruleActions}>
                      <span className={styles.priority}>Priority: {rule.priority}</span>
                      {rule.is_active ? (
                        <span className={styles.statusActive}>Active</span>
                      ) : (
                        <span className={styles.statusInactive}>Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Rule limits */}
                  <div className={styles.ruleLimits}>
                    {rule.monthly_limit && <span>Monthly: {rule.monthly_limit}</span>}
                    {rule.daily_limit && <span>Daily: {rule.daily_limit}</span>}
                    {!rule.monthly_limit && !rule.daily_limit && <span>Unlimited</span>}
                  </div>

                  {/* Conditions */}
                  <div className={styles.conditions}>
                    <div className={styles.conditionsHeader}>
                      <span className={styles.conditionsLabel}>Conditions</span>
                      {activeRuleForCondition === rule.id ? (
                        <button
                          className={styles.cancelConditionButton}
                          onClick={() => {
                            setActiveRuleForCondition(null);
                            setConditionFormData(initialConditionFormData);
                          }}
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          className={styles.addConditionButton}
                          onClick={() => setActiveRuleForCondition(rule.id)}
                        >
                          + Add Condition
                        </button>
                      )}
                    </div>

                    {rule.conditions.length > 0 && (
                      <div className={styles.conditionsList}>
                        {rule.conditions.map((condition: BenefitCondition) => (
                          <div key={condition.id} className={styles.conditionItem}>
                            <span>
                              {condition.condition_type_display}: {formatConditionValue(condition)}
                            </span>
                            <button
                              className={styles.deleteConditionButton}
                              onClick={() => handleDeleteCondition(condition.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeRuleForCondition === rule.id && (
                      <div className={styles.conditionForm}>
                        <select
                          value={conditionFormData.condition_type}
                          onChange={(e) =>
                            setConditionFormData({
                              condition_type: e.target.value as ConditionType,
                              reference_value: '', // Reset value when type changes
                            })
                          }
                          className={styles.conditionSelect}
                        >
                          <option value="">Select condition type...</option>
                          {(CONDITION_TYPES_BY_SCOPE[rule.benefit_scope] || []).map((ct) => (
                            <option key={ct.value} value={ct.value}>
                              {ct.label}
                            </option>
                          ))}
                        </select>

                        {/* Time picker for TIME_BEFORE and TIME_AFTER */}
                        {(conditionFormData.condition_type === 'TIME_BEFORE' ||
                          conditionFormData.condition_type === 'TIME_AFTER') && (
                          <input
                            type="time"
                            value={conditionFormData.reference_value}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                reference_value: e.target.value,
                              })
                            }
                            className={styles.conditionInput}
                          />
                        )}

                        {/* Day of week selector */}
                        {conditionFormData.condition_type === 'DAY_OF_WEEK' && (
                          <select
                            value={conditionFormData.reference_value}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                reference_value: e.target.value,
                              })
                            }
                            className={styles.conditionInput}
                          >
                            <option value="">Select day...</option>
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Ticket type selector */}
                        {conditionFormData.condition_type === 'TICKET_TYPE' && (
                          <select
                            value={conditionFormData.reference_value}
                            onChange={(e) =>
                              setConditionFormData({
                                ...conditionFormData,
                                reference_value: e.target.value,
                              })
                            }
                            className={styles.conditionInput}
                          >
                            <option value="">Select ticket type...</option>
                            {ticketTypes.map((tt) => (
                              <option key={tt.id} value={String(tt.id)}>
                                {tt.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* No input needed for BIRTHDAY_MONTH and COMPANION */}
                        {conditionFormData.condition_type === 'BIRTHDAY_MONTH' && (
                          <span className={styles.conditionHint}>
                            Applies during member's birthday month
                          </span>
                        )}

                        {conditionFormData.condition_type === 'COMPANION' && (
                          <span className={styles.conditionHint}>
                            Applies when member has companions
                          </span>
                        )}

                        <button
                          className={styles.addConditionSubmitButton}
                          onClick={() => handleAddCondition(rule.id)}
                          disabled={
                            !conditionFormData.condition_type ||
                            (conditionNeedsInput(conditionFormData.condition_type) &&
                              !conditionFormData.reference_value)
                          }
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rule actions */}
                  <div className={styles.ruleFooter}>
                    <button
                      className={styles.editRuleButton}
                      onClick={() => openEditRuleModal(rule)}
                    >
                      Edit Rule
                    </button>
                    <button
                      className={styles.deleteRuleButton}
                      onClick={() => handleDeleteRule(rule)}
                    >
                      Delete Rule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Tier Drawer */}
      <Drawer
        isOpen={modalMode === 'edit-tier'}
        onClose={closeModal}
        title="Edit Tier"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="tier-form"
              className={styles.submitButton}
              disabled={updateTierMutation.isPending}
            >
              {updateTierMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="tier-form" onSubmit={handleTierSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="tier-detail-name">Tier Name *</label>
            <input
              id="tier-detail-name"
              type="text"
              value={tierFormData.name}
              onChange={(e) => setTierFormData({ ...tierFormData, name: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tier-detail-description">Description</label>
            <textarea
              id="tier-detail-description"
              value={tierFormData.description}
              onChange={(e) => setTierFormData({ ...tierFormData, description: e.target.value })}
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="tier-detail-price">Price *</label>
              <input
                id="tier-detail-price"
                type="number"
                min="0"
                step="0.01"
                value={tierFormData.price}
                onChange={(e) => setTierFormData({ ...tierFormData, price: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="tier-detail-duration">Duration (months) *</label>
              <input
                id="tier-detail-duration"
                type="number"
                min="1"
                value={tierFormData.duration_months}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, duration_months: e.target.value })
                }
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={tierFormData.is_family_tier}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, is_family_tier: e.target.checked })
                }
              />
              Family Tier
            </label>
          </div>

          {tierFormData.is_family_tier && (
            <div className={styles.formGroup}>
              <label htmlFor="tier-detail-max-family">Maximum Family Members</label>
              <input
                id="tier-detail-max-family"
                type="number"
                min="1"
                value={tierFormData.max_family_members}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, max_family_members: e.target.value })
                }
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="tier-detail-display-order">Display Order</label>
              <input
                id="tier-detail-display-order"
                type="number"
                min="0"
                value={tierFormData.display_order}
                onChange={(e) =>
                  setTierFormData({ ...tierFormData, display_order: e.target.value })
                }
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={tierFormData.is_active}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
          </div>
        </form>
      </Drawer>

      {/* Create/Edit Benefit Rule Drawer */}
      <Drawer
        isOpen={modalMode === 'create-rule' || modalMode === 'edit-rule'}
        onClose={closeModal}
        title={modalMode === 'create-rule' ? 'New Benefit Rule' : 'Edit Benefit Rule'}
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
                : modalMode === 'create-rule'
                  ? 'Create Rule'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="rule-form" onSubmit={handleRuleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="benefit-rule-name">Rule Name *</label>
            <input
              id="benefit-rule-name"
              type="text"
              value={ruleFormData.name}
              onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Matinee Discount"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="benefit-rule-description">Description</label>
            <textarea
              id="benefit-rule-description"
              value={ruleFormData.description}
              onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
              className={styles.textarea}
              rows={2}
              placeholder="Optional description for staff"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="benefit-rule-type">Benefit Type *</label>
              <select
                id="benefit-rule-type"
                value={ruleFormData.benefit_type}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    benefit_type: e.target.value as BenefitType,
                  })
                }
                required
                className={styles.input}
              >
                <option value="">Select type...</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FREE_ITEM">Free Item</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="benefit-rule-scope">Benefit Scope *</label>
              <select
                id="benefit-rule-scope"
                value={ruleFormData.benefit_scope}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    benefit_scope: e.target.value as BenefitScope,
                  })
                }
                required
                className={styles.input}
              >
                <option value="">Select scope...</option>
                <option value="TICKET">Ticket</option>
                <option value="RENTAL">Rental</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="benefit-rule-value">Value *</label>
            <input
              id="benefit-rule-value"
              type="number"
              min="0"
              step="0.01"
              value={ruleFormData.value}
              onChange={(e) => setRuleFormData({ ...ruleFormData, value: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., 5.00 for $5 off, 10 for 10%"
            />
            <small className={styles.helpText}>Enter dollar amount (5.00) or percentage (10)</small>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="benefit-rule-monthly-limit">Monthly Limit</label>
              <input
                id="benefit-rule-monthly-limit"
                type="number"
                min="0"
                value={ruleFormData.monthly_limit}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, monthly_limit: e.target.value })
                }
                className={styles.input}
                placeholder="Leave blank for unlimited"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="benefit-rule-daily-limit">Daily Limit</label>
              <input
                id="benefit-rule-daily-limit"
                type="number"
                min="0"
                value={ruleFormData.daily_limit}
                onChange={(e) => setRuleFormData({ ...ruleFormData, daily_limit: e.target.value })}
                className={styles.input}
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="benefit-rule-priority">Priority</label>
              <input
                id="benefit-rule-priority"
                type="number"
                min="0"
                value={ruleFormData.priority}
                onChange={(e) => setRuleFormData({ ...ruleFormData, priority: e.target.value })}
                className={styles.input}
              />
              <small className={styles.helpText}>Lower numbers apply first</small>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={ruleFormData.is_active}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, is_active: e.target.checked })
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
