import styles from './EmptyState.module.css';

const VARIANT_CLASS = {
  primary: styles.actionPrimary,
  secondary: styles.actionSecondary,
  ghost: styles.actionGhost,
};

export default function EmptyState({ title, description, actions = [], children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action, idx) => (
            <button
              key={`${action.label}-${idx}`}
              type="button"
              className={VARIANT_CLASS[action.variant] || styles.actionSecondary}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {children ? <div className={styles.children}>{children}</div> : null}
    </section>
  );
}
