import { useRef } from 'react';
import useClickOutside from './useClickOutside';
import styles from '../InventoryTab.module.css';
import { useLanguage } from '../i18n';

export default function DataDropdown({
  onClose,
  handleImportClick,
  handleExportClick,
  selectedSource,
  onSelectChange,
  driveConnected,
  driveStatus,
  onConnectDrive,
  onViewDriveData
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const text = {
    zh: {
      selectLabel: '存取方式',
      importText: '匯入 CSV',
      exportText: '匯出 CSV',
      driveConnect: '連接 Google Drive',
      driveConnecting: '連接中…',
      driveSyncing: '同步中…',
      driveSynced: '已同步',
      driveError: '同步失敗',
      driveLastSync: '上次同步',
      driveAutoSync: '自動同步中',
      driveView: '查看備份資料',
      driveHint: '自動備份至 Google Drive，可跨裝置同步交易紀錄'
    },
    en: {
      selectLabel: 'Data source',
      importText: 'Import CSV',
      exportText: 'Export CSV',
      driveConnect: 'Connect Google Drive',
      driveConnecting: 'Connecting…',
      driveSyncing: 'Syncing…',
      driveSynced: 'Synced',
      driveError: 'Sync failed',
      driveLastSync: 'Last synced',
      driveAutoSync: 'Auto-syncing',
      driveView: 'View backup',
      driveHint: 'Auto-backup to Google Drive and sync across devices'
    }
  };

  const t = text[lang] || text.zh;
  const isDebug = new URLSearchParams(window.location.search).has('debug');
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
  const status = driveStatus?.status;
  const timestamp = driveStatus?.timestamp;

  const handleSelectChange = event => {
    if (typeof onSelectChange === 'function') {
      onSelectChange(event.target.value);
    }
  };

  const handleAction = action => {
    if (typeof action === 'function') {
      action();
      onClose();
    }
  };

  let driveStatusMessage = '';
  let driveStatusClass = '';
  if (status === 'connecting') {
    driveStatusMessage = t.driveConnecting;
    driveStatusClass = styles.autoSaveStatusSaving;
  } else if (status === 'syncing') {
    driveStatusMessage = t.driveSyncing;
    driveStatusClass = styles.autoSaveStatusSaving;
  } else if (status === 'synced') {
    const timeStr = timestamp ? new Date(timestamp).toLocaleString(locale) : '';
    driveStatusMessage = timeStr ? `${t.driveLastSync}: ${timeStr}` : t.driveSynced;
    driveStatusClass = styles.autoSaveStatusSuccess;
  } else if (status === 'error') {
    driveStatusMessage = t.driveError;
    driveStatusClass = styles.autoSaveStatusError;
  }

  return (
    <div className={'action-dropdown silver-button-container ' + styles.dataDropdown} ref={ref}>
      <div className={styles.dataSelectRow}>
        <label className={styles.dataSelectLabel} htmlFor="data-source-select">
          {t.selectLabel}
        </label>
        <select
          id="data-source-select"
          className={styles.dataSelect}
          value={selectedSource}
          onChange={handleSelectChange}
        >
          <option value="csv">CSV</option>
          <option value="googleDrive">Google Drive</option>
        </select>
      </div>

      {selectedSource === 'csv' && (
        <div className={styles.buttonGroup}>
          <button type="button" onClick={() => handleAction(handleImportClick)}>{t.importText}</button>
          <button type="button" onClick={() => handleAction(handleExportClick)}>{t.exportText}</button>
        </div>
      )}

      {selectedSource === 'googleDrive' && (
        <>
          <div
            className={styles.autoSaveStatus + (driveStatusClass ? ' ' + driveStatusClass : '')}
            role={status === 'error' ? 'alert' : 'status'}
            aria-live={status === 'error' ? 'assertive' : 'polite'}
          >
            {driveStatusMessage}
          </div>
          {!driveConnected && status !== 'connecting' && status !== 'syncing' && (
            <>
              <p className={styles.driveHint}>{t.driveHint}</p>
              <div className={styles.buttonGroup}>
                <button type="button" onClick={() => handleAction(onConnectDrive)}>{t.driveConnect}</button>
              </div>
            </>
          )}
          {isDebug && driveConnected && status === 'synced' && (
            <div className={styles.buttonGroup}>
              <button type="button" onClick={() => handleAction(onViewDriveData)}>{t.driveView}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
