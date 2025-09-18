const STORAGE_KEY = 'investment_goals';

const defaultGoals = {
  totalTarget: 0,
  monthlyTarget: 0,
  goalName: ''
};

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
    const goalName = typeof parsed.goalName === 'string' ? parsed.goalName : '';
    return {
      totalTarget: Number.isFinite(totalTarget) ? totalTarget : 0,
      monthlyTarget: Number.isFinite(monthlyTarget) ? monthlyTarget : 0,
      goalName: goalName.trim().slice(0, 60)
    };
  } catch {
    return { ...defaultGoals };
  }
}

export function saveInvestmentGoals(goals) {
  if (typeof localStorage === 'undefined') return;
  const payload = {
    totalTarget: Number.isFinite(Number(goals.totalTarget)) ? Number(goals.totalTarget) : 0,
    monthlyTarget: Number.isFinite(Number(goals.monthlyTarget)) ? Number(goals.monthlyTarget) : 0,
    goalName: typeof goals.goalName === 'string' ? goals.goalName.trim().slice(0, 60) : ''
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors (quota, privacy mode, etc.)
  }
}
