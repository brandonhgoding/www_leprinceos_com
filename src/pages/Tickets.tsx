// src/pages/Tickets.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { TicketType, TicketTypeCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
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
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showArchived, setShowArchived] = useState(false);

  // Queries
  const { data: ticketTypes = [], isLoading } = useQuery({
    queryKey: ['ticket-types', { showArchived }],
    queryFn: () => ticketsApi.list(showArchived ? { include_archived: true } : undefined),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TicketTypeCreate) => ticketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create ticket type.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TicketTypeCreate> }) =>
      ticketsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update ticket type.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete ticket type.')),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to archive ticket type.')),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => ticketsApi.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to unarchive ticket type.')),
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

  const handleDelete = async (ticket: TicketType) => {
    if (
      await confirm({
        title: 'Delete Ticket Type',
        message: `Are you sure you want to delete "${ticket.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteMutation.mutate(ticket.id);
    }
  };

  const handleToggleArchive = (ticket: TicketType) => {
    if (ticket.is_archived) {
      unarchiveMutation.mutate(ticket.id);
    } else {
      archiveMutation.mutate(ticket.id);
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
        <div className={styles.headerActions}>
          <label className={styles.archiveToggle}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            + New Ticket Type
          </button>
        </div>
      </div>

      {/* Ticket Types List */}
      {isLoading ? (
        <div className={styles.loading}>Loading ticket types...</div>
      ) : ticketTypes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🎫
          </div>
          <h3 className="empty-state-title">No Ticket Types Defined</h3>
          <p className="empty-state-description">
            Create ticket types with different pricing to accommodate various customer segments like
            adults, children, seniors, or special promotions.
          </p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Create First Ticket Type
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
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
                      {ticket.is_archived ? (
                        <span className={`${styles.statusBadge} ${styles.statusArchived}`}>
                          Archived
                        </span>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${
                            ticket.is_active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {ticket.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
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
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
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
                          className={styles.actionButton}
                          onClick={() => handleToggleArchive(ticket)}
                        >
                          {ticket.is_archived ? 'Unarchive' : 'Archive'}
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

          {/* Mobile Card View */}
          <div className={styles.cardList}>
            {ticketTypes.map((ticket) => (
              <div key={ticket.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{ticket.name}</h3>
                    <span className={styles.cardPrice}>{formatPrice(ticket.price)}</span>
                  </div>
                  <div className={styles.cardBadges}>
                    {ticket.is_archived ? (
                      <span className={`${styles.statusBadge} ${styles.statusArchived}`}>
                        Archived
                      </span>
                    ) : (
                      <span
                        className={`${styles.statusBadge} ${
                          ticket.is_active ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {ticket.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                    <span className={styles.rulesCount}>
                      {ticket.rules_count} {ticket.rules_count === 1 ? 'rule' : 'rules'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    Details
                  </button>
                  <button className={styles.actionButton} onClick={() => openEditModal(ticket)}>
                    Edit
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleToggleArchive(ticket)}
                  >
                    {ticket.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(ticket)}
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
        title={modalMode === 'create' ? 'New Ticket Type' : 'Edit Ticket Type'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="ticket-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Create Ticket Type'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="ticket-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ticket-name">Name</label>
              <input
                id="ticket-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., Adult, Child, Senior"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="ticket-price">Price</label>
              <input
                id="ticket-price"
                type="number"
                min="0"
                step="0.01"
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
            <label htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.textarea}
              placeholder="Optional description for this ticket type"
              rows={3}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
