// src/components/Drawer.tsx
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Drawer.module.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated without triggering effects
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Handle open/close side effects
  useEffect(() => {
    if (!isOpen) {
      // Unlock body scroll
      document.body.style.overflow = '';
      // Restore focus
      previousActiveElement.current?.focus();
      return;
    }

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Focus first focusable element in the drawer
    const timer = setTimeout(() => {
      const firstInput = drawerRef.current?.querySelector<HTMLElement>(
        'input, select, textarea'
      );
      if (firstInput) {
        firstInput.focus();
      } else {
        drawerRef.current?.focus();
      }
    }, 0);

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    // Focus trap
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drawerRef.current) return;

      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleFocusTrap);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} data-cy="drawer-overlay" onClick={onClose}>
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${styles[width]}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        data-cy="drawer"
      >
        <div className={styles.header}>
          <h2 id="drawer-title" className={styles.title} data-cy="drawer-title">
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close drawer"
            data-cy="drawer-close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className={styles.content} data-cy="drawer-content">{children}</div>
        {footer && <div className={styles.footer} data-cy="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}
