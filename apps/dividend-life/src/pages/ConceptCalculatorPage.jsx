import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ThemeLanguageProvider, useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';
import Footer from '@shared/components/Footer/Footer.jsx';
import styles from './ConceptCalculatorPage.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const MAX_YEARS = 50;

const PRESETS = {
  conservative: { annualYieldPct: 4, annualInflationPct: 2, initialInvestment: 300000, monthlyContribution: 3000, targetMonthlyIncome: 30000 },
  moderate:     { annualYieldPct: 6, annualInflationPct: 2, initialInvestment: 500000, monthlyContribution: 5000, targetMonthlyIncome: 50000 },
  aggressive:   { annualYieldPct: 8, annualInflationPct: 2, initialInvestment: 1000000, monthlyContribution: 10000, targetMonthlyIncome: 80000 },
};

const PRESET_LABELS = {
  zh: { conservative: '保守', moderate: '穩健', aggressive: '積極' },
  en: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
};

const PARAM_META = {
  zh: {
    initialInvestment:   { label: '初始投入金額', hint: '目前已投入或預計一次性投入的本金', unit: 'NT$', min: 0, max: 5000000, step: 10000 },
    monthlyContribution: { label: '每月定投金額', hint: '每個月持續投入的金額（定期定額）', unit: 'NT$', min: 0, max: 100000, step: 1000 },
    annualYieldPct:      { label: '年化配息率', hint: '台股長期平均約 6-8%；保守估計建議使用 4-5%', unit: '%', min: 1, max: 15, step: 0.5 },
    annualInflationPct:  { label: '年化通膨率', hint: '台灣近年平均約 1.5-2.5%；會使目標金額逐年提高', unit: '%', min: 0, max: 10, step: 0.5 },
    targetMonthlyIncome: { label: '目標月收入（股息）', hint: '達到財務自由所需的每月被動收入', unit: 'NT$', min: 5000, max: 300000, step: 5000 },
  },
  en: {
    initialInvestment:   { label: 'Initial Investment', hint: 'Lump sum you are starting with or investing now', unit: 'NT$', min: 0, max: 5000000, step: 10000 },
    monthlyContribution: { label: 'Monthly Contribution', hint: 'Amount added to the portfolio every month (DCA)', unit: 'NT$', min: 0, max: 100000, step: 1000 },
    annualYieldPct:      { label: 'Annual Dividend Yield', hint: 'Taiwan ETF long-term average ~6-8%; use 4-5% for conservative estimates', unit: '%', min: 1, max: 15, step: 0.5 },
    annualInflationPct:  { label: 'Annual Inflation Rate', hint: "Taiwan's recent average ~1.5-2.5%; raises the target income each year", unit: '%', min: 0, max: 10, step: 0.5 },
    targetMonthlyIncome: { label: 'Target Monthly Income', hint: 'Monthly passive income needed to achieve financial freedom', unit: 'NT$', min: 5000, max: 300000, step: 5000 },
  },
};

// ── URL param key mapping (short for sharing) ──
const URL_KEY_MAP = { i: 'initialInvestment', m: 'monthlyContribution', y: 'annualYieldPct', inf: 'annualInflationPct', t: 'targetMonthlyIncome' };

// ── Chart constants ──
const VW = 560;
const VH = 240;
const PAD = { top: 20, right: 16, bottom: 36, left: 60 };
const CHART_W = VW - PAD.left - PAD.right;
const CHART_H = VH - PAD.top - PAD.bottom;

const C = {
  axis:        'rgba(160,169,199,0.25)',
  text:        'rgba(163,174,208,0.9)',
  gold:        '#d4af37',
  target:      '#f87171',
  barNormal:   'rgba(100,160,255,0.65)',
  barAchieved: 'rgba(47,158,68,0.75)',
  lineB:       'rgba(251,146,60,0.85)',
  hoverLine:   'rgba(255,255,255,0.15)',
  tooltipBg:   'rgba(16,20,34,0.95)',
  tooltipBdr:  'rgba(121,147,255,0.3)',
};

function formatNT(value, compact = false) {
  if (compact) {
    if (value >= 1e8) return `${(value / 1e8).toFixed(1)}億`;
    if (value >= 1e4) return `${(value / 1e4).toFixed(0)}萬`;
    return String(Math.round(value));
  }
  return Math.round(value).toLocaleString();
}

function simulate({ initialInvestment, monthlyContribution, annualYieldPct, annualInflationPct, targetMonthlyIncome }) {
  const y = annualYieldPct / 100;
  const inf = annualInflationPct / 100;
  const rows = [];
  let portfolio = initialInvestment;
  for (let i = 0; i <= MAX_YEARS; i++) {
    const monthlyIncome = portfolio * y / 12;
    const adjustedTarget = targetMonthlyIncome * Math.pow(1 + inf, i);
    rows.push({ yearOffset: i, year: CURRENT_YEAR + i, portfolio: Math.round(portfolio), monthlyIncome: Math.round(monthlyIncome), adjustedTarget: Math.round(adjustedTarget), achieved: monthlyIncome >= adjustedTarget });
    portfolio = portfolio * (1 + y) + monthlyContribution * 12;
  }
  return rows;
}

// ── Chart component ──
function CalcChart({ rows, rowsB, lang, svgRef, hoveredIdx, onHover, onHoverEnd }) {
  const freedomOffset = rows.findIndex(r => r.achieved);
  const freedomOffsetB = rowsB ? rowsB.findIndex(r => r.achieved) : -1;
  const windowEnd = Math.min(
    Math.max(
      freedomOffset >= 0 ? freedomOffset + 10 : MAX_YEARS,
      rowsB && freedomOffsetB >= 0 ? freedomOffsetB + 10 : 0
    ),
    MAX_YEARS
  );

  const visible = rows.slice(0, windowEnd + 1);
  const visibleB = rowsB ? rowsB.slice(0, windowEnd + 1) : null;

  const maxIncome = Math.max(
    ...visible.map(r => Math.max(r.monthlyIncome, r.adjustedTarget)),
    ...(visibleB ? visibleB.map(r => r.monthlyIncome) : []),
    1
  );

  const toY = (v) => PAD.top + CHART_H - (v / maxIncome) * CHART_H;
  const toX = (i) => PAD.left + (i / Math.max(visible.length - 1, 1)) * CHART_W;
  const barW = Math.max(3, CHART_W / visible.length - 2);

  const targetPath = visible
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(r.adjustedTarget).toFixed(1)}`)
    .join(' ');

  const lineBPath = visibleB
    ? visibleB.map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(r.monthlyIncome).toFixed(1)}`).join(' ')
    : null;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: maxIncome * f, y: toY(maxIncome * f) }));
  const xTicks = visible.filter((_, i) => i % 5 === 0);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    let best = 0, minDist = Infinity;
    visible.forEach((_, i) => {
      const d = Math.abs(svgX - toX(i));
      if (d < minDist) { minDist = d; best = i; }
    });
    onHover(best);
  }, [visible, onHover]);

  const hovered = hoveredIdx !== null && hoveredIdx < visible.length ? visible[hoveredIdx] : null;
  const hoveredB = hoveredIdx !== null && visibleB && hoveredIdx < visibleB.length ? visibleB[hoveredIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className={styles.chartSvg}
      ref={svgRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={onHoverEnd}
      role="img"
      aria-label={lang === 'zh' ? '配息收入預測圖表' : 'Dividend income projection chart'}
    >
      {/* Grid + Y axis */}
      {yTicks.map(({ v, y }, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y} stroke={C.axis} strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill={C.text}>
            {lang === 'zh' ? formatNT(v, true) : `${Math.round(v / 1000)}k`}
          </text>
        </g>
      ))}

      {/* Bars — Scenario A */}
      {visible.map((r, i) => {
        const x = toX(i) - barW / 2;
        const barH = Math.max(0, (r.monthlyIncome / maxIncome) * CHART_H);
        const barY = PAD.top + CHART_H - barH;
        return (
          <rect key={i} x={x} y={barY} width={barW} height={barH}
            fill={r.achieved ? C.barAchieved : C.barNormal} rx="1" />
        );
      })}

      {/* Line — Scenario B */}
      {lineBPath && (
        <path d={lineBPath} fill="none" stroke={C.lineB} strokeWidth="2" strokeLinejoin="round" />
      )}
      {visibleB && visibleB.map((r, i) => (
        <circle key={i} cx={toX(i)} cy={toY(r.monthlyIncome)} r="2"
          fill={r.achieved ? '#6ee7b7' : C.lineB} />
      ))}

      {/* Target line */}
      <path d={targetPath} fill="none" stroke={C.target} strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Freedom markers */}
      {freedomOffset >= 0 && freedomOffset <= windowEnd && (() => {
        const fx = toX(freedomOffset);
        return (
          <g>
            <line x1={fx} y1={PAD.top} x2={fx} y2={PAD.top + CHART_H} stroke={C.gold} strokeWidth="1" strokeDasharray="3 2" />
            <text x={fx + 4} y={PAD.top + 11} fontSize="9" fill={C.gold} fontWeight="700">{rows[freedomOffset].year}</text>
          </g>
        );
      })()}
      {rowsB && freedomOffsetB >= 0 && freedomOffsetB <= windowEnd && (() => {
        const fx = toX(freedomOffsetB);
        return (
          <g>
            <line x1={fx} y1={PAD.top + 14} x2={fx} y2={PAD.top + CHART_H} stroke={C.lineB} strokeWidth="1" strokeDasharray="3 2" />
            <text x={fx + 4} y={PAD.top + 25} fontSize="9" fill={C.lineB} fontWeight="700">{rowsB[freedomOffsetB].year}</text>
          </g>
        );
      })()}

      {/* Hover crosshair + tooltip */}
      {hovered && (() => {
        const hx = toX(hoveredIdx);
        const tipW = visibleB ? 126 : 110;
        const tipH = visibleB ? 56 : 44;
        const tipX = hx + tipW + 12 > VW - PAD.right ? hx - tipW - 6 : hx + 8;
        const tipY = PAD.top;
        return (
          <g>
            <line x1={hx} y1={PAD.top} x2={hx} y2={PAD.top + CHART_H} stroke={C.hoverLine} strokeWidth="1" />
            <circle cx={hx} cy={toY(hovered.monthlyIncome)} r="3" fill={hovered.achieved ? C.barAchieved : C.barNormal} />
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="4" fill={C.tooltipBg} stroke={C.tooltipBdr} strokeWidth="1" />
            <text x={tipX + 7} y={tipY + 13} fontSize="9" fill={C.gold} fontWeight="700">{hovered.year}</text>
            <text x={tipX + 7} y={tipY + 25} fontSize="8" fill={C.barNormal}>
              {visibleB ? 'A: ' : ''}{lang === 'zh' ? '月股息' : 'Income'}: NT${hovered.monthlyIncome.toLocaleString()}
            </text>
            {hoveredB && (
              <text x={tipX + 7} y={tipY + 37} fontSize="8" fill={C.lineB}>
                B: NT${hoveredB.monthlyIncome.toLocaleString()}
              </text>
            )}
            <text x={tipX + 7} y={tipY + (visibleB ? 49 : 37)} fontSize="8" fill={C.target}>
              {lang === 'zh' ? '目標' : 'Target'}: NT${hovered.adjustedTarget.toLocaleString()}
            </text>
          </g>
        );
      })()}

      {/* X axis */}
      <line x1={PAD.left} y1={PAD.top + CHART_H} x2={PAD.left + CHART_W} y2={PAD.top + CHART_H} stroke={C.axis} strokeWidth="1" />
      {xTicks.map((r, i) => (
        <text key={i} x={toX(visible.indexOf(r))} y={VH - 6} textAnchor="middle" fontSize="9" fill={C.text}>{r.year}</text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${VH - 14})`}>
        <rect x="0" y="-6" width="10" height="8" fill={C.barNormal} rx="1" />
        <text x="13" y="1" fontSize="8" fill={C.text}>{rowsB ? 'A ' : ''}{lang === 'zh' ? '月股息' : 'Income A'}</text>
        {rowsB && (
          <>
            <line x1="65" y1="-2" x2="75" y2="-2" stroke={C.lineB} strokeWidth="2" />
            <text x="78" y="1" fontSize="8" fill={C.lineB}>{lang === 'zh' ? 'B 月股息' : 'Income B'}</text>
          </>
        )}
        <line x1={rowsB ? 130 : 68} y1="-2" x2={rowsB ? 140 : 78} y2="-2" stroke={C.target} strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={rowsB ? 143 : 81} y="1" fontSize="8" fill={C.text}>{lang === 'zh' ? '目標' : 'Target'}</text>
        {freedomOffset >= 0 && (
          <>
            <line x1={rowsB ? 175 : 115} y1="-2" x2={rowsB ? 185 : 125} y2="-2" stroke={C.gold} strokeWidth="1" strokeDasharray="3 2" />
            <text x={rowsB ? 188 : 128} y="1" fontSize="8" fill={C.gold}>{lang === 'zh' ? '達成' : 'Freedom'}</text>
          </>
        )}
      </g>
    </svg>
  );
}

function SliderInput({ id, value, onChange, meta }) {
  return (
    <div className={styles.sliderRow}>
      <input type="range" id={id} className={styles.slider}
        min={meta.min} max={meta.max} step={meta.step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <input type="number" className={styles.paramInput} inputMode="numeric"
        min={meta.min} max={meta.max} step={meta.step} value={value}
        onChange={e => { const v = Number(e.target.value); if (!isNaN(v) && v >= meta.min && v <= meta.max) onChange(v); }}
        aria-label={meta.label} />
    </div>
  );
}

function ParamPanel({ params, setParam, activePreset, applyPreset, lang, prefix = '' }) {
  const meta = PARAM_META[lang] ?? PARAM_META.zh;
  const presetLabels = PRESET_LABELS[lang] ?? PRESET_LABELS.zh;
  const PARAM_KEYS = ['initialInvestment', 'monthlyContribution', 'annualYieldPct', 'annualInflationPct', 'targetMonthlyIncome'];

  return (
    <div className={styles.params} role="form" aria-label={lang === 'zh' ? '投資參數' : 'Investment Parameters'}>
      <div className={styles.presets}>
        {Object.keys(PRESETS).map(key => (
          <button key={key} type="button"
            className={`${styles.presetBtn}${activePreset === key ? ' ' + styles.active : ''}`}
            onClick={() => applyPreset(key)}>
            {presetLabels[key]}
          </button>
        ))}
      </div>
      {PARAM_KEYS.map(key => {
        const m = meta[key];
        const inputId = `calc-${prefix}${key}`;
        return (
          <div key={key} className={styles.paramGroup}>
            <label htmlFor={inputId} className={styles.paramLabel}>
              {m.label}
              <span className={styles.paramLabelHint} title={m.hint} aria-label={m.hint}>?</span>
              <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: '0.9em', color: 'var(--color-text, #f5f7ff)' }}>
                {m.unit === '%' ? `${params[key]}%` : `NT$${params[key].toLocaleString()}`}
              </span>
            </label>
            <SliderInput id={inputId} value={params[key]} onChange={setParam(key)} meta={m} />
          </div>
        );
      })}
    </div>
  );
}

function buildSummaryText(rows, lang, styles) {
  const freedomEntry = rows.find(r => r.achieved);
  const lastRow = rows[rows.length - 1];
  const fmt = v => Math.round(v).toLocaleString();

  if (freedomEntry) {
    const n = freedomEntry.yearOffset;
    const income = fmt(freedomEntry.monthlyIncome);
    if (lang === 'en') return <>{n === 0 ? 'Already achieved!' : `Freedom in `}<span className={styles.summaryHighlight}>{freedomEntry.year}</span>{` (${n}yr). Income: `}<span className={styles.summaryHighlight}>NT${income}</span></>;
    return <>{n === 0 ? '已達成！' : ''}<span className={styles.summaryHighlight}>{freedomEntry.year} 年</span>（{n === 0 ? '今年' : `${n} 年後`}）達成，月股息 <span className={styles.summaryHighlight}>NT${income}</span></>;
  }
  if (lang === 'en') return <>{MAX_YEARS}yr portfolio: <span className={styles.summaryHighlight}>NT${fmt(lastRow.portfolio)}</span>. Target not reached.</>;
  return <>{MAX_YEARS} 年後資產：<span className={styles.summaryHighlight}>NT${fmt(lastRow.portfolio)}</span>，未達目標。</>;
}

function CalculatorContent() {
  const { lang } = useThemeLanguage();
  const meta = PARAM_META[lang] ?? PARAM_META.zh;

  // ── Scenario A ──
  const [activePreset, setActivePreset] = useState('moderate');
  const [params, setParams] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const loaded = {};
      for (const [k, pk] of Object.entries(URL_KEY_MAP)) {
        const v = sp.get(k);
        if (v !== null && !isNaN(+v)) loaded[pk] = +v;
      }
      return Object.keys(loaded).length > 0 ? { ...PRESETS.moderate, ...loaded } : PRESETS.moderate;
    } catch { return PRESETS.moderate; }
  });

  // ── Scenario B (compare mode) ──
  const [compareMode, setCompareMode] = useState(false);
  const [activePresetB, setActivePresetB] = useState('conservative');
  const [paramsB, setParamsB] = useState(PRESETS.conservative);

  // ── UI state ──
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    document.title = lang === 'en' ? 'ETF Lifecycle Calculator — Concept Life' : 'ETF 存股計算器 — Concept Life';
    return () => { document.title = 'Concept Life'; };
  }, [lang]);

  // Update URL params when scenario A changes (replace, no history entry)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      for (const [k, pk] of Object.entries(URL_KEY_MAP)) url.searchParams.set(k, params[pk]);
      window.history.replaceState(null, '', url.toString());
    } catch { /* ignore */ }
  }, [params]);

  const setParam = useCallback((key) => (val) => {
    setParams(p => ({ ...p, [key]: val }));
    setActivePreset(null);
  }, []);

  const setParamB = useCallback((key) => (val) => {
    setParamsB(p => ({ ...p, [key]: val }));
    setActivePresetB(null);
  }, []);

  const applyPreset = useCallback((key) => { setParams(PRESETS[key]); setActivePreset(key); }, []);
  const applyPresetB = useCallback((key) => { setParamsB(PRESETS[key]); setActivePresetB(key); }, []);

  const rows = useMemo(() => simulate(params), [params]);
  const rowsB = useMemo(() => compareMode ? simulate(paramsB) : null, [paramsB, compareMode]);

  const freedomEntry = rows.find(r => r.achieved);
  const lastRow = rows[rows.length - 1];
  const fmt = v => Math.round(v).toLocaleString();

  // ── Share link ──
  const shareUrl = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      for (const [k, pk] of Object.entries(URL_KEY_MAP)) url.searchParams.set(k, params[pk]);
      return url.toString();
    } catch { return window.location.href; }
  }, [params]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt(lang === 'zh' ? '複製此連結：' : 'Copy this link:', shareUrl);
    }
  }, [shareUrl, lang]);

  // ── SVG export ──
  const handleExport = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Inject a dark background for standalone viewing
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', VW); bg.setAttribute('height', VH);
    bg.setAttribute('fill', '#0d1117');
    clone.insertBefore(bg, clone.firstChild);
    const s = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([s], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'etf-lifecycle.svg'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const statCards = lang === 'en'
    ? [
        { label: 'Portfolio at Year 10', value: `NT$${fmt(rows[10]?.portfolio ?? 0)}` },
        { label: 'Monthly Income at Year 10', value: `NT$${fmt(rows[10]?.monthlyIncome ?? 0)}`, gold: true },
        { label: freedomEntry ? 'Freedom Year' : `Year ${MAX_YEARS} Portfolio`, value: freedomEntry ? String(freedomEntry.year) : `NT$${fmt(lastRow.portfolio)}`, gold: !!freedomEntry },
      ]
    : [
        { label: '10年後資產規模', value: `NT$${fmt(rows[10]?.portfolio ?? 0)}` },
        { label: '10年後月股息', value: `NT$${fmt(rows[10]?.monthlyIncome ?? 0)}`, gold: true },
        { label: freedomEntry ? '財務自由年份' : `${MAX_YEARS}年後資產`, value: freedomEntry ? String(freedomEntry.year) : `NT$${fmt(lastRow.portfolio)}`, gold: !!freedomEntry },
      ];

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <ExperienceNavigation current="dividend-life" homeHref="/" homeNavigation="reload" />
      </div>

      <div className={styles.card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className={styles.heading}>
              {lang === 'zh' ? 'ETF 存股生命週期計算器' : 'ETF Lifecycle Calculator'}
            </h1>
            <p className={styles.subtitle}>
              {lang === 'zh'
                ? '輸入投資參數，即時預測達成財務自由的年份與資產軌跡。'
                : 'Enter your parameters and instantly project your path to financial freedom.'}
            </p>
          </div>
          <div className={styles.actionRow}>
            <button type="button"
              className={`${styles.actionBtn}${compareMode ? ' ' + styles.compareActive : ''}`}
              onClick={() => setCompareMode(v => !v)}
              aria-pressed={compareMode}>
              ⇄ {lang === 'zh' ? '雙方案對比' : 'Compare'}
            </button>
            <button type="button" className={styles.actionBtn} onClick={handleExport} title={lang === 'zh' ? '匯出圖表 SVG' : 'Export chart as SVG'}>
              ↓ {lang === 'zh' ? '匯出圖表' : 'Export'}
            </button>
            <button type="button" className={styles.actionBtn} onClick={handleCopy}>
              {copied ? (lang === 'zh' ? '✓ 已複製' : '✓ Copied') : (lang === 'zh' ? '🔗 分享連結' : '🔗 Share')}
            </button>
          </div>
        </div>

        {/* Body */}
        {!compareMode ? (
          /* ── Single mode ── */
          <>
            <div>
              <div className={styles.paramLabel} style={{ marginBottom: 8 }}>
                {lang === 'zh' ? '快速情境' : 'Quick Presets'}
              </div>
              <div className={styles.presets}>
                {Object.keys(PRESETS).map(key => (
                  <button key={key} type="button"
                    className={`${styles.presetBtn}${activePreset === key ? ' ' + styles.active : ''}`}
                    onClick={() => applyPreset(key)}>
                    {(PRESET_LABELS[lang] ?? PRESET_LABELS.zh)[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.body}>
              <ParamPanel params={params} setParam={setParam} activePreset={activePreset} applyPreset={applyPreset} lang={lang} prefix="a-" />
              <div className={styles.results}>
                <div className={`${styles.summary} ${freedomEntry ? styles.achieved : styles.notAchieved}`} role="status" aria-live="polite">
                  {buildSummaryText(rows, lang, styles)}
                </div>
                <div className={styles.statsRow}>
                  {statCards.map((s, i) => (
                    <div key={i} className={styles.statCard}>
                      <div className={styles.statLabel}>{s.label}</div>
                      <div className={`${styles.statValue}${s.gold ? ' ' + styles.gold : ''}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.chartWrap}>
                  <CalcChart rows={rows} rowsB={null} lang={lang} svgRef={svgRef}
                    hoveredIdx={hoveredIdx} onHover={setHoveredIdx} onHoverEnd={() => setHoveredIdx(null)} />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── Compare mode ── */
          <>
            <div className={styles.compareBody}>
              <div className={styles.compareScenario}>
                <span className={`${styles.scenarioLabel} ${styles.a}`}>
                  {lang === 'zh' ? '方案 A' : 'Scenario A'}
                </span>
                <ParamPanel params={params} setParam={setParam} activePreset={activePreset} applyPreset={applyPreset} lang={lang} prefix="a-" />
              </div>
              <div className={styles.compareScenario}>
                <span className={`${styles.scenarioLabel} ${styles.b}`}>
                  {lang === 'zh' ? '方案 B' : 'Scenario B'}
                </span>
                <ParamPanel params={paramsB} setParam={setParamB} activePreset={activePresetB} applyPreset={applyPresetB} lang={lang} prefix="b-" />
              </div>
            </div>

            {/* Combined chart */}
            <div className={styles.chartWrap}>
              <CalcChart rows={rows} rowsB={rowsB} lang={lang} svgRef={svgRef}
                hoveredIdx={hoveredIdx} onHover={setHoveredIdx} onHoverEnd={() => setHoveredIdx(null)} />
            </div>

            {/* Compare summaries */}
            <div className={styles.compareSummaryRow}>
              <div className={`${styles.compareSummaryBox} ${styles.a}`}>
                <strong>{lang === 'zh' ? '方案 A　' : 'Scenario A　'}</strong>
                {buildSummaryText(rows, lang, styles)}
              </div>
              <div className={`${styles.compareSummaryBox} ${styles.b}`}>
                <strong>{lang === 'zh' ? '方案 B　' : 'Scenario B　'}</strong>
                {rowsB && buildSummaryText(rowsB, lang, styles)}
              </div>
            </div>
          </>
        )}
      </div>

      <p className={styles.disclaimer}>
        {lang === 'zh'
          ? '本計算器僅供教育參考用途，不構成任何投資建議。實際報酬率因市場波動而異，過去績效不代表未來結果。'
          : 'This calculator is for educational purposes only and does not constitute investment advice. Actual returns vary with market conditions; past performance does not guarantee future results.'}
      </p>

      <div style={{ width: 'min(960px, 100%)' }}>
        <Footer />
      </div>
    </div>
  );
}

export default function ConceptCalculatorPage() {
  return (
    <ThemeLanguageProvider>
      <CalculatorContent />
    </ThemeLanguageProvider>
  );
}
