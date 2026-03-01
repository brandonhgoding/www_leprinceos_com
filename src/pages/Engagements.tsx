// src/pages/Engagements.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementsApi, screensApi } from '../api';
import type { Engagement, EngagementCreate, Film, Screen } from '../api/types';
import Drawer from '../components/Drawer';
import StatusDropdown from '../components/StatusDropdown';
import FilmSearchCombo from '../components/FilmSearchCombo';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
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
  const { addToast } = useToast();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [statusFilter, setStatusFilter] = useState<string>('CONFIRMED');

  // Listen for keyboard shortcut to open create drawer
  useEffect(() => {
    const handleOpenDrawer = () => {
      openCreateModal();
    };

    window.addEventListener('open-create-engagement-drawer', handleOpenDrawer);
    return () => window.removeEventListener('open-create-engagement-drawer', handleOpenDrawer);
  }, []);

  // Queries
  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements', statusFilter],
    queryFn: () => engagementsApi.list(statusFilter ? { status: statusFilter } : {}),
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
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create engagement.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EngagementCreate> }) =>
      engagementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update engagement.')),
  });

  // Inline status update mutation (doesn't close modal)
  const inlineUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EngagementCreate> }) =>
      engagementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update engagement status.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => engagementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagements'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete engagement.')),
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedEngagement(null);
    setModalMode('create');
  };

  const handleFilmSelected = (film: Film) => {
    setFormData({ ...formData, film: film.id });
    // Invalidate films query to ensure the new film appears in future searches
    queryClient.invalidateQueries({ queryKey: ['films'] });
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

  const handleInlineStatusChange = async (
    engagementId: number,
    newStatus: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED'
  ) => {
    await inlineUpdateMutation.mutateAsync({
      id: engagementId,
      data: { status: newStatus },
    });
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
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

      {/* Filter Tabs */}
      <div className="filter-tabs" role="tablist">
        <button
          className={`filter-tab ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'CONFIRMED'}
          onClick={() => setStatusFilter('CONFIRMED')}
        >
          Confirmed
        </button>
        <button
          className={`filter-tab ${statusFilter === 'DRAFT' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'DRAFT'}
          onClick={() => setStatusFilter('DRAFT')}
        >
          Draft
        </button>
        <button
          className={`filter-tab ${statusFilter === 'ENDED' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'ENDED'}
          onClick={() => setStatusFilter('ENDED')}
        >
          Ended
        </button>
        <button
          className={`filter-tab ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'CANCELLED'}
          onClick={() => setStatusFilter('CANCELLED')}
        >
          Cancelled
        </button>
      </div>

      {/* Engagements List */}
      {engagementsLoading ? (
        <div className={styles.loading}>Loading engagements...</div>
      ) : engagements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🎬
          </div>
          <h3 className="empty-state-title">
            {statusFilter ? `No ${statusFilter.toLowerCase()} engagements` : 'No Engagements Yet'}
          </h3>
          <p className="empty-state-description">
            {statusFilter
              ? `You don't have any ${statusFilter.toLowerCase()} engagements at the moment.`
              : "Start booking films by creating your first engagement. An engagement represents a film's run at your cinema."
            }
          </p>
          {!statusFilter && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              Create First Engagement
            </button>
          )}
          {statusFilter && (
            <button className="btn btn-secondary" onClick={() => setStatusFilter('')}>
              View All Engagements
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
                      <StatusDropdown
                        value={engagement.status}
                        onChange={(newStatus) => handleInlineStatusChange(engagement.id, newStatus)}
                      />
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          to={`/engagements/${engagement.id}`}
                          className={`${styles.actionButton} ${styles.detailsButton}`}
                        >
                          Details
                        </Link>
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

          {/* Mobile Card View */}
          <div className={styles.cardList}>
            {engagements.map((engagement) => (
              <div key={engagement.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  {engagement.film_poster_url && (
                    <img
                      src={engagement.film_poster_url}
                      alt=""
                      className={styles.cardPoster}
                    />
                  )}
                  <div className={styles.cardTitleSection}>
                    <h3 className={styles.cardTitle}>{engagement.film_title}</h3>
                    <div className={styles.cardBadges}>
                      <StatusDropdown
                        value={engagement.status}
                        onChange={(newStatus) => handleInlineStatusChange(engagement.id, newStatus)}
                      />
                      <span className={styles.formatBadge}>
                        {engagement.presentation_format.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardDetail}>
                    <span className={styles.cardLabel}>Screen</span>
                    <span className={styles.cardValue}>{engagement.screen_name}</span>
                  </div>
                  <div className={styles.cardDetail}>
                    <span className={styles.cardLabel}>Dates</span>
                    <span className={styles.cardValue}>
                      {formatDate(engagement.start_date)} - {formatDate(engagement.end_date)}
                    </span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <Link
                    to={`/engagements/${engagement.id}`}
                    className={`${styles.actionButton} ${styles.detailsButton}`}
                  >
                    Details
                  </Link>
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
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Engagement' : 'Edit Engagement'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="engagement-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                ? 'Create Engagement'
                : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="engagement-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="film-search">Film</label>
            <FilmSearchCombo
              onFilmSelected={handleFilmSelected}
              disabled={createMutation.isPending || updateMutation.isPending}
              selectedFilmId={formData.film}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="engagement-screen">Screen</label>
            <select
              id="engagement-screen"
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
              <label htmlFor="engagement-start-date">Start Date</label>
              <input
                id="engagement-start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-end-date">End Date</label>
              <input
                id="engagement-end-date"
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
              <label htmlFor="engagement-format">Format</label>
              <select
                id="engagement-format"
                value={formData.presentation_format}
                onChange={(e) => setFormData({ ...formData, presentation_format: e.target.value as '2d' | '3d' })}
                className={styles.input}
              >
                <option value="2d">2D</option>
                <option value="3d">3D</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-status">Status</label>
              <select
                id="engagement-status"
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
            <label htmlFor="engagement-notes">Notes</label>
            <textarea
              id="engagement-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={styles.textarea}
              rows={3}
              placeholder="Optional notes about this engagement..."
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
