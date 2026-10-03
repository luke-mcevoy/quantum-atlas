import { useMemo } from "react";
import type { AccessRoute, Index } from "../atlas";
import { locateAny, nodeName } from "../atlas";
import {
  PROBLEM_PICKS, availabilityLabel, limitsText, plainQuote, programText, routeMatchesProblem, type ProblemPick,
} from "../display";
import { useStore } from "../store";
import { HonestyPanel } from "./Honesty";

function machineName(idx: Index, route: AccessRoute): string {
  return route.system ? nodeName(idx, route.system) : (route.system_hint || nodeName(idx, route.target_org));
}

export default function RunToday({ idx }: { idx: Index }) {
  const problem = useStore((s) => s.problem);
  const set = useStore((s) => s.set);
  const select = useStore((s) => s.select);
  const focus = useStore((s) => s.focus);
  const selected = useStore((s) => s.selected);

  const rows = useMemo(() => {
    const cases = idx.atlas.use_cases ?? [];
    return idx.atlas.access
      .filter((r) => routeMatchesProblem(r, problem, cases))
      .slice()
      .sort((a, b) => machineName(idx, a).localeCompare(machineName(idx, b)) || a.platform_name.localeCompare(b.platform_name));
  }, [idx, problem]);

  const orgs = useMemo(() => {
    const ids = new Set<string>();
    for (const u of idx.atlas.use_cases ?? []) {
      if (problem === "all" || u.problem_class === problem) ids.add(u.platform);
    }
    return [...ids];
  }, [idx, problem]);

  const open = (route: AccessRoute) => {
    select(route.id);
    const anchor = route.system ?? route.target_org;
    const p = locateAny(idx, anchor);
    if (p) focus(p[0], p[1], 2.8);
  };

  return (
    <aside className="panel mode-panel today-panel" aria-label="Run today">
      <h3>Run today</h3>
      <div className="chips-scroll scenario" role="tablist" aria-label="Problem">
        {PROBLEM_PICKS.map((p) => (
          <button key={p.id} role="tab" aria-selected={problem === p.id} className={problem === p.id ? "on" : ""} onClick={() => set({ problem: p.id as ProblemPick })}>{p.label}</button>
        ))}
      </div>
      <p className="muted small spof-note">{rows.length} machine {rows.length === 1 ? "route" : "routes"}{problem === "all" ? "" : " for this problem class"}.</p>
      <div className="today-scroll">
        <table className="today-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Availability</th>
              <th>Program model</th>
              <th>Platform</th>
              <th>SDK</th>
              <th>Limits</th>
              <th>Pricing</th>
              <th>Last confirmed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`today-row${selected === r.id ? " on" : ""}`} onClick={() => open(r)}>
                <td>{machineName(idx, r)}</td>
                <td className={r.availability?.stale ? "avail-stale" : ""}>{availabilityLabel(r.availability ? { ...r.availability, tier: r.tier } : undefined)}</td>
                <td>{programText(r.program_models)}</td>
                <td>{r.platform_name}</td>
                <td>{r.sdks.join(", ") || "—"}</td>
                <td>{limitsText(r.limits)}</td>
                <td>{r.pricing ? plainQuote(r.pricing.quote) : "—"}</td>
                <td className="mono">{r.availability?.as_of ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="today-cards">
          {rows.map((r) => (
            <li key={r.id}>
              <button className={`today-card${selected === r.id ? " on" : ""}`} onClick={() => open(r)}>
                <b>{machineName(idx, r)}</b>
                <span className={r.availability?.stale ? "avail-stale" : ""}>{availabilityLabel(r.availability ? { ...r.availability, tier: r.tier } : undefined)}</span>
                <span className="muted">{r.platform_name} · {r.sdks.slice(0, 2).join(", ") || "SDK not recorded"}</span>
                <span className="muted small">{programText(r.program_models)}{r.availability?.as_of ? ` · ${r.availability.as_of}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
        {!rows.length && <p className="muted">No published route matches this problem class.</p>}
      </div>
      <HonestyPanel idx={idx} orgIds={orgs} problem={problem} includeMilestones={false} />
    </aside>
  );
}
