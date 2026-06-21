// src/api/types.ts

// DRF paginated response wrapper
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

