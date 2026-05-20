import { useEffect, useRef, useState } from 'react';
import styles from './DrivePreviewModal.module.css';
import { useLanguage } from '../i18n';
import useFocusTrap from '../hooks/useFocusTrap';
import { getTransactionHistoryUpdatedAt } from '../utils/transactionStorage';

const text = {
  zh: {
    title: 'Google Drive 備份資料',
    loading: '讀取中…',
    noData: 'Drive 上沒有備份資料',
    driveModified: 'Drive 更新時間',
    localModified: '本地更新時間',
    newer: '(較新)',
    syncToDrive: '同步到 Drive',
    syncToLocal: '從 Drive 同步',
    records: '筆記錄',
    colStock: '股票代碼',
    colName: '名稱',
    colDate: '日期',
    colQty: '數量',
    colPrice: '價格',
    colType: '類型',
    buy: '買入',
    sell: '賣出',
    close: '關閉',
    tabDrive: 'Drive',
    tabLocal: '本地',
  },
  en: {
    title: 'Google Drive Backup',
    loading: 'Loading…',
    noData: 'No backup found on Drive',
    driveModified: 'Drive updated',
    localModified: 'Local updated',
    newer: '(newer)',
    syncToDrive: 'Sync to Drive',
    syncToLocal: 'Sync from Drive',
    records: 'records',
    colStock: 'Stock ID',
    colName: 'Name',
    colDate: 'Date',
    colQty: 'Qty',
    colPrice: 'Price',
    colType: 'Type',
    buy: 'Buy',
    sell: 'Sell',
    close: 'Close',
    tabDrive: 'Drive',
    tabLocal: 'Local',
  },
};

function isTW(row) {
  if (row.country) return row.country.toUpperCase() === 'TW';
  return /^\d/.test(row.stock_id || '');
}

function StockTable({ rows, label, t, styles: s }) {
  return (
    <div className={s.splitCol}>
      <div className={s.splitLabel}>{label} ({rows.length})</div>
      <div className={s.tableWrap}>
        <table className={s.table} aria-label={label}>
          <thead>
            <tr>
              <th scope="col">{t.colStock}</th>
              <th scope="col">{t.colDate}</th>
              <th scope="col">{t.colQty}</th>
              <th scope="col">{t.colPrice}</th>
              <th scope="col">{t.colType}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.stock_id}</td>
                <td>{row.date}</td>
                <td>{row.quantity}</td>
                <td>{row.price}</td>
                <td>{row.type === 'sell' ? t.sell : t.buy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionTable({ list, t, styles: s }) {
  const sorted = [...list].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  const tw = sorted.filter(isTW);
  const us = sorted.filter(r => !isTW(r));

  return (
    <div className={s.splitWrap}>
      <StockTable rows={tw} label="🇹🇼 台股" t={t} styles={s} />
      <StockTable rows={us} label="🇺🇸 美股" t={t} styles={s} />
    </div>
  );
}

export default function DrivePreviewModal({ show, onClose, data, loading, localList, onSyncToDrive, onSyncFromDrive }) {
  const { lang } = useLanguage();
  const t = text[lang] || text.zh;
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
  const closeRef = useRef(null);
  const modalRef = useRef(null);
  const titleId = 'drive-preview-title';
  const [activeTab, setActiveTab] = useState('drive');
  useFocusTrap(modalRef, show);

  useEffect(() => {
    if (!show) return;
    setActiveTab('drive');
    closeRef.current?.focus();
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const driveList = data?.list ?? null;
  const modifiedTime = data?.modifiedTime ?? null;
  const localUpdatedAt = getTransactionHistoryUpdatedAt();
  const driveTimeStr = modifiedTime ? new Date(modifiedTime).toLocaleString(locale) : '—';
  const localTimeStr = localUpdatedAt ? new Date(localUpdatedAt).toLocaleString(locale) : '—';
  const driveIsNewer = modifiedTime && localUpdatedAt && modifiedTime > localUpdatedAt;
  const localIsNewer = modifiedTime && localUpdatedAt && localUpdatedAt > modifiedTime;
  const localCount = localList?.length ?? 0;
  const driveCount = driveList?.length ?? 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={modalRef}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{t.title}</h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t.close}
          >✕</button>
        </div>

        {loading && <p className={styles.status}>{t.loading}</p>}

        {!loading && driveList === null && (
          <p className={styles.status}>{t.noData}</p>
        )}

        {!loading && driveList !== null && (
          <>
            <table className={styles.tsMeta}>
              <tbody>
                <tr>
                  <td className={styles.tsLabel}>{t.driveModified}</td>
                  <td className={styles.tsValue}>
                    {driveTimeStr}
                    {driveIsNewer && <span className={styles.tsNewer}> {t.newer}</span>}
                  </td>
                </tr>
                <tr>
                  <td className={styles.tsLabel}>{t.localModified}</td>
                  <td className={styles.tsValue}>
                    {localTimeStr}
                    {localIsNewer && <span className={styles.tsNewer}> {t.newer}</span>}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className={styles.tabs} role="tablist" aria-label="資料來源">
              <button
                role="tab"
                type="button"
                aria-selected={activeTab === 'drive'}
                aria-controls="tab-panel-drive"
                className={`${styles.tab}${activeTab === 'drive' ? ` ${styles.tabActive}` : ''}`}
                onClick={() => setActiveTab('drive')}
              >
                {t.tabDrive} ({driveCount})
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={activeTab === 'local'}
                aria-controls="tab-panel-local"
                className={`${styles.tab}${activeTab === 'local' ? ` ${styles.tabActive}` : ''}`}
                onClick={() => setActiveTab('local')}
              >
                {t.tabLocal} ({localCount})
              </button>
            </div>

            <div id="tab-panel-drive" role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'drive'}>
              <TransactionTable list={driveList} t={t} styles={styles} />
            </div>
            <div id="tab-panel-local" role="tabpanel" className={styles.tabPanel} hidden={activeTab !== 'local'}>
              <TransactionTable list={localList ?? []} t={t} styles={styles} />
            </div>
          </>
        )}

        <div className={styles.footer}>
          {!loading && driveList !== null && localIsNewer && onSyncToDrive && (
            <button type="button" className={styles.syncButton} onClick={() => { onSyncToDrive(); onClose(); }}>
              {t.syncToDrive}
            </button>
          )}
          {!loading && driveList !== null && driveIsNewer && onSyncFromDrive && (
            <button type="button" className={styles.syncButton} onClick={() => { onSyncFromDrive(); onClose(); }}>
              {t.syncToLocal}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
