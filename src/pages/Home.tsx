// src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { filmsApi, engagementsApi, showtimesApi } from '../api';
import type { Showtime } from '../api/types';
import styles from './Home.module.css';

interface SummaryCardProps {
  label: string;
  value: number | string;
  linkText?: string;
  linkTo?: string;
  subtitle?: string;
  isLoading?: boolean;
}

function SummaryCard({ label, value, linkText, linkTo, subtitle, isLoading }: SummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <p className={styles.cardLabel}>{label}</p>
        <p className={styles.cardValue}>{isLoading ? '—' : value}</p>
        {linkTo && linkText ? (
          <Link to={linkTo} className={styles.cardLink}>
            {linkText} &rarr;
          </Link>
        ) : subtitle ? (
          <span className={styles.cardSubtitle}>{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}

function formatShowtime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export default function Home() {
  const today = getTodayDateString();

  // Fetch films count
  const { data: films = [], isLoading: filmsLoading } = useQuery({
    queryKey: ['films'],
    queryFn: () => filmsApi.list(),
  });

  // Fetch active (confirmed) engagements
  const { data: activeEngagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements', 'active'],
    queryFn: () => engagementsApi.list({ status: 'CONFIRMED' }),
  });

  // Fetch today's showtimes
  const { data: todayShowtimes = [], isLoading: showtimesLoading } = useQuery({
    queryKey: ['showtimes', 'today', today],
    queryFn: () => showtimesApi.list({ date: today, is_cancelled: false }),
  });

  // Sort showtimes by time
  const sortedShowtimes = [...todayShowtimes].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  return (
    <div>
      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <SummaryCard
          label="Films in Catalog"
          value={films.length}
          subtitle="Managed by admin"
          isLoading={filmsLoading}
        />
        <SummaryCard
          label="Active Engagements"
          value={activeEngagements.length}
          linkText="View all"
          linkTo="/dashboard/engagements"
          isLoading={engagementsLoading}
        />
        <SummaryCard
          label="Today's Showtimes"
          value={todayShowtimes.length}
          linkText="View showtimes"
          linkTo="/dashboard/showtimes"
          isLoading={showtimesLoading}
        />
      </div>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actions}>
          <Link to="/dashboard/engagements" className={styles.btnCharcoal}>
            Schedule Engagement
          </Link>
        </div>
      </section>

      {/* Today's Schedule */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Now Playing</h2>
        {showtimesLoading ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyText}>Loading showtimes...</p>
          </div>
        ) : sortedShowtimes.length > 0 ? (
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Film</th>
                    <th>Screen</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedShowtimes.map((show: Showtime) => (
                    <tr key={show.id}>
                      <td className={styles.timeCell}>{formatShowtime(show.starts_at)}</td>
                      <td className={styles.filmCell}>{show.film_title}</td>
                      <td className={styles.screenCell}>{show.screen_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <p className={styles.emptyText}>No showtimes scheduled for today.</p>
            <Link to="/dashboard/engagements" className={styles.emptyLink}>
              View engagements &rarr;
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
