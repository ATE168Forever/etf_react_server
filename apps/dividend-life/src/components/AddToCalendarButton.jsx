import styles from './AddToCalendarButton.module.css';
import { buildIcsEvent, downloadIcsFile } from '../utils/icsExport';

export default function AddToCalendarButton({ nextPayment, lang, t }) {
  const handleClick = () => {
    const icsContent = buildIcsEvent(nextPayment, lang);
    downloadIcsFile(icsContent, `dividend-${nextPayment.stock_id}-${nextPayment.date}.ics`);
  };

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      📅 {t('next_payment_add_to_calendar')}
    </button>
  );
}
