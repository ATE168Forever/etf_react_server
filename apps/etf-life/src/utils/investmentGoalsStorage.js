const STORAGE_KEY = 'investment_goals';
const GOAL_TYPES = ['annual', 'monthly', 'minimum', 'shares'];
const CASHFLOW_GOAL_TYPES = ['annual', 'monthly', 'minimum'];
const SUPPORTED_CURRENCIES = ['TWD', 'USD'];
const DEFAULT_GOAL_TYPE = 'annual';

let goalIdSeed = 0;

const defaultGoals = {
  goalName: '',
  cashflowGoals: [],
  goalType: DEFAULT_GOAL_TYPE,
  totalTarget: 0,
  monthlyTarget: 0,
  minimumTarget: 0,
  shareTargets: []
};

function generateGoalId() {
  goalIdSeed += 1;
  return `goal-${Date.now()}-${goalIdSeed}`;
}

function normalizeCurrency(value) {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return SUPPORTED_CURRENCIES.includes(raw) ? raw : 'TWD';
}

function normalizeGoalType(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CASHFLOW_GOAL_TYPES.includes(raw) ? raw : 'annual';
}

function sanitizeGoalName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 60);
}

function normalizeCashflowGoals(rawGoals) {
  if (!Array.isArray(rawGoals) || !rawGoals.length) {
    return [];
  }

  const seenIds = new Set();
  const normalized = [];

  rawGoals.forEach(goal => {
    const targetValue = Number(goal?.target);
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      return;
    }

    const type = normalizeGoalType(goal?.goalType);
    const currency = normalizeCurrency(goal?.currency);
    const idRaw = typeof goal?.id === 'string' ? goal.id.trim() : '';
    const id = idRaw && !seenIds.has(idRaw) ? idRaw : generateGoalId();
    seenIds.add(id);

    normalized.push({
      id,
      goalType: type,
      target: targetValue,
      currency,
      name: sanitizeGoalName(goal?.name)
    });
  });

  return normalized;
}

function buildLegacyCashflowGoals(parsed) {
  const legacy = [];

  const pushIfValid = (goalType, value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return;
    }
    legacy.push({
      id: generateGoalId(),
      goalType,
      target: numericValue,
      currency: 'TWD',
      name: ''
    });
  };

  pushIfValid('annual', parsed?.totalTarget);
  pushIfValid('monthly', parsed?.monthlyTarget);
  pushIfValid('minimum', parsed?.minimumTarget);

  return legacy;
}

function normalizeShareTargets(rawTargets) {
  if (!Array.isArray(rawTargets) || !rawTargets.length) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  rawTargets.forEach(item => {
    const stockId = typeof item?.stockId === 'string'
      ? item.stockId.trim().toUpperCase()
      : '';
    if (!stockId || seen.has(stockId)) return;

    const quantity = Number(item?.targetQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const stockName = typeof item?.stockName === 'string'
      ? item.stockName.trim().slice(0, 60)
      : '';

    normalized.push({
      stockId,
      stockName,
      targetQuantity: quantity
    });
    seen.add(stockId);
  });

  return normalized;
}

export function loadInvestmentGoals() {
  if (typeof localStorage === 'undefined') {
    return { ...defaultGoals };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultGoals };
    }
    const parsed = JSON.parse(raw);
    const goalTypeRaw = typeof parsed.goalType === 'string' ? parsed.goalType.toLowerCase() : '';
    const normalizedGoalType = GOAL_TYPES.includes(goalTypeRaw)
      ? goalTypeRaw
      : '';
    const goalName = sanitizeGoalName(parsed.goalName);
    const cashflowGoals = normalizeCashflowGoals(parsed.cashflowGoals);
    const shareTargets = normalizeShareTargets(parsed.shareTargets);
    const legacyGoals = cashflowGoals.length ? cashflowGoals : buildLegacyCashflowGoals(parsed);

    let legacyAnnual = 0;
    let legacyMonthly = 0;
    let legacyMinimum = 0;
    legacyGoals.forEach(goal => {
      if (goal.currency !== 'TWD') return;
      if (goal.goalType === 'annual' && !legacyAnnual) legacyAnnual = goal.target;
      if (goal.goalType === 'monthly' && !legacyMonthly) legacyMonthly = goal.target;
      if (goal.goalType === 'minimum' && !legacyMinimum) legacyMinimum = goal.target;
    });

    const fallbackGoalType = () => {
      if (legacyGoals.some(goal => goal.goalType === 'annual')) return 'annual';
      if (legacyGoals.some(goal => goal.goalType === 'monthly')) return 'monthly';
      if (legacyGoals.some(goal => goal.goalType === 'minimum')) return 'minimum';
      if (shareTargets.length > 0) return 'shares';
      return DEFAULT_GOAL_TYPE;
    };
    return {
      goalName,
      cashflowGoals: legacyGoals,
      goalType: normalizedGoalType || fallbackGoalType(),
      totalTarget: legacyAnnual,
      monthlyTarget: legacyMonthly,
      minimumTarget: legacyMinimum,
      shareTargets
    };
  } catch {
    return { ...defaultGoals };
  }
}

export function saveInvestmentGoals(goals) {
  if (typeof localStorage === 'undefined') return;
  const rawType = typeof goals.goalType === 'string' ? goals.goalType.toLowerCase() : '';
  const goalType = GOAL_TYPES.includes(rawType) ? rawType : DEFAULT_GOAL_TYPE;
  const cashflowGoals = normalizeCashflowGoals(goals.cashflowGoals);

  let legacyAnnual = 0;
  let legacyMonthly = 0;
  let legacyMinimum = 0;
  cashflowGoals.forEach(goal => {
    if (goal.currency !== 'TWD') return;
    if (goal.goalType === 'annual' && !legacyAnnual) legacyAnnual = goal.target;
    if (goal.goalType === 'monthly' && !legacyMonthly) legacyMonthly = goal.target;
    if (goal.goalType === 'minimum' && !legacyMinimum) legacyMinimum = goal.target;
  });

  const payload = {
    goalName: sanitizeGoalName(goals.goalName),
    goalType,
    cashflowGoals,
    totalTarget: legacyAnnual,
    monthlyTarget: legacyMonthly,
    minimumTarget: legacyMinimum,
    shareTargets: normalizeShareTargets(goals.shareTargets)
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors (quota, privacy mode, etc.)
  }
}
