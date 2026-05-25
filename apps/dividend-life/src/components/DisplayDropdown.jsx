import { useLanguage } from '../i18n';

const MODES = {
  zh: [
    { value: 'default', label: '預設' },
    { value: 'yield', label: '殖利率' },
    { value: 'perYield', label: '月化殖利率' },
    { value: 'info', label: '資訊' },
  ],
  en: [
    { value: 'default', label: 'Default' },
    { value: 'yield', label: 'Yield' },
    { value: 'perYield', label: 'Monthly Avg Yield' },
    { value: 'info', label: 'Info' },
  ],
};

export default function DisplayDropdown({ displayMode, onModeChange }) {
  const { lang } = useLanguage();
  const options = MODES[lang] ?? MODES.zh;

  return (
    <select
      className="filter-bar__display-select"
      value={displayMode}
      onChange={e => onModeChange(e.target.value)}
      aria-label={lang === 'en' ? 'Display mode' : '顯示模式'}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
