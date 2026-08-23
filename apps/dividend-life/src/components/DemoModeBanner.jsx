import styles from './DemoModeBanner.module.css';

export default function DemoModeBanner({ isVisible, onExit, t }) {
  if (!isVisible) return null;
  return (
    <div className={styles.banner} role="status">
      <span>{t('demo_mode_banner_text')}</span>
      <button type="button" className={styles.exitButton} onClick={onExit}>
        {t('demo_mode_banner_exit')}
      </button>
    </div>
  );
}
