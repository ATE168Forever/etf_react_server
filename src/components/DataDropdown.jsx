import { useRef } from 'react';
import useClickOutside from './useClickOutside';
import styles from '../InventoryTab.module.css';
import { useLanguage } from '../i18n';

export default function DataDropdown({
  onClose,
  handleImportClick,
  handleExportClick,
  handleDriveImport,
  handleDriveExport,
  handleOneDriveImport,
  handleOneDriveExport,
  handleICloudImport,
  handleICloudExport,
  selectedSource,
  onSelectChange,
  autoSaveEnabled,
  onToggleAutoSave,
  autoSaveState
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const handleAction = action => {
    if (typeof action === 'function') {
      action();
      onClose();
    }
  };

  const text = {
    zh: {
      importText: '匯入',
      exportText: '匯出',
      selectLabel: '存取方式',
      autoSaveLabel: '自動儲存',
      autoSaveOn: '開啟中',
      autoSaveOff: '已關閉',
      autoSaveSaving: '自動儲存中…',
      autoSaveSuccess: '自動儲存完成',
      autoSaveError: '自動儲存失敗',
      autoSaveDisabled: '自動儲存已關閉',
      autoSaveLocationLabel: '存入位置'
    },
    en: {
      importText: 'Import',
      exportText: 'Export',
      selectLabel: 'Data source',
      autoSaveLabel: 'Auto-save',
      autoSaveOn: 'On',
      autoSaveOff: 'Off',
      autoSaveSaving: 'Auto-saving…',
      autoSaveSuccess: 'Auto-save completed',
      autoSaveError: 'Auto-save failed',
      autoSaveDisabled: 'Auto-save is off',
      autoSaveLocationLabel: 'Saved to'
    }
  };

  const { importText, exportText, selectLabel, autoSaveLabel, autoSaveOn, autoSaveOff, autoSaveSaving, autoSaveSuccess, autoSaveError, autoSaveDisabled, autoSaveLocationLabel } = text[lang];

  const providerActions = {
    csv: {
      import: handleImportClick,
      export: handleExportClick
    },
    googleDrive: {
      import: handleDriveImport,
      export: handleDriveExport
    },
    oneDrive: {
      import: handleOneDriveImport,
      export: handleOneDriveExport
    },
    icloudDrive: {
      import: handleICloudImport,
      export: handleICloudExport
    }
  };

  const handleSelectChange = event => {
    if (typeof onSelectChange === 'function') {
      onSelectChange(event.target.value);
    }
  };

  const handleSelectAction = type => {
    const action = providerActions?.[selectedSource]?.[type];
    handleAction(action);
  };

  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
  const status = autoSaveState?.status;
  const timestamp = autoSaveState?.timestamp;
  const location = autoSaveState?.location;
  const providerLabels = {
    csv: 'CSV',
    googleDrive: 'Google Drive',
    oneDrive: 'OneDrive',
    icloudDrive: 'iCloudDrive'
  };
  const providerLabel = providerLabels?.[autoSaveState?.provider] || '';
  const locationTypeLabels = {
    localStorage: {
      zh: '瀏覽器儲存空間',
      en: 'Browser storage'
    }
  };
  let statusMessage = '';
  if (status === 'saving') {
    statusMessage = autoSaveSaving;
  } else if (status === 'success') {
    statusMessage = autoSaveSuccess;
  } else if (status === 'error') {
    statusMessage = autoSaveError;
  } else if (!autoSaveEnabled) {
    statusMessage = autoSaveDisabled;
  }

  const messageParts = [];

  if (statusMessage && providerLabel && status !== 'idle') {
    statusMessage = `${statusMessage} (${providerLabel})`;
  }

  if (statusMessage) {
    messageParts.push(statusMessage);
  }

  if (timestamp) {
    const formatted = new Date(timestamp).toLocaleString(locale);
    messageParts.push(formatted);
  }

  if (location) {
    const typeLabel = locationTypeLabels?.[location.type]?.[lang] || location.type;
    const detailParts = [];
    if (location.path) detailParts.push(location.path);
    if (location.filename) detailParts.push(location.filename);
    if (detailParts.length === 0 && location.key) detailParts.push(location.key);
    const detail = detailParts.join(' · ');
    const locationMessage = `${autoSaveLocationLabel}: ${typeLabel}${detail ? ` (${detail})` : ''}`;
    messageParts.push(locationMessage);
  }

  const finalStatusMessage = messageParts.join(' · ');

  return (
    <div className={`action-dropdown silver-button-container ${styles.dataDropdown}`} ref={ref}>
      <div className={styles.dataSelectRow}>
        <label className={styles.dataSelectLabel} htmlFor="data-source-select">
          {selectLabel}
        </label>
        <select
          id="data-source-select"
          className={styles.dataSelect}
          value={selectedSource}
          onChange={handleSelectChange}
        >
          <option value="csv">CSV</option>
          <option value="googleDrive">Google Drive</option>
          <option value="oneDrive">OneDrive</option>
          <option value="icloudDrive">iCloudDrive</option>
        </select>
      </div>
      <div className={styles.autoSaveRow}>
        <span className={styles.autoSaveLabel}>{autoSaveLabel}</span>
        <button
          type="button"
          className={`${styles.autoSaveButton} ${autoSaveEnabled ? styles.autoSaveButtonActive : ''}`}
          onClick={() => {
            if (typeof onToggleAutoSave === 'function') {
              onToggleAutoSave();
            }
          }}
          aria-pressed={autoSaveEnabled}
        >
          {autoSaveEnabled ? autoSaveOn : autoSaveOff}
        </button>
      </div>
      <div
        className={`${styles.autoSaveStatus} ${
          status === 'error'
            ? styles.autoSaveStatusError
            : status === 'success'
              ? styles.autoSaveStatusSuccess
              : status === 'saving'
                ? styles.autoSaveStatusSaving
                : ''
        }`}
      >
        {finalStatusMessage}
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={() => handleSelectAction('import')}>{importText}</button>
        <button onClick={() => handleSelectAction('export')}>{exportText}</button>
      </div>
    </div>
  );
}

