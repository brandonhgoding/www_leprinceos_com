// src/api/types.ts

// DRF paginated response wrapper
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Cinema {
  id: number;
  name: string;
  slug: string;
  timezone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
}

export interface Film {
  id: number;
  title: string;
  runtime_minutes: number | null;
  rating: string;
  synopsis: string;
  poster_url: string;
  tmdb_id: string | null;
  imdb_id: string | null;
}

export interface Screen {
  id: number;
  name: string;
  capacity: number;
  screen_type: 'standard' | 'imax' | 'dolby_cinema';
  aspect_ratio: 'flat' | 'scope' | 'imax_190' | 'imax_143';
  sound_system: 'standard' | 'dolby_digital' | 'dolby_atmos';
  supports_3d: boolean;
}

export interface Engagement {
  id: number;
  film: number;
  film_title: string;
  film_poster_url: string | null;
  screen: number;
  screen_name: string;
  start_date: string;
  end_date: string;
  presentation_format: '2d' | '3d';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface EngagementCreate {
  film: number;
  screen: number;
  start_date: string;
  end_date: string;
  presentation_format?: '2d' | '3d';
  status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  notes?: string;
}

export interface Showtime {
  id: number;
  engagement: number;
  screen: number;
  screen_name: string;
  starts_at: string;
  is_cancelled: boolean;
  captions: 'CC' | 'OC' | null;
  film_title: string;
  film_poster_url: string | null;
  is_outside_engagement_range: boolean;
  presentation_format: '2d' | '3d';
  presentation_format_display: string;
}

export interface ShowtimeCreate {
  engagement: number;
  screen?: number;
  starts_at: string;
  is_cancelled?: boolean;
  captions?: 'CC' | 'OC' | null;
}

export interface BulkShowtimeCreate {
  engagement: number;
  screen?: number | null;
  start_date: string;
  end_date: string;
  times: string[];
  captions?: 'CC' | 'OC' | null;
}

// Filter types
export interface EngagementFilters {
  status?: string;
  film?: number;
  screen?: number;
  start_date_after?: string;
  start_date_before?: string;
  end_date_after?: string;
  end_date_before?: string;
}

export interface ShowtimeFilters {
  engagement?: number;
  screen?: number;
  is_cancelled?: boolean;
  date?: string;
  starts_at_after?: string;
  starts_at_before?: string;
}

// Ticket Types
export interface TicketTypeRule {
  id: number;
  ticket_type: number;
  name: string;
  is_active: boolean;
  priority: number;
  matinee_cutoff_time: string | null;
  days_of_week: string;
  days_of_week_list: number[];
  presentation_format: '2d' | '3d' | null;
  requires_3d_screen: boolean | null;
  screen_type: 'standard' | 'imax' | 'dolby_cinema' | null;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeRuleCreate {
  name: string;
  is_active?: boolean;
  priority?: number;
  matinee_cutoff_time?: string | null;
  days_of_week_list?: number[];
  presentation_format?: '2d' | '3d' | null;
  requires_3d_screen?: boolean | null;
  screen_type?: 'standard' | 'imax' | 'dolby_cinema' | null;
}

export interface TicketType {
  id: number;
  name: string;
  price: string;
  is_active: boolean;
  description: string;
  rules_count: number;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeDetail extends TicketType {
  rules: TicketTypeRule[];
}

export interface TicketTypeCreate {
  name: string;
  price: string;
  is_active?: boolean;
  description?: string;
}

// Concessions
export interface ConcessionVariation {
  id: number;
  item: number;
  name: string;
  sku: string;
  price: string;
  cost: string | null;
  is_active: boolean;
  square_id: string;
  margin: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConcessionVariationCreate {
  name: string;
  sku?: string;
  price: string;
  cost?: string | null;
  is_active?: boolean;
  square_id?: string;
}

export interface ModifierGroupBasic {
  id: number;
  name: string;
  selection_type: 'SINGLE' | 'MULTIPLE';
  is_required: boolean;
  modifiers_count: number;
}

// Item-to-ModifierGroup assignment (through model for per-item settings)
export interface ItemModifierAssignment {
  id: number;
  modifier_group: ModifierGroupBasic;
  min_selected_modifiers: number;  // -1 = use group default
  max_selected_modifiers: number;  // -1 = use group default
  effective_min_selections: number;
  effective_max_selections: number | null;
  enabled: boolean;
  ordinal: number;
  modifier_overrides: ModifierOverride[];
}

export interface ModifierOverride {
  modifier_id: string;
  on_by_default?: boolean;
  hidden_online?: boolean;
}

export interface ItemModifierAssignmentCreate {
  modifier_group_id: number;
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  enabled?: boolean;
  ordinal?: number;
  modifier_overrides?: ModifierOverride[];
}

export interface SalesTaxBasic {
  id: number;
  name: string;
  percentage: string;
  tax_type: TaxType;
  inclusion_type: InclusionType;
}

export interface ConcessionItem {
  id: number;
  category: number;
  category_name: string;
  name: string;
  description: string;
  image_url: string;
  is_active: boolean;
  square_id: string;
  variations_count: number;
  price_range: { min: string; max: string } | null;
  modifier_groups: ModifierGroupBasic[];
  modifier_assignments: ItemModifierAssignment[];
  sales_taxes: SalesTaxBasic[];
  created_at: string;
  updated_at: string;
}

export interface ConcessionItemDetail extends ConcessionItem {
  variations: ConcessionVariation[];
}

export interface ConcessionItemCreate {
  category: number;
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  square_id?: string;
  modifier_group_ids?: number[];  // Simple mode: just IDs (creates default assignments)
  modifier_assignments?: ItemModifierAssignmentCreate[];  // Advanced mode: per-item settings
  sales_tax_ids?: number[];
}

export interface ConcessionCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  square_id: string;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConcessionCategoryDetail extends ConcessionCategory {
  items: ConcessionItemDetail[];
}

export interface ConcessionCategoryCreate {
  name: string;
  description?: string;
  is_active?: boolean;
  square_id?: string;
}

// Modifiers
export interface Modifier {
  id: number;
  group: number;
  name: string;
  price_adjustment: string;
  ordinal: number;
  on_by_default: boolean;
  is_active: boolean;
  square_id: string;
  created_at: string;
  updated_at: string;
}

export interface ModifierCreate {
  name: string;
  price_adjustment?: string;
  ordinal?: number;
  on_by_default?: boolean;
  is_active?: boolean;
  square_id?: string;
}

export interface ModifierGroup {
  id: number;
  name: string;
  internal_name: string;
  selection_type: 'SINGLE' | 'MULTIPLE';
  min_selections: number;
  max_selections: number | null;
  is_required: boolean;
  ordinal: number;
  is_active: boolean;
  square_id: string;
  modifiers_count: number;
  created_at: string;
  updated_at: string;
}

export interface ModifierGroupDetail extends ModifierGroup {
  modifiers: Modifier[];
}

export interface ModifierGroupCreate {
  name: string;
  internal_name?: string;
  selection_type?: 'SINGLE' | 'MULTIPLE';
  min_selections?: number;
  max_selections?: number | null;
  is_required?: boolean;
  ordinal?: number;
  is_active?: boolean;
  square_id?: string;
}

// Square Integration
export interface SquareCredentials {
  id: number;
  environment: 'sandbox' | 'production';
  location_id: string;
  merchant_id: string;
  is_active: boolean;
  is_connected: boolean;
  is_configured: boolean;
  token_preview: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SquareCredentialsCreate {
  access_token: string;
  refresh_token?: string;
  environment: 'sandbox' | 'production';
  location_id: string;
  merchant_id?: string;
}

export interface SquareConnectionTest {
  success: boolean;
  location_name?: string;
  location_id?: string;
  merchant_id?: string;
  error?: string;
}

export type SquareSyncType = 'full' | 'categories' | 'items' | 'modifiers';
export type SquareSyncStatus = 'pending' | 'in_progress' | 'success' | 'partial' | 'failed';

export interface SquareSyncLog {
  id: number;
  sync_type: SquareSyncType;
  status: SquareSyncStatus;
  objects_synced: number;
  objects_failed: number;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
}

export interface SquareSyncRequest {
  sync_type?: SquareSyncType;
}

// Sales Taxes
export type TaxType = 'state' | 'local' | 'county' | 'city' | 'other';
export type InclusionType = 'additive' | 'inclusive';

export interface SalesTax {
  id: number;
  name: string;
  percentage: string;
  tax_type: TaxType;
  inclusion_type: InclusionType;
  is_active: boolean;
  square_id: string;
  concession_items_count: number;
  ticket_types_count: number;
  created_at: string;
  updated_at: string;
}

export interface SalesTaxDetail extends SalesTax {
  concession_items: { id: number; name: string }[];
  ticket_types: { id: number; name: string }[];
}

export interface SalesTaxCreate {
  name: string;
  percentage: string;
  tax_type?: TaxType;
  inclusion_type?: InclusionType;
  is_active?: boolean;
}

// Integration types for the Integrations page
export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_configured: boolean;
  is_active: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_sync_at: string | null;
}
