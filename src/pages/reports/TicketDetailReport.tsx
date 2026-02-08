// src/pages/reports/TicketDetailReport.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { engagementsApi, reportsApi } from '../../api';
import type { ReportDateRangeParams } from '../../api/types';
import { downloadBlob } from './downloadBlob';
import styles from './Reports.module.css';

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M4 7l4 4 4-4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function TicketDetailReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [engagementId, setEngagementId] = useState<number | ''>('');
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [generated, setGenerated] = useState(false);

  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['engagements'],
    queryFn: () => engagementsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const canGenerate = startDate !== '' && endDate !== '';

  const buildParams = (): ReportDateRangeParams => {
    const params: ReportDateRangeParams = {
      start_date: startDate,
      end_date: endDate,
    };
    if (engagementId !== '') {
      params.engagement_id = engagementId;
    }
    return params;
  };

  const handleGenerate = () => {
    if (canGenerate) {
      setGenerated(true);
    }
  };

  const handleDownloadCsv = async () => {
    if (!canGenerate) return;
    setDownloadingCsv(true);
    try {
      const response = await reportsApi.downloadTicketsCsv(buildParams());
      downloadBlob(response, `tickets_${startDate}_${endDate}.csv`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canGenerate) return;
    setDownloadingPdf(true);
    try {
      const response = await reportsApi.downloadTicketsPdf(buildParams());
      downloadBlob(response, `tickets_${startDate}_${endDate}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ticket Detail</h1>
          <p className={styles.subtitle}>Export individual ticket records for a date range.</p>
        </div>
        {generated && (
          <div className={styles.actionBar}>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              aria-label="Download ticket detail report as CSV"
            >
              <DownloadIcon />
              {downloadingCsv ? 'Downloading...' : 'Download CSV'}
            </button>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              aria-label="Download ticket detail report as PDF"
            >
              <DownloadIcon />
              {downloadingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setGenerated(false);
            }}
          />
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setGenerated(false);
            }}
          />
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="engagement-filter">Engagement (optional)</label>
          <select
            id="engagement-filter"
            className={styles.select}
            value={engagementId}
            onChange={(e) => {
              setEngagementId(e.target.value ? Number(e.target.value) : '');
              setGenerated(false);
            }}
            disabled={engagementsLoading}
          >
            <option value="">All engagements</option>
            {engagements.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.film_title} ({eng.start_date} - {eng.end_date})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>&nbsp;</label>
          <button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            Generate Report
          </button>
        </div>
      </div>

      {generated ? (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyStateTitle}>Report Ready</h3>
          <p className={styles.emptyStateDescription}>
            Use the download buttons above to export your ticket detail report as CSV or PDF.
            The report covers {startDate} through {endDate}.
          </p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyStateTitle}>Configure Your Report</h3>
          <p className={styles.emptyStateDescription}>
            Select a date range and optionally filter by engagement, then click
            Generate Report to prepare your export.
          </p>
        </div>
      )}
    </div>
  );
}
