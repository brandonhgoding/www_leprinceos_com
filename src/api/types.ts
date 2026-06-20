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

export interface TMDBSearchResult {
  tmdb_id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

export interface CreateFilmFromTMDBRequest {
  tmdb_id: number;
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
  film_runtime_minutes: number | null;
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
  is_archived: boolean;
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

export interface AvailableTicketType {
  id: number;
  name: string;
  price: string;
  description: string;
  matched_rule_name: string | null;
}

// Memberships
export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type BenefitType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_ITEM';
export type BenefitScope = 'TICKET' | 'RENTAL';
export type ConditionType =
  | 'TIME_BEFORE'
  | 'TIME_AFTER'
  | 'DAY_OF_WEEK'
  | 'TICKET_TYPE'
  | 'BIRTHDAY_MONTH'
  | 'COMPANION';
export type PeriodType = 'MONTHLY' | 'DAILY' | 'LIFETIME';
export type AuditAction = 'CREATED' | 'ACTIVATED' | 'RENEWED' | 'CANCELLED' | 'EXPIRED';

export interface Member {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  birth_month: number | null;
  birth_day: number | null;
  family_member_count: number;
  member_number: string;
  active_membership: {
    id: number;
    tier_name: string;
    status: MembershipStatus;
    end_date: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface MemberCreate {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  birth_month?: number;
  birth_day?: number;
  family_member_count?: number;
  member_number?: string;
}

export interface MemberLookup {
  email?: string;
  phone?: string;
  member_number?: string;
}

export interface MembershipTier {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_months: number;
  is_family_tier: boolean;
  max_family_members: number;
  display_order: number;
  is_active: boolean;
  benefit_count: number;
  created_at: string;
  updated_at: string;
}

export interface MembershipTierCreate {
  name: string;
  description?: string;
  price: string;
  duration_months: number;
  is_family_tier?: boolean;
  max_family_members?: number;
  display_order?: number;
  is_active?: boolean;
}

export interface MembershipTierDetail extends MembershipTier {
  benefit_rules: BenefitRule[];
}

export interface BenefitCondition {
  id: number;
  condition_type: ConditionType;
  condition_type_display: string;
  reference_value: string;
}

export interface BenefitConditionCreate {
  rule: number;
  condition_type: ConditionType;
  reference_value: string;
}

export interface BenefitRule {
  id: number;
  tier: number;
  tier_name: string;
  name: string;
  description: string;
  benefit_type: BenefitType;
  benefit_type_display: string;
  benefit_scope: BenefitScope;
  benefit_scope_display: string;
  value: string;
  monthly_limit: number | null;
  daily_limit: number | null;
  priority: number;
  is_active: boolean;
  conditions: BenefitCondition[];
  created_at: string;
  updated_at: string;
}

export interface BenefitRuleCreate {
  tier: number;
  name: string;
  description?: string;
  benefit_type: BenefitType;
  benefit_scope: BenefitScope;
  value: string;
  monthly_limit?: number | null;
  daily_limit?: number | null;
  priority?: number;
  is_active?: boolean;
}

export interface Membership {
  id: number;
  member: number;
  member_name: string;
  member_email: string;
  tier: number;
  tier_name: string;
  status: MembershipStatus;
  status_display: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  price_paid: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipCreate {
  member: number;
  tier: number;
  start_date?: string;
  price_paid?: string;
  auto_activate?: boolean;
}

export interface BenefitAllocation {
  id: number;
  benefit_rule: number;
  benefit_name: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  quantity_allocated: number;
  quantity_used: number;
  quantity_remaining: number;
  is_exhausted: boolean;
}

export interface BenefitRedemption {
  id: number;
  allocation: number;
  benefit_name: string;
  sale: number | null;
  ticket: number | null;
  discount_amount: string;
  quantity_redeemed: number;
  redeemed_at: string;
}

export interface MembershipAuditLog {
  id: number;
  action: AuditAction;
  action_display: string;
  performed_by: number | null;
  performed_by_username: string | null;
  performed_at: string;
  old_value: string;
  new_value: string;
  notes: string;
}

export interface MemberBenefits {
  membership: {
    id: number;
    tier_name: string;
    status: MembershipStatus;
    start_date: string;
    end_date: string;
  };
  allocations: BenefitAllocation[];
}

// Filter types
export interface MemberFilters {
  search?: string;
  page?: number;
  email?: string;
  phone?: string;
  member_number?: string;
}

export interface MembershipFilters {
  status?: MembershipStatus;
  tier?: number;
  member?: number;
}
