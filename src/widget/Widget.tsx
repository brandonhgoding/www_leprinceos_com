// src/widget/Widget.tsx
// Root widget component that manages view navigation between
// showtimes, checkout, and confirmation screens.

import { useCallback, useState } from 'react';
import type { WidgetConfig, WidgetView } from './types.ts';
import CheckoutView from './views/CheckoutView.tsx';
import ConfirmationView from './views/ConfirmationView.tsx';
import ShowtimesView from './views/ShowtimesView.tsx';

interface WidgetProps {
  config: WidgetConfig;
}

export default function Widget({ config }: WidgetProps) {
  const [view, setView] = useState<WidgetView>({ name: 'showtimes' });

  const handleSelectShowtime = useCallback((showtimeId: number) => {
    setView({ name: 'checkout', showtimeId });
  }, []);

  const handleBackToShowtimes = useCallback(() => {
    setView({ name: 'showtimes' });
  }, []);

  const handleOrderComplete = useCallback((orderId: string) => {
    setView({ name: 'confirmation', orderId });
  }, []);

  const handleBuyMore = useCallback(() => {
    setView({ name: 'showtimes' });
  }, []);

  return (
    <div className="lpo-widget">
      {view.name === 'showtimes' && (
        <ShowtimesView config={config} onSelectShowtime={handleSelectShowtime} />
      )}

      {view.name === 'checkout' && (
        <CheckoutView
          config={config}
          showtimeId={view.showtimeId}
          onBack={handleBackToShowtimes}
          onComplete={handleOrderComplete}
        />
      )}

      {view.name === 'confirmation' && (
        <ConfirmationView config={config} orderId={view.orderId} onBuyMore={handleBuyMore} />
      )}

      {view.name === 'error' && (
        <div className="lpo-empty" role="alert">
          <p className="lpo-empty-title">Something went wrong</p>
          <p>{view.message}</p>
          {view.retry && (
            <button
              className="lpo-btn-secondary"
              onClick={view.retry}
              type="button"
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          )}
        </div>
      )}

      <div className="lpo-powered-by">
        <a href="https://leprinceos.com" target="_blank" rel="noopener noreferrer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
          Powered by LeprinceOS
        </a>
      </div>
    </div>
  );
}
