import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentsApi } from '../api';
import type { StripeAccountStatus } from '../api/types';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Integrations.module.css';

function StatusBadge({ status }: { status: StripeAccountStatus }) {
  if (status.charges_enabled) {
    return <span className={`${styles.statusBadge} ${styles.statusConnected}`}>Connected</span>;
  }
  if (status.has_account) {
    return <span className={`${styles.statusBadge} ${styles.statusWarning}`}>Pending</span>;
  }
  return (
    <span className={`${styles.statusBadge} ${styles.statusDisconnected}`}>Not Connected</span>
  );
}

export default function Integrations() {
  const { addToast } = useToast();
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    data: connectStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['stripe-connect-status'],
    queryFn: paymentsApi.getConnectStatus,
  });

  const onboardingMutation = useMutation({
    mutationFn: () => paymentsApi.startOnboarding(window.location.href, window.location.href),
    onSuccess: (data) => {
      window.location.href = data.onboarding_url;
    },
    onError: (err) => {
      addToast(getErrorMessage(err));
    },
  });

  const terminalMutation = useMutation({
    mutationFn: () => paymentsApi.getTerminalConnectionToken(),
    onSuccess: () => {
      setTerminalStatus('success');
      addToast('Terminal connection successful', 'success');
    },
    onError: (err) => {
      setTerminalStatus('error');
      addToast(getErrorMessage(err));
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Integrations</h1>
          <p className={styles.subtitle}>Connect your cinema to external services</p>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>Loading integration status...</div>
        ) : error ? (
          <div className={styles.empty}>Failed to load integration status.</div>
        ) : connectStatus ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Integration</th>
                <th>Status</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Integration">
                  <div className={styles.integrationCell}>
                    <div className={styles.integrationIconWrapper}>
                      <svg
                        className={styles.integrationIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.integrationName}>Stripe Connect</div>
                      <div className={styles.integrationDescription}>
                        Accept card payments online
                      </div>
                    </div>
                  </div>
                </td>
                <td data-label="Status">
                  <StatusBadge status={connectStatus} />
                </td>
                <td data-label="Details">
                  {connectStatus.has_account && connectStatus.stripe_account_id ? (
                    <div>
                      <div className={styles.accountId}>{connectStatus.stripe_account_id}</div>
                      <div className={styles.detailChecks}>
                        <span
                          className={
                            connectStatus.charges_enabled
                              ? styles.checkEnabled
                              : styles.checkDisabled
                          }
                        >
                          {connectStatus.charges_enabled ? '\u2713' : '\u2717'} Charges
                        </span>
                        <span
                          className={
                            connectStatus.payouts_enabled
                              ? styles.checkEnabled
                              : styles.checkDisabled
                          }
                        >
                          {connectStatus.payouts_enabled ? '\u2713' : '\u2717'} Payouts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.noDetails}>No account connected</span>
                  )}
                </td>
                <td data-label="Actions">
                  <div className={styles.actions}>
                    {connectStatus.charges_enabled ? (
                      <a
                        href="https://dashboard.stripe.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.actionButton} ${styles.syncButton}`}
                      >
                        Go to Stripe Dashboard
                      </a>
                    ) : connectStatus.has_account ? (
                      <button
                        className={`${styles.actionButton} ${styles.syncButton}`}
                        onClick={() => onboardingMutation.mutate()}
                        disabled={onboardingMutation.isPending}
                      >
                        {onboardingMutation.isPending ? 'Redirecting...' : 'Continue Setup'}
                      </button>
                    ) : (
                      <button
                        className={`${styles.actionButton} ${styles.syncButton}`}
                        onClick={() => onboardingMutation.mutate()}
                        disabled={onboardingMutation.isPending}
                      >
                        {onboardingMutation.isPending ? 'Redirecting...' : 'Connect with Stripe'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Stripe Terminal */}
      <div className={styles.sectionSpacer} />
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Integration</th>
              <th>Status</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Integration">
                <div className={styles.integrationCell}>
                  <div className={styles.integrationIconWrapper}>
                    <svg
                      className={styles.integrationIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <div className={styles.integrationName}>Stripe Terminal</div>
                    <div className={styles.integrationDescription}>
                      In-person card reader for transactions
                    </div>
                  </div>
                </div>
              </td>
              <td data-label="Status">
                {terminalStatus === 'success' ? (
                  <span className={`${styles.statusBadge} ${styles.statusConnected}`}>
                    Connected
                  </span>
                ) : terminalStatus === 'error' ? (
                  <span className={`${styles.statusBadge} ${styles.statusDisconnected}`}>
                    Error
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.statusDisconnected}`}>
                    Untested
                  </span>
                )}
              </td>
              <td data-label="Details">
                <span className={styles.noDetails}>
                  {terminalStatus === 'success'
                    ? 'Connection token retrieved successfully'
                    : terminalStatus === 'error'
                      ? 'Failed to retrieve connection token'
                      : 'Test connection to verify terminal access'}
                </span>
              </td>
              <td data-label="Actions">
                <div className={styles.actions}>
                  <button
                    className={`${styles.actionButton} ${styles.syncButton}`}
                    onClick={() => terminalMutation.mutate()}
                    disabled={terminalMutation.isPending}
                  >
                    {terminalMutation.isPending ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
