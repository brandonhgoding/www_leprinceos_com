// src/pages/Inventory.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api';
import type { ConcessionInventory, InventoryAdjustmentCreate } from '../api/types';
import Drawer from '../components/Drawer';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import styles from './Inventory.module.css';

type Tab = 'stock' | 'history';
type AdjustmentReason = InventoryAdjustmentCreate['reason'];

interface AdjustFormData {
  quantity_change: string;
  reason: AdjustmentReason;
  notes: string;
}

const initialAdjustForm: AdjustFormData = {
  quantity_change: '',
  reason: 'RECEIVED',
  notes: '',
};

const reasonOptions: { value: AdjustmentReason; label: string }[] = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'WASTE', label: 'Waste' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'OTHER', label: 'Other' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatChange(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConcessionInventory | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustFormData>(initialAdjustForm);

  // Queries
  const { data: inventory = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['inventory-history'],
    queryFn: () => inventoryApi.history(),
    enabled: activeTab === 'history',
  });

  // Mutations
  const adjustMutation = useMutation({
    mutationFn: (data: InventoryAdjustmentCreate) => inventoryApi.adjust(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
      closeDrawer();
      addToast('Inventory adjusted successfully.');
    },
    onError: (error) => addToast(getErrorMessage(error, 'Failed to adjust inventory.')),
  });

  // Handlers
  const openAdjustDrawer = (item: ConcessionInventory) => {
    setSelectedItem(item);
    setAdjustForm(initialAdjustForm);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedItem(null);
    setAdjustForm(initialAdjustForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem || adjustForm.quantity_change === '') return;

    const quantityChange = parseInt(adjustForm.quantity_change, 10);
    if (isNaN(quantityChange) || quantityChange === 0) return;

    const data: InventoryAdjustmentCreate = {
      variation_id: selectedItem.variation,
      quantity_change: quantityChange,
      reason: adjustForm.reason,
      notes: adjustForm.notes || undefined,
    };

    adjustMutation.mutate(data);
  };

  const getStatusBadge = (item: ConcessionInventory) => {
    if (!item.track_inventory) {
      return <span className={`${styles.statusBadge} ${styles.stockUntracked}`}>Not tracked</span>;
    }
    if (item.is_out_of_stock) {
      return <span className={`${styles.statusBadge} ${styles.stockOut}`}>Out</span>;
    }
    if (item.is_low_stock) {
      return <span className={`${styles.statusBadge} ${styles.stockLow}`}>Low</span>;
    }
    return <span className={`${styles.statusBadge} ${styles.stockOk}`}>OK</span>;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory</h1>
          <p className={styles.subtitle}>Track stock levels and make adjustments.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'stock' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Levels
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* Stock Levels Tab */}
      {activeTab === 'stock' && (
        <>
          {isLoadingStock ? (
            <div className={styles.loading} role="status" aria-live="polite">
              Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className={styles.empty}>
              <h3>No Inventory Items</h3>
              <p>
                Inventory records will appear here once concession items with variations are
                created.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Variation</th>
                      <th>On Hand</th>
                      <th>Threshold</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.itemName}>{item.item_name}</td>
                        <td>{item.variation_name}</td>
                        <td className={styles.quantity}>{item.quantity_on_hand}</td>
                        <td>{item.low_stock_threshold}</td>
                        <td>{getStatusBadge(item)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => openAdjustDrawer(item)}
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className={styles.cardList}>
                {inventory.map((item) => (
                  <div key={item.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.cardTitle}>{item.item_name}</h3>
                        <span className={styles.quantity}>{item.quantity_on_hand}</span>
                      </div>
                      <p className={styles.cardSubtitle}>{item.variation_name}</p>
                      <div className={styles.cardBadges}>
                        {getStatusBadge(item)}
                        <span className={styles.cardMeta}>
                          Threshold: {item.low_stock_threshold}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => openAdjustDrawer(item)}
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {isLoadingHistory ? (
            <div className={styles.loading} role="status" aria-live="polite">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className={styles.empty}>
              <h3>No Adjustment History</h3>
              <p>Inventory adjustments will appear here once stock levels are modified.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item / Variation</th>
                      <th>Change</th>
                      <th>Reason</th>
                      <th>Notes</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((adj) => (
                      <tr key={adj.id}>
                        <td>{formatDate(adj.created_at)}</td>
                        <td className={styles.itemName}>Variation #{adj.variation}</td>
                        <td>
                          <span
                            className={adj.quantity_change > 0 ? styles.positive : styles.negative}
                          >
                            {formatChange(adj.quantity_change)}
                          </span>
                        </td>
                        <td>{adj.reason_display}</td>
                        <td>{adj.notes || '\u2014'}</td>
                        <td>{adj.adjusted_by_username || '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className={styles.cardList}>
                {history.map((adj) => (
                  <div key={adj.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.cardTitle}>{adj.reason_display}</h3>
                        <span
                          className={`${styles.cardChange} ${
                            adj.quantity_change > 0 ? styles.positive : styles.negative
                          }`}
                        >
                          {formatChange(adj.quantity_change)}
                        </span>
                      </div>
                      <p className={styles.cardSubtitle}>Variation #{adj.variation}</p>
                      <div className={styles.cardMeta}>
                        <span>{formatDate(adj.created_at)}</span>
                        {adj.adjusted_by_username && <span>by {adj.adjusted_by_username}</span>}
                      </div>
                      {adj.notes && <p className={styles.cardNotes}>{adj.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Adjust Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title="Adjust Inventory"
        footer={
          <>
            <button type="button" className={styles.cancelButton} onClick={closeDrawer}>
              Cancel
            </button>
            <button
              type="submit"
              form="adjust-form"
              className={styles.submitButton}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? 'Saving...' : 'Save Adjustment'}
            </button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Item</label>
            <div className={styles.formInfo}>
              {selectedItem?.item_name} &mdash; {selectedItem?.variation_name}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="adjust-quantity">Quantity Change</label>
            <input
              id="adjust-quantity"
              type="number"
              value={adjustForm.quantity_change}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
              required
              className={styles.input}
              placeholder="e.g., 10 or -3"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="adjust-reason">Reason</label>
            <select
              id="adjust-reason"
              value={adjustForm.reason}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, reason: e.target.value as AdjustmentReason })
              }
              className={styles.select}
            >
              {reasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="adjust-notes">Notes</label>
            <textarea
              id="adjust-notes"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              className={styles.textarea}
              placeholder="Optional notes about this adjustment"
              rows={3}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
