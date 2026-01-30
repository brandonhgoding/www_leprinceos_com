// src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { engagementsApi, showtimesApi, screensApi } from '../api';
import type { Showtime } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import { formatTime, getTodayInTimezone } from '../utils/timezone';
import styles from './Home.module.css';

interface SummaryCardProps {
  label: string;
  value: number | string;
  linkText?: string;
  linkTo?: string;
  isLoading?: boolean;
}

function SummaryCard({ label, value, linkText, linkTo, isLoading }: SummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <p className={styles.cardLabel}>{label}</p>
        <p className={styles.cardValue}>{isLoading ? '—' : value}</p>
        {linkTo && linkText && (
          <Link to={linkTo} className={styles.cardLink}>
            {linkText} &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, currentCinema } = useAuth();
  const cinemaTimezone = currentCinema?.cinema_timezone || 'America/New_York';
  const today = getTodayInTimezone(cinemaTimezone);

  // Fetch screens count
  const { data: screens = [], isLoading: screensLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => screensApi.list(),
  });

  // Fetch active (confirmed) engagements
  const { data: activeEngagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements', 'active'],
    queryFn: () => engagementsApi.list({ status: 'CONFIRMED' }),
  });

  // Fetch today's showtimes
  const { data: todayShowtimes = [], isLoading: showtimesLoading } = useQuery({
    queryKey: ['showtimes', 'today', today],
    queryFn: () => showtimesApi.list({ date: today }),
  });

  // Sort showtimes by time
  const sortedShowtimes = [...todayShowtimes].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const displayName = user?.first_name || user?.username || 'User';

  return (
    <div className={styles.dashboardHome}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.welcomeText}>Welcome back, {displayName}</p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <SummaryCard
          label="Active Engagements"
          value={activeEngagements.length}
          linkText="View all"
          linkTo="/engagements"
          isLoading={engagementsLoading}
        />
        <SummaryCard
          label="Today's Showtimes"
          value={todayShowtimes.length}
          isLoading={showtimesLoading}
        />
        <SummaryCard
          label="Screens"
          value={screens.length}
          linkText="Manage"
          linkTo="/screens"
          isLoading={screensLoading}
        />
      </div>

      {/* Today's Showtimes */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Today's Showtimes</h2>
        {showtimesLoading ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyText}>Loading showtimes...</p>
          </div>
        ) : sortedShowtimes.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Film</th>
                      <th>Screen</th>
                      <th>Format</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShowtimes.map((show: Showtime) => (
                      <tr key={show.id}>
                        <td className={styles.timeCell}>
                          {formatTime(show.starts_at, cinemaTimezone)}
                        </td>
                        <td className={styles.filmCell}>{show.film_title}</td>
                        <td className={styles.screenCell}>{show.screen_name}</td>
                        <td className={styles.formatCell}>
                          {show.presentation_format_display || '2D'}
                        </td>
                        <td>
                          {show.is_cancelled ? (
                            <span className={styles.statusCancelled}>Cancelled</span>
                          ) : (
                            <span className={styles.statusActive}>Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className={styles.cardList}>
              {sortedShowtimes.map((show: Showtime) => (
                <div key={show.id} className={styles.showtimeCard}>
                  <div className={styles.showtimeCardHeader}>
                    <span className={styles.showtimeTime}>
                      {formatTime(show.starts_at, cinemaTimezone)}
                    </span>
                    {show.is_cancelled ? (
                      <span className={styles.statusCancelled}>Cancelled</span>
                    ) : (
                      <span className={styles.statusActive}>Active</span>
                    )}
                  </div>
                  <div className={styles.showtimeCardBody}>
                    <h3 className={styles.showtimeFilm}>{show.film_title}</h3>
                    <div className={styles.showtimeMeta}>
                      <span>{show.screen_name}</span>
                      <span className={styles.showtimeFormat}>
                        {show.presentation_format_display || '2D'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyCard}>
            <p className={styles.emptyText}>No showtimes scheduled for today.</p>
            <Link to="/engagements" className={styles.emptyLink}>
              View engagements &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
