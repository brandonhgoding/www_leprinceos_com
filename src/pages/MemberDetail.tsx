// src/pages/MemberDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi, membershipTiersApi, membershipsApi } from '../api/memberships';
import type { MemberCreate, MembershipCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './MemberDetail.module.css';

type ModalMode = 'closed' | 'edit' | 'create-membership';

interface EditFormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  birth_month: string;
  birth_day: string;
  family_member_count: string;
}

interface MembershipFormData {
  tier: string;
  start_date: string;
  price_paid: string;
  auto_activate: boolean;
}

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const memberId = parseInt(id!);

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [editFormData, setEditFormData] = useState<EditFormData>({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    birth_month: '',
    birth_day: '',
    family_member_count: '0',
  });
  const [membershipFormData, setMembershipFormData] = useState<MembershipFormData>({
    tier: '',
    start_date: new Date().toISOString().split('T')[0],
    price_paid: '',
    auto_activate: true,
  });

  // Queries
  const { data: member, isLoading } = useQuery({
    queryKey: ['members', memberId],
    queryFn: () => membersApi.get(memberId),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['members', memberId, 'memberships'],
    queryFn: () => membersApi.getMemberships(memberId),
    enabled: !!member,
  });

  const { data: benefits } = useQuery({
    queryKey: ['members', memberId, 'benefits'],
    queryFn: () => membersApi.getBenefits(memberId),
    enabled: !!member,
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['membership-tiers'],
    queryFn: () => membershipTiersApi.list(),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Partial<MemberCreate>) => membersApi.update(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update member.')),
  });

  const createMembershipMutation = useMutation({
    mutationFn: (data: MembershipCreate) => membershipsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', memberId, 'memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members', memberId, 'benefits'] });
      queryClient.invalidateQueries({ queryKey: ['members', memberId] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create membership.')),
  });

  // Handlers
  const openEditModal = () => {
    if (!member) return;
    setEditFormData({
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      birth_month: member.birth_month ? String(member.birth_month) : '',
      birth_day: member.birth_day ? String(member.birth_day) : '',
      family_member_count: String(member.family_member_count),
    });
    setModalMode('edit');
  };

  const openCreateMembershipModal = () => {
    setMembershipFormData({
      tier: '',
      start_date: new Date().toISOString().split('T')[0],
      price_paid: '',
      auto_activate: true,
    });
    setModalMode('create-membership');
  };

  const closeModal = () => {
    setModalMode('closed');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.email || !editFormData.first_name || !editFormData.last_name) return;

    const data: Partial<MemberCreate> = {
      email: editFormData.email,
      first_name: editFormData.first_name,
      last_name: editFormData.last_name,
      phone: editFormData.phone || undefined,
      birth_month: editFormData.birth_month ? parseInt(editFormData.birth_month) : undefined,
      birth_day: editFormData.birth_day ? parseInt(editFormData.birth_day) : undefined,
      family_member_count: editFormData.family_member_count
        ? parseInt(editFormData.family_member_count)
        : undefined,
    };

    updateMutation.mutate(data);
  };

  const handleMembershipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipFormData.tier) return;

    const data: MembershipCreate = {
      member: memberId,
      tier: parseInt(membershipFormData.tier),
      start_date: membershipFormData.start_date || undefined,
      price_paid: membershipFormData.price_paid || undefined,
      auto_activate: membershipFormData.auto_activate,
    };

    createMembershipMutation.mutate(data);
  };

  const handleTierChange = (tierId: string) => {
    setMembershipFormData({ ...membershipFormData, tier: tierId });
    if (tierId) {
      const selectedTier = tiers.find((t) => t.id === parseInt(tierId));
      if (selectedTier) {
        setMembershipFormData((prev) => ({ ...prev, price_paid: selectedTier.price }));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  const getStatusClass = (status: string) => {
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

  if (isLoading) {
    return <div className={styles.loading}>Loading member details...</div>;
  }

  if (!member) {
    return <div className={styles.error}>Member not found</div>;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} onClick={() => navigate('/members')}>
            ← Back to Members
          </button>
          <h1 className={styles.title}>{member.full_name}</h1>
          <p className={styles.subtitle}>Member #{member.member_number}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} onClick={openEditModal}>
            Edit Member
          </button>
          <button className={styles.primaryButton} onClick={openCreateMembershipModal}>
            + New Membership
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Member Info Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Member Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>{member.email}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Phone</div>
              <div className={styles.infoValue}>{member.phone || '—'}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Birthday</div>
              <div className={styles.infoValue}>
                {member.birth_month && member.birth_day
                  ? `${new Date(2000, member.birth_month - 1).toLocaleString('default', {
                      month: 'long',
                    })} ${member.birth_day}`
                  : '—'}
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Family Members</div>
              <div className={styles.infoValue}>{member.family_member_count || 0}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Member Since</div>
              <div className={styles.infoValue}>{formatDate(member.created_at)}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Square Customer ID</div>
              <div className={styles.infoValue}>
                {member.square_customer_id || 'Not synced'}
              </div>
            </div>
          </div>
        </div>

        {/* Current Benefits Card */}
        {benefits && benefits.allocations.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Current Benefits</h2>
            <p className={styles.cardSubtitle}>
              Active Membership: {benefits.membership.tier_name} (
              {benefits.membership.status})
            </p>
            <div className={styles.benefitsTable}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Benefit</th>
                    <th>Period</th>
                    <th>Usage</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {benefits.allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className={styles.benefitName}>{allocation.benefit_name}</td>
                      <td>
                        {formatDate(allocation.period_start)} –{' '}
                        {formatDate(allocation.period_end)}
                      </td>
                      <td>
                        <span className={allocation.is_exhausted ? styles.exhausted : ''}>
                          {allocation.quantity_used} / {allocation.quantity_allocated}
                        </span>
                      </td>
                      <td>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: `${
                                (allocation.quantity_used / allocation.quantity_allocated) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Membership History Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Membership History</h2>
          {memberships.length === 0 ? (
            <p className={styles.emptyMessage}>No memberships yet.</p>
          ) : (
            <div className={styles.membershipList}>
              {memberships.map((membership) => (
                <div key={membership.id} className={styles.membershipItem}>
                  <div className={styles.membershipHeader}>
                    <div>
                      <div className={styles.membershipTier}>{membership.tier_name}</div>
                      <div className={styles.membershipDates}>
                        {formatDate(membership.start_date)} –{' '}
                        {formatDate(membership.end_date)}
                      </div>
                    </div>
                    <div className={styles.membershipRight}>
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(
                          membership.status
                        )}`}
                      >
                        {membership.status_display}
                      </span>
                      <div className={styles.membershipPrice}>
                        {formatPrice(membership.price_paid)}
                      </div>
                    </div>
                  </div>
                  <button
                    className={styles.viewButton}
                    onClick={() => navigate(`/memberships/${membership.id}`)}
                  >
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Member Drawer */}
      <Drawer
        isOpen={modalMode === 'edit'}
        onClose={closeModal}
        title="Edit Member"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-member-form"
              className={styles.submitButton}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-member-form" onSubmit={handleEditSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>First Name *</label>
              <input
                type="text"
                value={editFormData.first_name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, first_name: e.target.value })
                }
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name *</label>
              <input
                type="text"
                value={editFormData.last_name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, last_name: e.target.value })
                }
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Email *</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Phone</label>
            <input
              type="tel"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Birth Month</label>
              <select
                value={editFormData.birth_month}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, birth_month: e.target.value })
                }
                className={styles.input}
              >
                <option value="">Select month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Birth Day</label>
              <input
                type="number"
                min="1"
                max="31"
                value={editFormData.birth_day}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, birth_day: e.target.value })
                }
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Family Member Count</label>
            <input
              type="number"
              min="0"
              value={editFormData.family_member_count}
              onChange={(e) =>
                setEditFormData({ ...editFormData, family_member_count: e.target.value })
              }
              className={styles.input}
            />
          </div>
        </form>
      </Drawer>

      {/* Create Membership Drawer */}
      <Drawer
        isOpen={modalMode === 'create-membership'}
        onClose={closeModal}
        title={`New Membership for ${member.full_name}`}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="create-membership-form"
              className={styles.submitButton}
              disabled={createMembershipMutation.isPending}
            >
              {createMembershipMutation.isPending ? 'Creating...' : 'Create Membership'}
            </button>
          </>
        }
      >
        <form
          id="create-membership-form"
          onSubmit={handleMembershipSubmit}
          className={styles.form}
        >
          <div className={styles.formGroup}>
            <label>Membership Tier *</label>
            <select
              value={membershipFormData.tier}
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
            <label>Start Date</label>
            <input
              type="date"
              value={membershipFormData.start_date}
              onChange={(e) =>
                setMembershipFormData({ ...membershipFormData, start_date: e.target.value })
              }
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Price Paid</label>
            <input
              type="text"
              value={membershipFormData.price_paid}
              onChange={(e) =>
                setMembershipFormData({ ...membershipFormData, price_paid: e.target.value })
              }
              className={styles.input}
              placeholder="Defaults to tier price"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={membershipFormData.auto_activate}
                onChange={(e) =>
                  setMembershipFormData({
                    ...membershipFormData,
                    auto_activate: e.target.checked,
                  })
                }
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
