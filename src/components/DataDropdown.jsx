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
  handleICloudExport
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const handleAction = action => {
    action();
    onClose();
  };

  const text = {
    zh: {
      importText: '匯入',
      exportText: '匯出'
    },
    en: {
      importText: 'Import',
      exportText: 'Export'
    }
  };

  const { importText, exportText } = text[lang];

  return (
    <div className={`action-dropdown silver-button-container ${styles.dataDropdown}`} ref={ref}>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>CSV</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleImportClick)}>{importText}</button>
          <button onClick={() => handleAction(handleExportClick)}>{exportText}</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>Google Drive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleDriveImport)}>{importText}</button>
          <button onClick={() => handleAction(handleDriveExport)}>{exportText}</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>OneDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleOneDriveImport)}>{importText}</button>
          <button onClick={() => handleAction(handleOneDriveExport)}>{exportText}</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>iCloudDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleICloudImport)}>{importText}</button>
          <button onClick={() => handleAction(handleICloudExport)}>{exportText}</button>
        </div>
      </div>
    </div>
  );
}

