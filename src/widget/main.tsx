// src/widget/main.tsx
// Entry point for the embeddable widget.
// Reads config from data attributes on the host div, creates a shadow DOM
// for style isolation, and mounts the React widget app.
//
// Expected HTML on host page:
//   <div id="leprince-buy-tickets" data-cinema="my-cinema" data-theme="light"></div>
//   <script src="https://leprinceos.com/embeds/widget.js" async></script>

import { createRoot } from 'react-dom/client';
import { getWidgetCSS } from './styles.ts';
import type { WidgetConfig } from './types.ts';
import Widget from './Widget.tsx';

const API_BASE = 'https://leprinceos.com/api/v1';

/** Selectors to find the widget container div */
const CONTAINER_SELECTORS = [
  '[id^="leprince-"]', // <div id="leprince-buy-tickets" ...>
  '[data-leprinceos-widget]', // <div data-leprinceos-widget ...>
  '#leprinceos-widget', // legacy: <div id="leprinceos-widget" ...>
] as const;

function findContainer(): HTMLElement | null {
  for (const selector of CONTAINER_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

function parseConfig(container: HTMLElement): WidgetConfig {
  const cinema = container.dataset.cinema ?? '';
  const type = container.dataset.type ?? 'buy-tickets';
  const rawTheme = container.dataset.theme ?? 'light';
  const theme: 'light' | 'dark' = rawTheme === 'dark' ? 'dark' : 'light';

  // Allow overriding the API base URL for development
  const apiBaseUrl = container.dataset.apiBase ?? API_BASE;

  return { cinema, type, theme, apiBaseUrl };
}

function init(): void {
  const container = findContainer();
  if (!container) {
    // Widget div not found - silently exit (might be on a page without the embed)
    return;
  }

  const config = parseConfig(container);

  if (!config.cinema) {
    console.error('[LeprinceOS Widget] Missing data-cinema attribute on widget container.');
    return;
  }

  // Create shadow DOM for style isolation
  const shadow = container.attachShadow({ mode: 'open' });

  // Inject scoped styles
  const styleEl = document.createElement('style');
  styleEl.textContent = getWidgetCSS(config.theme);
  shadow.appendChild(styleEl);

  // Create React mount point inside shadow DOM
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  // Mount React app
  const root = createRoot(mountPoint);
  root.render(<Widget config={config} />);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
