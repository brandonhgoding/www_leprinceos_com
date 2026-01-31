// src/components/AlertBanner.tsx
import { useState } from 'react';
import styles from './AlertBanner.module.css';

export type AlertType = 'warning' | 'info' | 'success' | 'error';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  dismissible?: boolean;
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
}

const alertIcons: Record<AlertType, string> = {
  warning: '⚠',
  info: 'ℹ',
  success: '✓',
  error: '✕',
};

const alertLabels: Record<AlertType, string> = {
  warning: 'Warning',
  info: 'Information',
  success: 'Success',
  error: 'Error',
};

export default function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, alertId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDismiss(alertId);
    }
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={styles.alertContainer}>
      {visibleAlerts.map(alert => (
        <div
          key={alert.id}
          role="alert"
          aria-live="polite"
          className={`${styles.alert} ${styles[`alert${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`]}`}
        >
          <div className={styles.alertIcon} aria-label={alertLabels[alert.type]}>
            {alertIcons[alert.type]}
          </div>

          <p className={styles.alertMessage}>{alert.message}</p>

          {alert.dismissible !== false && (
            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              onKeyDown={(e) => handleKeyDown(e, alert.id)}
              className={styles.dismissButton}
              aria-label="Dismiss alert"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
