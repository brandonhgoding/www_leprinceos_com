// src/widget/views/CheckoutView.tsx
// Two-step checkout: (1) select ticket quantities + optional concessions, (2) customer info + payment.

import { useCallback, useEffect, useState } from 'react';
import { ApiError, createOrder, fetchAvailability, fetchConcessionMenu } from '../api.ts';
import type {
  Cart,
  ConcessionCartItem,
  OrderConfirmation,
  PublicConcessionCategory,
  PublicConcessionItem,
  PublicConcessionMenu,
  PublicConcessionVariation,
  PublicModifier,
  ShowtimeAvailability,
  TicketType,
  WidgetConfig,
} from '../types.ts';

interface CheckoutViewProps {
  config: WidgetConfig;
  showtimeId: number;
  onBack: () => void;
  onComplete: (orderId: string) => void;
}

const MAX_TICKETS = 10;
const MAX_CONCESSION_QTY = 20;

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

function getConcessionSubtotal(concessionCart: ConcessionCartItem[]): number {
  return concessionCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function makeConcessionCartKey(variationId: number, modifierOptionIds: number[]): string {
  const sorted = [...modifierOptionIds].sort((a, b) => a - b);
  return `${variationId}:${sorted.join(',')}`;
}

/** Compute unit price for a variation including modifier adjustments */
function computeUnitPrice(
  variation: PublicConcessionVariation,
  item: PublicConcessionItem,
  selectedOptionIds: number[],
): number {
  let price = parseFloat(variation.price);
  for (const mod of item.modifiers) {
    for (const opt of mod.options) {
      if (selectedOptionIds.includes(opt.id)) {
        price += parseFloat(opt.price_adjustment);
      }
    }
  }
  return price;
}

/* ---- Concession Item Picker (inline, no modal) ---- */

interface ConcessionItemPickerProps {
  item: PublicConcessionItem;
  onAdd: (item: ConcessionCartItem) => void;
}

function ConcessionItemPicker({ item, onAdd }: ConcessionItemPickerProps) {
  // If only one variation, auto-select it
  const inStockVariations = item.variations.filter((v) => v.in_stock);
  const [selectedVariation, setSelectedVariation] = useState<PublicConcessionVariation | null>(
    inStockVariations.length === 1 ? inStockVariations[0] : null,
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>(() => {
    const initial: Record<number, number[]> = {};
    for (const mod of item.modifiers) {
      initial[mod.id] = [];
    }
    return initial;
  });

  const toggleOption = useCallback((modifier: PublicModifier, optionId: number) => {
    setSelectedOptions((prev) => {
      const current = prev[modifier.id] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [modifier.id]: current.filter((id) => id !== optionId) };
      }
      // For single-select (max_selections=1), replace
      if (modifier.max_selections === 1) {
        return { ...prev, [modifier.id]: [optionId] };
      }
      // For multi-select, check max
      if (modifier.max_selections > 0 && current.length >= modifier.max_selections) {
        return prev;
      }
      return { ...prev, [modifier.id]: [...current, optionId] };
    });
  }, []);

  const allRequiredMet = item.modifiers
    .filter((m) => m.is_required)
    .every((m) => (selectedOptions[m.id] ?? []).length > 0);

  const canAdd = selectedVariation && allRequiredMet;

  const handleAdd = useCallback(() => {
    if (!selectedVariation) return;
    const allOptionIds = Object.values(selectedOptions).flat();
    const unitPrice = computeUnitPrice(selectedVariation, item, allOptionIds);
    const cartKey = makeConcessionCartKey(selectedVariation.id, allOptionIds);

    onAdd({
      cartKey,
      variation_id: selectedVariation.id,
      quantity: 1,
      modifier_option_ids: allOptionIds,
      itemName: item.name,
      variationName: selectedVariation.name,
      unitPrice,
    });
  }, [selectedVariation, selectedOptions, item, onAdd]);

  if (inStockVariations.length === 0) {
    return (
      <div className="lpo-concession-card">
        <div className="lpo-concession-info">
          <span className="lpo-concession-name">{item.name}</span>
          <span className="lpo-concession-out-of-stock">Out of stock</span>
        </div>
      </div>
    );
  }

  return (
    <div className="lpo-concession-item-expanded">
      <span className="lpo-concession-name">{item.name}</span>
      {item.description && <span className="lpo-concession-desc">{item.description}</span>}

      {/* Variation selection (only if more than one) */}
      {inStockVariations.length > 1 && (
        <div style={{ marginTop: '0.5rem' }}>
          {inStockVariations.map((v) => (
            <div className="lpo-concession-variation" key={v.id}>
              <input
                type="radio"
                name={`variation-${item.id}`}
                checked={selectedVariation?.id === v.id}
                onChange={() => setSelectedVariation(v)}
                style={{ accentColor: 'inherit' }}
              />
              <span className="lpo-concession-variation-name">{v.name}</span>
              <span className="lpo-concession-price">${v.price}</span>
            </div>
          ))}
        </div>
      )}

      {/* Single variation: show price */}
      {inStockVariations.length === 1 && selectedVariation && (
        <span className="lpo-concession-price" style={{ display: 'block', marginTop: '0.25rem' }}>
          ${selectedVariation.price}
        </span>
      )}

      {/* Modifier groups */}
      {item.modifiers.map((mod) => (
        <div className="lpo-modifier-group" key={mod.id}>
          <span className="lpo-modifier-label">
            {mod.name}
            {mod.is_required && ' *'}
            {mod.max_selections > 1 && ` (choose up to ${mod.max_selections})`}
          </span>
          {mod.options.map((opt) => {
            const isSelected = (selectedOptions[mod.id] ?? []).includes(opt.id);
            const inputType = mod.max_selections === 1 ? 'radio' : 'checkbox';
            return (
              <label className="lpo-modifier-option" key={opt.id}>
                <input
                  type={inputType}
                  name={`mod-${mod.id}`}
                  checked={isSelected}
                  onChange={() => toggleOption(mod, opt.id)}
                />
                <span>{opt.name}</span>
                {parseFloat(opt.price_adjustment) !== 0 && (
                  <span className="lpo-modifier-adjustment">
                    {parseFloat(opt.price_adjustment) > 0 ? '+' : ''}${opt.price_adjustment}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        className="lpo-btn-primary"
        style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}
        disabled={!canAdd}
        onClick={handleAdd}
      >
        Add to Order
      </button>
    </div>
  );
}

/* ---- Concession Menu Browser ---- */

interface ConcessionBrowserProps {
  menu: PublicConcessionMenu;
  concessionCart: ConcessionCartItem[];
  onAddItem: (item: ConcessionCartItem) => void;
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemoveItem: (cartKey: string) => void;
}

function ConcessionBrowser({
  menu,
  concessionCart,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
}: ConcessionBrowserProps) {
  const hasItems = menu.categories.some((c) => c.items.length > 0);

  if (!hasItems) {
    return (
      <p style={{ fontSize: '0.8125rem', color: 'inherit', opacity: 0.6 }}>
        No concession items currently available.
      </p>
    );
  }

  return (
    <div className="lpo-concession-section">
      {/* Cart summary at top if items exist */}
      {concessionCart.length > 0 && (
        <div className="lpo-summary" style={{ marginBottom: '1rem', marginTop: 0 }}>
          {concessionCart.map((ci) => (
            <div
              className="lpo-concession-card"
              key={ci.cartKey}
              style={{ marginBottom: '0.375rem' }}
            >
              <div className="lpo-concession-info">
                <span className="lpo-concession-name">
                  {ci.itemName}
                  {ci.variationName !== ci.itemName && ` - ${ci.variationName}`}
                </span>
              </div>
              <div className="lpo-concession-price">{formatCurrency(ci.unitPrice)}</div>
              <div className="lpo-qty-controls">
                <button
                  type="button"
                  className="lpo-qty-btn"
                  onClick={() => {
                    if (ci.quantity <= 1) {
                      onRemoveItem(ci.cartKey);
                    } else {
                      onUpdateQty(ci.cartKey, -1);
                    }
                  }}
                  aria-label={`Decrease ${ci.itemName} quantity`}
                >
                  -
                </button>
                <span className="lpo-qty-display">{ci.quantity}</span>
                <button
                  type="button"
                  className="lpo-qty-btn"
                  onClick={() => onUpdateQty(ci.cartKey, 1)}
                  disabled={ci.quantity >= MAX_CONCESSION_QTY}
                  aria-label={`Increase ${ci.itemName} quantity`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menu categories */}
      {menu.categories.map((cat: PublicConcessionCategory) => {
        if (cat.items.length === 0) return null;
        return (
          <div key={cat.id}>
            <h4 className="lpo-category-header">{cat.name}</h4>
            {cat.items.map((item: PublicConcessionItem) => (
              <ConcessionItemPicker key={item.id} item={item} onAdd={onAddItem} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Main CheckoutView ---- */

export default function CheckoutView({
  config,
  showtimeId,
  onBack, // onComplete will be used when a payment provider is integrated
}: CheckoutViewProps) {
  // State
  const [availability, setAvailability] = useState<ShowtimeAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [step, setStep] = useState<'tickets' | 'payment'>('tickets');

  // Concession state
  const [concessionMenu, setConcessionMenu] = useState<PublicConcessionMenu | null>(null);
  const [concessionCart, setConcessionCart] = useState<ConcessionCartItem[]>([]);
  const [showConcessions, setShowConcessions] = useState(false);
  const [concessionsLoading, setConcessionsLoading] = useState(false);

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

  // Load concession menu (lazy, on first toggle)
  const handleToggleConcessions = useCallback(() => {
    if (!showConcessions && !concessionMenu) {
      setConcessionsLoading(true);
      fetchConcessionMenu(config.apiBaseUrl)
        .then((data) => {
          setConcessionMenu(data);
          setConcessionsLoading(false);
          setShowConcessions(true);
        })
        .catch(() => {
          setConcessionsLoading(false);
          // Silently fail - concessions are optional
          setShowConcessions(true);
          setConcessionMenu({ categories: [], combos: [] });
        });
    } else {
      setShowConcessions((prev) => !prev);
    }
  }, [showConcessions, concessionMenu, config.apiBaseUrl]);

  const totalQty = getTotalQuantity(cart);
  const ticketSubtotal = availability ? getSubtotal(cart, availability.ticket_types) : 0;
  const concessionSubtotal = getConcessionSubtotal(concessionCart);
  const subtotal = ticketSubtotal + concessionSubtotal;

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

  // Concession cart handlers
  const handleAddConcessionItem = useCallback((item: ConcessionCartItem) => {
    setConcessionCart((prev) => {
      const existing = prev.find((ci) => ci.cartKey === item.cartKey);
      if (existing) {
        return prev.map((ci) =>
          ci.cartKey === item.cartKey ? { ...ci, quantity: ci.quantity + 1 } : ci,
        );
      }
      return [...prev, item];
    });
  }, []);

  const handleUpdateConcessionQty = useCallback((cartKey: string, delta: number) => {
    setConcessionCart((prev) =>
      prev
        .map((ci) => {
          if (ci.cartKey !== cartKey) return ci;
          const newQty = ci.quantity + delta;
          if (newQty <= 0) return null;
          return { ...ci, quantity: Math.min(newQty, MAX_CONCESSION_QTY) };
        })
        .filter((ci): ci is ConcessionCartItem => ci !== null),
    );
  }, []);

  const handleRemoveConcessionItem = useCallback((cartKey: string) => {
    setConcessionCart((prev) => prev.filter((ci) => ci.cartKey !== cartKey));
  }, []);

  // When moving to payment step
  const handleContinueToPayment = useCallback(() => {
    setStep('payment');
  }, []);

  // Process payment for a given order.
  // Currently no payment provider is active — short-circuit without calling
  // the backend payment endpoint. When a provider is integrated, tokenize
  // and call payOrder here instead.
  const processPayment = useCallback(async () => {
    setPaymentError(
      'Online payment is not currently available. Please purchase tickets at the box office.',
    );
    setProcessing(false);
  }, []);

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

        const concessionItems =
          concessionCart.length > 0
            ? concessionCart.map((ci) => ({
                variation_id: ci.variation_id,
                quantity: ci.quantity,
                modifier_option_ids: ci.modifier_option_ids,
              }))
            : undefined;

        const orderPayload = {
          showtime_id: showtimeId,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim() || undefined,
          member_email:
            memberEmail.trim() && isValidEmail(memberEmail.trim()) ? memberEmail.trim() : undefined,
          items,
          concession_items: concessionItems,
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

        // Step 3: Process payment
        await processPayment();
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
      concessionCart,
      config.apiBaseUrl,
      customerEmail,
      customerName,
      customerPhone,
      memberEmail,
      showtimeId,
      subtotal,
      processPayment,
    ],
  );

  // Handle confirmation after price mismatch
  const handleConfirmMismatch = useCallback(async () => {
    if (!pendingOrder) return;
    setProcessing(true);
    try {
      await processPayment();
      setPriceMismatch(null);
      setPendingOrder(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setPaymentError(message);
      setProcessing(false);
    }
  }, [pendingOrder, processPayment]);

  const handleCancelMismatch = useCallback(() => {
    setPriceMismatch(null);
    setPendingOrder(null);
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

      {/* Step 1: Ticket Selection + Concessions */}
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

          {/* Concessions toggle and browser */}
          <button
            type="button"
            className="lpo-concession-toggle"
            onClick={handleToggleConcessions}
            disabled={concessionsLoading}
          >
            {concessionsLoading ? (
              <>
                <span className="lpo-spinner lpo-spinner-sm" aria-hidden="true" />
                Loading...
              </>
            ) : (
              <>
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
                  {showConcessions ? (
                    <polyline points="18 15 12 9 6 15" />
                  ) : (
                    <polyline points="6 9 12 15 18 9" />
                  )}
                </svg>
                {showConcessions ? 'Hide Concessions' : 'Add Concessions'}
                {concessionCart.length > 0 &&
                  ` (${concessionCart.reduce((s, i) => s + i.quantity, 0)})`}
              </>
            )}
          </button>

          {showConcessions && concessionMenu && (
            <ConcessionBrowser
              menu={concessionMenu}
              concessionCart={concessionCart}
              onAddItem={handleAddConcessionItem}
              onUpdateQty={handleUpdateConcessionQty}
              onRemoveItem={handleRemoveConcessionItem}
            />
          )}

          {/* Order summary */}
          {(totalQty > 0 || concessionCart.length > 0) && (
            <div className="lpo-summary">
              {ticketSubtotal > 0 && (
                <div className="lpo-summary-row">
                  <span>Tickets</span>
                  <span>{formatCurrency(ticketSubtotal)}</span>
                </div>
              )}
              {concessionSubtotal > 0 && (
                <div className="lpo-summary-row">
                  <span>Concessions</span>
                  <span>{formatCurrency(concessionSubtotal)}</span>
                </div>
              )}
              <div className="lpo-summary-row lpo-summary-total">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="lpo-btn-primary"
            disabled={totalQty === 0 && concessionCart.length === 0}
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
            {/* Ticket line items */}
            {Object.entries(cart)
              .filter(([, qty]) => qty > 0)
              .map(([id, qty]) => {
                const tt = ticket_types.find((t) => t.id === Number(id));
                if (!tt) return null;
                const lineTotal = parseFloat(tt.price) * qty;
                return (
                  <div className="lpo-summary-row" key={`ticket-${id}`}>
                    <span>
                      {qty}x {tt.name}
                    </span>
                    <span>{formatCurrency(lineTotal)}</span>
                  </div>
                );
              })}

            {/* Concession line items */}
            {concessionCart.map((ci) => {
              const lineTotal = ci.unitPrice * ci.quantity;
              return (
                <div className="lpo-summary-row" key={`conc-${ci.cartKey}`}>
                  <span>
                    {ci.quantity}x {ci.itemName}
                    {ci.variationName !== ci.itemName && ` (${ci.variationName})`}
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
          <div className="lpo-error-msg" role="status">
            Online payment is not currently available. Please purchase tickets at the box office.
          </div>

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

          <button type="submit" className="lpo-btn-primary" disabled={true}>
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
