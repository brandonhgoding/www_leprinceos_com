// src/pages/reports/EngagementReport.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { engagementsApi, reportsApi } from '../../api';
import type { EngagementStats, ShowtimeStatsNested } from '../../api/types';
import { downloadBlob } from './downloadBlob';
import styles from './Reports.module.css';

type SortField = 'starts_at' | 'total_tickets' | 'gross_revenue' | 'occupancy_pct';
type SortDirection = 'asc' | 'desc';

function formatCurrency(value: string): string {
  return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    <path d="M8 2v8M4 7l4 4 4-4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function EngagementReport() {
  const [engagementId, setEngagementId] = useState<number | ''>('');
  const [sortField, setSortField] = useState<SortField>('starts_at');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [downloading, setDownloading] = useState(false);

  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements'],
    queryFn: () => engagementsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['report', 'engagement', engagementId],
    queryFn: () => reportsApi.getEngagementStats(engagementId as number),
    enabled: engagementId !== '',
    staleTime: 5 * 60 * 1000,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className={styles.sortIndicator}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  const sortedShowtimes = useMemo(() => {
    if (!stats) return [];
    const rows = [...stats.showtimes];
    rows.sort((a: ShowtimeStatsNested, b: ShowtimeStatsNested) => {
      let cmp = 0;
      switch (sortField) {
        case 'starts_at':
          cmp = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
          break;
        case 'total_tickets':
          cmp = a.stats.total_tickets - b.stats.total_tickets;
          break;
        case 'gross_revenue':
          cmp = parseFloat(a.stats.gross_revenue) - parseFloat(b.stats.gross_revenue);
          break;
        case 'occupancy_pct':
          cmp = a.stats.occupancy_pct - b.stats.occupancy_pct;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [stats, sortField, sortDir]);

  const handleDownloadPdf = async () => {
    if (engagementId === '') return;
    setDownloading(true);
    try {
      const response = await reportsApi.downloadEngagementPdf(engagementId);
      downloadBlob(response, `engagement_${engagementId}_report.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const renderStats = (data: EngagementStats) => (
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
          <div className={styles.statLabel}>Showtimes</div>
          <div className={styles.statValue}>{data.showtime_count}</div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className={styles.tableWrapper}>
        <h3 className={styles.tableTitle}>Per-Showtime Breakdown</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('starts_at')}>
                Date / Time{sortIndicator('starts_at')}
              </th>
              <th>Screen</th>
              <th className={styles.numericCell} onClick={() => handleSort('total_tickets')}>
                Tickets{sortIndicator('total_tickets')}
              </th>
              <th className={styles.numericCell} onClick={() => handleSort('gross_revenue')}>
                Revenue{sortIndicator('gross_revenue')}
              </th>
              <th className={styles.numericCell} onClick={() => handleSort('occupancy_pct')}>
                Occupancy{sortIndicator('occupancy_pct')}
              </th>
              <th className={styles.numericCell}>Comped</th>
              <th className={styles.numericCell}>Scanned</th>
              <th className={styles.numericCell}>Refunded</th>
            </tr>
          </thead>
          <tbody>
            {sortedShowtimes.map((row) => (
              <tr key={row.showtime_id}>
                <td>{formatDateTime(row.starts_at)}</td>
                <td>{row.screen_name}</td>
                <td className={styles.numericCell}>{row.stats.total_tickets}</td>
                <td className={styles.numericCell}>{formatCurrency(row.stats.gross_revenue)}</td>
                <td className={styles.numericCell}>{row.stats.occupancy_pct.toFixed(1)}%</td>
                <td className={styles.numericCell}>{row.stats.comped_count}</td>
                <td className={styles.numericCell}>{row.stats.scanned_count}</td>
                <td className={styles.numericCell}>{row.stats.refunded_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={styles.cardList}>
        {sortedShowtimes.map((row) => (
          <div key={row.showtime_id} className={styles.card}>
            <div className={styles.cardHeader}>
              {formatDateTime(row.starts_at)} - {row.screen_name}
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Tickets</span>
                <span className={styles.cardValue}>{row.stats.total_tickets}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Revenue</span>
                <span className={styles.cardValue}>{formatCurrency(row.stats.gross_revenue)}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Occupancy</span>
                <span className={styles.cardValue}>{row.stats.occupancy_pct.toFixed(1)}%</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Comped</span>
                <span className={styles.cardValue}>{row.stats.comped_count}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Scanned</span>
                <span className={styles.cardValue}>{row.stats.scanned_count}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Refunded</span>
                <span className={styles.cardValue}>{row.stats.refunded_count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Engagement Report</h1>
          <p className={styles.subtitle}>Aggregate statistics across all showtimes in an engagement.</p>
        </div>
        {stats && (
          <div className={styles.actionBar}>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadPdf}
              disabled={downloading}
              aria-label="Download engagement report as PDF"
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
            onChange={(e) => setEngagementId(e.target.value ? Number(e.target.value) : '')}
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
      </div>

      {statsLoading && <div className={styles.loading}>Loading statistics...</div>}

      {statsError && (
        <div className={styles.errorMessage}>
          Failed to load engagement statistics. Please try again.
        </div>
      )}

      {stats && renderStats(stats)}

      {!stats && !statsLoading && !statsError && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyStateTitle}>Select an Engagement</h3>
          <p className={styles.emptyStateDescription}>
            Choose an engagement above to view aggregate revenue and attendance statistics.
          </p>
        </div>
      )}
    </div>
  );
}
