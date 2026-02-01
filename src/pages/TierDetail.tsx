// src/pages/TierDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  membershipTiersApi,
  benefitRulesApi,
  benefitConditionsApi,
} from '../api/memberships';
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
import styles from './TierDetail.module.css';

type ModalMode = 'closed' | 'edit-tier' | 'create-rule' | 'edit-rule';

interface TierFormData {
  name: string;
  slug: string;
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
  const tierId = parseInt(id!);

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [tierFormData, setTierFormData] = useState<TierFormData>({
    name: '',
    slug: '',
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

  // Queries
  const { data: tier, isLoading } = useQuery({
    queryKey: ['membership-tiers', tierId],
    queryFn: () => membershipTiersApi.get(tierId),
  });

  // Mutations
  const updateTierMutation = useMutation({
    mutationFn: (data: Partial<MembershipTierCreate>) =>
      membershipTiersApi.update(tierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      queryClient.invalidateQueries({ queryKey: ['membership-tiers'] });
      closeModal();
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: BenefitRuleCreate) => benefitRulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      closeModal();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BenefitRuleCreate> }) =>
      benefitRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
      closeModal();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => benefitRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
    },
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
  });

  const deleteConditionMutation = useMutation({
    mutationFn: (id: number) => benefitConditionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers', tierId] });
    },
  });

  // Handlers
  const openEditTierModal = () => {
    if (!tier) return;
    setTierFormData({
      name: tier.name,
      slug: tier.slug,
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
      slug: tierFormData.slug || undefined,
      description: tierFormData.description || undefined,
      price: tierFormData.price,
      duration_months: parseInt(tierFormData.duration_months),
      is_family_tier: tierFormData.is_family_tier,
      max_family_members: tierFormData.is_family_tier
        ? parseInt(tierFormData.max_family_members)
        : undefined,
      display_order: tierFormData.display_order
        ? parseInt(tierFormData.display_order)
        : undefined,
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
      monthly_limit: ruleFormData.monthly_limit
        ? parseInt(ruleFormData.monthly_limit)
        : undefined,
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

  const handleDeleteRule = (rule: BenefitRule) => {
    if (window.confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  const handleAddCondition = (ruleId: number) => {
    if (!conditionFormData.condition_type || !conditionFormData.reference_value) {
      alert('Please fill in both condition type and value');
      return;
    }

    addConditionMutation.mutate({
      ruleId,
      data: {
        condition_type: conditionFormData.condition_type as ConditionType,
        reference_value: conditionFormData.reference_value,
      },
    });
  };

  const handleDeleteCondition = (conditionId: number) => {
    if (window.confirm('Are you sure you want to delete this condition?')) {
      deleteConditionMutation.mutate(conditionId);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading tier details...</div>;
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
          <button
            className={styles.backButton}
            onClick={() => navigate('/membership-tiers')}
          >
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
              <div className={styles.infoLabel}>Slug</div>
              <div className={styles.infoValue}>{tier.slug}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Type</div>
              <div className={styles.infoValue}>
                {tier.is_family_tier
                  ? `Family (max ${tier.max_family_members})`
                  : 'Individual'}
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
                              {condition.condition_type_display}:{' '}
                              {condition.reference_value}
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
                              ...conditionFormData,
                              condition_type: e.target.value as ConditionType,
                            })
                          }
                          className={styles.conditionSelect}
                        >
                          <option value="">Select condition type...</option>
                          <option value="TIME_BEFORE">Time Before</option>
                          <option value="TIME_AFTER">Time After</option>
                          <option value="DAY_OF_WEEK">Day of Week</option>
                          <option value="TICKET_TYPE">Ticket Type</option>
                          <option value="CONCESSION_CATEGORY">Concession Category</option>
                          <option value="CONCESSION_ITEM">Concession Item</option>
                          <option value="BIRTHDAY_MONTH">Birthday Month</option>
                          <option value="COMPANION">Companion Required</option>
                        </select>
                        <input
                          type="text"
                          value={conditionFormData.reference_value}
                          onChange={(e) =>
                            setConditionFormData({
                              ...conditionFormData,
                              reference_value: e.target.value,
                            })
                          }
                          placeholder="Value (e.g., 18:00, 2, adult_ticket)"
                          className={styles.conditionInput}
                        />
                        <button
                          className={styles.addConditionSubmitButton}
                          onClick={() => handleAddCondition(rule.id)}
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
            <label>Tier Name *</label>
            <input
              type="text"
              value={tierFormData.name}
              onChange={(e) => setTierFormData({ ...tierFormData, name: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Slug</label>
            <input
              type="text"
              value={tierFormData.slug}
              onChange={(e) => setTierFormData({ ...tierFormData, slug: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={tierFormData.description}
              onChange={(e) =>
                setTierFormData({ ...tierFormData, description: e.target.value })
              }
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Price *</label>
              <input
                type="text"
                value={tierFormData.price}
                onChange={(e) => setTierFormData({ ...tierFormData, price: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Duration (months) *</label>
              <input
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
              <label>Maximum Family Members</label>
              <input
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
              <label>Display Order</label>
              <input
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
            <label>Rule Name *</label>
            <input
              type="text"
              value={ruleFormData.name}
              onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., 10% Off Concessions"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={ruleFormData.description}
              onChange={(e) =>
                setRuleFormData({ ...ruleFormData, description: e.target.value })
              }
              className={styles.textarea}
              rows={2}
              placeholder="Optional description for staff"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Benefit Type *</label>
              <select
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
              <label>Benefit Scope *</label>
              <select
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
                <option value="CONCESSION">Concession</option>
                <option value="RENTAL">Rental</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Value *</label>
            <input
              type="text"
              value={ruleFormData.value}
              onChange={(e) => setRuleFormData({ ...ruleFormData, value: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., 5.00 for $5 off, 10 for 10%"
            />
            <small className={styles.helpText}>
              Enter dollar amount (5.00) or percentage (10)
            </small>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Monthly Limit</label>
              <input
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
              <label>Daily Limit</label>
              <input
                type="number"
                min="0"
                value={ruleFormData.daily_limit}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, daily_limit: e.target.value })
                }
                className={styles.input}
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Priority</label>
              <input
                type="number"
                min="0"
                value={ruleFormData.priority}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, priority: e.target.value })
                }
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
