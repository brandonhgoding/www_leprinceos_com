// src/widget/views/ShowtimesView.tsx
// Browse upcoming showtimes grouped by film. Users select a showtime to proceed to checkout.

import { useEffect, useState } from 'react';
import { fetchShowtimes } from '../api.ts';
import type { PublicShowtime, WidgetConfig } from '../types.ts';

interface ShowtimesViewProps {
  config: WidgetConfig;
  onSelectShowtime: (showtimeId: number) => void;
}

/** Group showtimes by film title for display */
interface FilmGroup {
  filmTitle: string;
  posterUrl: string | null;
  rating: string;
  runtimeMinutes: number | null;
  showtimes: PublicShowtime[];
}

function groupByFilm(showtimes: PublicShowtime[]): FilmGroup[] {
  const map = new Map<string, FilmGroup>();
  for (const st of showtimes) {
    let group = map.get(st.film_title);
    if (!group) {
      group = {
        filmTitle: st.film_title,
        posterUrl: st.film_poster_url,
        rating: st.film_rating,
        runtimeMinutes: st.film_runtime_minutes,
        showtimes: [],
      };
      map.set(st.film_title, group);
    }
    group.showtimes.push(st);
  }
  return Array.from(map.values());
}

function formatShowtime(isoDate: string): { day: string; time: string } {
  const date = new Date(isoDate);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { day, time };
}

export default function ShowtimesView({ config, onSelectShowtime }: ShowtimesViewProps) {
  const [showtimes, setShowtimes] = useState<PublicShowtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchShowtimes(config.apiBaseUrl)
      .then((data) => {
        if (!cancelled) {
          setShowtimes(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load showtimes';
          setError(message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [config.apiBaseUrl]);

  if (loading) {
    return (
      <div className="lpo-loading" role="status">
        <div className="lpo-spinner" aria-hidden="true" />
        <p>Loading showtimes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lpo-empty" role="alert">
        <p className="lpo-empty-title">Unable to load showtimes</p>
        <p>{error}</p>
      </div>
    );
  }

  const filmGroups = groupByFilm(showtimes);

  if (filmGroups.length === 0) {
    return (
      <div className="lpo-empty">
        <p className="lpo-empty-title">No showtimes available</p>
        <p>Check back soon for upcoming screenings and ticket sales.</p>
      </div>
    );
  }

  return (
    <>
      <div className="lpo-header">
        <h2 className="lpo-title">Buy Tickets</h2>
      </div>

      {filmGroups.map((group) => (
        <div className="lpo-film-card" key={group.filmTitle}>
          {group.posterUrl ? (
            <img
              className="lpo-film-poster"
              src={group.posterUrl}
              alt={`${group.filmTitle} poster`}
              loading="lazy"
            />
          ) : (
            <div className="lpo-film-poster-placeholder" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
          )}
          <div className="lpo-film-info">
            <h3 className="lpo-film-title">{group.filmTitle}</h3>
            <div className="lpo-film-meta">
              {group.runtimeMinutes && <span>{group.runtimeMinutes} min</span>}
              {group.rating && <span>{group.rating}</span>}
            </div>
            <div className="lpo-showtimes-list" role="list" aria-label={`Showtimes for ${group.filmTitle}`}>
              {group.showtimes.map((st) => {
                const { day, time } = formatShowtime(st.starts_at);
                return (
                  <button
                    key={st.id}
                    className="lpo-showtime-badge"
                    onClick={() => onSelectShowtime(st.id)}
                    aria-label={`${day} ${time} at ${st.screen_name}, ${st.tickets_remaining} tickets remaining`}
                    role="listitem"
                  >
                    {day} {time}
                    <span className="lpo-screen-hint">{st.screen_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
