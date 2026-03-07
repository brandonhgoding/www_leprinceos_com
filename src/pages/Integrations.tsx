import styles from './Integrations.module.css';

export default function Integrations() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Integrations</h1>
          <p className={styles.subtitle}>Connect your cinema to external services</p>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.empty}>No integrations available.</div>
      </div>
    </div>
  );
}
