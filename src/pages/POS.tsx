// src/pages/POS.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import {
  concessionsApi,
  membersApi,
  paymentsApi,
  showtimesApi,
  ticketsApi,
  benefitPreviewApi,
} from '../api';
import type {
  AvailableTicketType,
  ConcessionCategory,
  ConcessionItem,
  ConcessionVariation,
  Member,
  Showtime,
  POSSaleCreate,
  POSSaleResponse,
  PaymentMethod,
  BenefitDiscount,
  BenefitPreviewRequest,
} from '../api/types';
import type { LayoutContext } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/errorMessage';
import { usePrinter } from '../hooks/usePrinter';
import { buildTicketStub, buildReceipt, buildCashDrawerKick } from '../utils/escpos';
import type { TicketStubData, ReceiptData } from '../utils/escpos';
import styles from './POS.module.css';

type ActiveTab = 'concessions' | 'tickets';

interface VariationPickerState {
  item: ConcessionItem;
  variations: ConcessionVariation[];
}

interface ModifierPickerState {
  item: ConcessionItem;
  variation: ConcessionVariation;
}

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
  const { isFullscreen, toggleFullscreen } = useOutletContext<LayoutContext>();
  const { currentCinema } = useAuth();
  const printer = usePrinter();

  const getPreference = (key: string, defaultValue: boolean): boolean => {
    const stored = localStorage.getItem(`pos_printer_${key}`);
    return stored !== null ? stored === 'true' : defaultValue;
  };
  const setPreference = (key: string, value: boolean) => {
    localStorage.setItem(`pos_printer_${key}`, String(value));
  };
  const [autoPrintTickets, setAutoPrintTickets] = useState(() =>
    getPreference('autoPrintTickets', true),
  );
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(() =>
    getPreference('cashDrawerEnabled', true),
  );
  const [printedTickets, setPrintedTickets] = useState<Set<string>>(new Set());
  const [printingTicket, setPrintingTicket] = useState<string | null>(null);

  useEffect(() => {
    setPreference('autoPrintTickets', autoPrintTickets);
  }, [autoPrintTickets]);
  useEffect(() => {
    setPreference('cashDrawerEnabled', cashDrawerEnabled);
  }, [cashDrawerEnabled]);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('concessions');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [selectedFilmTitle, setSelectedFilmTitle] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Cart state
  const [concessionCart, setConcessionCart] = useState<CartConcessionItem[]>([]);
  const [ticketCart, setTicketCart] = useState<CartTicketItem[]>([]);

  // Variation picker state
  const [variationPicker, setVariationPicker] = useState<VariationPickerState | null>(null);

  // Modifier picker state
  const [modifierPicker, setModifierPicker] = useState<ModifierPickerState | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});

  // Success state
  const [saleResult, setSaleResult] = useState<POSSaleResponse | null>(null);

  // Member search state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const memberSearchRef = useRef<HTMLDivElement>(null);

  // Benefit preview state
  const [ticketDiscounts, setTicketDiscounts] = useState<Record<number, BenefitDiscount>>({});
  const [concessionDiscounts, setConcessionDiscounts] = useState<Record<number, BenefitDiscount>>(
    {},
  );
  const [totalSavings, setTotalSavings] = useState<string>('0.00');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (memberSearchRef.current && !memberSearchRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Benefit preview — fetch when member + cart changes
  const [debouncedPreviewKey, setDebouncedPreviewKey] = useState(0);
  const previewKeyRef = useRef(0);

  useEffect(() => {
    previewKeyRef.current += 1;
    const timer = setTimeout(() => {
      setDebouncedPreviewKey(previewKeyRef.current);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedMember, concessionCart, ticketCart, selectedShowtimeId]);

  useEffect(() => {
    if (!selectedMember || (concessionCart.length === 0 && ticketCart.length === 0)) {
      setTicketDiscounts({});
      setConcessionDiscounts({});
      setTotalSavings('0.00');
      return;
    }

    const data: BenefitPreviewRequest = {
      member_id: selectedMember.id,
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

    benefitPreviewApi
      .preview(data)
      .then((result) => {
        const td: Record<number, BenefitDiscount> = {};
        const cd: Record<number, BenefitDiscount> = {};
        for (const d of result.discounts) {
          if (d.scope === 'TICKET' && d.ticket_type_id != null) {
            td[d.ticket_type_id] = d;
          } else if (d.scope === 'CONCESSION' && d.variation_id != null) {
            cd[d.variation_id] = d;
          }
        }
        setTicketDiscounts(td);
        setConcessionDiscounts(cd);
        setTotalSavings(result.total_savings);
      })
      .catch(() => {
        // Preview failure is non-critical — just show full prices
        setTicketDiscounts({});
        setConcessionDiscounts({});
        setTotalSavings('0.00');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPreviewKey]);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['concession-categories'],
    queryFn: () => concessionsApi.listCategories(),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['concession-items'],
    queryFn: () => concessionsApi.listItems(),
  });

  const { data: availableTicketTypes = [] } = useQuery({
    queryKey: ['available-ticket-types', selectedShowtimeId],
    queryFn: () => showtimesApi.availableTicketTypes(selectedShowtimeId!),
    enabled: selectedShowtimeId !== null,
  });

  const { data: showtimes = [] } = useQuery({
    queryKey: ['showtimes-today'],
    queryFn: () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      return showtimesApi.list({
        starts_at_after: startOfDay.toISOString(),
        starts_at_before: endOfDay.toISOString(),
      });
    },
  });

  const { data: memberResults = [], isLoading: memberSearchLoading } = useQuery({
    queryKey: ['member-search', debouncedMemberSearch],
    queryFn: () => membersApi.list({ search: debouncedMemberSearch }),
    enabled: debouncedMemberSearch.length >= 2 && !selectedMember,
  });

  // Sale mutation
  const saleMutation = useMutation({
    mutationFn: (data: POSSaleCreate) => paymentsApi.createPOSSale(data),
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

  // Group today's showtimes by film, filtering out past showtimes.
  // A showtime is "past" if:
  // - it ended (start + runtime), or
  // - it started more than 1 hour ago (we won't sell tickets that late)
  // If runtime is unknown, we only use the 1-hour-after-start cutoff.
  const filmShowtimes = useMemo(() => {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const grouped = new Map<string, { posterUrl: string | null; showtimes: Showtime[] }>();
    for (const st of showtimes) {
      if (st.is_cancelled) continue;
      const startMs = new Date(st.starts_at).getTime();
      const runtime = st.film_runtime_minutes;
      if (runtime) {
        const endMs = startMs + runtime * 60 * 1000;
        if (endMs <= now) continue;
      }
      if (startMs + oneHourMs <= now) continue;
      const existing = grouped.get(st.film_title);
      if (existing) {
        existing.showtimes.push(st);
      } else {
        grouped.set(st.film_title, { posterUrl: st.film_poster_url, showtimes: [st] });
      }
    }
    // Sort showtimes within each film by start time
    for (const film of grouped.values()) {
      film.showtimes.sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    }
    return grouped;
  }, [showtimes]);

  // Cart helpers
  const makeCartKey = (variationId: number, modifierOptionIds: number[]): string => {
    const sorted = [...modifierOptionIds].sort((a, b) => a - b);
    return `${variationId}:${sorted.join(',')}`;
  };

  const getModifierPriceAdjustment = (
    item: ConcessionItem,
    variationId: number,
    optionIds: number[],
  ): number => {
    let total = 0;
    for (const mod of item.modifiers) {
      for (const opt of mod.options) {
        if (!optionIds.includes(opt.id)) continue;
        const varPrice = opt.variation_prices.find((vp) => vp.variation_id === variationId);
        total += parseFloat(varPrice ? varPrice.price_adjustment : opt.price_adjustment);
      }
    }
    return total;
  };

  const getSelectedOptionNames = (item: ConcessionItem, optionIds: number[]): string[] => {
    const names: string[] = [];
    for (const mod of item.modifiers) {
      for (const opt of mod.options) {
        if (optionIds.includes(opt.id)) names.push(opt.name);
      }
    }
    return names;
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setMemberSearch('');
    setMemberDropdownOpen(false);
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setTicketDiscounts({});
    setConcessionDiscounts({});
    setTotalSavings('0.00');
  };

  const handleItemClick = (item: ConcessionItem) => {
    const activeVariations = item.variations.filter((v) => v.is_active);
    if (activeVariations.length === 1) {
      handleVariationSelected(item, activeVariations[0]);
    } else if (activeVariations.length > 1) {
      setVariationPicker({ item, variations: activeVariations });
    }
  };

  const handleVariationSelected = (item: ConcessionItem, variation: ConcessionVariation) => {
    setVariationPicker(null);
    if (item.modifiers.length > 0) {
      // Initialize with default options
      const defaults: Record<number, number[]> = {};
      for (const mod of item.modifiers) {
        const defaultIds = mod.options.filter((opt) => opt.is_default).map((opt) => opt.id);
        if (defaultIds.length > 0) defaults[mod.id] = defaultIds;
      }
      setSelectedOptions(defaults);
      setModifierPicker({ item, variation });
    } else {
      addConcessionToCart(item, variation, []);
    }
  };

  const toggleOption = (modifierId: number, maxSelections: number, optionId: number) => {
    setSelectedOptions((prev) => {
      const current = prev[modifierId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [modifierId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelections === 1) {
        return { ...prev, [modifierId]: [optionId] };
      }
      if (maxSelections > 0 && current.length >= maxSelections) {
        return prev;
      }
      return { ...prev, [modifierId]: [...current, optionId] };
    });
  };

  const handleModifierConfirm = () => {
    if (!modifierPicker) return;
    const allOptionIds = Object.values(selectedOptions).flat();
    addConcessionToCart(modifierPicker.item, modifierPicker.variation, allOptionIds);
    setModifierPicker(null);
    setSelectedOptions({});
  };

  const allRequiredMet = modifierPicker
    ? modifierPicker.item.modifiers
        .filter((m) => m.is_required)
        .every((m) => (selectedOptions[m.id] ?? []).length > 0)
    : false;

  const addConcessionToCart = (
    item: ConcessionItem,
    variation: ConcessionVariation,
    modifierOptionIds: number[],
  ) => {
    setVariationPicker(null);
    const cartKey = makeCartKey(variation.id, modifierOptionIds);
    setConcessionCart((prev) => {
      const existing = prev.find(
        (c) => makeCartKey(c.variation.id, c.modifier_option_ids) === cartKey,
      );
      if (existing) {
        return prev.map((c) =>
          makeCartKey(c.variation.id, c.modifier_option_ids) === cartKey
            ? { ...c, quantity: c.quantity + 1 }
            : c,
        );
      }
      return [...prev, { variation, item, quantity: 1, modifier_option_ids: modifierOptionIds }];
    });
  };

  const updateConcessionQuantity = (cartKey: string, delta: number) => {
    setConcessionCart((prev) => {
      return prev
        .map((c) =>
          makeCartKey(c.variation.id, c.modifier_option_ids) === cartKey
            ? { ...c, quantity: c.quantity + delta }
            : c,
        )
        .filter((c) => c.quantity > 0);
    });
  };

  const removeConcessionFromCart = (cartKey: string) => {
    setConcessionCart((prev) =>
      prev.filter((c) => makeCartKey(c.variation.id, c.modifier_option_ids) !== cartKey),
    );
  };

  const updateTicketQuantity = (ticketType: AvailableTicketType, delta: number) => {
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
    () =>
      concessionCart.reduce((sum, c) => {
        const basePrice = parseFloat(c.variation.price);
        const modAdj = getModifierPriceAdjustment(c.item, c.variation.id, c.modifier_option_ids);
        const fullUnitPrice = basePrice + modAdj;
        const discount = concessionDiscounts[c.variation.id];
        if (discount) {
          const discountedUnitPrice = parseFloat(discount.discounted_price) + modAdj;
          const discountedQty = Math.min(discount.applicable_quantity, c.quantity);
          const fullPriceQty = c.quantity - discountedQty;
          return sum + discountedUnitPrice * discountedQty + fullUnitPrice * fullPriceQty;
        }
        return sum + fullUnitPrice * c.quantity;
      }, 0),
    [concessionCart, concessionDiscounts],
  );

  const ticketSubtotal = useMemo(
    () =>
      ticketCart.reduce((sum, t) => {
        const fullPrice = parseFloat(t.price);
        const discount = ticketDiscounts[t.ticket_type_id];
        if (discount) {
          const discountedPrice = parseFloat(discount.discounted_price);
          const discountedQty = Math.min(discount.applicable_quantity, t.quantity);
          const fullPriceQty = t.quantity - discountedQty;
          return sum + discountedPrice * discountedQty + fullPrice * fullPriceQty;
        }
        return sum + fullPrice * t.quantity;
      }, 0),
    [ticketCart, ticketDiscounts],
  );

  const subtotal = concessionSubtotal + ticketSubtotal;
  const total = subtotal;

  const cartIsEmpty = concessionCart.length === 0 && ticketCart.length === 0;

  // Complete sale
  const handleCompleteSale = async () => {
    if (cartIsEmpty) return;

    const data: POSSaleCreate = {
      payment_method: paymentMethod,
      showtime_id: selectedShowtimeId,
      member_id: selectedMember?.id,
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

    try {
      const response = await saleMutation.mutateAsync(data);
      setSaleResult(response);
      setPrintedTickets(new Set());

      // Auto-print ticket stubs if printer connected and preference is on
      if (printer.isConnected && autoPrintTickets && response.tickets.length > 0) {
        const printedUuids: string[] = [];

        for (const ticket of response.tickets) {
          try {
            setPrintingTicket(ticket.uuid);
            const stubData: TicketStubData = {
              uuid: ticket.uuid,
              film_title: ticket.film_title,
              starts_at: ticket.starts_at,
              screen_name: ticket.screen_name,
              ticket_type_name: ticket.ticket_type_name,
              price_paid: ticket.price_paid,
              cinema_name: currentCinema?.cinema_name ?? '',
            };
            await printer.printBytes(buildTicketStub(stubData));
            printedUuids.push(ticket.uuid);
            setPrintedTickets((prev) => new Set([...prev, ticket.uuid]));
          } catch {
            addToast(`Failed to print ticket ${ticket.uuid.slice(0, 8)}`, 'error');
            break;
          } finally {
            setPrintingTicket(null);
          }
        }

        if (printedUuids.length > 0) {
          try {
            await ticketsApi.markPrinted(printedUuids);
          } catch {
            // Non-blocking
          }
        }

        if (cashDrawerEnabled && response.payment_method === 'CASH') {
          try {
            await printer.printBytes(buildCashDrawerKick());
          } catch {
            // Non-blocking
          }
        }
      }
    } catch {
      // Sale failed — handled by mutation's onError
    }
  };

  // Reset for new sale
  const handleNewSale = () => {
    setConcessionCart([]);
    setTicketCart([]);
    setSelectedShowtimeId(null);
    setPaymentMethod('CASH');
    setSaleResult(null);
    setSelectedMember(null);
    setMemberSearch('');
    setTicketDiscounts({});
    setConcessionDiscounts({});
    setTotalSavings('0.00');
  };

  const selectedShowtime = showtimes.find((s: Showtime) => s.id === selectedShowtimeId);

  const isLoading = categoriesLoading || itemsLoading;

  return (
    <>
      <div className={styles.printerBar}>
        <span
          className={`${styles.printerStatus} ${
            printer.isConnected ? styles.printerConnected : styles.printerDisconnected
          }`}
        >
          {printer.isConnected ? 'Printer Connected' : 'No Printer'}
        </span>
        {printer.isConnected ? (
          <button className={styles.printerButton} onClick={printer.disconnect}>
            Disconnect
          </button>
        ) : (
          <button className={styles.printerButton} onClick={printer.connect}>
            Connect Printer
          </button>
        )}
        {printer.error && <span className={styles.printerError}>{printer.error}</span>}
        <div className={styles.printerSettings}>
          <label className={styles.printerSettingLabel}>
            <input
              type="checkbox"
              checked={autoPrintTickets}
              onChange={(e) => setAutoPrintTickets(e.target.checked)}
            />
            Auto-print tickets
          </label>
          <label className={styles.printerSettingLabel}>
            <input
              type="checkbox"
              checked={cashDrawerEnabled}
              onChange={(e) => setCashDrawerEnabled(e.target.checked)}
            />
            Cash drawer
          </label>
        </div>
      </div>
      <div className={isFullscreen ? styles.posLayoutFullscreen : styles.posLayout}>
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
            <button
              className={styles.fullscreenToggle}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
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
                      {filteredItems.map((item: ConcessionItem) => {
                        const activeVariations = item.variations.filter(
                          (v: ConcessionVariation) => v.is_active,
                        );
                        const hasVariations = activeVariations.length > 0;
                        const singleVariation =
                          activeVariations.length === 1 ? activeVariations[0] : null;

                        return (
                          <button
                            key={item.id}
                            className={hasVariations ? styles.itemCard : styles.itemCardDisabled}
                            onClick={() => handleItemClick(item)}
                            disabled={!hasVariations}
                          >
                            <div className={styles.itemName}>{item.name}</div>
                            {item.description && (
                              <div className={styles.itemDescription}>{item.description}</div>
                            )}
                            <div className={styles.itemPrice}>
                              {singleVariation
                                ? formatPrice(singleVariation.price)
                                : activeVariations.length > 1
                                  ? `From ${formatPrice(
                                      activeVariations.reduce((min, v) =>
                                        parseFloat(v.price) < parseFloat(min.price) ? v : min,
                                      ).price,
                                    )}`
                                  : item.price
                                    ? formatPrice(item.price)
                                    : 'No variations'}
                            </div>
                            {activeVariations.length > 1 && (
                              <div className={styles.variationHint}>
                                {activeVariations.length} sizes
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Tickets tab */}
          {activeTab === 'tickets' && (
            <>
              {filmShowtimes.size === 0 ? (
                <div className={styles.selectShowtimePrompt}>No showtimes scheduled for today.</div>
              ) : selectedShowtimeId !== null ? (
                /* Ticket type selection — showtime is chosen */
                <>
                  <button
                    className={styles.backButton}
                    onClick={() => {
                      setSelectedShowtimeId(null);
                      setTicketCart([]);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    {(() => {
                      const st = showtimes.find((s: Showtime) => s.id === selectedShowtimeId);
                      return st
                        ? `${st.film_title} — ${new Date(st.starts_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
                        : 'Back';
                    })()}
                  </button>
                  <div className={styles.ticketTypeList}>
                    {availableTicketTypes.map((tt: AvailableTicketType) => (
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
                </>
              ) : selectedFilmTitle !== null ? (
                /* Showtime selection — film is chosen */
                <>
                  <button className={styles.backButton} onClick={() => setSelectedFilmTitle(null)}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    {selectedFilmTitle}
                  </button>
                  <div className={styles.showtimeGrid}>
                    {filmShowtimes.get(selectedFilmTitle)?.showtimes.map((st) => (
                      <button
                        key={st.id}
                        className={styles.showtimeCard}
                        onClick={() => setSelectedShowtimeId(st.id)}
                      >
                        <span className={styles.showtimeTime}>
                          {new Date(st.starts_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={styles.showtimeScreen}>{st.screen_name}</span>
                        {st.presentation_format === '3d' && (
                          <span className={styles.showtimeBadge}>3D</span>
                        )}
                        {st.captions && <span className={styles.showtimeBadge}>{st.captions}</span>}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* Film selection — top level */
                <div className={styles.filmGrid}>
                  {Array.from(filmShowtimes.entries()).map(([title, film]) => (
                    <button
                      key={title}
                      className={styles.filmCard}
                      onClick={() => {
                        if (film.showtimes.length === 1) {
                          setSelectedFilmTitle(title);
                          setSelectedShowtimeId(film.showtimes[0].id);
                        } else {
                          setSelectedFilmTitle(title);
                        }
                      }}
                    >
                      {film.posterUrl ? (
                        <img
                          src={film.posterUrl}
                          alt={title}
                          className={styles.filmPoster}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.filmPosterPlaceholder}>
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                            <line x1="7" y1="2" x2="7" y2="22" />
                            <line x1="17" y1="2" x2="17" y2="22" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="2" y1="7" x2="7" y2="7" />
                            <line x1="2" y1="17" x2="7" y2="17" />
                            <line x1="17" y1="7" x2="22" y2="7" />
                            <line x1="17" y1="17" x2="22" y2="17" />
                          </svg>
                        </div>
                      )}
                      <div className={styles.filmInfo}>
                        <span className={styles.filmTitle}>{title}</span>
                        <span className={styles.filmShowtimeCount}>
                          {film.showtimes.length} showtime
                          {film.showtimes.length !== 1 ? 's' : ''} today
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Variation picker modal */}
        {variationPicker && (
          <div className={styles.variationOverlay} onClick={() => setVariationPicker(null)}>
            <div className={styles.variationModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.variationModalTitle}>{variationPicker.item.name}</h3>
              <div className={styles.variationList}>
                {variationPicker.variations.map((variation) => (
                  <button
                    key={variation.id}
                    className={styles.variationOption}
                    onClick={() => handleVariationSelected(variationPicker.item, variation)}
                  >
                    <span>{variation.name}</span>
                    <span className={styles.variationOptionPrice}>
                      {formatPrice(variation.price)}
                    </span>
                  </button>
                ))}
              </div>
              <button className={styles.variationCancel} onClick={() => setVariationPicker(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Modifier picker modal */}
        {modifierPicker && (
          <div
            className={styles.variationOverlay}
            onClick={() => {
              setModifierPicker(null);
              setSelectedOptions({});
            }}
          >
            <div className={styles.modifierModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.variationModalTitle}>{modifierPicker.item.name}</h3>
              <p className={styles.modifierSubtitle}>
                {modifierPicker.variation.name} &mdash;{' '}
                {formatPrice(modifierPicker.variation.price)}
              </p>
              <div className={styles.modifierGroups}>
                {modifierPicker.item.modifiers.map((mod) => (
                  <div key={mod.id} className={styles.modifierGroup}>
                    <div className={styles.modifierGroupHeader}>
                      <span className={styles.modifierGroupName}>{mod.name}</span>
                      <span className={styles.modifierGroupMeta}>
                        {mod.is_required ? 'Required' : 'Optional'}
                        {mod.max_selections === 1
                          ? ' - Pick 1'
                          : mod.max_selections > 1
                            ? ` - Pick up to ${mod.max_selections}`
                            : ''}
                      </span>
                    </div>
                    <div className={styles.modifierOptions}>
                      {mod.options.map((opt) => {
                        const isSelected = (selectedOptions[mod.id] ?? []).includes(opt.id);
                        const varPrice = opt.variation_prices.find(
                          (vp) => vp.variation_id === modifierPicker.variation.id,
                        );
                        const adj = parseFloat(
                          varPrice ? varPrice.price_adjustment : opt.price_adjustment,
                        );
                        return (
                          <label key={opt.id} className={styles.modifierOptionLabel}>
                            <input
                              type={mod.max_selections === 1 ? 'radio' : 'checkbox'}
                              name={`modifier-${mod.id}`}
                              checked={isSelected}
                              onChange={() => toggleOption(mod.id, mod.max_selections, opt.id)}
                              onClick={
                                mod.max_selections === 1 && isSelected
                                  ? () => toggleOption(mod.id, mod.max_selections, opt.id)
                                  : undefined
                              }
                            />
                            <span className={styles.modifierOptionName}>{opt.name}</span>
                            {adj !== 0 && (
                              <span className={styles.modifierOptionPrice}>
                                {adj > 0 ? '+' : ''}
                                {formatPrice(adj)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.modifierActions}>
                <button
                  className={styles.completeButton}
                  onClick={handleModifierConfirm}
                  disabled={!allRequiredMet}
                >
                  Add to Cart
                </button>
                <button
                  className={styles.variationCancel}
                  onClick={() => {
                    setModifierPicker(null);
                    setSelectedOptions({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right panel — Cart/Checkout */}
        <div className={styles.cartPanel}>
          {saleResult ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>&#10003;</div>
              <h2 className={styles.successTitle}>Sale Complete</h2>
              <p className={styles.successDetail}>Order #{saleResult.uuid.slice(0, 8)}</p>
              {parseFloat(saleResult.tax_total) > 0 && (
                <p className={styles.successDetail}>
                  Subtotal:{' '}
                  {formatPrice(
                    (
                      parseFloat(saleResult.total_amount) - parseFloat(saleResult.tax_total)
                    ).toFixed(2),
                  )}
                  {' · '}Tax: {formatPrice(saleResult.tax_total)}
                </p>
              )}
              <p className={styles.successTotal}>{formatPrice(saleResult.total_amount)}</p>
              {saleResult.member_savings && parseFloat(saleResult.member_savings) > 0 && (
                <p className={styles.successSavings}>
                  You saved {formatPrice(saleResult.member_savings)}
                </p>
              )}

              {saleResult.tickets.length > 0 && (
                <div className={styles.printStatus}>
                  {saleResult.tickets.map((ticket) => (
                    <div
                      key={ticket.uuid}
                      className={`${styles.printStatusItem} ${
                        printedTickets.has(ticket.uuid)
                          ? styles.printStatusPrinted
                          : printingTicket === ticket.uuid
                            ? styles.printStatusPrinting
                            : styles.printStatusPending
                      }`}
                    >
                      <span>
                        {ticket.ticket_type_name} — {ticket.uuid.slice(0, 8)}
                      </span>
                      <span>
                        {printedTickets.has(ticket.uuid)
                          ? 'Printed'
                          : printingTicket === ticket.uuid
                            ? 'Printing...'
                            : 'Not printed'}
                      </span>
                      {printingTicket !== ticket.uuid && (
                        <button
                          className={styles.reprintButton}
                          onClick={async () => {
                            if (!printer.isConnected) {
                              addToast('Printer not connected', 'error');
                              return;
                            }
                            try {
                              const stubData: TicketStubData = {
                                uuid: ticket.uuid,
                                film_title: ticket.film_title,
                                starts_at: ticket.starts_at,
                                screen_name: ticket.screen_name,
                                ticket_type_name: ticket.ticket_type_name,
                                price_paid: ticket.price_paid,
                                cinema_name: currentCinema?.cinema_name ?? '',
                              };
                              await printer.printBytes(buildTicketStub(stubData));
                              setPrintedTickets((prev) => new Set([...prev, ticket.uuid]));
                              await ticketsApi.markPrinted([ticket.uuid]);
                            } catch {
                              addToast('Reprint failed', 'error');
                            }
                          }}
                          disabled={!printer.isConnected}
                        >
                          {printedTickets.has(ticket.uuid) ? 'Reprint' : 'Print'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                className={styles.printReceiptButton}
                onClick={async () => {
                  if (!printer.isConnected) {
                    addToast('Printer not connected', 'error');
                    return;
                  }
                  const receiptData: ReceiptData = {
                    cinema_name: currentCinema?.cinema_name ?? '',
                    payment_method: saleResult.payment_method,
                    total_amount: saleResult.total_amount,
                    tax_total: saleResult.tax_total,
                    tickets: saleResult.tickets.map((t) => ({
                      ticket_type_name: t.ticket_type_name,
                      quantity: 1,
                      price_paid: t.price_paid,
                    })),
                    concession_items: saleResult.concession_items ?? [],
                  };
                  try {
                    await printer.printBytes(buildReceipt(receiptData));
                    addToast('Receipt printed', 'success');
                  } catch {
                    addToast('Failed to print receipt', 'error');
                  }
                }}
                disabled={!printer.isConnected}
              >
                Print Receipt
              </button>

              {!printer.isConnected && saleResult.tickets.length > 0 && (
                <p className={styles.printerWarning}>
                  Printer not connected — tickets were not printed
                </p>
              )}

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

              {/* Member search */}
              <div className={styles.memberSection}>
                {selectedMember ? (
                  <div className={styles.memberChip}>
                    <div className={styles.memberChipInfo}>
                      <span className={styles.memberChipName}>{selectedMember.full_name}</span>
                      {selectedMember.active_membership ? (
                        <span
                          className={
                            selectedMember.active_membership.status === 'EXPIRED'
                              ? styles.memberChipStatusExpired
                              : selectedMember.active_membership.status === 'CANCELLED'
                                ? styles.memberChipStatusCancelled
                                : styles.memberChipStatus
                          }
                        >
                          {selectedMember.active_membership.tier_name}
                          {selectedMember.active_membership.status === 'ACTIVE'
                            ? ` — expires ${new Date(
                                selectedMember.active_membership.end_date,
                              ).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}`
                            : ` (${
                                selectedMember.active_membership.status.charAt(0) +
                                selectedMember.active_membership.status.slice(1).toLowerCase()
                              })`}
                        </span>
                      ) : (
                        <span className={styles.memberChipStatusNone}>No active membership</span>
                      )}
                    </div>
                    <button
                      className={styles.memberChipRemove}
                      onClick={handleClearMember}
                      aria-label="Remove member from sale"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className={styles.memberSearchWrapper} ref={memberSearchRef}>
                    <input
                      type="text"
                      className={styles.memberSearchInput}
                      placeholder="Search member..."
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setMemberDropdownOpen(true);
                      }}
                      onFocus={() => {
                        if (memberSearch.length >= 2) setMemberDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setMemberDropdownOpen(false);
                      }}
                    />
                    {memberDropdownOpen && memberSearch.length >= 2 && (
                      <div className={styles.memberDropdown}>
                        {memberSearchLoading ? (
                          <div className={styles.memberDropdownMessage}>Searching...</div>
                        ) : memberResults.length === 0 ? (
                          <div className={styles.memberDropdownMessage}>No members found.</div>
                        ) : (
                          memberResults.map((member) => (
                            <button
                              key={member.id}
                              className={styles.memberDropdownItem}
                              onClick={() => handleSelectMember(member)}
                            >
                              <span className={styles.memberDropdownName}>
                                {member.full_name}
                                {member.member_number && (
                                  <span className={styles.memberDropdownNumber}>
                                    #{member.member_number}
                                  </span>
                                )}
                              </span>
                              <span className={styles.memberDropdownTier}>
                                {member.active_membership
                                  ? member.active_membership.tier_name
                                  : 'No membership'}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart items */}
              {cartIsEmpty ? (
                <div className={styles.cartEmpty}>Add items from the menu to start a sale.</div>
              ) : (
                <div className={styles.cartItems}>
                  {/* Ticket items */}
                  {ticketCart.map((t) => {
                    const discount = ticketDiscounts[t.ticket_type_id];
                    const fullPrice = parseFloat(t.price);
                    let lineTotal: number;
                    if (discount) {
                      const discountedPrice = parseFloat(discount.discounted_price);
                      const discountedQty = Math.min(discount.applicable_quantity, t.quantity);
                      const fullPriceQty = t.quantity - discountedQty;
                      lineTotal = discountedPrice * discountedQty + fullPrice * fullPriceQty;
                    } else {
                      lineTotal = fullPrice * t.quantity;
                    }
                    return (
                      <div key={`ticket-${t.ticket_type_id}`} className={styles.cartItem}>
                        <div className={styles.cartItemDetails}>
                          <div className={styles.cartItemName}>{t.ticket_type_name}</div>
                          <div className={styles.cartItemMeta}>
                            {selectedShowtime
                              ? `${selectedShowtime.film_title} - ${selectedShowtime.screen_name}`
                              : 'Ticket'}{' '}
                            &times; {t.quantity} @{' '}
                            {discount ? (
                              <>
                                <span className={styles.originalPrice}>{formatPrice(t.price)}</span>{' '}
                                {formatPrice(discount.discounted_price)}
                                {discount.applicable_quantity < t.quantity && (
                                  <span className={styles.partialDiscount}>
                                    {' '}
                                    ({discount.applicable_quantity} of {t.quantity})
                                  </span>
                                )}
                              </>
                            ) : (
                              formatPrice(t.price)
                            )}
                          </div>
                          {discount && (
                            <div className={styles.benefitName}>{discount.benefit_name}</div>
                          )}
                        </div>
                        <div className={styles.cartItemRight}>
                          <span className={styles.cartItemPrice}>{formatPrice(lineTotal)}</span>
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
                    );
                  })}

                  {/* Concession items */}
                  {concessionCart.map((c) => {
                    const key = makeCartKey(c.variation.id, c.modifier_option_ids);
                    const modAdj = getModifierPriceAdjustment(
                      c.item,
                      c.variation.id,
                      c.modifier_option_ids,
                    );
                    const discount = concessionDiscounts[c.variation.id];
                    const fullUnitPrice = parseFloat(c.variation.price) + modAdj;
                    let lineTotal: number;
                    if (discount) {
                      const discountedUnitPrice = parseFloat(discount.discounted_price) + modAdj;
                      const discountedQty = Math.min(discount.applicable_quantity, c.quantity);
                      const fullPriceQty = c.quantity - discountedQty;
                      lineTotal =
                        discountedUnitPrice * discountedQty + fullUnitPrice * fullPriceQty;
                    } else {
                      lineTotal = fullUnitPrice * c.quantity;
                    }
                    const optionNames = getSelectedOptionNames(c.item, c.modifier_option_ids);
                    return (
                      <div key={`concession-${key}`} className={styles.cartItem}>
                        <div className={styles.cartItemDetails}>
                          <div className={styles.cartItemName}>
                            {c.item.name} ({c.variation.name})
                          </div>
                          <div className={styles.cartItemMeta}>
                            {discount ? (
                              <>
                                <span className={styles.originalPrice}>
                                  {formatPrice(fullUnitPrice)}
                                </span>{' '}
                                {formatPrice(parseFloat(discount.discounted_price) + modAdj)}
                                {discount.applicable_quantity < c.quantity && (
                                  <span className={styles.partialDiscount}>
                                    {' '}
                                    ({discount.applicable_quantity} of {c.quantity})
                                  </span>
                                )}
                              </>
                            ) : (
                              formatPrice(fullUnitPrice)
                            )}{' '}
                            each
                            {optionNames.length > 0 && ` — ${optionNames.join(', ')}`}
                          </div>
                          {discount && (
                            <div className={styles.benefitName}>{discount.benefit_name}</div>
                          )}
                        </div>
                        <div className={styles.cartItemRight}>
                          <div className={styles.cartQuantityControls}>
                            <button
                              className={styles.cartQuantityButton}
                              onClick={() => updateConcessionQuantity(key, -1)}
                              aria-label={`Decrease ${c.item.name} quantity`}
                            >
                              -
                            </button>
                            <span className={styles.cartQuantityValue}>{c.quantity}</span>
                            <button
                              className={styles.cartQuantityButton}
                              onClick={() => updateConcessionQuantity(key, 1)}
                              aria-label={`Increase ${c.item.name} quantity`}
                            >
                              +
                            </button>
                          </div>
                          <span className={styles.cartItemPrice}>{formatPrice(lineTotal)}</span>
                          <button
                            className={styles.removeButton}
                            onClick={() => removeConcessionFromCart(key)}
                            aria-label={`Remove ${c.item.name}`}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                    {parseFloat(totalSavings) > 0 && (
                      <div className={styles.savingsRow}>
                        <span>Member savings</span>
                        <span className={styles.savingsAmount}>-{formatPrice(totalSavings)}</span>
                      </div>
                    )}
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
    </>
  );
}
