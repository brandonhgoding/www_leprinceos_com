// src/pages/Screens.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { screensApi } from '../api';
import type { Screen } from '../api/types';
import type { ScreenCreate } from '../api/screens';
import Drawer from '../components/Drawer';
import styles from './Screens.module.css';

type ModalMode = 'closed' | 'create' | 'edit';

interface FormData {
  name: string;
  capacity: number | '';
  screen_type: 'standard' | 'imax' | 'dolby_cinema';
  aspect_ratio: 'flat' | 'scope' | 'imax_190' | 'imax_143';
  sound_system: 'standard' | 'dolby_digital' | 'dolby_atmos';
  supports_3d: boolean;
}

const initialFormData: FormData = {
  name: '',
  capacity: '',
  screen_type: 'standard',
  aspect_ratio: 'flat',
  sound_system: 'standard',
  supports_3d: false,
};

const SCREEN_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  imax: 'IMAX',
  dolby_cinema: 'Dolby Cinema',
};

const ASPECT_RATIO_LABELS: Record<string, string> = {
  flat: 'Flat (1.85:1)',
  scope: 'Scope (2.39:1)',
  imax_190: 'IMAX 1.90:1',
  imax_143: 'IMAX 1.43:1',
};

const SOUND_SYSTEM_LABELS: Record<string, string> = {
  standard: 'Standard',
  dolby_digital: 'Dolby Digital',
  dolby_atmos: 'Dolby Atmos',
};

export default function Screens() {
  const queryClient = useQueryClient();
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => screensApi.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ScreenCreate) => screensApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScreenCreate> }) =>
      screensApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => screensApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screens'] });
    },
  });

  // Handlers
  const openCreateModal = () => {
    setFormData(initialFormData);
    setSelectedScreen(null);
    setModalMode('create');
  };

  const openEditModal = (screen: Screen) => {
    setFormData({
      name: screen.name,
      capacity: screen.capacity,
      screen_type: screen.screen_type,
      aspect_ratio: screen.aspect_ratio,
      sound_system: screen.sound_system,
      supports_3d: screen.supports_3d,
    });
    setSelectedScreen(screen);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode('closed');
    setSelectedScreen(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name === '' || formData.capacity === '') return;

    const data: ScreenCreate = {
      name: formData.name,
      capacity: formData.capacity as number,
      screen_type: formData.screen_type,
      aspect_ratio: formData.aspect_ratio,
      sound_system: formData.sound_system,
      supports_3d: formData.supports_3d,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedScreen) {
      updateMutation.mutate({ id: selectedScreen.id, data });
    }
  };

  const handleDelete = (screen: Screen) => {
    if (window.confirm(`Are you sure you want to delete "${screen.name}"? This may affect existing engagements and showtimes.`)) {
      deleteMutation.mutate(screen.id);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Screens</h1>
          <p className={styles.subtitle}>Manage your cinema's screens and auditoriums.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          + New Screen
        </button>
      </div>

      {/* Screens List */}
      {isLoading ? (
        <div className={styles.loading}>Loading screens...</div>
      ) : screens.length === 0 ? (
        <div className={styles.empty}>
          <p>No screens found.</p>
          <button className={styles.primaryButton} onClick={openCreateModal}>
            Add your first screen
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Capacity</th>
                <th>Type</th>
                <th>Aspect Ratio</th>
                <th>Sound</th>
                <th>3D</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {screens.map((screen) => (
                <tr key={screen.id}>
                  <td className={styles.screenName}>{screen.name}</td>
                  <td>{screen.capacity} seats</td>
                  <td>
                    <span className={`${styles.typeBadge} ${styles[`type${screen.screen_type}`]}`}>
                      {SCREEN_TYPE_LABELS[screen.screen_type]}
                    </span>
                  </td>
                  <td>{ASPECT_RATIO_LABELS[screen.aspect_ratio]}</td>
                  <td>{SOUND_SYSTEM_LABELS[screen.sound_system]}</td>
                  <td>
                    {screen.supports_3d ? (
                      <span className={styles.badge3d}>3D</span>
                    ) : (
                      <span className={styles.badgeNo}>—</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openEditModal(screen)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(screen)}
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

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={modalMode !== 'closed'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'New Screen' : 'Edit Screen'}
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="screen-form"
              className={styles.submitButton}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : modalMode === 'create'
                ? 'Create Screen'
                : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="screen-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Screen Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={styles.input}
                placeholder="e.g., Screen 1, Main Auditorium"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Capacity (seats)</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? parseInt(e.target.value) : '' })}
                required
                min="1"
                className={styles.input}
                placeholder="e.g., 150"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Screen Type</label>
              <select
                value={formData.screen_type}
                onChange={(e) => setFormData({ ...formData, screen_type: e.target.value as FormData['screen_type'] })}
                className={styles.input}
              >
                <option value="standard">Standard</option>
                <option value="imax">IMAX</option>
                <option value="dolby_cinema">Dolby Cinema</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Aspect Ratio</label>
              <select
                value={formData.aspect_ratio}
                onChange={(e) => setFormData({ ...formData, aspect_ratio: e.target.value as FormData['aspect_ratio'] })}
                className={styles.input}
              >
                <option value="flat">Flat (1.85:1)</option>
                <option value="scope">Scope (2.39:1)</option>
                <option value="imax_190">IMAX 1.90:1</option>
                <option value="imax_143">IMAX 1.43:1</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Sound System</label>
              <select
                value={formData.sound_system}
                onChange={(e) => setFormData({ ...formData, sound_system: e.target.value as FormData['sound_system'] })}
                className={styles.input}
              >
                <option value="standard">Standard</option>
                <option value="dolby_digital">Dolby Digital</option>
                <option value="dolby_atmos">Dolby Atmos</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.supports_3d}
                  onChange={(e) => setFormData({ ...formData, supports_3d: e.target.checked })}
                />
                Supports 3D Projection
              </label>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
