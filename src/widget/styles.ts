// src/widget/styles.ts
// Self-contained CSS for the embeddable widget.
// Injected into shadow DOM to avoid conflicts with host page styles.
// Design tokens match the LeprinceOS embed base template.

export function getWidgetCSS(theme: 'light' | 'dark'): string {
  const isLight = theme === 'light';

  const vars = isLight
    ? {
        bgPrimary: '#faf8f3',
        bgCard: '#ffffff',
        textPrimary: '#0d0d0d',
        textSecondary: 'rgba(13, 13, 13, 0.7)',
        textMuted: 'rgba(13, 13, 13, 0.5)',
        borderColor: 'rgba(13, 13, 13, 0.1)',
        accent: '#b8956c',
        accentHover: '#d4b896',
        errorColor: '#e53e3e',
        errorBg: 'rgba(229, 62, 62, 0.08)',
        errorBorder: 'rgba(229, 62, 62, 0.2)',
        successColor: '#2d8a4e',
        successBg: 'rgba(72, 187, 120, 0.1)',
        successBorder: 'rgba(72, 187, 120, 0.3)',
        warnColor: '#c05621',
        warnBg: 'rgba(237, 137, 54, 0.1)',
        warnBorder: 'rgba(237, 137, 54, 0.3)',
      }
    : {
        bgPrimary: '#1a1a1a',
        bgCard: '#262626',
        textPrimary: '#f5f2eb',
        textSecondary: 'rgba(245, 242, 235, 0.7)',
        textMuted: 'rgba(245, 242, 235, 0.5)',
        borderColor: 'rgba(245, 242, 235, 0.15)',
        accent: '#d4b896',
        accentHover: '#b8956c',
        errorColor: '#fc8181',
        errorBg: 'rgba(229, 62, 62, 0.15)',
        errorBorder: 'rgba(229, 62, 62, 0.3)',
        successColor: '#68d391',
        successBg: 'rgba(72, 187, 120, 0.15)',
        successBorder: 'rgba(72, 187, 120, 0.3)',
        warnColor: '#ed8936',
        warnBg: 'rgba(237, 137, 54, 0.15)',
        warnBorder: 'rgba(237, 137, 54, 0.3)',
      };

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :host {
      all: initial;
      display: block;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .lpo-widget {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: ${vars.bgPrimary};
      color: ${vars.textPrimary};
      line-height: 1.5;
      padding: 1rem;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      border-radius: 8px;
    }

    /* -- Header -- */
    .lpo-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid ${vars.borderColor};
    }

    .lpo-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: ${vars.textPrimary};
    }

    .lpo-subtitle {
      font-size: 0.875rem;
      color: ${vars.textMuted};
    }

    /* -- Back link -- */
    .lpo-back {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: ${vars.textMuted};
      text-decoration: none;
      margin-bottom: 0.75rem;
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
      transition: color 0.15s ease;
    }

    .lpo-back:hover {
      color: ${vars.accent};
    }

    /* -- Film card -- */
    .lpo-film-card {
      background: ${vars.bgCard};
      border: 1px solid ${vars.borderColor};
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
    }

    .lpo-film-poster {
      width: 80px;
      height: 120px;
      object-fit: cover;
      border-radius: 4px;
      background: ${vars.borderColor};
      flex-shrink: 0;
    }

    .lpo-film-poster-placeholder {
      width: 80px;
      height: 120px;
      background: ${vars.borderColor};
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: ${vars.textMuted};
    }

    .lpo-film-info {
      flex: 1;
      min-width: 0;
    }

    .lpo-film-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: ${vars.textPrimary};
    }

    .lpo-film-meta {
      font-size: 0.8125rem;
      color: ${vars.textSecondary};
      margin-bottom: 0.75rem;
    }

    .lpo-film-meta span {
      margin-right: 0.75rem;
    }

    /* -- Showtime badges -- */
    .lpo-showtimes-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .lpo-showtime-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      background: ${vars.bgPrimary};
      border: 1px solid ${vars.borderColor};
      border-radius: 4px;
      color: ${vars.textPrimary};
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .lpo-showtime-badge:hover {
      border-color: ${vars.accent};
      background-color: ${vars.accent};
      color: #ffffff;
    }

    .lpo-showtime-badge:hover .lpo-screen-hint {
      color: rgba(255, 255, 255, 0.7);
    }

    .lpo-screen-hint {
      display: block;
      font-size: 0.6875rem;
      color: ${vars.textMuted};
      margin-top: 0.125rem;
    }

    /* -- Ticket selection rows -- */
    .lpo-ticket-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.875rem 1rem;
      background: ${vars.bgCard};
      border: 1px solid ${vars.borderColor};
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }

    .lpo-ticket-info {
      flex: 1;
      min-width: 0;
    }

    .lpo-ticket-name {
      font-weight: 600;
      display: block;
      color: ${vars.textPrimary};
    }

    .lpo-ticket-desc {
      font-size: 0.8125rem;
      color: ${vars.textSecondary};
      display: block;
      margin-top: 0.125rem;
    }

    .lpo-ticket-price {
      font-weight: 600;
      color: ${vars.accent};
      white-space: nowrap;
      min-width: 60px;
      text-align: right;
    }

    .lpo-qty-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .lpo-qty-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid ${vars.borderColor};
      border-radius: 6px;
      background: ${vars.bgPrimary};
      color: ${vars.textPrimary};
      cursor: pointer;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .lpo-qty-btn:hover:not(:disabled) {
      border-color: ${vars.accent};
      background-color: ${vars.accent};
      color: #ffffff;
    }

    .lpo-qty-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .lpo-qty-display {
      min-width: 24px;
      text-align: center;
      font-weight: 600;
      font-size: 1rem;
    }

    /* -- Order summary -- */
    .lpo-summary {
      background: ${vars.bgCard};
      border: 1px solid ${vars.borderColor};
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }

    .lpo-summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0;
      font-size: 0.875rem;
      color: ${vars.textSecondary};
    }

    .lpo-summary-total {
      font-weight: 600;
      font-size: 1rem;
      color: ${vars.textPrimary};
      padding-top: 0.625rem;
      margin-top: 0.375rem;
      border-top: 1px solid ${vars.borderColor};
    }

    /* -- Buttons -- */
    .lpo-btn-primary {
      display: block;
      width: 100%;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      color: #ffffff;
      background: ${vars.accent};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
    }

    .lpo-btn-primary:hover:not(:disabled) {
      background: ${vars.accentHover};
    }

    .lpo-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .lpo-btn-secondary {
      display: inline-block;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      font-family: inherit;
      color: ${vars.textPrimary};
      background: ${vars.bgPrimary};
      border: 1px solid ${vars.borderColor};
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: border-color 0.15s ease;
    }

    .lpo-btn-secondary:hover {
      border-color: ${vars.accent};
    }

    .lpo-btn-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.75rem;
      padding: 0;
      font-size: 0.8125rem;
      font-family: inherit;
      color: ${vars.textMuted};
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .lpo-btn-link:hover {
      color: ${vars.accent};
    }

    /* -- Form -- */
    .lpo-form-group {
      margin-bottom: 1rem;
    }

    .lpo-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.375rem;
      color: ${vars.textPrimary};
    }

    .lpo-required {
      color: ${vars.errorColor};
    }

    .lpo-optional {
      color: ${vars.textMuted};
      font-weight: 400;
    }

    .lpo-hint {
      display: block;
      font-size: 0.75rem;
      color: ${vars.textMuted};
      margin-top: 0.25rem;
    }

    .lpo-input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      border: 1px solid ${vars.borderColor};
      border-radius: 6px;
      background: ${vars.bgCard};
      color: ${vars.textPrimary};
      transition: border-color 0.15s ease;
    }

    .lpo-input:focus {
      outline: none;
      border-color: ${vars.accent};
    }

    .lpo-input::placeholder {
      color: ${vars.textMuted};
    }

    .lpo-input-invalid {
      border-color: ${vars.errorColor};
    }

    /* -- Card container -- */
    .lpo-card-container {
      min-height: 90px;
      background: ${vars.bgCard};
      border: 1px solid ${vars.borderColor};
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    /* -- Error / Loading / Empty states -- */
    .lpo-error-msg {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: ${vars.errorColor};
      background: ${vars.errorBg};
      border: 1px solid ${vars.errorBorder};
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .lpo-loading {
      text-align: center;
      padding: 3rem 1rem;
    }

    .lpo-empty {
      text-align: center;
      padding: 3rem 1rem;
      color: ${vars.textMuted};
    }

    .lpo-empty-title {
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: ${vars.textSecondary};
    }

    /* -- Spinner -- */
    .lpo-spinner {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid ${vars.borderColor};
      border-top-color: ${vars.accent};
      border-radius: 50%;
      animation: lpo-spin 0.6s linear infinite;
      margin-bottom: 1rem;
    }

    .lpo-spinner-sm {
      width: 16px;
      height: 16px;
      border-width: 2px;
      border-color: rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      vertical-align: middle;
      margin-right: 0.375rem;
      margin-bottom: 0;
    }

    @keyframes lpo-spin {
      to { transform: rotate(360deg); }
    }

    /* -- Confirmation -- */
    .lpo-confirmation {
      text-align: center;
    }

    .lpo-confirm-icon {
      color: ${vars.successColor};
      margin-bottom: 1rem;
    }

    .lpo-confirm-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: ${vars.textPrimary};
    }

    .lpo-confirm-number {
      font-size: 1rem;
      color: ${vars.accent};
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }

    .lpo-confirm-card {
      background: ${vars.bgCard};
      border: 1px solid ${vars.borderColor};
      border-radius: 8px;
      overflow: hidden;
      text-align: left;
      margin-bottom: 1.5rem;
    }

    .lpo-confirm-film {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid ${vars.borderColor};
    }

    .lpo-confirm-poster {
      width: 60px;
      height: 90px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .lpo-confirm-film-info {
      flex: 1;
      min-width: 0;
    }

    .lpo-confirm-film-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: ${vars.textPrimary};
    }

    .lpo-confirm-showtime {
      font-size: 0.8125rem;
      color: ${vars.textSecondary};
      line-height: 1.5;
    }

    .lpo-confirm-details {
      padding: 1rem;
    }

    .lpo-detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0;
      font-size: 0.875rem;
    }

    .lpo-detail-label {
      color: ${vars.textSecondary};
    }

    .lpo-detail-value {
      font-weight: 500;
      color: ${vars.textPrimary};
    }

    .lpo-detail-total {
      font-weight: 600;
      font-size: 1rem;
      color: ${vars.textPrimary};
      padding-top: 0.75rem;
      margin-top: 0.5rem;
      border-top: 1px solid ${vars.borderColor};
    }

    .lpo-detail-total .lpo-detail-label {
      color: ${vars.textPrimary};
    }

    .lpo-confirm-message {
      margin-bottom: 1.5rem;
    }

    .lpo-confirm-message p {
      font-size: 0.875rem;
      color: ${vars.textSecondary};
      margin-bottom: 0.375rem;
    }

    .lpo-confirm-message strong {
      color: ${vars.textPrimary};
      font-weight: 500;
    }

    /* -- Section title -- */
    .lpo-section-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: ${vars.textPrimary};
    }

    /* -- Member lookup row -- */
    .lpo-member-row {
      display: flex;
      gap: 0.5rem;
    }

    .lpo-member-row .lpo-input {
      flex: 1;
    }

    .lpo-member-status {
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    .lpo-member-found {
      background: ${vars.successBg};
      color: ${vars.successColor};
      border: 1px solid ${vars.successBorder};
    }

    .lpo-member-not-found {
      background: ${vars.warnBg};
      color: ${vars.warnColor};
      border: 1px solid ${vars.warnBorder};
    }

    /* -- Powered by -- */
    .lpo-powered-by {
      text-align: right;
      padding: 1rem 0 0;
      margin-top: 1.5rem;
      border-top: 1px solid ${vars.borderColor};
    }

    .lpo-powered-by a {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      color: ${vars.textMuted};
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .lpo-powered-by a:hover {
      color: ${vars.accent};
    }

    /* -- Responsive -- */
    @media (max-width: 480px) {
      .lpo-ticket-row {
        flex-wrap: wrap;
      }

      .lpo-ticket-info {
        flex-basis: 100%;
        margin-bottom: 0.25rem;
      }

      .lpo-ticket-price {
        flex: 1;
      }

      .lpo-film-card {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .lpo-film-poster,
      .lpo-film-poster-placeholder {
        width: 100px;
        height: 150px;
      }

      .lpo-showtimes-list {
        justify-content: center;
      }
    }

    /* -- Focus ring for accessibility -- */
    button:focus-visible,
    a:focus-visible,
    input:focus-visible {
      outline: 2px solid ${vars.accent};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `;
}
