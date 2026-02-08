// src/pages/reports/EngagementSummaryReport.tsx
import { useState } from 'react';
import { reportsApi } from '../../api';
import { downloadBlob } from './downloadBlob';
import styles from './Reports.module.css';

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M4 7l4 4 4-4M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function EngagementSummaryReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [generated, setGenerated] = useState(false);

  const canGenerate = startDate !== '' && endDate !== '';

  const buildParams = () => ({
    start_date: startDate,
    end_date: endDate,
  });

  const handleGenerate = () => {
    if (canGenerate) {
      setGenerated(true);
    }
  };

  const handleDownloadCsv = async () => {
    if (!canGenerate) return;
    setDownloadingCsv(true);
    try {
      const response = await reportsApi.downloadSummaryCsv(buildParams());
      downloadBlob(response, `summary_${startDate}_${endDate}.csv`);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canGenerate) return;
    setDownloadingPdf(true);
    try {
      const response = await reportsApi.downloadSummaryPdf(buildParams());
      downloadBlob(response, `summary_${startDate}_${endDate}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Engagement Summary</h1>
          <p className={styles.subtitle}>Aggregated ticket sales by engagement for a date range.</p>
        </div>
        {generated && (
          <div className={styles.actionBar}>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              aria-label="Download engagement summary as CSV"
            >
              <DownloadIcon />
              {downloadingCsv ? 'Downloading...' : 'Download CSV'}
            </button>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              aria-label="Download engagement summary as PDF"
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
            Use the download buttons above to export your engagement summary as CSV or PDF.
            The report covers {startDate} through {endDate}.
          </p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyStateTitle}>Configure Your Report</h3>
          <p className={styles.emptyStateDescription}>
            Select a date range and click Generate Report to prepare your engagement summary export.
          </p>
        </div>
      )}
    </div>
  );
}
