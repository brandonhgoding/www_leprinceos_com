// src/pages/Tickets.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { TicketType, TicketTypeCreate } from '../api/types';
import styles from './Tickets.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  name: string;
  price: string;
  is_active: boolean;
  description: string;
}

const initialFormData: FormData = {
  name: '',
  price: '',
  is_active: true,
  description: '',
};

export default function Tickets() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const { data: ticketTypes = [], isLoading } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => ticketsApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TicketTypeCreate) => ticketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TicketTypeCreate> }) =>
      ticketsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedTicket(null);
    setModalMode('create');
  };

  const openEditModal = (ticket: TicketType) => {
    setFormData({
      name: ticket.name,
      price: ticket.price,
      is_active: ticket.is_active,
      description: ticket.description,
    });
    setSelectedTicket(ticket);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedTicket(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name === '' || formData.price === '') return;

    const data: TicketTypeCreate = {
      name: formData.name,
      price: formData.price,
      is_active: formData.is_active,
      description: formData.description,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedTicket) {
      updateMutation.mutate({ id: selectedTicket.id, data });
    }
  };

  const handleDelete = (ticket: TicketType) => {
    if (window.confirm(`Are you sure you want to delete "${ticket.name}"?`)) {
      deleteMutation.mutate(ticket.id);
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
          <h1 className={styles.title}>Ticket Types</h1>
          <p className={styles.subtitle}>Manage ticket pricing and availability.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Ticket Type
        </button>
      </div>

      {/* Ticket Types List */}
      {isLoading ? (
        <div className={styles.loading}>Loading ticket types...</div>
      ) : ticketTypes.length === 0 ? (
        <div className={styles.empty}>
          <p>No ticket types found.</p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Add your first ticket type
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Rules</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((ticket) => (
                <tr key={ticket.id}>
                  <td className={styles.ticketName}>{ticket.name}</td>
                  <td className={styles.price}>{formatPrice(ticket.price)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${ticket.is_active ? styles.statusActive : styles.statusInactive}`}>
                      {ticket.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.rulesCount}>
                      {ticket.rules_count} {ticket.rules_count === 1 ? 'rule' : 'rules'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => navigate(`/dashboard/tickets/${ticket.id}`)}
                      >
                        Details
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditModal(ticket)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(ticket)}
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
      )}

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === 'create' ? 'New Ticket Type' : 'Edit Ticket Type'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className={styles.input}
                    placeholder="e.g., Adult, Child, Senior"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Price</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className={styles.input}
                    placeholder="e.g., 12.50"
                  />
                </div>
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
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={styles.textarea}
                  placeholder="Optional description for this ticket type"
                  rows={3}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : modalMode === 'create'
                    ? 'Create Ticket Type'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
