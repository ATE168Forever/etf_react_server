import styles from './SummaryHero.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

export default function SummaryHero({ monthLabel, twScheduled, coveragePercent, lang, t }) {
  const amount = formatTwd(twScheduled);
  const headline = t('home_greeting_headline').replace('{month}', monthLabel);
  const detail = coveragePercent === null
    ? t('home_greeting_detail_no_coverage').replace('{amount}', amount)
    : t('home_greeting_detail')
        .replace('{amount}', amount)
        .replace('{percent}', String(coveragePercent));

  return (
    <section className={styles.hero} aria-label={t('home_greeting_aria_label')}>
      <p className={styles.headline}>{headline}</p>
      <p className={styles.detail}>{detail}</p>
    </section>
  );
}
