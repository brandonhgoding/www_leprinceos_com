// src/pages/Members.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { membersApi } from '../api/memberships';
import type { Member, MemberCreate } from '../api/types';
import Drawer from '../components/Drawer';
import styles from './Members.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  birth_month: string;
  birth_day: string;
  family_member_count: string;
}

const initialFormData: FormData = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  birth_month: '',
  birth_day: '',
  family_member_count: '0',
};

export default function Members() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: MemberCreate) => membersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MemberCreate> }) =>
      membersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeModal();
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedMember(null);
    setModalMode('create');
  };

  const openEditModal = (member: Member) => {
    setFormData({
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      birth_month: member.birth_month ? String(member.birth_month) : '',
      birth_day: member.birth_day ? String(member.birth_day) : '',
      family_member_count: String(member.family_member_count),
    });
    setSelectedMember(member);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedMember(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.first_name || !formData.last_name) return;

    const data: MemberCreate = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone || undefined,
      birth_month: formData.birth_month ? parseInt(formData.birth_month) : undefined,
      birth_day: formData.birth_day ? parseInt(formData.birth_day) : undefined,
      family_member_count: formData.family_member_count
        ? parseInt(formData.family_member_count)
        : undefined,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    }
  };

  // Filter members based on search term
  const filteredMembers = members.filter((member) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.phone?.toLowerCase().includes(search) ||
      member.member_number.toLowerCase().includes(search)
    );
  });

  const formatMembershipStatus = (member: Member) => {
    if (!member.active_membership) {
      return <span className={styles.statusInactive}>No Active Membership</span>;
    }

    const statusClass =
      member.active_membership.status === 'ACTIVE'
        ? styles.statusActive
        : styles.statusPending;

    return (
      <span className={statusClass}>
        {member.active_membership.tier_name} - {member.active_membership.status}
      </span>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Members</h1>
          <p className={styles.subtitle}>Manage member profiles and memberships.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Member
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or member number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className={styles.loading}>Loading members...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            👥
          </div>
          <h3 className="empty-state-title">
            {searchTerm ? 'No Members Found' : 'No Members Yet'}
          </h3>
          <p className="empty-state-description">
            {searchTerm
              ? 'Try adjusting your search criteria.'
              : 'Create your first member to start managing memberships.'}
          </p>
          {!searchTerm && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create First Member
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
                  <th>Member #</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Membership Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td className={styles.memberNumber}>{member.member_number}</td>
                    <td className={styles.memberName}>{member.full_name}</td>
                    <td>{member.email}</td>
                    <td>{member.phone || '—'}</td>
                    <td>{formatMembershipStatus(member)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => navigate(`/members/${member.id}`)}
                        >
                          View
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditModal(member)}
                        >
                          Edit
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
            {filteredMembers.map((member) => (
              <div key={member.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{member.full_name}</h3>
                    <span className={styles.memberNumberBadge}>
                      #{member.member_number}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <div>{member.email}</div>
                    {member.phone && <div>{member.phone}</div>}
                  </div>
                  <div className={styles.cardStatus}>{formatMembershipStatus(member)}</div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    View
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => openEditModal(member)}
                  >
                    Edit
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
        title={modalMode === 'create' ? 'New Member' : 'Edit Member'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="member-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                ? 'Create Member'
                : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="member-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={styles.input}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Birth Month</label>
              <select
                value={formData.birth_month}
                onChange={(e) => setFormData({ ...formData, birth_month: e.target.value })}
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
                value={formData.birth_day}
                onChange={(e) => setFormData({ ...formData, birth_day: e.target.value })}
                className={styles.input}
                placeholder="1-31"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Family Member Count</label>
            <input
              type="number"
              min="0"
              value={formData.family_member_count}
              onChange={(e) =>
                setFormData({ ...formData, family_member_count: e.target.value })
              }
              className={styles.input}
            />
            <small className={styles.helpText}>
              Number of additional family members (for family tier memberships)
            </small>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
