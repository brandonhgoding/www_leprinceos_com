// src/pages/OnlineOrders.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import onlineOrdersApi from '../api/onlineOrders';
import type { OnlineOrderSummary, OnlineOrderDetail, OrderStatus, OnlineOrderFilters } from '../api/onlineOrders';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './OnlineOrders.module.css';

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

function getStatusClass(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING: styles.statusPending,
    PAID: styles.statusPaid,
    CONFIRMED: styles.statusConfirmed,
    EXPIRED: styles.statusExpired,
    CANCELLED: styles.statusCancelled,
    REFUNDED: styles.statusRefunded,
  };
  return map[status] ?? '';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function formatShowtime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function OnlineOrders() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [page, setPage] = useState(1);

  // Detail drawer
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  // Build filter params
  const filters: OnlineOrderFilters = {
    page,
    ...(statusFilter && { status: statusFilter }),
    ...(searchTerm && { search: searchTerm }),
    ...(dateAfter && { created_after: `${dateAfter}T00:00:00` }),
    ...(dateBefore && { created_before: `${dateBefore}T23:59:59` }),
  };

  // Queries
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['online-orders', filters],
    queryFn: () => onlineOrdersApi.list(filters),
  });

  const { data: orderDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['online-order', selectedOrderId],
    queryFn: () => onlineOrdersApi.get(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      onlineOrdersApi.refund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-orders'] });
      queryClient.invalidateQueries({ queryKey: ['online-order', selectedOrderId] });
      setShowRefundConfirm(false);
      setRefundReason('');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to process refund.')),
  });

  const orders = ordersData?.results ?? [];
  const totalCount = ordersData?.count ?? 0;
  const hasNext = ordersData?.next !== null;
  const hasPrev = ordersData?.previous !== null;

  const openDetail = (order: OnlineOrderSummary) => {
    setSelectedOrderId(order.id);
    setShowRefundConfirm(false);
    setRefundReason('');
    refundMutation.reset();
  };

  const closeDetail = () => {
    setSelectedOrderId(null);
    setShowRefundConfirm(false);
    setRefundReason('');
    refundMutation.reset();
  };

  const handleRefund = () => {
    if (selectedOrderId === null) return;
    refundMutation.mutate({ id: selectedOrderId, reason: refundReason });
  };

  const canRefund = (detail: OnlineOrderDetail): boolean => {
    return detail.status === 'CONFIRMED' || detail.status === 'PAID';
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Online Orders</h1>
          <p className={styles.subtitle}>View and manage online ticket purchases.</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="orders-search">Search</label>
          <input
            id="orders-search"
            type="text"
            placeholder="Name, email, or confirmation #"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="orders-status">Status</label>
          <select
            id="orders-status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}
            className={styles.filterSelect}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="orders-date-from">From</label>
          <input
            id="orders-date-from"
            type="date"
            value={dateAfter}
            onChange={(e) => { setDateAfter(e.target.value); setPage(1); }}
            className={styles.filterDate}
          />
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="orders-date-to">To</label>
          <input
            id="orders-date-to"
            type="date"
            value={dateBefore}
            onChange={(e) => { setDateBefore(e.target.value); setPage(1); }}
            className={styles.filterDate}
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className={styles.loading}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>
            🛒
          </div>
          <h3 className="empty-state-title">
            {searchTerm || statusFilter || dateAfter || dateBefore
              ? 'No Orders Found'
              : 'No Online Orders Yet'}
          </h3>
          <p className="empty-state-description">
            {searchTerm || statusFilter || dateAfter || dateBefore
              ? 'Try adjusting your filters.'
              : 'Online orders will appear here once customers start purchasing tickets.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Confirmation #</th>
                  <th>Customer</th>
                  <th>Film / Showtime</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const st = formatShowtime(order.showtime_starts_at);
                  return (
                    <tr key={order.id} onClick={() => openDetail(order)}>
                      <td className={styles.confirmationNumber}>{order.confirmation_number}</td>
                      <td>
                        <div className={styles.customerName}>{order.customer_name}</div>
                      </td>
                      <td>
                        <div className={styles.filmInfo}>{order.film_title}</div>
                        <div className={styles.filmInfoSub}>
                          {st.date} {st.time} &middot; {order.screen_name}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className={styles.amount}>${order.total_amount}</td>
                      <td className={styles.dateCell}>{formatDate(order.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className={styles.pagination}>
              <span>{totalCount} order{totalCount !== 1 ? 's' : ''}</span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.pageButton}
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className={styles.pageButton}
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className={styles.cardList}>
            {orders.map((order) => {
              const st = formatShowtime(order.showtime_starts_at);
              return (
                <div key={order.id} className={styles.card} onClick={() => openDetail(order)}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{order.customer_name}</h3>
                      <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {order.film_title} &middot; {st.date} {st.time}
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.confirmationNumber}>{order.confirmation_number}</span>
                    <span className={styles.amount}>${order.total_amount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Order Detail Drawer */}
      <Drawer
        isOpen={selectedOrderId !== null}
        onClose={closeDetail}
        title={orderDetail ? `Order ${orderDetail.confirmation_number}` : 'Order Details'}
      >
        {isLoadingDetail ? (
          <div className={styles.loading}>Loading order details...</div>
        ) : orderDetail ? (
          <>
            {/* Status */}
            <div className={styles.detailSection}>
              <span className={`${styles.statusBadge} ${getStatusClass(orderDetail.status)}`}>
                {orderDetail.status}
              </span>
            </div>

            {/* Customer Info */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Customer</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Name</span>
                <span className={styles.detailValue}>{orderDetail.customer_name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{orderDetail.customer_email}</span>
              </div>
              {orderDetail.customer_phone && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Phone</span>
                  <span className={styles.detailValue}>{orderDetail.customer_phone}</span>
                </div>
              )}
            </div>

            {/* Showtime Details */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Showtime</h4>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Film</span>
                <span className={styles.detailValue}>{orderDetail.film_title}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date/Time</span>
                <span className={styles.detailValue}>
                  {formatDateTime(orderDetail.showtime_starts_at)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Screen</span>
                <span className={styles.detailValue}>{orderDetail.screen_name}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Items</h4>
              {orderDetail.items.map((item) => (
                <div className={styles.detailRow} key={item.id}>
                  <span className={styles.detailLabel}>
                    {item.quantity}x {item.ticket_type_name}
                  </span>
                  <span className={styles.detailValue}>${item.line_total}</span>
                </div>
              ))}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Subtotal</span>
                <span className={styles.detailValue}>${orderDetail.subtotal}</span>
              </div>
              {orderDetail.tax_amount !== '0.00' && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Tax</span>
                  <span className={styles.detailValue}>${orderDetail.tax_amount}</span>
                </div>
              )}
              <div className={`${styles.detailRow} ${styles.detailTotal}`}>
                <span className={styles.detailLabel}>Total</span>
                <span className={styles.detailValue}>${orderDetail.total_amount}</span>
              </div>
            </div>

            {/* Payment Info */}
            {orderDetail.square_payment_id && (
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Payment</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Square Payment ID</span>
                  <span className={styles.detailValue} style={{ fontSize: '0.8125rem' }}>
                    {orderDetail.square_payment_id}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>${orderDetail.total_amount}</span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Timeline</h4>
              <div className={styles.timelineItem}>
                <span className={styles.timelineLabel}>Created</span>
                <span className={styles.timelineValue}>{formatDateTime(orderDetail.created_at)}</span>
              </div>
              {orderDetail.updated_at !== orderDetail.created_at && (
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Last Updated</span>
                  <span className={styles.timelineValue}>{formatDateTime(orderDetail.updated_at)}</span>
                </div>
              )}
              {orderDetail.expires_at && (
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Expires</span>
                  <span className={styles.timelineValue}>{formatDateTime(orderDetail.expires_at)}</span>
                </div>
              )}
            </div>

            {/* Refund Action */}
            {canRefund(orderDetail) && (
              <div className={styles.detailSection}>
                {refundMutation.isError && (
                  <div className={styles.errorMsg}>
                    {refundMutation.error instanceof Error
                      ? refundMutation.error.message
                      : 'Refund failed. Please try again.'}
                  </div>
                )}

                {!showRefundConfirm ? (
                  <button
                    className={styles.refundButton}
                    onClick={() => setShowRefundConfirm(true)}
                  >
                    Issue Refund
                  </button>
                ) : (
                  <div className={styles.refundConfirm}>
                    <p className={styles.refundConfirmTitle}>Confirm Refund</p>
                    <p className={styles.refundConfirmText}>
                      This will refund ${orderDetail.total_amount} to the customer's card via Square.
                      This action cannot be undone.
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for refund (optional)"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className={styles.refundReasonInput}
                    />
                    <div className={styles.refundActions}>
                      <button
                        className={styles.refundConfirmButton}
                        onClick={handleRefund}
                        disabled={refundMutation.isPending}
                      >
                        {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
                      </button>
                      <button
                        className={styles.refundCancelButton}
                        onClick={() => { setShowRefundConfirm(false); setRefundReason(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </Drawer>
    </div>
  );
}
