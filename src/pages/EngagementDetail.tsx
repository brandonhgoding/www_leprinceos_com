// src/pages/EngagementDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementsApi, showtimesApi } from '../api';
import type { Showtime, ShowtimeCreate, BulkShowtimeCreate } from '../api/types';
import {
  formatDateTime,
  formatDate,
  getDateInTimezone,
  getTimeInTimezone,
  DEFAULT_TIMEZONE,
} from '../utils/timezone';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getErrorMessage } from '../utils/errorMessage';
import { KIND_LABELS } from '../utils/engagementKinds';
import styles from './EngagementDetail.module.css';

type ModalMode = 'closed' | 'create' | 'edit' | 'bulk';

interface ShowtimeFormData {
  starts_at_date: string;
  starts_at_time: string;
  is_cancelled: boolean;
  captions: 'CC' | 'OC' | null;
}

interface BulkFormData {
  start_date: string;
  end_date: string;
  times: string[];
  captions: 'CC' | 'OC' | null;
}

const initialFormData: ShowtimeFormData = {
  starts_at_date: '',
  starts_at_time: '',
  is_cancelled: false,
  captions: null,
};

const initialBulkFormData: BulkFormData = {
  start_date: '',
  end_date: '',
  times: [''],
  captions: null,
};

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const engagementId = parseInt(id || '0');
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const cinemaTimezone = DEFAULT_TIMEZONE;

  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [formData, setFormData] = useState<ShowtimeFormData>(initialFormData);
  const [bulkFormData, setBulkFormData] = useState<BulkFormData>(initialBulkFormData);

  // Fetch engagement
  const { data: engagement, isLoading: engagementLoading } = useQuery({
    queryKey: ['engagement', engagementId],
    queryFn: () => engagementsApi.get(engagementId),
    enabled: engagementId > 0,
  });

  // Fetch showtimes for this engagement
  const { data: showtimes = [], isLoading: showtimesLoading } = useQuery({
    queryKey: ['showtimes', 'engagement', engagementId],
    queryFn: () => showtimesApi.list({ engagement: engagementId }),
    enabled: engagementId > 0,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ShowtimeCreate) => showtimesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes', 'engagement', engagementId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create showtime.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ShowtimeCreate> }) =>
      showtimesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes', 'engagement', engagementId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to update showtime.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => showtimesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes', 'engagement', engagementId] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to delete showtime.')),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: BulkShowtimeCreate) => showtimesApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes', 'engagement', engagementId] });
      closeModal();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to create showtimes.')),
  });

  // Handlers
  const openCreateModal = () => {
    const defaultDate = engagement?.start_date || new Date().toISOString().split('T')[0];
    setFormData({
      ...initialFormData,
      starts_at_date: defaultDate,
    });
    setSelectedShowtime(null);
    setModalMode('create');
  };

  const openEditModal = (showtime: Showtime) => {
    const startsAt = new Date(showtime.starts_at);
    setFormData({
      starts_at_date: getDateInTimezone(startsAt, cinemaTimezone),
      starts_at_time: getTimeInTimezone(startsAt, cinemaTimezone),
      is_cancelled: showtime.is_cancelled,
      captions: showtime.captions,
    });
    setSelectedShowtime(showtime);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedShowtime(null);
    setFormData(initialFormData);
    setBulkFormData(initialBulkFormData);
  };

  const openBulkModal = () => {
    setBulkFormData({
      ...initialBulkFormData,
      start_date: engagement?.start_date || '',
      end_date: engagement?.end_date || '',
    });
    setModalMode('bulk');
  };

  const addTimeSlot = () => {
    setBulkFormData({ ...bulkFormData, times: [...bulkFormData.times, ''] });
  };

  const removeTimeSlot = (index: number) => {
    const newTimes = bulkFormData.times.filter((_, i) => i !== index);
    setBulkFormData({ ...bulkFormData, times: newTimes.length ? newTimes : [''] });
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...bulkFormData.times];
    newTimes[index] = value;
    setBulkFormData({ ...bulkFormData, times: newTimes });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validTimes = bulkFormData.times.filter((t) => t.trim() !== '');
    if (!bulkFormData.start_date || !bulkFormData.end_date || validTimes.length === 0) return;

    const data: BulkShowtimeCreate = {
      engagement: engagementId,
      start_date: bulkFormData.start_date,
      end_date: bulkFormData.end_date,
      times: validTimes,
      captions: bulkFormData.captions,
    };

    bulkCreateMutation.mutate(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.starts_at_date || !formData.starts_at_time) return;

    const starts_at = `${formData.starts_at_date}T${formData.starts_at_time}:00`;

    const data: ShowtimeCreate = {
      engagement: engagementId,
      starts_at,
      is_cancelled: formData.is_cancelled,
      captions: formData.captions,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedShowtime) {
      updateMutation.mutate({ id: selectedShowtime.id, data });
    }
  };

  const handleDelete = async (showtime: Showtime) => {
    if (
      await confirm({
        title: 'Delete Showtime',
        message: 'Are you sure you want to delete this showtime?',
        confirmLabel: 'Delete',
        variant: 'danger',
      })
    ) {
      deleteMutation.mutate(showtime.id);
    }
  };

  // Sort showtimes by date/time
  const sortedShowtimes = [...showtimes].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

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

  if (engagementLoading) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        Loading engagement...
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className={styles.notFound}>
        <p>Engagement not found.</p>
        <Link to="/engagements" className={styles.backLink}>
          &larr; Back to Engagements
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link to="/engagements" className={styles.backLink}>
            &larr; Back to Engagements
          </Link>
          <h1 className={styles.title}>{engagement.display_title}</h1>
          <p className={styles.subtitle}>Engagement Details & Showtimes</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className={styles.cardsGrid}>
        {/* Film Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Film Details</h2>
          <div className={styles.cardContent}>
            {engagement.films[0]?.poster_url && (
              <img
                src={engagement.films[0].poster_url}
                alt={engagement.display_title}
                className={styles.poster}
              />
            )}
            <div className={styles.filmInfo}>
              <h3 className={styles.filmTitle}>{engagement.display_title}</h3>
              <div className={styles.filmList}>
                {engagement.films.map((film, idx) => (
                  <div key={film.id} className={styles.filmRow}>
                    {engagement.films.length > 1 && (
                      <span className={styles.filmOrder}>{idx + 1}</span>
                    )}
                    {/* Skip the thumbnail for the first film — its poster already shows in the hero above. */}
                    {film.poster_url && idx > 0 && (
                      <img src={film.poster_url} alt="" className={styles.posterThumb} />
                    )}
                    <div>
                      <div className={styles.filmRowTitle}>{film.title}</div>
                      {film.runtime_minutes != null && (
                        <div className={styles.filmRowMeta}>{film.runtime_minutes} min</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Engagement Details</h2>
          <div className={styles.engagementInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Status:</span>
              <span className={`${styles.statusBadge} ${getStatusBadgeClass(engagement.status)}`}>
                {engagement.status}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Kind:</span>
              <span>{KIND_LABELS[engagement.kind]}</span>
            </div>
            {engagement.event_title && engagement.event_title !== engagement.display_title && (
              <div className={styles.infoRow}>
                <span className={styles.label}>Event:</span>
                <span>{engagement.event_title}</span>
              </div>
            )}
            {!engagement.show_in_main_listings && (
              <div className={styles.infoRow}>
                <span className={styles.hiddenNote}>Hidden from public listings</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.label}>Screen:</span>
              <span>{engagement.screen_name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Format:</span>
              <span>{engagement.presentation_format.toUpperCase()}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Start Date:</span>
              <span>{formatDate(engagement.start_date, cinemaTimezone)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>End Date:</span>
              <span>{formatDate(engagement.end_date, cinemaTimezone)}</span>
            </div>
            {engagement.notes && (
              <div className={styles.notes}>
                <span className={styles.label}>Notes:</span>
                <p>{engagement.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Showtimes Section */}
      <section className={styles.showtimesSection}>
        <div className={styles.showtimesHeader}>
          <h2 className={styles.sectionTitle}>Showtimes</h2>
          <div className={styles.headerActions}>
            <button className={styles.primaryButton} onClick={openCreateModal}>
              + Add Showtime
            </button>
            <button className={styles.secondaryButton} onClick={openBulkModal}>
              Bulk Add
            </button>
          </div>
        </div>

        {showtimesLoading ? (
          <div className={styles.loading} role="status" aria-live="polite">
            Loading showtimes...
          </div>
        ) : sortedShowtimes.length === 0 ? (
          <div className={styles.empty}>
            <p>No showtimes scheduled for this engagement.</p>
            <button className={styles.primaryButton} onClick={openCreateModal}>
              Add your first showtime
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Screen</th>
                    <th>Captions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShowtimes.map((showtime) => (
                    <tr
                      key={showtime.id}
                      className={showtime.is_cancelled ? styles.cancelledRow : ''}
                    >
                      <td className={styles.dateTimeCell}>
                        {formatDateTime(showtime.starts_at, cinemaTimezone)}
                      </td>
                      <td>{showtime.screen_name}</td>
                      <td>
                        {showtime.captions ? (
                          <span className={styles.captionsBadge}>{showtime.captions}</span>
                        ) : (
                          <span className={styles.noCaptions}>—</span>
                        )}
                      </td>
                      <td>
                        {showtime.is_cancelled ? (
                          <span className={styles.cancelledBadge}>Cancelled</span>
                        ) : (
                          <span className={styles.activeBadge}>Active</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => openEditModal(showtime)}
                          >
                            Edit
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => handleDelete(showtime)}
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
              {sortedShowtimes.map((showtime) => (
                <div
                  key={showtime.id}
                  className={`${styles.card} ${showtime.is_cancelled ? styles.cardCancelled : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardDateTime}>
                      {formatDateTime(showtime.starts_at, cinemaTimezone)}
                    </div>
                    <div className={styles.cardBadges}>
                      {showtime.is_cancelled ? (
                        <span className={styles.cancelledBadge}>Cancelled</span>
                      ) : (
                        <span className={styles.activeBadge}>Active</span>
                      )}
                      {showtime.captions && (
                        <span className={styles.captionsBadge}>{showtime.captions}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardDetail}>
                      <span className={styles.cardLabel}>Screen</span>
                      <span className={styles.cardValue}>{showtime.screen_name}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionButton} onClick={() => openEditModal(showtime)}>
                      Edit
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(showtime)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Create/Edit Showtime Drawer */}
      <Drawer
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Add Showtime' : 'Edit Showtime'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="showtime-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                  ? 'Add Showtime'
                  : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="showtime-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-detail-showtime-date">Date</label>
              <input
                id="engagement-detail-showtime-date"
                type="date"
                value={formData.starts_at_date}
                onChange={(e) => setFormData({ ...formData, starts_at_date: e.target.value })}
                required
                className={styles.input}
                min={engagement?.start_date}
                max={engagement?.end_date}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-detail-showtime-time">Time</label>
              <input
                id="engagement-detail-showtime-time"
                type="time"
                value={formData.starts_at_time}
                onChange={(e) => setFormData({ ...formData, starts_at_time: e.target.value })}
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-detail-showtime-captions">Captions</label>
              <select
                id="engagement-detail-showtime-captions"
                value={formData.captions || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    captions: (e.target.value as 'CC' | 'OC' | null) || null,
                  })
                }
                className={styles.input}
              >
                <option value="">None</option>
                <option value="CC">Closed Captions (CC)</option>
                <option value="OC">Open Captions (OC)</option>
              </select>
            </div>
            {modalMode === 'edit' && (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_cancelled}
                    onChange={(e) => setFormData({ ...formData, is_cancelled: e.target.checked })}
                  />
                  Cancelled
                </label>
              </div>
            )}
          </div>
        </form>
      </Drawer>

      {/* Bulk Add Showtimes Drawer */}
      <Drawer
        isOpen={modalMode === 'bulk'}
        onClose={closeModal}
        title="Bulk Add Showtimes"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="bulk-showtime-form"
              className={styles.submitButton}
              disabled={bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? 'Creating...' : 'Create Showtimes'}
            </button>
          </>
        }
      >
        <form id="bulk-showtime-form" onSubmit={handleBulkSubmit} className={styles.form}>
          <div className={styles.bulkInfo}>
            Create showtimes for each day in the date range at the specified times.
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-detail-bulk-start-date">Start Date</label>
              <input
                id="engagement-detail-bulk-start-date"
                type="date"
                value={bulkFormData.start_date}
                onChange={(e) => setBulkFormData({ ...bulkFormData, start_date: e.target.value })}
                required
                className={styles.input}
                min={engagement?.start_date}
                max={engagement?.end_date}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="engagement-detail-bulk-end-date">End Date</label>
              <input
                id="engagement-detail-bulk-end-date"
                type="date"
                value={bulkFormData.end_date}
                onChange={(e) => setBulkFormData({ ...bulkFormData, end_date: e.target.value })}
                required
                className={styles.input}
                min={engagement?.start_date}
                max={engagement?.end_date}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Showtimes (per day)</label>
            <div className={styles.timeSlots}>
              {bulkFormData.times.map((time, index) => (
                <div key={index} className={styles.timeSlot}>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    required
                    className={styles.input}
                  />
                  {bulkFormData.times.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeTimeButton}
                      onClick={() => removeTimeSlot(index)}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={styles.addTimeButton} onClick={addTimeSlot}>
                + Add another time
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="engagement-detail-bulk-captions">Captions (optional)</label>
            <select
              id="engagement-detail-bulk-captions"
              value={bulkFormData.captions || ''}
              onChange={(e) =>
                setBulkFormData({
                  ...bulkFormData,
                  captions: (e.target.value as 'CC' | 'OC' | null) || null,
                })
              }
              className={styles.input}
            >
              <option value="">None</option>
              <option value="CC">Closed Captions (CC)</option>
              <option value="OC">Open Captions (OC)</option>
            </select>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
