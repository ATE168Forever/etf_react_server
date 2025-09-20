const STORAGE_KEY = 'investment_goals';

const defaultGoals = {
  totalTarget: 0,
  monthlyTarget: 0,
  minimumTarget: 0,
  goalName: '',
  goalType: 'annual',
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
    const normalizedGoalType = ['annual', 'monthly', 'minimum'].includes(goalTypeRaw)
      ? goalTypeRaw
      : '';
    const goalName = typeof parsed.goalName === 'string' ? parsed.goalName : '';
    return {
      totalTarget: Number.isFinite(totalTarget) ? totalTarget : 0,
      monthlyTarget: Number.isFinite(monthlyTarget) ? monthlyTarget : 0,
      minimumTarget: Number.isFinite(minimumTarget) ? minimumTarget : 0,
      goalName: goalName.trim().slice(0, 60),
      goalType: normalizedGoalType
        || (Number.isFinite(totalTarget) && totalTarget > 0
          ? 'annual'
          : Number.isFinite(monthlyTarget) && monthlyTarget > 0
            ? 'monthly'
            : Number.isFinite(minimumTarget) && minimumTarget > 0
              ? 'minimum'
              : 'annual'),
      shareTargets: normalizeShareTargets(parsed.shareTargets)
    };
  } catch {
    return { ...defaultGoals };
  }
}

export function saveInvestmentGoals(goals) {
  if (typeof localStorage === 'undefined') return;
  const rawType = typeof goals.goalType === 'string' ? goals.goalType.toLowerCase() : '';
  const goalType = ['annual', 'monthly', 'minimum'].includes(rawType) ? rawType : 'annual';
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
