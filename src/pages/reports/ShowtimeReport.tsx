// src/pages/reports/ShowtimeReport.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { engagementsApi, showtimesApi, reportsApi } from '../../api';
import type { ShowtimeStats } from '../../api/types';
import { downloadBlob } from './downloadBlob';
import styles from './Reports.module.css';

function formatCurrency(value: string): string {
  return `$${parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2v8M4 7l4 4 4-4M2 12v2h12v-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ShowtimeReport() {
  const [engagementId, setEngagementId] = useState<number | ''>('');
  const [showtimeId, setShowtimeId] = useState<number | ''>('');
  const [downloading, setDownloading] = useState(false);

  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements'],
    queryFn: () => engagementsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: showtimes = [], isLoading: showtimesLoading } = useQuery({
    queryKey: ['showtimes', { engagement: engagementId }],
    queryFn: () => showtimesApi.list({ engagement: engagementId as number }),
    enabled: engagementId !== '',
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['report', 'showtime', showtimeId],
    queryFn: () => reportsApi.getShowtimeStats(showtimeId as number),
    enabled: showtimeId !== '',
    staleTime: 5 * 60 * 1000,
  });

  const handleDownloadPdf = async () => {
    if (showtimeId === '') return;
    setDownloading(true);
    try {
      const response = await reportsApi.downloadShowtimePdf(showtimeId);
      downloadBlob(response, `showtime_${showtimeId}_report.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const renderStats = (data: ShowtimeStats) => (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Tickets</div>
          <div className={styles.statValue}>{data.total_tickets}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Gross Revenue</div>
          <div className={styles.statValue}>{formatCurrency(data.gross_revenue)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Capacity</div>
          <div className={styles.statValue}>{data.capacity}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Occupancy</div>
          <div className={styles.statValue}>{data.occupancy_pct.toFixed(1)}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Comped</div>
          <div className={styles.statValue}>{data.comped_count}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Scanned</div>
          <div className={styles.statValue}>{data.scanned_count}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Refunded</div>
          <div className={styles.statValue}>{data.refunded_count}</div>
        </div>
      </div>

      {data.by_ticket_type.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className={styles.tableWrapper}>
            <h3 className={styles.tableTitle}>Ticket Type Breakdown</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket Type</th>
                  <th className={styles.numericCell}>Count</th>
                  <th className={styles.numericCell}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.by_ticket_type.map((row) => (
                  <tr key={row.ticket_type__name}>
                    <td>{row.ticket_type__name}</td>
                    <td className={styles.numericCell}>{row.count}</td>
                    <td className={styles.numericCell}>{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className={styles.cardList}>
            {data.by_ticket_type.map((row) => (
              <div key={row.ticket_type__name} className={styles.card}>
                <div className={styles.cardHeader}>{row.ticket_type__name}</div>
                <div className={styles.cardBody}>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Count</span>
                    <span className={styles.cardValue}>{row.count}</span>
                  </div>
                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Revenue</span>
                    <span className={styles.cardValue}>{formatCurrency(row.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Showtime Report</h1>
          <p className={styles.subtitle}>View attendance and revenue for a single showtime.</p>
        </div>
        {stats && (
          <div className={styles.actionBar}>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadPdf}
              disabled={downloading}
              aria-label="Download showtime report as PDF"
            >
              <DownloadIcon />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label htmlFor="engagement-select">Engagement</label>
          <select
            id="engagement-select"
            className={styles.select}
            value={engagementId}
            onChange={(e) => {
              setEngagementId(e.target.value ? Number(e.target.value) : '');
              setShowtimeId('');
            }}
            disabled={engagementsLoading}
          >
            <option value="">Select an engagement</option>
            {engagements.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.film_title} ({eng.start_date} - {eng.end_date})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="showtime-select">Showtime</label>
          <select
            id="showtime-select"
            className={styles.select}
            value={showtimeId}
            onChange={(e) => setShowtimeId(e.target.value ? Number(e.target.value) : '')}
            disabled={engagementId === '' || showtimesLoading}
          >
            <option value="">Select a showtime</option>
            {showtimes.map((st) => (
              <option key={st.id} value={st.id}>
                {formatDateTime(st.starts_at)} - {st.screen_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statsLoading && <div className={styles.loading}>Loading statistics...</div>}

      {statsError && (
        <div className={styles.errorMessage}>
          Failed to load showtime statistics. Please try again.
        </div>
      )}

      {stats && renderStats(stats)}

      {!stats && !statsLoading && !statsError && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyStateTitle}>Select a Showtime</h3>
          <p className={styles.emptyStateDescription}>
            Choose an engagement and showtime above to view attendance and revenue statistics.
          </p>
        </div>
      )}
    </div>
  );
}
