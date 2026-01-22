// src/pages/Showtimes.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showtimesApi, engagementsApi, screensApi } from '../api';
import type { Showtime, ShowtimeCreate, BulkShowtimeCreate, Engagement, Screen } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, getDateInTimezone, getTimeInTimezone } from '../utils/timezone';
import styles from './Showtimes.module.css';

type ModalMode = 'closed' | 'create' | 'edit' | 'bulk';

interface FormData {
  engagement: number | '';
  screen: number | '';
  starts_at_date: string;
  starts_at_time: string;
  is_cancelled: boolean;
  captions: 'CC' | 'OC' | '';
}

interface BulkFormData {
  engagement: number | '';
  screen: number | '';
  start_date: string;
  end_date: string;
  times: string[];
  captions: 'CC' | 'OC' | '';
}

const initialFormData: FormData = {
  engagement: '',
  screen: '',
  starts_at_date: '',
  starts_at_time: '',
  is_cancelled: false,
  captions: '',
};

const initialBulkFormData: BulkFormData = {
  engagement: '',
  screen: '',
  start_date: '',
  end_date: '',
  times: [''],
  captions: '',
};

export default function Showtimes() {
  const queryClient = useQueryClient();
  const { currentCinema } = useAuth();
  const cinemaTimezone = currentCinema?.cinema_timezone || 'America/New_York';
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [bulkFormData, setBulkFormData] = useState<BulkFormData>(initialBulkFormData);
  const [engagementFilter, setEngagementFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Queries
  const { data: showtimes = [], isLoading: showtimesLoading } = useQuery({
    queryKey: ['showtimes', engagementFilter, dateFilter],
    queryFn: () => showtimesApi.list({
      engagement: engagementFilter ? parseInt(engagementFilter) : undefined,
      date: dateFilter || undefined,
    }),
  });

  const { data: engagements = [] } = useQuery({
    queryKey: ['engagements'],
    queryFn: () => engagementsApi.list({}),
  });

  const { data: screens = [] } = useQuery({
    queryKey: ['screens'],
    queryFn: () => screensApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ShowtimeCreate) => showtimesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ShowtimeCreate> }) =>
      showtimesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => showtimesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: BulkShowtimeCreate) => showtimesApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      closeModal();
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData({
      ...initialFormData,
      engagement: engagementFilter ? parseInt(engagementFilter) : '',
    });
    setSelectedShowtime(null);
    setModalMode('create');
  };

  const openBulkModal = () => {
    setBulkFormData({
      ...initialBulkFormData,
      engagement: engagementFilter ? parseInt(engagementFilter) : '',
    });
    setModalMode('bulk');
  };

  const openEditModal = (showtime: Showtime) => {
    const startsAt = new Date(showtime.starts_at);
    setFormData({
      engagement: showtime.engagement,
      screen: showtime.screen,
      starts_at_date: getDateInTimezone(startsAt, cinemaTimezone),
      starts_at_time: getTimeInTimezone(startsAt, cinemaTimezone),
      is_cancelled: showtime.is_cancelled,
      captions: showtime.captions || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.engagement === '') return;

    const startsAt = `${formData.starts_at_date}T${formData.starts_at_time}:00`;

    const data: ShowtimeCreate = {
      engagement: formData.engagement as number,
      screen: formData.screen ? (formData.screen as number) : undefined,
      starts_at: startsAt,
      is_cancelled: formData.is_cancelled,
      captions: formData.captions || null,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedShowtime) {
      updateMutation.mutate({ id: selectedShowtime.id, data });
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkFormData.engagement === '' || bulkFormData.times.filter(t => t).length === 0) return;

    const data: BulkShowtimeCreate = {
      engagement: bulkFormData.engagement as number,
      screen: bulkFormData.screen ? (bulkFormData.screen as number) : null,
      start_date: bulkFormData.start_date,
      end_date: bulkFormData.end_date,
      times: bulkFormData.times.filter(t => t),
      captions: bulkFormData.captions || null,
    };

    bulkCreateMutation.mutate(data);
  };

  const handleDelete = (showtime: Showtime) => {
    if (window.confirm(`Are you sure you want to delete this showtime?`)) {
      deleteMutation.mutate(showtime.id);
    }
  };

  const addTimeSlot = () => {
    setBulkFormData({
      ...bulkFormData,
      times: [...bulkFormData.times, ''],
    });
  };

  const removeTimeSlot = (index: number) => {
    setBulkFormData({
      ...bulkFormData,
      times: bulkFormData.times.filter((_, i) => i !== index),
    });
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...bulkFormData.times];
    newTimes[index] = value;
    setBulkFormData({ ...bulkFormData, times: newTimes });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Showtimes</h1>
          <p className={styles.subtitle}>Schedule and manage your showtimes.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={openBulkModal}>
            Bulk Create
          </button>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            + New Showtime
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Engagement:
          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Engagements</option>
            {engagements.map((eng: Engagement) => (
              <option key={eng.id} value={eng.id}>
                {eng.film_title}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterLabel}>
          Date:
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={styles.filterInput}
          />
        </label>
        {(engagementFilter || dateFilter) && (
          <button
            className={styles.clearButton}
            onClick={() => {
              setEngagementFilter('');
              setDateFilter('');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Showtimes List */}
      {showtimesLoading ? (
        <div className={styles.loading}>Loading showtimes...</div>
      ) : showtimes.length === 0 ? (
        <div className={styles.empty}>
          <p>No showtimes found.</p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Create your first showtime
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Film</th>
                <th>Screen</th>
                <th>Date & Time</th>
                <th>Captions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {showtimes.map((showtime) => (
                <tr key={showtime.id} className={showtime.is_cancelled ? styles.cancelledRow : ''}>
                  <td>
                    <span className={styles.filmTitle}>{showtime.film_title}</span>
                    {showtime.is_outside_engagement_range && (
                      <span className={styles.warningBadge} title="Outside engagement date range">
                        !
                      </span>
                    )}
                  </td>
                  <td>{showtime.screen_name}</td>
                  <td>{formatDateTime(showtime.starts_at, cinemaTimezone)}</td>
                  <td>{showtime.captions || '-'}</td>
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
      )}

      {/* Single Showtime Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalMode === 'create' ? 'New Showtime' : 'Edit Showtime'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Engagement</label>
                <select
                  value={formData.engagement}
                  onChange={(e) => setFormData({ ...formData, engagement: e.target.value ? parseInt(e.target.value) : '' })}
                  required
                  className={styles.input}
                >
                  <option value="">Select an engagement</option>
                  {engagements.map((eng: Engagement) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.film_title} ({eng.start_date} - {eng.end_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Screen (optional, defaults to engagement's screen)</label>
                <select
                  value={formData.screen}
                  onChange={(e) => setFormData({ ...formData, screen: e.target.value ? parseInt(e.target.value) : '' })}
                  className={styles.input}
                >
                  <option value="">Use engagement default</option>
                  {screens.map((screen: Screen) => (
                    <option key={screen.id} value={screen.id}>
                      {screen.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.starts_at_date}
                    onChange={(e) => setFormData({ ...formData, starts_at_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Time</label>
                  <input
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
                  <label>Captions</label>
                  <select
                    value={formData.captions}
                    onChange={(e) => setFormData({ ...formData, captions: e.target.value as FormData['captions'] })}
                    className={styles.input}
                  >
                    <option value="">None</option>
                    <option value="CC">Closed Captions</option>
                    <option value="OC">Open Captions</option>
                  </select>
                </div>
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
                    ? 'Create Showtime'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {modalMode === 'bulk' && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Bulk Create Showtimes</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Engagement</label>
                <select
                  value={bulkFormData.engagement}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, engagement: e.target.value ? parseInt(e.target.value) : '' })}
                  required
                  className={styles.input}
                >
                  <option value="">Select an engagement</option>
                  {engagements.map((eng: Engagement) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.film_title} ({eng.start_date} - {eng.end_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Screen (optional)</label>
                <select
                  value={bulkFormData.screen}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, screen: e.target.value ? parseInt(e.target.value) : '' })}
                  className={styles.input}
                >
                  <option value="">Use engagement default</option>
                  {screens.map((screen: Screen) => (
                    <option key={screen.id} value={screen.id}>
                      {screen.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={bulkFormData.start_date}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, start_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={bulkFormData.end_date}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, end_date: e.target.value })}
                    required
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Show Times</label>
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
                    + Add Time
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Captions</label>
                <select
                  value={bulkFormData.captions}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, captions: e.target.value as BulkFormData['captions'] })}
                  className={styles.input}
                >
                  <option value="">None</option>
                  <option value="CC">Closed Captions</option>
                  <option value="OC">Open Captions</option>
                </select>
              </div>

              <div className={styles.bulkInfo}>
                {bulkFormData.start_date && bulkFormData.end_date && bulkFormData.times.filter(t => t).length > 0 && (
                  <p>
                    This will create{' '}
                    <strong>
                      {Math.max(0, Math.ceil((new Date(bulkFormData.end_date).getTime() - new Date(bulkFormData.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1) * bulkFormData.times.filter(t => t).length)}
                    </strong>{' '}
                    showtimes.
                  </p>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={bulkCreateMutation.isPending}
                >
                  {bulkCreateMutation.isPending ? 'Creating...' : 'Create Showtimes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
