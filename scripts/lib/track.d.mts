export declare function dueEnd(targetDate: string): string;
export declare function slipMonths(dueBy: string, resolvedOn: string): number;
export declare function isStale(asOf: string, builtAt: string, days?: number): boolean;
export interface LedgerCounts {
  n: number;
  show_rates: boolean;
  on_time_or_early: number;
  late: number;
  partial: number;
  revised_before_due: number;
  acknowledged_missed: number;
  no_delivery_found: number;
  pending: number;
  late_slip_median?: number;
  late_slip_min?: number;
  late_slip_max?: number;
  items?: string[];
}
export declare function aggregate(items: { id?: string; result: string; slip_months?: number; metric_kind?: string }[]): LedgerCounts;
export declare function itemsFromCompleteDocs(
  docs: { completeness: string; items?: string[] }[],
  outcomes: { id: string; target: string; result: string; slip_months?: number }[],
  targets: Map<string, { org: string; metric_kind?: string }>,
): { id: string; org: string; result: string; slip_months?: number; metric_kind?: string }[];
