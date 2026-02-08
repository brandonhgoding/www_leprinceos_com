// src/widget/views/ConfirmationView.tsx
// Shows order confirmation after successful payment.

import { useEffect, useState } from 'react';
import { fetchOrder } from '../api.ts';
import type { OrderConfirmation, WidgetConfig } from '../types.ts';

interface ConfirmationViewProps {
  config: WidgetConfig;
  orderId: string;
  onBuyMore: () => void;
}

function formatCurrency(amount: string): string {
  return `$${amount}`;
}

export default function ConfirmationView({ config, orderId, onBuyMore }: ConfirmationViewProps) {
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrder(config.apiBaseUrl, orderId)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load order details';
          setError(message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [config.apiBaseUrl, orderId]);

  if (loading) {
    return (
      <div className="lpo-loading" role="status">
        <div className="lpo-spinner" aria-hidden="true" />
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="lpo-empty" role="alert">
        <p className="lpo-empty-title">Unable to load order</p>
        <p>{error ?? 'Order not found'}</p>
      </div>
    );
  }

  const showtimeDate = new Date(order.showtime_starts_at);
  const dateStr = showtimeDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = showtimeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="lpo-confirmation">
      {/* Success icon */}
      <div className="lpo-confirm-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h2 className="lpo-confirm-title">Order Confirmed</h2>
      <p className="lpo-confirm-number">{order.confirmation_number}</p>

      <div className="lpo-confirm-card">
        <div className="lpo-confirm-film">
          <div className="lpo-confirm-film-info">
            <h3 className="lpo-confirm-film-title">{order.film_title}</h3>
            <p className="lpo-confirm-showtime">
              {dateStr}
              <br />
              {timeStr}
              {order.screen_name && <> &middot; {order.screen_name}</>}
            </p>
          </div>
        </div>

        <div className="lpo-confirm-details">
          {order.items.map((item, i) => (
            <div className="lpo-detail-row" key={i}>
              <span className="lpo-detail-label">
                {item.quantity}x {item.ticket_type_name}
              </span>
              <span className="lpo-detail-value">{formatCurrency(item.line_total)}</span>
            </div>
          ))}

          {order.tax_amount && order.tax_amount !== '0.00' && (
            <div className="lpo-detail-row">
              <span className="lpo-detail-label">Tax</span>
              <span className="lpo-detail-value">{formatCurrency(order.tax_amount)}</span>
            </div>
          )}

          <div className="lpo-detail-row lpo-detail-total">
            <span className="lpo-detail-label">Total Paid</span>
            <span className="lpo-detail-value">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      <div className="lpo-confirm-message">
        <p>
          A confirmation email with your tickets has been sent.
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'inherit' }}>
          Please show your tickets (QR code from email) when you arrive at the theater.
        </p>
      </div>

      <button className="lpo-btn-secondary" onClick={onBuyMore} type="button">
        Buy More Tickets
      </button>
    </div>
  );
}
