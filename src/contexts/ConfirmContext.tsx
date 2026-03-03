/* eslint-disable react-refresh/only-export-components */
// src/contexts/ConfirmContext.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

interface PromptOptions extends ConfirmOptions {
  promptLabel?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'default';
  isPrompt: boolean;
  promptLabel?: string;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'default',
    isPrompt: false,
  });
  const [promptValue, setPromptValue] = useState('');
  const resolveRef = useRef<((value: boolean | string | null) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string | null) => void;
      setDialog({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirm',
        variant: options.variant || 'default',
        isPrompt: false,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string | null) => void;
      setPromptValue('');
      setDialog({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirm',
        variant: options.variant || 'default',
        isPrompt: true,
        promptLabel: options.promptLabel,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialog.isPrompt) {
      resolveRef.current?.(promptValue);
    } else {
      resolveRef.current?.(true);
    }
    setDialog((prev) => ({ ...prev, isOpen: false }));
  }, [dialog.isPrompt, promptValue]);

  const handleCancel = useCallback(() => {
    if (dialog.isPrompt) {
      resolveRef.current?.(null);
    } else {
      resolveRef.current?.(false);
    }
    setDialog((prev) => ({ ...prev, isOpen: false }));
  }, [dialog.isPrompt]);

  // Focus management, ESC key, focus trap
  useEffect(() => {
    if (!dialog.isOpen) {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
      return;
    }

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (dialog.isPrompt) {
        const textarea = dialogRef.current?.querySelector<HTMLElement>('textarea');
        textarea?.focus();
      } else {
        // Focus cancel button — safer default for destructive actions
        const cancelBtn = dialogRef.current?.querySelector<HTMLElement>('[data-confirm-cancel]');
        cancelBtn?.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, textarea, [tabindex]:not([tabindex="-1"])',
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
  }, [dialog.isOpen, dialog.isPrompt, handleCancel]);

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {dialog.isOpen && (
        <div className={styles.overlay} onClick={handleCancel} data-testid="confirm-overlay">
          <div
            ref={dialogRef}
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            tabIndex={-1}
          >
            <div className={styles.header}>
              <h2 id="confirm-dialog-title" className={styles.title}>
                {dialog.title}
              </h2>
            </div>
            <div className={styles.body}>
              <p id="confirm-dialog-message" className={styles.message}>
                {dialog.message}
              </p>
              {dialog.isPrompt && (
                <div className={styles.promptGroup}>
                  {dialog.promptLabel && (
                    <label htmlFor="confirm-dialog-prompt" className={styles.promptLabel}>
                      {dialog.promptLabel}
                    </label>
                  )}
                  <textarea
                    id="confirm-dialog-prompt"
                    className={styles.promptInput}
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                data-confirm-cancel
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.confirmButton} ${
                  dialog.variant === 'danger' ? styles.danger : ''
                }`}
                onClick={handleConfirm}
                data-confirm-ok
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
