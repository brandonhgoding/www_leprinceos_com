// src/pages/MembershipDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipsApi } from '../api/memberships';
import type { MembershipStatus } from '../api/types';
import styles from './MembershipDetail.module.css';

export default function MembershipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const membershipId = parseInt(id!);

  // Queries
  const { data: membership, isLoading } = useQuery({
    queryKey: ['memberships', membershipId],
    queryFn: () => membershipsApi.get(membershipId),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['memberships', membershipId, 'allocations'],
    queryFn: () => membershipsApi.getAllocations(membershipId),
    enabled: !!membership,
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ['memberships', membershipId, 'redemptions'],
    queryFn: () => membershipsApi.getRedemptions(membershipId),
    enabled: !!membership,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['memberships', membershipId, 'audit-log'],
    queryFn: () => membershipsApi.getAuditLog(membershipId),
    enabled: !!membership,
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: () => membershipsApi.activate(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', membershipId] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const renewMutation = useMutation({
    mutationFn: () => membershipsApi.renew(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', membershipId] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (notes?: string) => membershipsApi.cancel(membershipId, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', membershipId] });
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  // Handlers
  const handleActivate = () => {
    if (window.confirm('Activate this membership?')) {
      activateMutation.mutate();
    }
  };

  const handleRenew = () => {
    if (window.confirm('Renew this membership? A new membership will be created.')) {
      renewMutation.mutate();
    }
  };

  const handleCancel = () => {
    const notes = window.prompt('Cancel this membership?\n\nOptional cancellation notes:');
    if (notes !== null) {
      cancelMutation.mutate(notes || undefined);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  const getStatusClass = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE':
        return styles.statusActive;
      case 'PENDING':
        return styles.statusPending;
      case 'EXPIRED':
        return styles.statusExpired;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading membership details...</div>;
  }

  if (!membership) {
    return <div className={styles.error}>Membership not found</div>;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} onClick={() => navigate('/memberships')}>
            ← Back to Memberships
          </button>
          <h1 className={styles.title}>{membership.member_name}</h1>
          <p className={styles.subtitle}>
            {membership.tier_name} Membership
            <span
              className={`${styles.statusBadge} ${getStatusClass(membership.status)}`}
              style={{ marginLeft: '1rem' }}
            >
              {membership.status_display}
            </span>
          </p>
        </div>
        <div className={styles.actions}>
          {membership.status === 'PENDING' && (
            <button
              className={styles.activateButton}
              onClick={handleActivate}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? 'Activating...' : 'Activate'}
            </button>
          )}
          {membership.status === 'ACTIVE' && (
            <>
              <button
                className={styles.primaryButton}
                onClick={handleRenew}
                disabled={renewMutation.isPending}
              >
                {renewMutation.isPending ? 'Renewing...' : 'Renew'}
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Membership'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {/* Membership Info Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Membership Details</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Member</div>
              <div className={styles.infoValue}>
                <button
                  className={styles.linkButton}
                  onClick={() => navigate(`/members/${membership.member}`)}
                >
                  {membership.member_name}
                </button>
                <div className={styles.memberEmail}>{membership.member_email}</div>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Tier</div>
              <div className={styles.infoValue}>{membership.tier_name}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Start Date</div>
              <div className={styles.infoValue}>{formatDate(membership.start_date)}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>End Date</div>
              <div className={styles.infoValue}>{formatDate(membership.end_date)}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Price Paid</div>
              <div className={styles.infoValue}>{formatPrice(membership.price_paid)}</div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Created</div>
              <div className={styles.infoValue}>{formatDate(membership.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Benefit Allocations Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Benefit Allocations</h2>
          {allocations.length === 0 ? (
            <p className={styles.emptyMessage}>
              No benefit allocations yet. Allocations are created when the membership is
              activated.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Benefit</th>
                    <th>Period</th>
                    <th>Dates</th>
                    <th>Usage</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className={styles.benefitName}>{allocation.benefit_name}</td>
                      <td>{allocation.period_type}</td>
                      <td className={styles.dates}>
                        {formatDate(allocation.period_start)} –{' '}
                        {formatDate(allocation.period_end)}
                      </td>
                      <td>
                        <span
                          className={allocation.is_exhausted ? styles.exhausted : ''}
                        >
                          {allocation.quantity_used} / {allocation.quantity_allocated}
                        </span>
                      </td>
                      <td>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: `${
                                (allocation.quantity_used / allocation.quantity_allocated) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className={styles.remaining}>
                          {allocation.quantity_remaining} remaining
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Redemption History Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Redemption History</h2>
          {redemptions.length === 0 ? (
            <p className={styles.emptyMessage}>
              No redemptions yet. Benefits will appear here when redeemed at checkout.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Benefit</th>
                    <th>Discount</th>
                    <th>Quantity</th>
                    <th>Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((redemption) => (
                    <tr key={redemption.id}>
                      <td>{formatDateTime(redemption.redeemed_at)}</td>
                      <td className={styles.benefitName}>{redemption.benefit_name}</td>
                      <td className={styles.discount}>
                        {formatPrice(redemption.discount_amount)}
                      </td>
                      <td>{redemption.quantity_redeemed}</td>
                      <td>
                        {redemption.sale ? (
                          <span className={styles.saleLink}>Sale #{redemption.sale}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Log Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Audit Log</h2>
          {auditLog.length === 0 ? (
            <p className={styles.emptyMessage}>No audit log entries.</p>
          ) : (
            <div className={styles.auditLog}>
              {auditLog.map((entry) => (
                <div key={entry.id} className={styles.auditEntry}>
                  <div className={styles.auditHeader}>
                    <div className={styles.auditAction}>{entry.action_display}</div>
                    <div className={styles.auditTime}>{formatDateTime(entry.performed_at)}</div>
                  </div>
                  {entry.performed_by_username && (
                    <div className={styles.auditUser}>
                      By: {entry.performed_by_username}
                    </div>
                  )}
                  {entry.notes && <div className={styles.auditNotes}>{entry.notes}</div>}
                  {(entry.old_value || entry.new_value) && (
                    <div className={styles.auditChange}>
                      {entry.old_value && (
                        <span className={styles.oldValue}>
                          Was: {entry.old_value}
                        </span>
                      )}
                      {entry.new_value && (
                        <span className={styles.newValue}>Now: {entry.new_value}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
