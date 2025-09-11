import { useRef } from 'react';
import useClickOutside from './useClickOutside';
import styles from '../InventoryTab.module.css';

export default function DataDropdown({
  onClose,
  handleImportClick,
  handleExportClick,
  handleDriveImport,
  handleDriveExport,
  handleDropboxImport,
  handleDropboxExport,
  handleOneDriveImport,
  handleOneDriveExport,
  handleICloudImport,
  handleICloudExport
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);

  const handleAction = action => {
    action();
    onClose();
  };

  return (
    <div className={`action-dropdown silver-button-container ${styles.dataDropdown}`} ref={ref}>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>CSV</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleImportClick)}>匯入</button>
          <button onClick={() => handleAction(handleExportClick)}>匯出</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>Google Drive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleDriveImport)}>匯入</button>
          <button onClick={() => handleAction(handleDriveExport)}>匯出</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>Dropbox</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleDropboxImport)}>匯入</button>
          <button onClick={() => handleAction(handleDropboxExport)}>匯出</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>OneDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleOneDriveImport)}>匯入</button>
          <button onClick={() => handleAction(handleOneDriveExport)}>匯出</button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>iCloudDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleICloudImport)}>匯入</button>
          <button onClick={() => handleAction(handleICloudExport)}>匯出</button>
        </div>
      </div>
    </div>
  );
}

