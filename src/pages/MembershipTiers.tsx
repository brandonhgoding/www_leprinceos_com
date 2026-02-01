// src/pages/MembershipTiers.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { membershipTiersApi } from '../api/memberships';
import type { MembershipTier, MembershipTierCreate } from '../api/types';
import Drawer from '../components/Drawer';
import styles from './MembershipTiers.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  name: string;
  description: string;
  price: string;
  duration_months: string;
  is_family_tier: boolean;
  max_family_members: string;
  display_order: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  price: '',
  duration_months: '12',
  is_family_tier: false,
  max_family_members: '0',
  display_order: '0',
  is_active: true,
};

export default function MembershipTiers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['membership-tiers'],
    queryFn: () => membershipTiersApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: MembershipTierCreate) => membershipTiersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MembershipTierCreate> }) =>
      membershipTiersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => membershipTiersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-tiers'] });
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedTier(null);
    setModalMode('create');
  };

  const openEditModal = (tier: MembershipTier) => {
    setFormData({
      name: tier.name,
      description: tier.description,
      price: tier.price,
      duration_months: String(tier.duration_months),
      is_family_tier: tier.is_family_tier,
      max_family_members: String(tier.max_family_members),
      display_order: String(tier.display_order),
      is_active: tier.is_active,
    });
    setSelectedTier(tier);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedTier(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.duration_months) return;

    const data: MembershipTierCreate = {
      name: formData.name,
      description: formData.description || undefined,
      price: formData.price,
      duration_months: parseInt(formData.duration_months),
      is_family_tier: formData.is_family_tier,
      max_family_members: formData.is_family_tier
        ? parseInt(formData.max_family_members)
        : undefined,
      display_order: formData.display_order ? parseInt(formData.display_order) : undefined,
      is_active: formData.is_active,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedTier) {
      updateMutation.mutate({ id: selectedTier.id, data });
    }
  };

  const handleDelete = (tier: MembershipTier) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${tier.name}"? This will affect existing memberships.`
      )
    ) {
      deleteMutation.mutate(tier.id);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  // Sort tiers by display_order
  const sortedTiers = [...tiers].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Membership Tiers</h1>
          <p className={styles.subtitle}>
            Define membership levels with pricing and duration.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Tier
        </button>
      </div>

      {/* Tiers List */}
      {isLoading ? (
        <div className={styles.loading}>Loading membership tiers...</div>
      ) : sortedTiers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🏆
          </div>
          <h3 className="empty-state-title">No Membership Tiers Defined</h3>
          <p className="empty-state-description">
            Create your first membership tier to start offering memberships to your customers.
          </p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Create First Tier
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Benefits</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier) => (
                  <tr key={tier.id}>
                    <td className={styles.displayOrder}>{tier.display_order}</td>
                    <td className={styles.tierName}>{tier.name}</td>
                    <td className={styles.price}>{formatPrice(tier.price)}</td>
                    <td>
                      {tier.duration_months} {tier.duration_months === 1 ? 'month' : 'months'}
                    </td>
                    <td>
                      {tier.is_family_tier ? (
                        <span className={styles.familyBadge}>
                          Family (max {tier.max_family_members})
                        </span>
                      ) : (
                        <span className={styles.individualBadge}>Individual</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.benefitCount}>
                        {tier.benefit_count} {tier.benefit_count === 1 ? 'benefit' : 'benefits'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${tier.is_active ? styles.statusActive : styles.statusInactive}`}
                      >
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => navigate(`/membership-tiers/${tier.id}`)}
                        >
                          Benefits
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditModal(tier)}
                        >
                          Edit
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDelete(tier)}
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
            {sortedTiers.map((tier) => (
              <div key={tier.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{tier.name}</h3>
                    <span className={styles.cardPrice}>{formatPrice(tier.price)}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <div>
                      {tier.duration_months} {tier.duration_months === 1 ? 'month' : 'months'}
                    </div>
                    <div>
                      {tier.is_family_tier ? (
                        <span className={styles.familyBadge}>
                          Family (max {tier.max_family_members})
                        </span>
                      ) : (
                        <span className={styles.individualBadge}>Individual</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.benefitCount}>
                      {tier.benefit_count} {tier.benefit_count === 1 ? 'benefit' : 'benefits'}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${tier.is_active ? styles.statusActive : styles.statusInactive}`}
                    >
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => navigate(`/membership-tiers/${tier.id}`)}
                  >
                    Benefits
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => openEditModal(tier)}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(tier)}
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
        title={modalMode === 'create' ? 'New Membership Tier' : 'Edit Membership Tier'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="tier-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                ? 'Create Tier'
                : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="tier-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Tier Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., Gold, Platinum, Premium"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Describe the benefits of this tier..."
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Price *</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., 99.99"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Duration (months) *</label>
              <input
                type="number"
                min="1"
                value={formData.duration_months}
                onChange={(e) =>
                  setFormData({ ...formData, duration_months: e.target.value })
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
                checked={formData.is_family_tier}
                onChange={(e) =>
                  setFormData({ ...formData, is_family_tier: e.target.checked })
                }
              />
              Family Tier
            </label>
            <small className={styles.helpText}>
              Enable if this tier allows multiple family members
            </small>
          </div>

          {formData.is_family_tier && (
            <div className={styles.formGroup}>
              <label>Maximum Family Members</label>
              <input
                type="number"
                min="1"
                value={formData.max_family_members}
                onChange={(e) =>
                  setFormData({ ...formData, max_family_members: e.target.value })
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
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                className={styles.input}
              />
              <small className={styles.helpText}>Lower numbers appear first</small>
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
          </div>
        </form>
      </Drawer>
    </div>
  );
}
