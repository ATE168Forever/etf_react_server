// Pushes two SVG text-label y-positions apart when they'd otherwise overlap
// (e.g. a bar chart's value label and a line chart's value label sharing
// the same x-position). Preserves whichever label started smaller/higher;
// null/undefined values (a month with no value to label) pass through
// unchanged rather than being clamped against nothing.
export function separateLabelYs(yA, yB, minGap, floor = -Infinity) {
  if (yA == null || yB == null) return { yA, yB };

  const gap = Math.abs(yA - yB);
  if (gap >= minGap) return { yA, yB };

  const mid = (yA + yB) / 2;
  const aIsSmaller = yA <= yB;
  const smaller = Math.max(mid - minGap / 2, floor);
  const larger = smaller + minGap;
  return aIsSmaller ? { yA: smaller, yB: larger } : { yA: larger, yB: smaller };
}
