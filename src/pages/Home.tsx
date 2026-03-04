// src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { engagementsApi, showtimesApi, screensApi } from '../api';
import type { Showtime } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import { formatTime, getTodayInTimezone } from '../utils/timezone';
import { useSmartAlerts } from '../hooks/useSmartAlerts';
import AlertBanner from '../components/AlertBanner';
import styles from './Home.module.css';

interface SummaryCardProps {
  label: string;
  value: number | string;
  linkText?: string;
  linkTo?: string;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  previousValue?: number;
}

function SummaryCard({
  label,
  value,
  linkText,
  linkTo,
  isLoading,
  trend,
  trendPercentage,
  previousValue,
}: SummaryCardProps) {
  const getTrendArrow = () => {
    if (!trend || trend === 'neutral') return null;
    return trend === 'up' ? '↑' : '↓';
  };

  const getTrendColor = () => {
    if (!trend || trend === 'neutral') return styles.trendNeutral;
    return trend === 'up' ? styles.trendUp : styles.trendDown;
  };

  const formatTrendPercentage = () => {
    if (trendPercentage === undefined) return '';
    return Math.abs(trendPercentage).toFixed(0);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <p className={styles.cardLabel}>{label}</p>
        <p className={styles.cardValue}>{isLoading ? '—' : value}</p>

        {!isLoading && trend && trendPercentage !== undefined && previousValue !== undefined && (
          <p className={`${styles.cardTrend} ${getTrendColor()}`}>
            <span
              className={styles.trendIcon}
              aria-label={`${trend} ${formatTrendPercentage()} percent`}
            >
              {getTrendArrow()}
            </span>
            <span className={styles.trendText}>
              {formatTrendPercentage()}% vs. {previousValue} last week
            </span>
          </p>
        )}

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

  // Calculate tomorrow's date
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Fetch all engagements for smart alerts
  const { data: allEngagements = [] } = useQuery({
    queryKey: ['engagements'],
    queryFn: () => engagementsApi.list(),
  });

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

  // Fetch tomorrow's showtimes for smart alerts
  const { data: tomorrowShowtimes = [] } = useQuery({
    queryKey: ['showtimes', 'tomorrow', tomorrowStr],
    queryFn: () => showtimesApi.list({ date: tomorrowStr }),
  });

  // Generate smart alerts
  const alerts = useSmartAlerts({
    engagements: allEngagements,
    todayShowtimes,
    tomorrowShowtimes,
  });

  // Sort showtimes by time
  const sortedShowtimes = [...todayShowtimes].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const displayName = user?.first_name || user?.username || 'User';

  return (
    <div className={styles.dashboardHome}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.welcomeText}>Welcome back, {displayName}</p>
      </div>

      {/* Smart Alerts */}
      <AlertBanner alerts={alerts} />

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
          <div className={styles.emptyCard} role="status" aria-live="polite">
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
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
              🎬
            </div>
            <h3 className="empty-state-title">No Showtimes Today</h3>
            <p className="empty-state-description">
              Get started by creating an engagement and scheduling showtimes for your films.
            </p>
            <Link to="/engagements" className="btn btn-primary">
              View Engagements
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
