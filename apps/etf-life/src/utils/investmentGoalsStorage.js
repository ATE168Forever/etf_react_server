const STORAGE_KEY = 'investment_goals';
const GOAL_TYPES = ['annual', 'monthly', 'minimum', 'shares'];
const DEFAULT_GOAL_TYPE = 'annual';

const defaultGoals = {
  totalTarget: 0,
  monthlyTarget: 0,
  minimumTarget: 0,
  goalName: '',
  goalType: DEFAULT_GOAL_TYPE,
  shareTargets: []
};

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
    const totalTarget = Number(parsed.totalTarget);
    const monthlyTarget = Number(parsed.monthlyTarget);
    const minimumTarget = Number(parsed.minimumTarget);
    const goalTypeRaw = typeof parsed.goalType === 'string' ? parsed.goalType.toLowerCase() : '';
    const normalizedGoalType = GOAL_TYPES.includes(goalTypeRaw)
      ? goalTypeRaw
      : '';
    const goalName = typeof parsed.goalName === 'string' ? parsed.goalName : '';
    const shareTargets = normalizeShareTargets(parsed.shareTargets);
    const fallbackGoalType = () => {
      if (Number.isFinite(totalTarget) && totalTarget > 0) return 'annual';
      if (Number.isFinite(monthlyTarget) && monthlyTarget > 0) return 'monthly';
      if (Number.isFinite(minimumTarget) && minimumTarget > 0) return 'minimum';
      if (shareTargets.length > 0) return 'shares';
      return DEFAULT_GOAL_TYPE;
    };
    return {
      totalTarget: Number.isFinite(totalTarget) ? totalTarget : 0,
      monthlyTarget: Number.isFinite(monthlyTarget) ? monthlyTarget : 0,
      minimumTarget: Number.isFinite(minimumTarget) ? minimumTarget : 0,
      goalName: goalName.trim().slice(0, 60),
      goalType: normalizedGoalType || fallbackGoalType(),
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
  const payload = {
    totalTarget: Number.isFinite(Number(goals.totalTarget)) ? Number(goals.totalTarget) : 0,
    monthlyTarget: Number.isFinite(Number(goals.monthlyTarget)) ? Number(goals.monthlyTarget) : 0,
    minimumTarget: Number.isFinite(Number(goals.minimumTarget)) ? Number(goals.minimumTarget) : 0,
    goalName: typeof goals.goalName === 'string' ? goals.goalName.trim().slice(0, 60) : '',
    goalType,
    shareTargets: normalizeShareTargets(goals.shareTargets)
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors (quota, privacy mode, etc.)
  }
}
