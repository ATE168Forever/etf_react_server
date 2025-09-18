const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;

export const DIVIDEND_YEAR_QUERY = `year=${CURRENT_YEAR}&year=${PREVIOUS_YEAR}`;

export function normalizeDividendResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function toValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function calculateDividendSummary({ inventoryList = [], dividendEvents = [], asOfDate = new Date() } = {}) {
  const holdings = new Map();
  inventoryList.forEach(item => {
    if (item?.stock_id && Number.isFinite(Number(item.total_quantity))) {
      holdings.set(item.stock_id, Number(item.total_quantity));
    }
  });
  if (!holdings.size) {
    return {
      yearToDateTotal: 0,
      annualTotal: 0,
      annualYear: new Date(asOfDate).getFullYear(),
      monthlyAverage: 0
    };
  }

  const now = new Date(asOfDate);
  const currentYear = now.getFullYear();
  const totalsByYear = new Map();
  let yearToDateTotal = 0;

  dividendEvents.forEach(event => {
    const stockId = event?.stock_id;
    const quantity = holdings.get(stockId);
    if (!quantity) return;
    const perShareDividend = Number(event?.dividend);
    if (!Number.isFinite(perShareDividend) || perShareDividend <= 0) return;
    const eventDate = toValidDate(event?.dividend_date);
    if (!eventDate) return;

    const amount = perShareDividend * quantity;
    const eventYear = eventDate.getFullYear();
    totalsByYear.set(eventYear, (totalsByYear.get(eventYear) || 0) + amount);
    if (eventYear === currentYear && eventDate <= now) {
      yearToDateTotal += amount;
    }
  });

  const sortedYears = [...totalsByYear.keys()].sort((a, b) => b - a);
  let annualYear = currentYear;
  let annualTotal = totalsByYear.get(currentYear) || 0;

  if (annualTotal === 0) {
    for (const year of sortedYears) {
      const total = totalsByYear.get(year);
      if (total > 0) {
        annualYear = year;
        annualTotal = total;
        break;
      }
    }
  }

  const monthlyAverage = annualTotal > 0 ? annualTotal / 12 : 0;

  return {
    yearToDateTotal,
    annualTotal,
    annualYear,
    monthlyAverage
  };
}

export function buildDividendGoalViewModel({ summary = {}, goals = {}, messages = {}, formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
} }) {
  const {
    yearToDateTotal = 0,
    annualTotal = 0,
    annualYear,
    monthlyAverage = 0
  } = summary;
  const annualGoal = Number(goals.totalTarget) || 0;
  const monthlyGoal = Number(goals.monthlyTarget) || 0;
  const placeholder = messages.goalPercentPlaceholder || '--';

  const annualGoalSet = annualGoal > 0;
  const monthlyGoalSet = monthlyGoal > 0;
  const annualPercentValue = annualGoalSet && annualGoal > 0
    ? Math.min(1, yearToDateTotal / annualGoal)
    : 0;
  const monthlyPercentValue = monthlyGoalSet && monthlyGoal > 0
    ? Math.min(1, monthlyAverage / monthlyGoal)
    : 0;

  const metrics = [
    {
      id: 'ytd',
      label: messages.goalDividendYtdLabel,
      value: formatCurrency(yearToDateTotal)
    },
    {
      id: 'annual',
      label: annualTotal > 0 && annualYear
        ? `${messages.goalDividendAnnualLabel} (${annualYear})`
        : messages.goalDividendAnnualLabel,
      value: formatCurrency(annualTotal)
    },
    {
      id: 'monthly',
      label: messages.goalDividendMonthlyLabel,
      value: formatCurrency(monthlyAverage)
    },
    {
      id: 'achievement',
      label: messages.goalAchievementLabel,
      value: annualGoalSet
        ? `${Math.min(100, Math.round(annualPercentValue * 100))}%`
        : placeholder
    }
  ].filter(metric => Boolean(metric.label));

  const rows = [
    {
      id: 'annual',
      label: messages.annualGoal,
      current: `${messages.goalDividendAccumulated}${formatCurrency(yearToDateTotal)}`,
      target: `${messages.goalTargetAnnual}${annualGoalSet ? formatCurrency(annualGoal) : placeholder}`,
      percent: annualPercentValue,
      percentLabel: annualGoalSet
        ? `${Math.min(100, Math.round(annualPercentValue * 100))}%`
        : placeholder,
      encouragement: annualGoalSet
        ? annualPercentValue >= 1
          ? messages.goalAnnualDone
          : annualPercentValue >= 0.5
            ? messages.goalAnnualHalf
            : ''
        : ''
    },
    {
      id: 'monthly',
      label: messages.monthlyGoal,
      current: `${messages.goalDividendMonthly}${formatCurrency(monthlyAverage)}`,
      target: `${messages.goalTargetMonthly}${monthlyGoalSet ? formatCurrency(monthlyGoal) : placeholder}`,
      percent: monthlyPercentValue,
      percentLabel: monthlyGoalSet
        ? `${Math.min(100, Math.round(monthlyPercentValue * 100))}%`
        : placeholder,
      encouragement: monthlyGoalSet
        ? monthlyPercentValue >= 1
          ? messages.goalMonthlyDone
          : monthlyPercentValue >= 0.5
            ? messages.goalMonthlyHalf
            : ''
        : ''
    }
  ];

  const emptyState = !annualGoalSet && !monthlyGoalSet ? messages.goalEmpty || '' : '';

  return {
    metrics,
    rows,
    emptyState
  };
}
