import { Link } from 'react-router-dom';
import styles from './Home.module.css';

interface Showtime {
  id: number;
  time: string;
  filmTitle: string;
  screenName: string;
}

interface SummaryCardProps {
  label: string;
  value: number;
  linkText?: string;
  linkTo?: string;
  subtitle?: string;
}

function SummaryCard({ label, value, linkText, linkTo, subtitle }: SummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardBody}>
        <p className={styles.cardLabel}>{label}</p>
        <p className={styles.cardValue}>{value}</p>
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

export default function Home() {
  // Mock data - in a real app this would come from an API
  const filmCount = 24;
  const activeEngagements = 8;
  const todayShowtimes = 12;

  const showtimes: Showtime[] = [
    { id: 1, time: '2:30 PM', filmTitle: 'Dune: Part Two', screenName: 'Screen 1' },
    { id: 2, time: '3:00 PM', filmTitle: 'Poor Things', screenName: 'Screen 2' },
    { id: 3, time: '5:15 PM', filmTitle: 'The Holdovers', screenName: 'Screen 3' },
    { id: 4, time: '6:00 PM', filmTitle: 'Dune: Part Two', screenName: 'Screen 1' },
    { id: 5, time: '7:30 PM', filmTitle: 'Oppenheimer', screenName: 'Screen 2' },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <SummaryCard
          label="Films in Catalog"
          value={filmCount}
          subtitle="Managed by admin"
        />
        <SummaryCard
          label="Active Engagements"
          value={activeEngagements}
          linkText="View all"
          linkTo="/engagements"
        />
        <SummaryCard
          label="Today's Showtimes"
          value={todayShowtimes}
          linkText="View engagements"
          linkTo="/engagements"
        />
      </div>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actions}>
          <Link to="/engagements/new" className={styles.btnCharcoal}>
            Schedule Engagement
          </Link>
        </div>
      </section>

      {/* Today's Schedule */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Now Playing</h2>
        {showtimes.length > 0 ? (
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
                  {showtimes.map((show) => (
                    <tr key={show.id}>
                      <td className={styles.timeCell}>{show.time}</td>
                      <td className={styles.filmCell}>{show.filmTitle}</td>
                      <td className={styles.screenCell}>{show.screenName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
