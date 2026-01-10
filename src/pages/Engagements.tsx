// src/pages/Engagements.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementsApi, filmsApi, screensApi } from '../api';
import type { Engagement, EngagementCreate, Film, Screen } from '../api/types';
import styles from './Engagements.module.css';

type ModalMode = 'closed' | 'create' | 'edit' | 'showtimes';

interface FormData {
  film: number | '';
  screen: number | '';
  start_date: string;
  end_date: string;
  presentation_format: '2d' | '3d';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  notes: string;
}

const initialFormData: FormData = {
  film: '',
  screen: '',
  start_date: '',
  end_date: '',
  presentation_format: '2d',
  status: 'DRAFT',
  notes: '',
};

export default function Engagements() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Queries
  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements', statusFilter],
    queryFn: () => engagementsApi.list(statusFilter ? { status: statusFilter } : {}),
  });

  const { data: films = [] } = useQuery({
    queryKey: ['films'],
    queryFn: () => filmsApi.list(),
  });

  const { data: screens = [] } = useQuery({
    queryKey: ['screens'],
    queryFn: () => screensApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: EngagementCreate) => engagementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EngagementCreate> }) =>
      engagementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => engagementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedEngagement(null);
    setModalMode('create');
  };

  const openEditModal = (engagement: Engagement) => {
    setFormData({
      film: engagement.film,
      screen: engagement.screen,
      start_date: engagement.start_date,
      end_date: engagement.end_date,
      presentation_format: engagement.presentation_format,
      status: engagement.status,
      notes: engagement.notes,
    });
    setSelectedEngagement(engagement);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedEngagement(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.film === '' || formData.screen === '') return;

    const data: EngagementCreate = {
      film: formData.film as number,
      screen: formData.screen as number,
      start_date: formData.start_date,
      end_date: formData.end_date,
      presentation_format: formData.presentation_format,
      status: formData.status,
      notes: formData.notes,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedEngagement) {
      updateMutation.mutate({ id: selectedEngagement.id, data });
    }
  };

  const handleDelete = (engagement: Engagement) => {
    if (window.confirm(`Are you sure you want to delete the engagement for "${engagement.film_title}"?`)) {
      deleteMutation.mutate(engagement.id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return styles.statusConfirmed;
      case 'DRAFT':
        return styles.statusDraft;
      case 'CANCELLED':
        return styles.statusCancelled;
      case 'ENDED':
        return styles.statusEnded;
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Engagements</h1>
          <p className={styles.subtitle}>Manage your film engagements and runs.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Engagement
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Status:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ENDED">Ended</option>
          </select>
        </label>
      </div>

      {/* Engagements List */}
      {engagementsLoading ? (
        <div className={styles.loading}>Loading engagements...</div>
      ) : engagements.length === 0 ? (
        <div className={styles.empty}>
          <p>No engagements found.</p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Create your first engagement
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Film</th>
                <th>Screen</th>
                <th>Dates</th>
                <th>Format</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {engagements.map((engagement) => (
                <tr key={engagement.id}>
                  <td>
                    <div className={styles.filmCell}>
                      {engagement.film_poster_url && (
                        <img
                          src={engagement.film_poster_url}
                          alt=""
                          className={styles.posterThumb}
                        />
                      )}
                      <span className={styles.filmTitle}>{engagement.film_title}</span>
                    </div>
                  </td>
                  <td>{engagement.screen_name}</td>
                  <td>
                    {formatDate(engagement.start_date)} - {formatDate(engagement.end_date)}
                  </td>
                  <td className={styles.formatCell}>
                    {engagement.presentation_format.toUpperCase()}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(engagement.status)}`}>
                      {engagement.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditModal(engagement)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(engagement)}
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
              <h2>{modalMode === 'create' ? 'New Engagement' : 'Edit Engagement'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Film</label>
                <select
                  value={formData.film}
                  onChange={(e) => setFormData({ ...formData, film: e.target.value ? parseInt(e.target.value) : '' })}
                  required
                  className={styles.input}
                >
                  <option value="">Select a film</option>
                  {films.map((film: Film) => (
                    <option key={film.id} value={film.id}>
                      {film.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Screen</label>
                <select
                  value={formData.screen}
                  onChange={(e) => setFormData({ ...formData, screen: e.target.value ? parseInt(e.target.value) : '' })}
                  required
                  className={styles.input}
                >
                  <option value="">Select a screen</option>
                  {screens.map((screen: Screen) => (
                    <option key={screen.id} value={screen.id}>
                      {screen.name} ({screen.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Format</label>
                  <select
                    value={formData.presentation_format}
                    onChange={(e) => setFormData({ ...formData, presentation_format: e.target.value as '2d' | '3d' })}
                    className={styles.input}
                  >
                    <option value="2d">2D</option>
                    <option value="3d">3D</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as FormData['status'] })}
                    className={styles.input}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="ENDED">Ended</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={styles.textarea}
                  rows={3}
                  placeholder="Optional notes about this engagement..."
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
                    ? 'Create Engagement'
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
