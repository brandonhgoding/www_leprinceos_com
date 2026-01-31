// src/components/StatusDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import styles from './StatusDropdown.module.css';

type EngagementStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';

interface StatusDropdownProps {
  value: EngagementStatus;
  onChange: (newStatus: EngagementStatus) => Promise<void>;
  disabled?: boolean;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  description: string;
}

const STATUS_CONFIG: Record<EngagementStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'status-draft',
    description: 'Not yet confirmed',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badgeClass: 'status-confirmed',
    description: 'Active engagement',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'status-cancelled',
    description: 'Engagement cancelled',
  },
  ENDED: {
    label: 'Ended',
    badgeClass: 'status-ended',
    description: 'Engagement has ended',
  },
};

const STATUS_ORDER: EngagementStatus[] = ['DRAFT', 'CONFIRMED', 'CANCELLED', 'ENDED'];

export default function StatusDropdown({ value, onChange, disabled = false }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleStatusChange = async (newStatus: EngagementStatus) => {
    if (newStatus === value || isLoading) return;

    setIsLoading(true);
    try {
      await onChange(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      // Error handling - the parent component should handle this via onError if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, status: EngagementStatus) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStatusChange(status);
    }
  };

  const currentConfig = STATUS_CONFIG[value];

  return (
    <div className={styles.statusDropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`status-badge ${currentConfig.badgeClass} ${styles.statusButton}`}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Change status from ${currentConfig.label}`}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true"></span>
            <span>Updating...</span>
          </>
        ) : (
          <>
            {currentConfig.label}
            <span className={styles.chevron} aria-hidden="true">
              ▼
            </span>
          </>
        )}
      </button>

      {isOpen && !isLoading && (
        <div className={styles.dropdown} role="listbox" aria-label="Select status">
          {STATUS_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const isCurrent = status === value;

            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={isCurrent}
                className={`${styles.dropdownItem} ${isCurrent ? styles.currentItem : ''}`}
                onClick={() => handleStatusChange(status)}
                onKeyDown={(e) => handleKeyDown(e, status)}
                disabled={isCurrent}
              >
                <div className={styles.statusOption}>
                  <span className={`status-badge ${config.badgeClass} ${styles.optionBadge}`}>
                    {config.label}
                  </span>
                  {isCurrent && (
                    <span className={styles.checkmark} aria-label="Current status">
                      ✓
                    </span>
                  )}
                </div>
                <p className={styles.statusDescription}>{config.description}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
