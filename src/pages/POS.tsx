// src/pages/POS.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { concessionsApi, membersApi, paymentsApi, showtimesApi, ticketsApi } from '../api';
import type {
  ConcessionCategory,
  ConcessionItem,
  ConcessionVariation,
  Member,
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

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('concessions');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
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

  const { data: memberResults = [], isLoading: memberSearchLoading } = useQuery({
    queryKey: ['member-search', debouncedMemberSearch],
    queryFn: () => membersApi.list({ search: debouncedMemberSearch }),
    enabled: debouncedMemberSearch.length >= 2 && !selectedMember,
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
    () =>
      concessionCart.reduce((sum, c) => {
        const basePrice = parseFloat(c.variation.price);
        const modAdj = getModifierPriceAdjustment(c.item, c.variation.id, c.modifier_option_ids);
        return sum + (basePrice + modAdj) * c.quantity;
      }, 0),
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

    saleMutation.mutate(data);
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
              {modifierPicker.variation.name} &mdash; {formatPrice(modifierPicker.variation.price)}
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
                {concessionCart.map((c) => {
                  const key = makeCartKey(c.variation.id, c.modifier_option_ids);
                  const modAdj = getModifierPriceAdjustment(
                    c.item,
                    c.variation.id,
                    c.modifier_option_ids,
                  );
                  const unitPrice = parseFloat(c.variation.price) + modAdj;
                  const optionNames = getSelectedOptionNames(c.item, c.modifier_option_ids);
                  return (
                    <div key={`concession-${key}`} className={styles.cartItem}>
                      <div className={styles.cartItemDetails}>
                        <div className={styles.cartItemName}>
                          {c.item.name} ({c.variation.name})
                        </div>
                        <div className={styles.cartItemMeta}>
                          {formatPrice(unitPrice)} each
                          {optionNames.length > 0 && ` — ${optionNames.join(', ')}`}
                        </div>
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
                        <span className={styles.cartItemPrice}>
                          {formatPrice(unitPrice * c.quantity)}
                        </span>
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
