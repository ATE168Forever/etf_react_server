import styles from './PageContainer.module.css';

export default function PageContainer({ children, navigation, footer, heading, overlay, wide = false }) {
  return (
    <main id="main-content" className={styles.shell}>
      {heading}
      {navigation && <div className={styles.navigation}>{navigation}</div>}
      <section className={wide ? `${styles.content} ${styles.contentWide}` : styles.content}>
        {children}
      </section>
      {footer && <div className={styles.footer}>{footer}</div>}
      {overlay}
    </main>
  );
}
