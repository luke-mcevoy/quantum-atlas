// Pure date and ledger helpers for the Run-today and Track-record features.
// The build calls these. Tests call them on fixtures. Nothing here reads the atlas.

/** "by 2023" is due on the last day of 2023. A year-month is due on the last day of that month. */
export function dueEnd(targetDate) {
  if (/^\d{4}$/.test(targetDate)) return `${targetDate}-12-31`;
  if (/^\d{4}-\d{2}$/.test(targetDate)) {
    const [y, m] = targetDate.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${targetDate}-${String(last).padStart(2, "0")}`;
  }
  return targetDate;
}

/** Whole months from the due date to the resolution date. Negative means early. */
export function slipMonths(dueBy, resolvedOn) {
  const [y1, m1, d1] = dueBy.split("-").map(Number);
  const [y2, m2, d2] = resolvedOn.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 - d1 >= 15) months += 1;
  else if (d1 - d2 >= 15) months -= 1;
  return months;
}

/** An availability date is stale when it is more than 45 days before the build date. */
export function isStale(asOf, builtAt, days = 45) {
  const a = Date.parse(String(asOf).slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(String(builtAt).slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return (b - a) / 86_400_000 > days;
}

function median(nums) {
  if (!nums.length) return undefined;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Counts over resolved ledger items. Rates are omitted when fewer than 3 items are resolved.
 * Pending items are counted but do not enter n.
 * @param {{ result: string, slip_months?: number, metric_kind?: string }[]} items
 */
export function aggregate(items) {
  const resolved = items.filter((i) => i.result !== "pending");
  const n = resolved.length;
  const count = (r) => resolved.filter((i) => i.result === r).length;
  const lateSlips = resolved.filter((i) => i.result === "met_late" && typeof i.slip_months === "number").map((i) => i.slip_months);
  const out = {
    n,
    show_rates: n >= 3,
    on_time_or_early: count("met_on_time") + count("met_early"),
    late: count("met_late"),
    partial: count("partially_met"),
    revised_before_due: count("revised_before_due"),
    acknowledged_missed: count("acknowledged_missed"),
    no_delivery_found: count("no_delivery_found"),
    pending: items.length - n,
  };
  if (lateSlips.length) {
    out.late_slip_median = median(lateSlips);
    out.late_slip_min = Math.min(...lateSlips);
    out.late_slip_max = Math.max(...lateSlips);
  }
  if (!out.show_rates) {
    out.items = items.map((i) => i.id).filter(Boolean);
  }
  return out;
}

/** Ledger items whose roadmap document was captured in full. Partial documents are excluded. */
export function itemsFromCompleteDocs(docs, outcomes, targets) {
  const complete = new Set(docs.filter((d) => d.completeness === "all_items").flatMap((d) => d.items ?? []));
  const byTarget = new Map(outcomes.map((o) => [o.target, o]));
  const items = [];
  for (const id of complete) {
    const t = targets.get(id);
    const o = byTarget.get(id);
    if (!t || !o) continue;
    items.push({ id: o.id, org: t.org, result: o.result, slip_months: o.slip_months, metric_kind: t.metric_kind });
  }
  return items;
}
