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

const DEFAULT_INACTIVE_BACKGROUND = '#d0d5dd';
const PRIMARY_COLOR = '#1971c2';

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

  const baseContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    ...style
  };

  const descriptionStyle = {
    fontSize: 14,
    color: '#adb5bd',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const buttonsWrapperStyle = {
    display: 'flex',
    gap: '6px'
  };

  const buttonConfigs = [
    { mode: 'TWD', disabled: !hasTwd },
    { mode: 'USD', disabled: !hasUsd },
    { mode: 'BOTH', disabled: !(hasTwd && hasUsd) }
  ];

  const getButtonStyle = (mode, disabled) => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: `1px solid ${PRIMARY_COLOR}`,
    background: mode === viewMode ? PRIMARY_COLOR : DEFAULT_INACTIVE_BACKGROUND,
    color: mode === viewMode ? '#fff' : PRIMARY_COLOR,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontWeight: 600,
    fontSize: 14,
    transition: 'background 0.2s ease, color 0.2s ease, opacity 0.2s ease'
  });

  return (
    <div style={baseContainerStyle}>
      <span style={descriptionStyle}>
        {resolvedLabelPrefix}
        <strong style={{ color: '#495057' }}>{resolvedDescription}</strong>
      </span>
      <div style={buttonsWrapperStyle}>
        {buttonConfigs.map(({ mode, disabled }) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              if (!disabled && mode !== viewMode) onChange(mode);
            }}
            disabled={disabled}
            style={getButtonStyle(mode, disabled)}
            aria-pressed={mode === viewMode}
          >
            {LABELS[mode]?.[lang === 'en' ? 'en' : 'zh'] || mode}
          </button>
        ))}
      </div>
    </div>
  );
}
