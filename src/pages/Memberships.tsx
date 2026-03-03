// src/pages/Memberships.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { membershipsApi, membersApi, membershipTiersApi } from '../api/memberships';
import type { Membership, MembershipCreate, MembershipStatus } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Memberships.module.css';

type ModalMode = 'closed' | 'create';
type FilterStatus = 'all' | MembershipStatus;

interface FormData {
  member: string;
  tier: string;
  start_date: string;
  price_paid: string;
  auto_activate: boolean;
}

const initialFormData: FormData = {
  member: '',
  tier: '',
  start_date: new Date().toISOString().split('T')[0],
  price_paid: '',
  auto_activate: true,
};

export default function Memberships() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterTier, setFilterTier] = useState<string>('all');

  // Queries
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => membershipsApi.list(),
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['membership-tiers'],
    queryFn: () => membershipTiersApi.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: MembershipCreate) => membershipsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create membership.')),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => membershipsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to activate membership.')),
  });

  const renewMutation = useMutation({
    mutationFn: (id: number) => membershipsApi.renew(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to renew membership.')),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      membershipsApi.cancel(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to cancel membership.')),
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setModalMode('create');
  };

  const closeModal = () => {
    setModalMode('closed');
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.member || !formData.tier) return;

    const data: MembershipCreate = {
      member: parseInt(formData.member),
      tier: parseInt(formData.tier),
      start_date: formData.start_date || undefined,
      price_paid: formData.price_paid || undefined,
      auto_activate: formData.auto_activate,
    };

    createMutation.mutate(data);
  };

  const handleActivate = async (membership: Membership) => {
    if (
      await confirm({
        title: 'Activate Membership',
        message: `Activate membership for ${membership.member_name}?`,
        confirmLabel: 'Activate',
      })
    ) {
      activateMutation.mutate(membership.id);
    }
  };

  const handleRenew = async (membership: Membership) => {
    if (
      await confirm({
        title: 'Renew Membership',
        message: `Renew membership for ${membership.member_name}?`,
        confirmLabel: 'Renew',
      })
    ) {
      renewMutation.mutate(membership.id);
    }
  };

  const handleCancel = async (membership: Membership) => {
    const notes = await prompt({
      title: 'Cancel Membership',
      message: `Cancel membership for ${membership.member_name}?`,
      confirmLabel: 'Cancel Membership',
      variant: 'danger',
      promptLabel: 'Cancellation notes (optional)',
    });
    if (notes !== null) {
      cancelMutation.mutate({ id: membership.id, notes: notes || undefined });
    }
  };

  // Filter memberships
  const filteredMemberships = memberships.filter((membership) => {
    if (filterStatus !== 'all' && membership.status !== filterStatus) return false;
    if (filterTier !== 'all' && membership.tier !== parseInt(filterTier)) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  const getStatusClass = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE':
        return styles.statusActive;
      case 'PENDING':
        return styles.statusPending;
      case 'EXPIRED':
        return styles.statusExpired;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  // Auto-fill price when tier is selected
  const handleTierChange = (tierId: string) => {
    setFormData({ ...formData, tier: tierId });
    if (tierId) {
      const selectedTier = tiers.find((t) => t.id === parseInt(tierId));
      if (selectedTier) {
        setFormData((prev) => ({ ...prev, price_paid: selectedTier.price }));
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Memberships</h1>
          <p className={styles.subtitle}>Manage active and historical memberships.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Membership
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="memberships-filter-status">Status</label>
          <select
            id="memberships-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="memberships-filter-tier">Tier</label>
          <select
            id="memberships-filter-tier"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Tiers</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Memberships List */}
      {isLoading ? (
        <div className={styles.loading}>Loading memberships...</div>
      ) : filteredMemberships.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🎟️
          </div>
          <h3 className="empty-state-title">
            {memberships.length === 0 ? 'No Memberships Yet' : 'No Matching Memberships'}
          </h3>
          <p className="empty-state-description">
            {memberships.length === 0
              ? 'Create your first membership to get started.'
              : 'Try adjusting your filters.'}
          </p>
          {memberships.length === 0 && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create First Membership
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Price Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberName}>{membership.member_name}</div>
                        <div className={styles.memberEmail}>{membership.member_email}</div>
                      </div>
                    </td>
                    <td className={styles.tierName}>{membership.tier_name}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(membership.status)}`}
                      >
                        {membership.status_display}
                      </span>
                    </td>
                    <td>{formatDate(membership.start_date)}</td>
                    <td>{formatDate(membership.end_date)}</td>
                    <td>{formatPrice(membership.price_paid)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => navigate(`/memberships/${membership.id}`)}
                        >
                          View
                        </button>
                        {membership.status === 'PENDING' && (
                          <button
                            className={`${styles.actionButton} ${styles.activateButton}`}
                            onClick={() => handleActivate(membership)}
                          >
                            Activate
                          </button>
                        )}
                        {membership.status === 'ACTIVE' && (
                          <>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleRenew(membership)}
                            >
                              Renew
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.cancelButton}`}
                              onClick={() => handleCancel(membership)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className={styles.cardList}>
            {filteredMemberships.map((membership) => (
              <div key={membership.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <div>
                      <h3 className={styles.cardTitle}>{membership.member_name}</h3>
                      <div className={styles.cardEmail}>{membership.member_email}</div>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusClass(membership.status)}`}>
                      {membership.status_display}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <div className={styles.tierName}>{membership.tier_name}</div>
                    <div>
                      {formatDate(membership.start_date)} – {formatDate(membership.end_date)}
                    </div>
                    <div className={styles.price}>{formatPrice(membership.price_paid)}</div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => navigate(`/memberships/${membership.id}`)}
                  >
                    View
                  </button>
                  {membership.status === 'PENDING' && (
                    <button
                      className={`${styles.actionButton} ${styles.activateButton}`}
                      onClick={() => handleActivate(membership)}
                    >
                      Activate
                    </button>
                  )}
                  {membership.status === 'ACTIVE' && (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleRenew(membership)}
                      >
                        Renew
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.cancelButton}`}
                        onClick={() => handleCancel(membership)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed'}
        onClose={closeModal}
        title="New Membership"
        footer={
          <>
            <button type="button" className={styles.cancelButtonDrawer} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="membership-form"
              className={styles.submitButton}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Membership'}
            </button>
          </>
        }
      >
        <form id="membership-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="membership-member">Member *</label>
            <select
              id="membership-member"
              value={formData.member}
              onChange={(e) => setFormData({ ...formData, member: e.target.value })}
              required
              className={styles.input}
            >
              <option value="">Select a member...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="membership-tier">Membership Tier *</label>
            <select
              id="membership-tier"
              value={formData.tier}
              onChange={(e) => handleTierChange(e.target.value)}
              required
              className={styles.input}
            >
              <option value="">Select a tier...</option>
              {tiers
                .filter((t) => t.is_active)
                .map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} – {formatPrice(tier.price)} / {tier.duration_months} months
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="membership-start-date">Start Date</label>
            <input
              id="membership-start-date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className={styles.input}
            />
            <small className={styles.helpText}>Defaults to today if not specified</small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="membership-price-paid">Price Paid</label>
            <input
              id="membership-price-paid"
              type="number"
              min="0"
              step="0.01"
              value={formData.price_paid}
              onChange={(e) => setFormData({ ...formData, price_paid: e.target.value })}
              className={styles.input}
              placeholder="Defaults to tier price"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.auto_activate}
                onChange={(e) => setFormData({ ...formData, auto_activate: e.target.checked })}
              />
              Auto-activate membership
            </label>
            <small className={styles.helpText}>
              Uncheck to create in PENDING status (e.g., awaiting payment)
            </small>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
