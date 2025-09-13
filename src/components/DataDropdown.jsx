import { useRef } from 'react';
import useClickOutside from './useClickOutside';
import styles from '../InventoryTab.module.css';
import { useLanguage } from './i18n';

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
  const { lang } = useLanguage();

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

  return (
    <div className={`action-dropdown silver-button-container ${styles.dataDropdown}`} ref={ref}>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>CSV</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleImportClick)}>
            {lang === 'en' ? 'Import' : '匯入'}
          </button>
          <button onClick={() => handleAction(handleExportClick)}>
            {lang === 'en' ? 'Export' : '匯出'}
          </button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>Google Drive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleDriveImport)}>
            {lang === 'en' ? 'Import' : '匯入'}
          </button>
          <button onClick={() => handleAction(handleDriveExport)}>
            {lang === 'en' ? 'Export' : '匯出'}
          </button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>Dropbox</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleDropboxImport)}>
            {lang === 'en' ? 'Import' : '匯入'}
          </button>
          <button onClick={() => handleAction(handleDropboxExport)}>
            {lang === 'en' ? 'Export' : '匯出'}
          </button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>OneDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleOneDriveImport)}>
            {lang === 'en' ? 'Import' : '匯入'}
          </button>
          <button onClick={() => handleAction(handleOneDriveExport)}>
            {lang === 'en' ? 'Export' : '匯出'}
          </button>
        </div>
      </div>
      <div className={styles.dataRow}>
        <span className={styles.dataLabel}>iCloudDrive</span>
        <div className={styles.buttonGroup}>
          <button onClick={() => handleAction(handleICloudImport)}>
            {lang === 'en' ? 'Import' : '匯入'}
          </button>
          <button onClick={() => handleAction(handleICloudExport)}>
            {lang === 'en' ? 'Export' : '匯出'}
          </button>
        </div>
      </div>
    </div>
  );
}

