// src/widget/types.ts
// Types matching the public ticketing API serializers

export interface PublicShowtime {
  id: number;
  starts_at: string;
  film_title: string;
  film_poster_url: string | null;
  film_rating: string;
  film_runtime_minutes: number | null;
  screen_name: string;
  presentation_format: string;
  captions: boolean;
  tickets_remaining: number;
}

export interface TicketType {
  id: number;
  name: string;
  price: string; // Decimal as string from DRF
  description: string;
}

export interface ShowtimeAvailability {
  showtime: PublicShowtime;
  ticket_types: TicketType[];
  capacity: number;
  sold: number;
  available: number;
}

export interface OrderItemInput {
  ticket_type_id: number;
  quantity: number;
}

export interface OrderCreatePayload {
  showtime_id: number;
  items: OrderItemInput[];
  concession_items?: ConcessionItemPayload[];
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  member_email?: string;
}

export interface OrderItemConfirmation {
  ticket_type_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface TicketQR {
  uuid: string;
  ticket_type: number;
}

export interface OrderConfirmation {
  order_id: string;
  confirmation_number: string;
  status: string;
  film_title: string;
  showtime_starts_at: string;
  screen_name: string;
  items: OrderItemConfirmation[];
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  tickets: TicketQR[];
}

/** Configuration read from the host page's data attributes */
export interface WidgetConfig {
  cinema: string;
  type: string;
  theme: 'light' | 'dark';
  apiBaseUrl: string;
}

/* ---- Concession types ---- */

export interface PublicModifierOption {
  id: number;
  name: string;
  price_adjustment: string; // Decimal as string from DRF
}

export interface PublicModifier {
  id: number;
  name: string;
  is_required: boolean;
  max_selections: number;
  options: PublicModifierOption[];
}

export interface PublicConcessionVariation {
  id: number;
  name: string;
  price: string; // Decimal as string from DRF
  in_stock: boolean;
}

export interface PublicConcessionItem {
  id: number;
  name: string;
  description: string;
  image: string | null;
  tax_rate: string; // Decimal as string from DRF
  variations: PublicConcessionVariation[];
  modifiers: PublicModifier[];
}

export interface PublicConcessionCategory {
  id: number;
  name: string;
  items: PublicConcessionItem[];
}

export interface PublicComboSlotOption {
  id: number;
  name: string;
  is_default: boolean;
}

export interface PublicComboSlot {
  id: number;
  name: string;
  options: PublicComboSlotOption[];
}

export interface PublicCombo {
  id: number;
  name: string;
  description: string;
  price: string; // Decimal as string from DRF
  tax_rate: string;
  slots: PublicComboSlot[];
}

export interface PublicConcessionMenu {
  categories: PublicConcessionCategory[];
  combos: PublicCombo[];
}

/** A single concession item in the cart */
export interface ConcessionCartItem {
  /** Unique key for this cart entry (variation_id + sorted modifier_option_ids) */
  cartKey: string;
  variation_id: number;
  quantity: number;
  modifier_option_ids: number[];
  /** Display fields */
  itemName: string;
  variationName: string;
  unitPrice: number; // base price + modifier adjustments
  taxRate: number;
}

export interface ConcessionItemPayload {
  variation_id: number;
  quantity: number;
  modifier_option_ids: number[];
}

/** Cart state: maps ticket_type_id -> quantity */
export type Cart = Record<number, number>;

/** Application view state */
export type WidgetView =
  | { name: 'showtimes' }
  | { name: 'checkout'; showtimeId: number }
  | { name: 'payment'; orderId: string }
  | { name: 'confirmation'; orderId: string }
  | { name: 'error'; message: string; retry?: () => void };

/** API error response shape */
export interface ApiErrorResponse {
  detail?: string;
  available?: number;
  requested?: number;
  [key: string]: unknown;
}
