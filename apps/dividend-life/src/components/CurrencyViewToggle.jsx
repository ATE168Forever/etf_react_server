const LABELS = {
  TWD: {
    en: 'TWD',
    zh: '台股'
  },
  USD: {
    en: 'USD',
    zh: '美股'
  },
  BOTH: {
    en: 'TWD & USD',
    zh: '台股/美股'
  }
};

export default function CurrencyViewToggle({
  viewMode,
  onChange,
  hasTwd,
  hasUsd,
  lang,
  description,
  labelPrefix,
  style
}) {
  const resolvedLabelPrefix = labelPrefix || (lang === 'en' ? 'Showing:' : '顯示：');
  const resolvedDescription = description ?? (lang === 'en' ? 'N/A' : '無資料');

  const buttonConfigs = [
    { mode: 'TWD', disabled: !hasTwd },
    { mode: 'USD', disabled: !hasUsd },
    { mode: 'BOTH', disabled: !(hasTwd && hasUsd) }
  ];

  return (
    <div className="currency-toggle" style={style}>
      <span className="currency-toggle__description">
        {resolvedLabelPrefix}
        <strong className="currency-toggle__value">{resolvedDescription}</strong>
      </span>
      <div className="currency-toggle__buttons" role="group" aria-label={lang === 'en' ? 'Currency view' : '幣別顯示'}>
        {buttonConfigs.map(({ mode, disabled }) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              if (!disabled && mode !== viewMode) onChange(mode);
            }}
            disabled={disabled}
            className="currency-toggle__btn"
            aria-pressed={mode === viewMode}
          >
            {LABELS[mode]?.[lang === 'en' ? 'en' : 'zh'] || mode}
          </button>
        ))}
      </div>
    </div>
  );
}
