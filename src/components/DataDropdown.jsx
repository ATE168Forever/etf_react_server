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
    <div className={`action-dropdown ${styles.dataDropdown}`} ref={ref}>
      <div className={styles.dataRow}>
        <span>CSV:</span>
        <button onClick={() => handleAction(handleImportClick)}>匯入</button>
        <button onClick={() => handleAction(handleExportClick)}>匯出</button>
      </div>
      <div className={styles.dataRow}>
        <span>Google Drive:</span>
        <button onClick={() => handleAction(handleDriveImport)}>匯入</button>
        <button onClick={() => handleAction(handleDriveExport)}>匯出</button>
      </div>
      <div className={styles.dataRow}>
        <span>Dropbox:</span>
        <button onClick={() => handleAction(handleDropboxImport)}>匯入</button>
        <button onClick={() => handleAction(handleDropboxExport)}>匯出</button>
      </div>
      <div className={styles.dataRow}>
        <span>OneDrive:</span>
        <button onClick={() => handleAction(handleOneDriveImport)}>匯入</button>
        <button onClick={() => handleAction(handleOneDriveExport)}>匯出</button>
      </div>
      <div className={styles.dataRow}>
        <span>iCloudDrive:</span>
        <button onClick={() => handleAction(handleICloudImport)}>匯入</button>
        <button onClick={() => handleAction(handleICloudExport)}>匯出</button>
      </div>
    </div>
  );
}

