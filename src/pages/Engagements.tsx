// src/pages/Engagements.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementsApi, screensApi } from '../api';
import type { Engagement, EngagementCreate, EngagementKind, Film, Screen } from '../api/types';
import Drawer from '../components/Drawer';
import StatusDropdown from '../components/StatusDropdown';
import FilmSearchCombo from '../components/FilmSearchCombo';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import { KIND_LABELS } from '../utils/engagementKinds';
import styles from './Engagements.module.css';

function getLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

type ModalMode = 'closed' | 'create' | 'edit' | 'showtimes';

interface FormData {
  kind: EngagementKind;
  films: number[];
  event_title: string;
  screen: number | '';
  start_date: string;
  end_date: string;
  presentation_format: '2d' | '3d';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  show_in_main_listings: boolean;
  notes: string;
}

// These are the form-select (dropdown) labels — intentionally longer/more descriptive than the
// short badge/detail labels in KIND_LABELS (src/utils/engagementKinds.ts).
// e.g. SPECIAL_EVENT → 'Special Event' here vs. 'Event' in KIND_LABELS.
// Do not "fix" one set to match the other; the divergence is intentional.
const KIND_OPTIONS: { value: EngagementKind; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'SPECIAL_EVENT', label: 'Special Event' },
  { value: 'CLASSIC', label: 'Classic' },
  { value: 'DOUBLE_FEATURE', label: 'Double Feature' },
];

const defaultVisibilityForKind = (kind: EngagementKind): boolean => kind === 'REGULAR';

const initialFormData: FormData = {
  kind: 'REGULAR',
  films: [],
  event_title: '',
  screen: '',
  start_date: '',
  end_date: '',
  presentation_format: '2d',
  status: 'DRAFT',
  show_in_main_listings: true,
  notes: '',
};

export default function Engagements() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [filmCache, setFilmCache] = useState<Record<number, Film>>({});
  const [statusFilter, setStatusFilter] = useState<string>('CURRENT');

  const openCreateModal = useCallback(() => {
    setFormData(initialFormData);
    setFilmCache({});
    setSelectedEngagement(null);
    setModalMode('create');
  }, []);

  // Listen for keyboard shortcut to open create drawer
  useEffect(() => {
    const handleOpenDrawer = () => {
      openCreateModal();
    };

    window.addEventListener('open-create-engagement-drawer', handleOpenDrawer);
    return () => window.removeEventListener('open-create-engagement-drawer', handleOpenDrawer);
  }, [openCreateModal]);

  // Build filter params: some tabs use composite date+status filters
  const getFilterParams = () => {
    const today = getLocalDateString();
    switch (statusFilter) {
      case 'CURRENT':
        return { status: 'CONFIRMED', start_date_before: today, end_date_after: today };
      case 'UPCOMING':
        return { status: 'CONFIRMED', start_date_after: today };
      case 'ENDED':
        return { end_date_before: today };
      case 'DRAFT':
      case 'CANCELLED':
        return { status: statusFilter };
      default:
        return {};
    }
  };

  // Queries
  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements', statusFilter],
    queryFn: () => engagementsApi.list(getFilterParams()),
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
  const handleFilmSelected = (film: Film) => {
    setFilmCache((prev) => ({ ...prev, [film.id]: film }));
    setFormData((prev) => {
      if (prev.kind === 'DOUBLE_FEATURE') {
        if (prev.films.includes(film.id)) return prev; // no duplicates
        return { ...prev, films: [...prev.films, film.id] };
      }
      return { ...prev, films: [film.id] }; // single-film kinds: replace
    });
    queryClient.invalidateQueries({ queryKey: ['films'] });
  };

  const removeFilm = (filmId: number) =>
    setFormData((prev) => ({ ...prev, films: prev.films.filter((id) => id !== filmId) }));

  const handleKindChange = (kind: EngagementKind) =>
    setFormData((prev) => ({
      ...prev,
      kind,
      // trim to one film when leaving double-feature
      films: kind === 'DOUBLE_FEATURE' ? prev.films : prev.films.slice(0, 1),
      show_in_main_listings: defaultVisibilityForKind(kind),
    }));

  const openEditModal = (engagement: Engagement) => {
    setFilmCache((prev) => ({
      ...prev,
      ...Object.fromEntries(engagement.films.map((f) => [f.id, f])),
    }));
    setFormData({
      kind: engagement.kind,
      films: engagement.films.map((f) => f.id),
      event_title: engagement.event_title,
      screen: engagement.screen,
      start_date: engagement.start_date,
      end_date: engagement.end_date,
      presentation_format: engagement.presentation_format,
      status: engagement.status,
      show_in_main_listings: engagement.show_in_main_listings,
      notes: engagement.notes,
    });
    setSelectedEngagement(engagement);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedEngagement(null);
    setFormData(initialFormData);
    setFilmCache({});
  };

  const isFormValid = (): boolean => {
    if (formData.screen === '' || !formData.start_date || !formData.end_date) return false;
    if (formData.kind === 'DOUBLE_FEATURE') return formData.films.length >= 2;
    return formData.films.length === 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    const data: EngagementCreate = {
      kind: formData.kind,
      films: formData.films,
      event_title: formData.event_title.trim() || undefined,
      screen: formData.screen as number,
      start_date: formData.start_date,
      end_date: formData.end_date,
      presentation_format: formData.presentation_format,
      status: formData.status,
      show_in_main_listings: formData.show_in_main_listings,
      notes: formData.notes,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedEngagement) {
      updateMutation.mutate({ id: selectedEngagement.id, data });
    }
  };

  const handleDelete = async (engagement: Engagement) => {
    if (
      await confirm({
        title: 'Delete Engagement',
        message: `Are you sure you want to delete the engagement for "${engagement.display_title}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteMutation.mutate(engagement.id);
    }
  };

  const handleInlineStatusChange = async (
    engagementId: number,
    newStatus: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED',
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
          className={`filter-tab ${statusFilter === 'CURRENT' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'CURRENT'}
          onClick={() => setStatusFilter('CURRENT')}
        >
          Current
        </button>
        <button
          className={`filter-tab ${statusFilter === 'UPCOMING' ? 'active' : ''}`}
          role="tab"
          aria-selected={statusFilter === 'UPCOMING'}
          onClick={() => setStatusFilter('UPCOMING')}
        >
          Upcoming
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
        <div className={styles.loading} role="status" aria-live="polite">
          Loading engagements...
        </div>
      ) : engagements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🎬
          </div>
          <h3 className="empty-state-title">
            {statusFilter
              ? `No ${
                  {
                    CURRENT: 'current',
                    UPCOMING: 'upcoming',
                    DRAFT: 'draft',
                    ENDED: 'ended',
                    CANCELLED: 'cancelled',
                  }[statusFilter] ?? statusFilter.toLowerCase()
                } engagements`
              : 'No Engagements Yet'}
          </h3>
          <p className="empty-state-description">
            {statusFilter
              ? {
                  CURRENT: "You don't have any engagements currently playing.",
                  UPCOMING: "You don't have any upcoming engagements.",
                  ENDED: "You don't have any past engagements.",
                }[statusFilter] ??
                `You don't have any ${statusFilter.toLowerCase()} engagements at the moment.`
              : "Start booking films by creating your first engagement. An engagement represents a film's run at your cinema."}
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
                        <span className={styles.filmTitle}>{engagement.display_title}</span>
                        {engagement.kind !== 'REGULAR' && (
                          <span className={styles.kindBadge}>{KIND_LABELS[engagement.kind]}</span>
                        )}
                        {!engagement.show_in_main_listings && (
                          <span className={styles.hiddenBadge} title="Hidden from public listings">
                            Hidden
                          </span>
                        )}
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
                        disabled={engagement.end_date < getLocalDateString()}
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
                    <img src={engagement.film_poster_url} alt="" className={styles.cardPoster} />
                  )}
                  <div className={styles.cardTitleSection}>
                    <h3 className={styles.cardTitle}>{engagement.display_title}</h3>
                    {engagement.kind !== 'REGULAR' && (
                      <span className={styles.kindBadge}>{KIND_LABELS[engagement.kind]}</span>
                    )}
                    {!engagement.show_in_main_listings && (
                      <span className={styles.hiddenBadge} title="Hidden from public listings">
                        Hidden
                      </span>
                    )}
                    <div className={styles.cardBadges}>
                      <StatusDropdown
                        value={engagement.status}
                        onChange={(newStatus) => handleInlineStatusChange(engagement.id, newStatus)}
                        disabled={engagement.end_date < getLocalDateString()}
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
                  <button className={styles.actionButton} onClick={() => openEditModal(engagement)}>
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
              disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()}
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
            <label htmlFor="engagement-kind">Type</label>
            <select
              id="engagement-kind"
              value={formData.kind}
              onChange={(e) => handleKindChange(e.target.value as EngagementKind)}
              className={styles.input}
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          {formData.kind === 'DOUBLE_FEATURE' ? (
            <div className={styles.formGroup}>
              <label>Films (in play order)</label>
              {formData.films.length > 0 && (
                <ol className={styles.filmList}>
                  {formData.films.map((id, idx) => (
                    <li key={id} className={styles.filmListItem}>
                      <span className={styles.filmListOrder}>{idx + 1}</span>
                      {filmCache[id]?.poster_url && (
                        <img src={filmCache[id]!.poster_url} alt="" className={styles.posterThumb} />
                      )}
                      <span className={styles.filmListTitle}>{filmCache[id]?.title ?? `Film #${id}`}</span>
                      <button type="button" className={styles.removeFilmButton} onClick={() => removeFilm(id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <FilmSearchCombo
                onFilmSelected={handleFilmSelected}
                disabled={createMutation.isPending || updateMutation.isPending}
                selectedFilmId={''}
              />
              {formData.films.length < 2 && (
                <p className={styles.fieldHint}>Add at least two films for a double feature.</p>
              )}
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label htmlFor="film-search">Film</label>
              <FilmSearchCombo
                onFilmSelected={handleFilmSelected}
                disabled={createMutation.isPending || updateMutation.isPending}
                selectedFilmId={formData.films[0] ?? ''}
              />
            </div>
          )}

          {formData.kind !== 'REGULAR' && (
            <div className={styles.formGroup}>
              <label htmlFor="engagement-event-title">Event Title (optional)</label>
              <input
                id="engagement-event-title"
                type="text"
                value={formData.event_title}
                onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                className={styles.input}
                placeholder="e.g. Creature Double Feature"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="engagement-screen">Screen</label>
            <select
              id="engagement-screen"
              value={formData.screen}
              onChange={(e) =>
                setFormData({ ...formData, screen: e.target.value ? parseInt(e.target.value) : '' })
              }
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
                onChange={(e) =>
                  setFormData({ ...formData, presentation_format: e.target.value as '2d' | '3d' })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as FormData['status'] })
                }
                className={styles.input}
              >
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.show_in_main_listings}
                onChange={(e) =>
                  setFormData({ ...formData, show_in_main_listings: e.target.checked })
                }
              />
              Show in main listings
            </label>
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
