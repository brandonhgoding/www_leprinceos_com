// src/widget/views/CheckoutView.tsx
// Two-step checkout: (1) select ticket quantities, (2) customer info + Square payment.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, createOrder, fetchAvailability, payOrder } from '../api.ts';
import type {
  Cart,
  CinemaConfig,
  OrderConfirmation,
  ShowtimeAvailability,
  TicketType,
  WidgetConfig,
} from '../types.ts';

interface CheckoutViewProps {
  config: WidgetConfig;
  cinemaConfig: CinemaConfig | null;
  showtimeId: number;
  onBack: () => void;
  onComplete: (orderId: string) => void;
}

const MAX_TICKETS = 10;

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSubtotal(cart: Cart, ticketTypes: TicketType[]): number {
  let subtotal = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const tt = ticketTypes.find((t) => t.id === Number(id));
    if (tt && qty > 0) {
      subtotal += parseFloat(tt.price) * qty;
    }
  }
  return subtotal;
}

function getTotalQuantity(cart: Cart): number {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

// Square types - loaded dynamically
interface SquarePayments {
  card: (opts?: Record<string, unknown>) => Promise<SquareCard>;
}
interface SquareCard {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  destroy: () => Promise<void>;
}
interface SquareGlobal {
  payments: (appId: string, locationId: string) => SquarePayments;
}

export default function CheckoutView({
  config,
  cinemaConfig,
  showtimeId,
  onBack,
  onComplete,
}: CheckoutViewProps) {
  // State
  const [availability, setAvailability] = useState<ShowtimeAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [step, setStep] = useState<'tickets' | 'payment'>('tickets');

  // Customer form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  // Payment state
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Price mismatch state
  const [priceMismatch, setPriceMismatch] = useState<{
    clientTotal: number;
    serverTotal: number;
  } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<OrderConfirmation | null>(null);

  // Refs
  const squareCardRef = useRef<SquareCard | null>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const squareInitializedRef = useRef(false);

  // Load availability data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAvailability(config.apiBaseUrl, showtimeId)
      .then((data) => {
        setAvailability(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load showtime details';
        setError(message);
        setLoading(false);
      });
  }, [config.apiBaseUrl, showtimeId]);

  // Cleanup Square card on unmount
  useEffect(() => {
    return () => {
      if (squareCardRef.current) {
        squareCardRef.current.destroy().catch(() => {});
      }
    };
  }, []);

  const totalQty = getTotalQuantity(cart);
  const subtotal = availability ? getSubtotal(cart, availability.ticket_types) : 0;

  const updateQty = useCallback((ticketTypeId: number, delta: number) => {
    setCart((prev) => {
      const currentQty = prev[ticketTypeId] ?? 0;
      const currentTotal = getTotalQuantity(prev);
      const newQty = Math.max(0, currentQty + delta);

      // Check max total
      if (delta > 0 && currentTotal >= MAX_TICKETS) return prev;

      const next = { ...prev };
      if (newQty === 0) {
        delete next[ticketTypeId];
      } else {
        next[ticketTypeId] = newQty;
      }
      return next;
    });
  }, []);

  // Load Square Web Payments SDK script
  const loadSquareSDK = useCallback((): Promise<void> => {
    if (!cinemaConfig) return Promise.reject(new Error('Cinema config not loaded'));

    // Check if already loaded
    const win = window as unknown as Record<string, unknown>;
    if (win['Square']) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        cinemaConfig.square_environment === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load payment SDK'));
      document.head.appendChild(script);
    });
  }, [cinemaConfig]);

  // Initialize Square card payment form
  const initSquarePayments = useCallback(async () => {
    if (squareInitializedRef.current || !cinemaConfig || !cardContainerRef.current) return;
    squareInitializedRef.current = true;

    try {
      await loadSquareSDK();

      const Square = (window as unknown as Record<string, unknown>)['Square'] as
        | SquareGlobal
        | undefined;
      if (!Square) {
        setPaymentError('Payment system is loading. Please wait a moment and try again.');
        squareInitializedRef.current = false;
        return;
      }

      const payments = Square.payments(cinemaConfig.square_app_id, cinemaConfig.square_location_id);
      const isDark = config.theme === 'dark';

      const card = await payments.card({
        style: {
          '.input-container': {
            borderColor: isDark ? 'rgba(245, 242, 235, 0.15)' : 'rgba(13, 13, 13, 0.1)',
            borderRadius: '6px',
          },
          '.input-container.is-focus': {
            borderColor: isDark ? '#d4b896' : '#b8956c',
          },
          input: {
            backgroundColor: isDark ? '#262626' : '#ffffff',
            color: isDark ? '#f5f2eb' : '#0d0d0d',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
          },
          'input::placeholder': {
            color: isDark ? 'rgba(245, 242, 235, 0.5)' : 'rgba(13, 13, 13, 0.5)',
          },
        },
      });

      squareCardRef.current = card;
      await card.attach(cardContainerRef.current);
    } catch (err: unknown) {
      console.error('Square SDK init error:', err);
      setPaymentError('Could not initialize payment form. Please refresh and try again.');
      squareInitializedRef.current = false;
    }
  }, [cinemaConfig, config.theme, loadSquareSDK]);

  // When moving to payment step, initialize Square
  const handleContinueToPayment = useCallback(() => {
    setStep('payment');
    // Defer init until after DOM renders the card container
    setTimeout(() => {
      initSquarePayments();
    }, 0);
  }, [initSquarePayments]);

  // Tokenize and pay for a given order
  const tokenizeAndPay = useCallback(
    async (order: OrderConfirmation) => {
      if (!squareCardRef.current) {
        throw new Error('Payment form not ready. Please try again.');
      }

      const tokenResult = await squareCardRef.current.tokenize();
      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        const messages = tokenResult.errors?.map((e) => e.message).join('. ');
        throw new Error(messages ?? 'Payment failed. Please check your card details.');
      }

      await payOrder(config.apiBaseUrl, order.order_id, tokenResult.token);
      onComplete(order.order_id);
    },
    [config.apiBaseUrl, onComplete],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setPaymentError(null);
      setPriceMismatch(null);
      setPendingOrder(null);

      if (!customerName.trim()) {
        setPaymentError('Please enter your name.');
        return;
      }
      if (!customerEmail.trim() || !isValidEmail(customerEmail.trim())) {
        setPaymentError('Please enter a valid email address.');
        return;
      }
      if (!availability) return;

      setProcessing(true);

      try {
        // Step 1: Create order
        const items = Object.entries(cart)
          .filter(([, qty]) => qty > 0)
          .map(([id, qty]) => ({ ticket_type_id: Number(id), quantity: qty }));

        const orderPayload = {
          showtime_id: showtimeId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim() || undefined,
          member_email:
            memberEmail.trim() && isValidEmail(memberEmail.trim()) ? memberEmail.trim() : undefined,
          items,
        };

        let order: OrderConfirmation;
        try {
          order = await createOrder(config.apiBaseUrl, orderPayload);
        } catch (err: unknown) {
          if (err instanceof ApiError && err.status === 409) {
            throw new Error(
              `Not enough tickets available. Only ${err.data.available ?? 0} remaining.`,
            );
          }
          throw err;
        }

        // Step 2: Compare server total with client subtotal (integer cents to avoid float drift)
        const serverTotal = parseFloat(order.total_amount);
        const serverCents = Math.round(serverTotal * 100);
        const clientCents = Math.round(subtotal * 100);
        if (Math.abs(serverCents - clientCents) > 0) {
          // Price mismatch — pause and let customer confirm
          setPriceMismatch({ clientTotal: subtotal, serverTotal });
          setPendingOrder(order);
          setProcessing(false);
          return;
        }

        // Step 3: Tokenize and pay
        await tokenizeAndPay(order);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setPaymentError(message);
        setProcessing(false);
      }
    },
    [
      availability,
      cart,
      config.apiBaseUrl,
      customerEmail,
      customerName,
      customerPhone,
      memberEmail,
      showtimeId,
      subtotal,
      tokenizeAndPay,
    ],
  );

  // Handle confirmation after price mismatch
  const handleConfirmMismatch = useCallback(async () => {
    if (!pendingOrder) return;
    setProcessing(true);
    try {
      await tokenizeAndPay(pendingOrder);
      setPriceMismatch(null);
      setPendingOrder(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setPaymentError(message);
      setProcessing(false);
    }
  }, [pendingOrder, tokenizeAndPay]);

  const handleCancelMismatch = useCallback(() => {
    setPriceMismatch(null);
    setPendingOrder(null);
    // Destroy the Square card instance so it can be re-initialized
    // when the user returns to the payment step.
    if (squareCardRef.current) {
      squareCardRef.current.destroy().catch(() => {});
      squareCardRef.current = null;
    }
    squareInitializedRef.current = false;
    setStep('tickets');
  }, []);

  if (loading) {
    return (
      <div className="lpo-loading" role="status">
        <div className="lpo-spinner" aria-hidden="true" />
        <p>Loading showtime details...</p>
      </div>
    );
  }

  if (error || !availability) {
    return (
      <div className="lpo-empty" role="alert">
        <p className="lpo-empty-title">Unable to load showtime</p>
        <p>{error ?? 'Showtime not found'}</p>
        <button
          className="lpo-btn-secondary"
          onClick={onBack}
          type="button"
          style={{ marginTop: '1rem' }}
        >
          Back to showtimes
        </button>
      </div>
    );
  }

  const { showtime, ticket_types } = availability;
  const showtimeDate = new Date(showtime.starts_at);
  const dateStr = showtimeDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = showtimeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      {/* Header with back navigation */}
      <div className="lpo-header">
        <button className="lpo-back" onClick={onBack} type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to showtimes
        </button>
        <h2 className="lpo-title">{showtime.film_title}</h2>
        <p className="lpo-subtitle">
          {dateStr} at {timeStr}
          {showtime.screen_name && <> &middot; {showtime.screen_name}</>}
        </p>
      </div>

      {/* Step 1: Ticket Selection */}
      {step === 'tickets' && (
        <div>
          <h3 className="lpo-section-title">Select Tickets</h3>

          {ticket_types.map((tt) => (
            <div className="lpo-ticket-row" key={tt.id}>
              <div className="lpo-ticket-info">
                <span className="lpo-ticket-name">{tt.name}</span>
                {tt.description && <span className="lpo-ticket-desc">{tt.description}</span>}
              </div>
              <div className="lpo-ticket-price">${tt.price}</div>
              <div className="lpo-qty-controls">
                <button
                  type="button"
                  className="lpo-qty-btn"
                  onClick={() => updateQty(tt.id, -1)}
                  disabled={!cart[tt.id] || cart[tt.id] <= 0}
                  aria-label={`Decrease ${tt.name} quantity`}
                >
                  -
                </button>
                <span className="lpo-qty-display" aria-label={`${tt.name} quantity`}>
                  {cart[tt.id] ?? 0}
                </span>
                <button
                  type="button"
                  className="lpo-qty-btn"
                  onClick={() => updateQty(tt.id, 1)}
                  disabled={totalQty >= MAX_TICKETS}
                  aria-label={`Increase ${tt.name} quantity`}
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {totalQty > 0 && (
            <div className="lpo-summary">
              <div className="lpo-summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="lpo-summary-row lpo-summary-total">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="lpo-btn-primary"
            disabled={totalQty === 0}
            onClick={handleContinueToPayment}
          >
            Continue to Payment
          </button>
        </div>
      )}

      {/* Step 2: Customer Info + Payment */}
      {step === 'payment' && (
        <form onSubmit={handleSubmit} noValidate>
          <h3 className="lpo-section-title">Your Information</h3>

          <div className="lpo-form-group">
            <label className="lpo-label" htmlFor="lpo-name">
              Full Name <span className="lpo-required">*</span>
            </label>
            <input
              id="lpo-name"
              className="lpo-input"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Jane Smith"
            />
          </div>

          <div className="lpo-form-group">
            <label className="lpo-label" htmlFor="lpo-email">
              Email <span className="lpo-required">*</span>
            </label>
            <input
              id="lpo-email"
              className="lpo-input"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="jane@example.com"
            />
            <span className="lpo-hint">Tickets will be sent to this email</span>
          </div>

          <div className="lpo-form-group">
            <label className="lpo-label" htmlFor="lpo-phone">
              Phone <span className="lpo-optional">(optional)</span>
            </label>
            <input
              id="lpo-phone"
              className="lpo-input"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              autoComplete="tel"
              placeholder="(207) 555-0123"
            />
          </div>

          <div className="lpo-form-group">
            <label className="lpo-label" htmlFor="lpo-member">
              Member Email <span className="lpo-optional">(optional)</span>
            </label>
            <div className="lpo-member-row">
              <input
                id="lpo-member"
                className="lpo-input"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Enter member email for discounts"
              />
            </div>
          </div>

          {/* Order summary */}
          <h3 className="lpo-section-title" style={{ marginTop: '1.5rem' }}>
            Order Summary
          </h3>
          <div className="lpo-summary">
            {Object.entries(cart)
              .filter(([, qty]) => qty > 0)
              .map(([id, qty]) => {
                const tt = ticket_types.find((t) => t.id === Number(id));
                if (!tt) return null;
                const lineTotal = parseFloat(tt.price) * qty;
                return (
                  <div className="lpo-summary-row" key={id}>
                    <span>
                      {qty}x {tt.name}
                    </span>
                    <span>{formatCurrency(lineTotal)}</span>
                  </div>
                );
              })}
            <div className="lpo-summary-row lpo-summary-total">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Payment */}
          <h3 className="lpo-section-title" style={{ marginTop: '1.5rem' }}>
            Payment
          </h3>
          <div className="lpo-card-container" ref={cardContainerRef} />

          {priceMismatch && (
            <div className="lpo-error-msg" role="alert">
              <p>
                The total has changed from {formatCurrency(priceMismatch.clientTotal)} to{' '}
                {formatCurrency(priceMismatch.serverTotal)}.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="lpo-btn-primary"
                  onClick={handleConfirmMismatch}
                  disabled={processing}
                >
                  Pay {formatCurrency(priceMismatch.serverTotal)}
                </button>
                <button
                  type="button"
                  className="lpo-btn-secondary"
                  onClick={handleCancelMismatch}
                  disabled={processing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {paymentError && (
            <div className="lpo-error-msg" role="alert">
              {paymentError}
            </div>
          )}

          <button
            type="submit"
            className="lpo-btn-primary"
            disabled={processing || !squareCardRef.current || !!priceMismatch}
          >
            {processing ? (
              <>
                <span className="lpo-spinner lpo-spinner-sm" aria-hidden="true" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(subtotal)}`
            )}
          </button>

          <button
            type="button"
            className="lpo-btn-link"
            disabled={processing}
            onClick={() => {
              handleCancelMismatch();
              setPaymentError(null);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Change ticket selection
          </button>
        </form>
      )}
    </>
  );
}
