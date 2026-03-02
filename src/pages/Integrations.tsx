import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import squareApi from '../api/square';
import type { SquareCredentialsCreate, SquareConnectionTest } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Integrations.module.css';

type ModalType = 'credentials' | 'logs' | 'test' | null;

export default function Integrations() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [testResult, setTestResult] = useState<SquareConnectionTest | null>(null);

  // Form state for credentials
  const [credentialsForm, setCredentialsForm] = useState<SquareCredentialsCreate>({
    access_token: '',
    refresh_token: '',
    environment: 'sandbox',
    location_id: '',
    merchant_id: '',
  });

  // Fetch Square credentials
  const { data: credentials, isLoading: loadingCredentials } = useQuery({
    queryKey: ['square-credentials'],
    queryFn: squareApi.getCredentials,
  });

  // Fetch sync history
  const { data: syncHistory, isLoading: loadingSyncHistory } = useQuery({
    queryKey: ['square-sync-history'],
    queryFn: squareApi.getSyncHistory,
    enabled: modalType === 'logs',
  });

  // Mutations
  const saveCredentialsMutation = useMutation({
    mutationFn: squareApi.saveCredentials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['square-credentials'] });
      setModalType(null);
      resetForm();
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to save Square credentials.')),
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: squareApi.deleteCredentials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['square-credentials'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to disconnect Square.')),
  });

  const testConnectionMutation = useMutation({
    mutationFn: squareApi.testConnection,
    onSuccess: (data) => {
      setTestResult(data);
      setModalType('test');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to test Square connection.')),
  });

  const triggerSyncMutation = useMutation({
    mutationFn: squareApi.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['square-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['square-credentials'] });
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to trigger Square sync.')),
  });

  const resetForm = () => {
    setCredentialsForm({
      access_token: '',
      refresh_token: '',
      environment: 'sandbox',
      location_id: '',
      merchant_id: '',
    });
  };

  const handleToggle = () => {
    if (credentials?.is_configured) {
      if (
        confirm('Are you sure you want to disconnect Square? This will remove your credentials.')
      ) {
        deleteCredentialsMutation.mutate();
      }
    } else {
      setModalType('credentials');
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveCredentialsMutation.mutate(credentialsForm);
  };

  const handleSync = () => {
    triggerSyncMutation.mutate({ sync_type: 'full' });
  };

  const handleClearAndSync = () => {
    if (
      confirm(
        'This will delete all ticket and discount items managed by this system from Square ' +
          'and re-sync them from scratch. Items you manage directly in Square (concessions, etc.) ' +
          'will not be affected. Continue?',
      )
    ) {
      triggerSyncMutation.mutate({ sync_type: 'clear_and_sync' });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: styles.statusPending,
      in_progress: styles.statusInProgress,
      success: styles.statusSuccess,
      partial: styles.statusPartial,
      failed: styles.statusFailed,
    };
    return statusStyles[status] || styles.statusPending;
  };

  // Build integrations list (just Square for now)
  const integrations = [
    {
      id: 'square',
      name: 'Square',
      description: 'Sync tickets and member discounts to Square POS',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.integrationIcon}>
          <path d="M3 3h18v18H3V3zm16.5 16.5v-15h-15v15h15zM8.25 8.25h7.5v7.5h-7.5v-7.5z" />
        </svg>
      ),
      is_configured: credentials?.is_configured || false,
      is_active: credentials?.is_active || false,
      status: credentials?.is_configured
        ? credentials?.is_active
          ? 'connected'
          : 'disconnected'
        : 'disconnected',
      last_sync_at: credentials?.last_sync_at || null,
      environment: credentials?.environment || 'sandbox',
      location_id: credentials?.location_id || '',
      token_preview: credentials?.token_preview || '',
    },
  ];

  if (loadingCredentials) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Integrations</h1>
          <p className={styles.subtitle}>Connect your cinema to external services</p>
        </div>
      </div>

      {/* Integrations Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Integration</th>
              <th>Status</th>
              <th>Last Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.id}>
                <td>
                  <div className={styles.integrationCell}>
                    <div className={styles.integrationIconWrapper}>{integration.icon}</div>
                    <div>
                      <div className={styles.integrationName}>{integration.name}</div>
                      <div className={styles.integrationDescription}>{integration.description}</div>
                      {integration.is_configured && (
                        <div className={styles.integrationMeta}>
                          <span className={styles.envBadge}>{integration.environment}</span>
                          {integration.location_id && (
                            <span className={styles.locationId}>
                              Location: {integration.location_id}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${
                      integration.status === 'connected'
                        ? styles.statusConnected
                        : styles.statusDisconnected
                    }`}
                  >
                    {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
                  </span>
                </td>
                <td>
                  <span className={styles.lastSync}>{formatDate(integration.last_sync_at)}</span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={integration.is_configured}
                        onChange={handleToggle}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    {integration.is_configured && (
                      <>
                        <button
                          className={styles.actionButton}
                          onClick={() => setModalType('credentials')}
                          title="Edit credentials"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                          </svg>
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => testConnectionMutation.mutate()}
                          disabled={testConnectionMutation.isPending}
                          title="Test connection"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                            <path
                              fillRule="evenodd"
                              d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
                            />
                          </svg>
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => setModalType('logs')}
                          title="View sync logs"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
                            <path d="M5 4h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 3h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zm0 3h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1z" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.syncButton}`}
                          onClick={handleSync}
                          disabled={triggerSyncMutation.isPending}
                          title="Sync now"
                        >
                          {triggerSyncMutation.isPending ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.clearSyncButton}`}
                          onClick={handleClearAndSync}
                          disabled={triggerSyncMutation.isPending}
                          title="Delete system-managed ticket and discount items from Square and re-sync"
                        >
                          Clear & Re-sync
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credentials Drawer */}
      <Drawer
        isOpen={modalType === 'credentials'}
        onClose={() => setModalType(null)}
        title={`${credentials?.is_configured ? 'Edit' : 'Configure'} Square Integration`}
        footer={
          <>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setModalType(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="credentials-form"
              className={styles.submitButton}
              disabled={saveCredentialsMutation.isPending}
            >
              {saveCredentialsMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form id="credentials-form" className={styles.form} onSubmit={handleSaveCredentials}>
          <div className={styles.formGroup}>
            <label htmlFor="square-environment">Environment</label>
            <select
              id="square-environment"
              className={styles.select}
              value={credentialsForm.environment}
              onChange={(e) =>
                setCredentialsForm({
                  ...credentialsForm,
                  environment: e.target.value as 'sandbox' | 'production',
                })
              }
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="square-access-token">Access Token *</label>
            <input
              id="square-access-token"
              type="password"
              className={styles.input}
              value={credentialsForm.access_token}
              onChange={(e) =>
                setCredentialsForm({ ...credentialsForm, access_token: e.target.value })
              }
              placeholder={credentials?.token_preview || 'Enter Square access token'}
              required={!credentials?.is_configured}
            />
            {credentials?.is_configured && (
              <span className={styles.hint}>
                Leave blank to keep existing token ({credentials.token_preview})
              </span>
            )}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="square-location-id">Location ID *</label>
            <input
              id="square-location-id"
              type="text"
              className={styles.input}
              value={credentialsForm.location_id}
              onChange={(e) =>
                setCredentialsForm({ ...credentialsForm, location_id: e.target.value })
              }
              placeholder={credentials?.location_id || 'Enter Square location ID'}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="square-merchant-id">Merchant ID (optional)</label>
            <input
              id="square-merchant-id"
              type="text"
              className={styles.input}
              value={credentialsForm.merchant_id}
              onChange={(e) =>
                setCredentialsForm({ ...credentialsForm, merchant_id: e.target.value })
              }
              placeholder={credentials?.merchant_id || 'Enter Square merchant ID'}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="square-refresh-token">Refresh Token (optional)</label>
            <input
              id="square-refresh-token"
              type="password"
              className={styles.input}
              value={credentialsForm.refresh_token}
              onChange={(e) =>
                setCredentialsForm({ ...credentialsForm, refresh_token: e.target.value })
              }
              placeholder="For OAuth flow (optional)"
            />
          </div>
        </form>
      </Drawer>

      {/* Sync Logs Drawer */}
      <Drawer
        isOpen={modalType === 'logs'}
        onClose={() => setModalType(null)}
        title="Sync History"
        width="lg"
      >
        <div className={styles.logsContent}>
          {loadingSyncHistory ? (
            <div className={styles.loading}>Loading sync history...</div>
          ) : syncHistory && syncHistory.length > 0 ? (
            <table className={styles.logsTable}>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Objects</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.started_at)}</td>
                    <td>
                      <span className={styles.syncType}>{log.sync_type}</span>
                    </td>
                    <td>
                      <span className={`${styles.logStatus} ${getStatusBadge(log.status)}`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={styles.objectCount}>
                        {log.objects_synced} synced
                        {log.objects_failed > 0 && (
                          <span className={styles.failedCount}>, {log.objects_failed} failed</span>
                        )}
                      </span>
                    </td>
                    <td>
                      {log.completed_at
                        ? `${Math.round(
                            (new Date(log.completed_at).getTime() -
                              new Date(log.started_at).getTime()) /
                              1000,
                          )}s`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.empty}>No sync history available</div>
          )}
        </div>
      </Drawer>

      {/* Test Connection Drawer */}
      <Drawer
        isOpen={modalType === 'test' && testResult !== null}
        onClose={() => setModalType(null)}
        title="Connection Test"
        width="sm"
        footer={
          <button className={styles.cancelButton} onClick={() => setModalType(null)}>
            Close
          </button>
        }
      >
        {testResult && (
          <div className={styles.testContent}>
            {testResult.success ? (
              <div className={styles.testSuccess}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={styles.testIcon}
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                </svg>
                <h3>Connection Successful</h3>
                <div className={styles.testDetails}>
                  {testResult.location_name && (
                    <p>
                      <strong>Location:</strong> {testResult.location_name}
                    </p>
                  )}
                  {testResult.location_id && (
                    <p>
                      <strong>Location ID:</strong> {testResult.location_id}
                    </p>
                  )}
                  {testResult.merchant_id && (
                    <p>
                      <strong>Merchant ID:</strong> {testResult.merchant_id}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.testError}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className={styles.testIcon}
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                </svg>
                <h3>Connection Failed</h3>
                <p className={styles.errorMessage}>{testResult.error}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
