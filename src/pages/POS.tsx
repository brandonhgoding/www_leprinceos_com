// src/pages/POS.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { concessionsApi, paymentsApi, showtimesApi, ticketsApi } from '../api';
import type {
  ConcessionCategory,
  ConcessionItem,
  ConcessionVariation,
  TicketType,
  Showtime,
  POSSaleCreate,
  POSSaleResponse,
  PaymentMethod,
} from '../api/types';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './POS.module.css';

type ActiveTab = 'concessions' | 'tickets';

interface CartConcessionItem {
  variation: ConcessionVariation;
  item: ConcessionItem;
  quantity: number;
  modifier_option_ids: number[];
}

interface CartTicketItem {
  ticket_type_id: number;
  ticket_type_name: string;
  quantity: number;
  price: string;
}

const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
};

export default function POS() {
  const { addToast } = useToast();

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('concessions');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Cart state
  const [concessionCart, setConcessionCart] = useState<CartConcessionItem[]>([]);
  const [ticketCart, setTicketCart] = useState<CartTicketItem[]>([]);

  // Success state
  const [saleResult, setSaleResult] = useState<POSSaleResponse | null>(null);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['concession-categories'],
    queryFn: () => concessionsApi.listCategories(),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['concession-items'],
    queryFn: () => concessionsApi.listItems(),
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => ticketsApi.list(),
  });

  const { data: showtimes = [] } = useQuery({
    queryKey: ['showtimes-upcoming'],
    queryFn: () => {
      const now = new Date().toISOString();
      return showtimesApi.list({ starts_at_after: now });
    },
  });

  // Sale mutation
  const saleMutation = useMutation({
    mutationFn: (data: POSSaleCreate) => paymentsApi.createPOSSale(data),
    onSuccess: (response: POSSaleResponse) => {
      setSaleResult(response);
      addToast('Sale completed successfully!');
    },
    onError: (error) => {
      addToast(getErrorMessage(error, 'Failed to complete sale.'));
    },
  });

  // Filtered items by category
  const activeCategories = useMemo(
    () => categories.filter((c: ConcessionCategory) => c.is_active),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const activeItems = items.filter((i: ConcessionItem) => i.is_active);
    if (selectedCategory === null) return activeItems;
    return activeItems.filter((i: ConcessionItem) => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const activeTicketTypes = useMemo(
    () => ticketTypes.filter((t: TicketType) => t.is_active),
    [ticketTypes],
  );

  // Cart helpers
  const addConcessionToCart = (item: ConcessionItem, variation: ConcessionVariation) => {
    setConcessionCart((prev) => {
      const existing = prev.find((c) => c.variation.id === variation.id);
      if (existing) {
        return prev.map((c) =>
          c.variation.id === variation.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      // Default modifier options: pick is_default options from each modifier
      const defaultModifierOptionIds = item.modifiers.flatMap((mod) =>
        mod.options.filter((opt) => opt.is_default).map((opt) => opt.id),
      );
      return [
        ...prev,
        { variation, item, quantity: 1, modifier_option_ids: defaultModifierOptionIds },
      ];
    });
  };

  const removeConcessionFromCart = (variationId: number) => {
    setConcessionCart((prev) => prev.filter((c) => c.variation.id !== variationId));
  };

  const updateTicketQuantity = (ticketType: TicketType, delta: number) => {
    setTicketCart((prev) => {
      const existing = prev.find((t) => t.ticket_type_id === ticketType.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter((t) => t.ticket_type_id !== ticketType.id);
        }
        return prev.map((t) =>
          t.ticket_type_id === ticketType.id ? { ...t, quantity: newQty } : t,
        );
      }
      if (delta > 0) {
        return [
          ...prev,
          {
            ticket_type_id: ticketType.id,
            ticket_type_name: ticketType.name,
            quantity: 1,
            price: ticketType.price,
          },
        ];
      }
      return prev;
    });
  };

  const getTicketQuantity = (ticketTypeId: number): number => {
    const item = ticketCart.find((t) => t.ticket_type_id === ticketTypeId);
    return item?.quantity ?? 0;
  };

  // Totals
  const concessionSubtotal = useMemo(
    () => concessionCart.reduce((sum, c) => sum + parseFloat(c.variation.price) * c.quantity, 0),
    [concessionCart],
  );

  const ticketSubtotal = useMemo(
    () => ticketCart.reduce((sum, t) => sum + parseFloat(t.price) * t.quantity, 0),
    [ticketCart],
  );

  const subtotal = concessionSubtotal + ticketSubtotal;
  const total = subtotal;

  const cartIsEmpty = concessionCart.length === 0 && ticketCart.length === 0;

  // Complete sale
  const handleCompleteSale = () => {
    if (cartIsEmpty) return;

    const data: POSSaleCreate = {
      payment_method: paymentMethod,
      showtime_id: selectedShowtimeId,
      ticket_items: ticketCart.map((t) => ({
        ticket_type_id: t.ticket_type_id,
        quantity: t.quantity,
      })),
      concession_items: concessionCart.map((c) => ({
        variation_id: c.variation.id,
        quantity: c.quantity,
        modifier_option_ids: c.modifier_option_ids.length > 0 ? c.modifier_option_ids : undefined,
      })),
    };

    saleMutation.mutate(data);
  };

  // Reset for new sale
  const handleNewSale = () => {
    setConcessionCart([]);
    setTicketCart([]);
    setSelectedShowtimeId(null);
    setPaymentMethod('CASH');
    setSaleResult(null);
  };

  const selectedShowtime = showtimes.find((s: Showtime) => s.id === selectedShowtimeId);

  const isLoading = categoriesLoading || itemsLoading;

  return (
    <div className={styles.posLayout}>
      {/* Left panel — Menu/Selection */}
      <div className={styles.menuPanel}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === 'concessions' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('concessions')}
          >
            Concessions
          </button>
          <button
            className={activeTab === 'tickets' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('tickets')}
          >
            Tickets
          </button>
        </div>

        {/* Concessions tab */}
        {activeTab === 'concessions' && (
          <>
            {isLoading ? (
              <div className={styles.loading} role="status" aria-live="polite">
                Loading menu...
              </div>
            ) : (
              <>
                {/* Category filters */}
                <div className={styles.categoryFilters}>
                  <button
                    className={
                      selectedCategory === null
                        ? styles.categoryButtonActive
                        : styles.categoryButton
                    }
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </button>
                  {activeCategories.map((cat: ConcessionCategory) => (
                    <button
                      key={cat.id}
                      className={
                        selectedCategory === cat.id
                          ? styles.categoryButtonActive
                          : styles.categoryButton
                      }
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Item grid */}
                {filteredItems.length === 0 ? (
                  <div className={styles.emptyMenu}>No items found.</div>
                ) : (
                  <div className={styles.itemGrid}>
                    {filteredItems.map((item: ConcessionItem) => (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemName}>{item.name}</div>
                        {item.description && (
                          <div className={styles.itemDescription}>{item.description}</div>
                        )}
                        <div className={styles.variations}>
                          {item.variations
                            .filter((v: ConcessionVariation) => v.is_active)
                            .map((variation: ConcessionVariation) => (
                              <button
                                key={variation.id}
                                className={styles.variationButton}
                                onClick={() => addConcessionToCart(item, variation)}
                              >
                                {variation.name} &middot; {formatPrice(variation.price)}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Tickets tab */}
        {activeTab === 'tickets' && (
          <>
            <div className={styles.showtimeSelector}>
              <label htmlFor="pos-showtime">Showtime</label>
              <select
                id="pos-showtime"
                className={styles.showtimeSelect}
                value={selectedShowtimeId ?? ''}
                onChange={(e) =>
                  setSelectedShowtimeId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Select a showtime...</option>
                {showtimes.map((st: Showtime) => (
                  <option key={st.id} value={st.id}>
                    {st.film_title} &mdash; {st.screen_name} &mdash;{' '}
                    {new Date(st.starts_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </option>
                ))}
              </select>
            </div>

            {selectedShowtimeId === null ? (
              <div className={styles.selectShowtimePrompt}>
                Select a showtime above to add tickets.
              </div>
            ) : (
              <div className={styles.ticketTypeList}>
                {activeTicketTypes.map((tt: TicketType) => (
                  <div key={tt.id} className={styles.ticketTypeRow}>
                    <div className={styles.ticketTypeInfo}>
                      <div className={styles.ticketTypeName}>{tt.name}</div>
                      <div className={styles.ticketTypePrice}>{formatPrice(tt.price)}</div>
                    </div>
                    <div className={styles.quantityControls}>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateTicketQuantity(tt, -1)}
                        disabled={getTicketQuantity(tt.id) === 0}
                        aria-label={`Remove one ${tt.name} ticket`}
                      >
                        -
                      </button>
                      <span className={styles.quantityValue}>{getTicketQuantity(tt.id)}</span>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateTicketQuantity(tt, 1)}
                        aria-label={`Add one ${tt.name} ticket`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right panel — Cart/Checkout */}
      <div className={styles.cartPanel}>
        {saleResult ? (
          /* Success state */
          <div className={styles.successState}>
            <div className={styles.successIcon}>&#10003;</div>
            <h2 className={styles.successTitle}>Sale Complete</h2>
            <p className={styles.successDetail}>Order #{saleResult.uuid.slice(0, 8)}</p>
            <p className={styles.successTotal}>{formatPrice(saleResult.total_amount)}</p>
            <button className={styles.newSaleButton} onClick={handleNewSale}>
              New Sale
            </button>
          </div>
        ) : (
          <>
            {/* Cart header */}
            <div className={styles.cartHeader}>
              <h2 className={styles.cartTitle}>Current Sale</h2>
            </div>

            {/* Cart items */}
            {cartIsEmpty ? (
              <div className={styles.cartEmpty}>Add items from the menu to start a sale.</div>
            ) : (
              <div className={styles.cartItems}>
                {/* Ticket items */}
                {ticketCart.map((t) => (
                  <div key={`ticket-${t.ticket_type_id}`} className={styles.cartItem}>
                    <div className={styles.cartItemDetails}>
                      <div className={styles.cartItemName}>{t.ticket_type_name}</div>
                      <div className={styles.cartItemMeta}>
                        {selectedShowtime
                          ? `${selectedShowtime.film_title} - ${selectedShowtime.screen_name}`
                          : 'Ticket'}{' '}
                        &times; {t.quantity} @ {formatPrice(t.price)}
                      </div>
                    </div>
                    <div className={styles.cartItemRight}>
                      <span className={styles.cartItemPrice}>
                        {formatPrice(parseFloat(t.price) * t.quantity)}
                      </span>
                      <button
                        className={styles.removeButton}
                        onClick={() =>
                          setTicketCart((prev) =>
                            prev.filter((item) => item.ticket_type_id !== t.ticket_type_id),
                          )
                        }
                        aria-label={`Remove ${t.ticket_type_name}`}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}

                {/* Concession items */}
                {concessionCart.map((c) => (
                  <div key={`concession-${c.variation.id}`} className={styles.cartItem}>
                    <div className={styles.cartItemDetails}>
                      <div className={styles.cartItemName}>
                        {c.item.name} ({c.variation.name})
                      </div>
                      <div className={styles.cartItemMeta}>
                        &times; {c.quantity} @ {formatPrice(c.variation.price)}
                      </div>
                    </div>
                    <div className={styles.cartItemRight}>
                      <span className={styles.cartItemPrice}>
                        {formatPrice(parseFloat(c.variation.price) * c.quantity)}
                      </span>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeConcessionFromCart(c.variation.id)}
                        aria-label={`Remove ${c.item.name}`}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cart footer */}
            {!cartIsEmpty && (
              <div className={styles.cartFooter}>
                <div className={styles.cartTotals}>
                  <div className={styles.totalRowGrand}>
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className={styles.paymentMethods}>
                  {(['CASH', 'CARD', 'COMP'] as PaymentMethod[]).map((method) => (
                    <label key={method} className={styles.paymentMethodLabel}>
                      <input
                        type="radio"
                        name="payment-method"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                      />
                      {method}
                    </label>
                  ))}
                </div>

                {/* Complete sale button */}
                <button
                  className={styles.completeButton}
                  onClick={handleCompleteSale}
                  disabled={saleMutation.isPending || cartIsEmpty}
                >
                  {saleMutation.isPending
                    ? 'Processing...'
                    : `Complete Sale - ${formatPrice(total)}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
