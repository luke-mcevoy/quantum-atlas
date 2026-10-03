import { useMemo } from "react";
import type { Index, Outcome, RoadmapDocument, Target, TrackCounts } from "../atlas";
import { nodeName } from "../atlas";
import {
  METRIC_KIND_LABEL, countsFor, dateNum, outcomeWord, plainQuote, rateSummary, slipPoints,
} from "../display";
import { useStore } from "../store";

const COMPANY_COLOR = ["#4c90f0", "#f0b040", "#40c896", "#ec62c4", "#b084fa", "#f06c56", "#96d246", "#5ec8ff", "#f0c450", "#7d8a98", "#ec9a3c", "#6fdc9d", "#c4cedc", "#ec5458", "#8fb8f5"];

export function TrackCard({ idx, orgId, attached }: { idx: Index; orgId: string; attached?: TrackCounts }) {
  const rec = countsFor(idx, orgId, attached);
  const view = rateSummary(rec);
  const select = useStore((s) => s.select);
  const set = useStore((s) => s.set);
  return (
    <section className="track-card" aria-label="Track record">
      <h4>Track record</h4>
      <p>{view.sentence}</p>
      {!view.showRates && (
        <ul className="track-items">
          {rec.items.map((id) => {
            const o = idx.outcome.get(id);
            const t = o ? idx.target.get(o.target) : undefined;
            return (
              <li key={id}>
                <button className="link" onClick={() => select(o?.target ?? id)}>
                  {t?.statement ?? id}
                  {o ? <span className="muted"> · {outcomeWord(o.result)}</span> : null}
                </button>
              </li>
            );
          })}
          {!rec.items.length && <li className="muted small">No items are published in this count.</li>}
        </ul>
      )}
      {view.showRates && (
        <ul className="track-items">
          {rec.items.map((id) => {
            const o = idx.outcome.get(id);
            const t = o ? idx.target.get(o.target) : undefined;
            return <li key={id}><button className="link" onClick={() => select(o?.target ?? id)}>{t?.statement ?? id}</button></li>;
          })}
        </ul>
      )}
      <button className="linkish" onClick={() => set({ mode: "track", trackOrg: orgId })}>Open the ledger</button>
    </section>
  );
}

function companiesOf(idx: Index): string[] {
  const ids = new Set<string>([
    ...Object.keys(idx.atlas.track_record?.companies ?? {}),
    ...(idx.atlas.roadmap_docs ?? []).map((d) => d.org),
    ...(idx.atlas.projections ?? []).map((p) => p.org),
  ]);
  for (const o of idx.atlas.outcomes ?? []) {
    const org = idx.target.get(o.target)?.org;
    if (org) ids.add(org);
  }
  return [...ids].sort((a, b) => nodeName(idx, a).localeCompare(nodeName(idx, b)));
}

function searchTitle(o: Outcome): string {
  if (o.result !== "no_delivery_found") return outcomeWord(o.result);
  const asOf = o.search_log?.as_of;
  const where = o.search_log?.checked?.length ? ` Checked: ${o.search_log.checked.join("; ")}` : "";
  return `No delivery found in the sources checked${asOf ? ` as of ${asOf}` : ""}.${where}`;
}

function LedgerDoc({ idx, doc, x0, span }: { idx: Index; doc: RoadmapDocument; x0: number; span: number }) {
  const groups = new Map<string, Target[]>();
  for (const id of doc.items) {
    const t = idx.target.get(id);
    if (!t) continue;
    const k = t.metric_kind ?? "other";
    const list = groups.get(k) ?? [];
    list.push(t);
    groups.set(k, list);
  }
  return (
    <section className="ledger-doc">
      <header>
        <b>{doc.title}</b>
        <span className="mono muted">{doc.published}</span>
        <span className={`doc-flag ${doc.completeness}`}>{doc.completeness === "partial" ? "Partial — excluded from the counts" : "All items in the document"}</span>
      </header>
      {[...groups.entries()].map(([kind, targets]) => (
        <div key={kind} className="ledger-group">
          <div className="muted small">{METRIC_KIND_LABEL[kind] ?? kind}</div>
          {targets.map((t) => <LedgerRow key={t.id} idx={idx} t={t} x0={x0} span={span} />)}
        </div>
      ))}
    </section>
  );
}

function LedgerRow({ idx, t, x0, span }: { idx: Index; t: Target; x0: number; span: number }) {
  const o = idx.outcomeByTarget.get(t.id);
  const start = dateNum(t.stated_on);
  const due = dateNum(t.due?.by ?? t.target_date);
  const resolved = o?.resolved_on ? dateNum(o.resolved_on) : undefined;
  const extend = o && (o.result === "met_late" || o.result === "partially_met") && resolved !== undefined ? Math.max(due, resolved) : due;
  const left = ((Math.min(start, due) - x0) / span) * 100;
  const width = Math.max(0.8, ((Math.max(extend, start) - Math.min(start, due)) / span) * 100);
  const next = t.superseded_by ? idx.target.get(t.superseded_by) : undefined;
  const nextX = next ? ((dateNum(next.due?.by ?? next.target_date) - x0) / span) * 100 : undefined;
  const mark = resolved !== undefined ? ((resolved - x0) / span) * 100 : undefined;
  const result = o?.result ?? "pending";
  return (
    <div className="ledger-row">
      <button className="ledger-label" onClick={() => useStore.getState().select(t.id)} title={t.statement}>
        <span>{t.statement}</span>
        <span className="mono muted">{outcomeWord(result)}{o?.slip_months !== undefined && o.result === "met_late" ? ` · ${o.slip_months} mo` : ""}</span>
      </button>
      <div className="ledger-track" aria-hidden>
        <i className={`ledger-bar r-${result}`} style={{ left: `${left}%`, width: `${width}%` }} />
        {next && nextX !== undefined && nextX > left + width && (
          <i className="ledger-jump" style={{ left: `${left + width}%`, width: `${nextX - (left + width)}%` }} title={`Revised. Next due ${next.due?.by ?? next.target_date}`} />
        )}
        {mark !== undefined && result !== "pending" && result !== "revised_before_due" && (
          <span className={`ledger-mark r-${result}`} style={{ left: `${mark}%` }} title={o ? searchTitle(o) : ""}>
            {result === "no_delivery_found" ? "⌀" : result === "acknowledged_missed" ? "✗" : result.startsWith("met") || result === "partially_met" ? "✓" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function SlipPlot({ idx }: { idx: Index }) {
  const points = useMemo(() => slipPoints(idx), [idx]);
  const orgs = useMemo(() => [...new Set(points.map((p) => p.org))].sort(), [points]);
  const color = (org: string) => COMPANY_COLOR[Math.max(0, orgs.indexOf(org)) % COMPANY_COLOR.length];
  if (!points.length) return <p className="muted small">No dated outcomes are published.</p>;
  const nums = points.flatMap((p) => [dateNum(p.promised), dateNum(p.actual)]);
  const t0 = Math.min(...nums);
  const t1 = Math.max(...nums);
  const span = Math.max(1, t1 - t0);
  const X = (d: string) => ((dateNum(d) - t0) / span) * 100;
  const Y = (d: string) => 100 - X(d);
  const byTarget = new Map(points.map((p) => [p.target, p]));
  return (
    <div className="slip">
      <svg viewBox="0 0 100 100" role="img" aria-label="Promised date versus actual date">
        <line x1="0" y1="100" x2="100" y2="0" className="slip-ontime" />
        {points.map((p) => {
          const nxt = p.next ? byTarget.get(p.next) : undefined;
          return nxt ? <line key={`${p.id}-link`} x1={X(p.promised)} y1={Y(p.actual)} x2={X(nxt.promised)} y2={Y(nxt.actual)} className="slip-link" /> : null;
        })}
        {points.map((p) => (
          <circle key={p.id} cx={X(p.promised)} cy={Y(p.actual)} r={p.result === "pending" ? 1.1 : 1.5} className={`slip-pt r-${p.result}`} fill={color(p.org)} stroke={color(p.org)}>
            <title>{`${nodeName(idx, p.org)} · promised ${p.promised} · ${p.result === "pending" ? "current" : "actual"} ${p.actual} · ${outcomeWord(p.result)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="slip-axis muted small"><span>Earlier promise</span><span>Later promise →</span></div>
      <p className="muted small">Promised date across, actual or current date up. The diagonal is on time. Colour is the company. A line joins a revision to the next date.</p>
      <ul className="slip-legend">
        {orgs.map((org) => <li key={org}><i style={{ background: color(org) }} />{nodeName(idx, org)}</li>)}
      </ul>
    </div>
  );
}

function ProjectionBars({ idx }: { idx: Index }) {
  const rows = (idx.atlas.projections ?? []).filter((p) => p.actual);
  if (!rows.length) return <p className="muted small">No projection in the atlas has both a projected figure and a reported figure.</p>;
  const byOrg = new Map<string, typeof rows>();
  for (const p of rows) {
    const list = byOrg.get(p.org) ?? [];
    list.push(p);
    byOrg.set(p.org, list);
  }
  return (
    <div className="proj">
      {[...byOrg.entries()].map(([org, list]) => (
        <section key={org}>
          <h4>{nodeName(idx, org)}</h4>
          {list.map((p) => {
            const a = p.projected.value;
            const b = p.actual!.value;
            const max = Math.max(Math.abs(a), Math.abs(b), 1);
            return (
              <div key={p.id} className="proj-pair">
                <div className="proj-label">{p.period} · {p.metric.replaceAll("_", " ")}</div>
                <div className="proj-bar"><i style={{ width: `${(Math.abs(a) / max) * 100}%` }} /><span className="mono">{a.toLocaleString()}</span><span className="muted"> projected</span></div>
                <div className="proj-bar actual"><i style={{ width: `${(Math.abs(b) / max) * 100}%` }} /><span className="mono">{b.toLocaleString()}</span><span className="muted"> reported</span></div>
                {p.projected.note && <div className="muted small">{plainQuote(p.projected.note)}</div>}
                {p.actual?.note && <div className="muted small">{plainQuote(p.actual.note)}</div>}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

const REV_LABEL = { retraction: "Retraction", correction: "Correction", expression_of_concern: "Expression of concern", published_rebuttal: "Published rebuttal" } as const;

export default function TrackRecord({ idx }: { idx: Index }) {
  const trackOrg = useStore((s) => s.trackOrg);
  const set = useStore((s) => s.set);
  const companies = useMemo(() => companiesOf(idx), [idx]);
  const orgId = trackOrg && companies.includes(trackOrg) ? trackOrg : companies[0];
  const docs = useMemo(() => (idx.atlas.roadmap_docs ?? []).filter((d) => d.org === orgId).slice().sort((a, b) => a.published.localeCompare(b.published)), [idx, orgId]);
  const loose = useMemo(() => {
    const inDoc = new Set(docs.flatMap((d) => d.items));
    return (idx.atlas.outcomes ?? [])
      .map((o) => idx.target.get(o.target))
      .filter((t): t is Target => !!t && t.org === orgId && !inDoc.has(t.id));
  }, [idx, orgId, docs]);
  const scale = useMemo(() => {
    const dates: number[] = [];
    const take = (t: Target) => {
      dates.push(dateNum(t.stated_on), dateNum(t.due?.by ?? t.target_date));
      const o = idx.outcomeByTarget.get(t.id);
      if (o?.resolved_on) dates.push(dateNum(o.resolved_on));
    };
    for (const d of docs) for (const id of d.items) { const t = idx.target.get(id); if (t) take(t); }
    for (const t of loose) take(t);
    if (!dates.length) return { x0: Date.UTC(2016, 0, 1), span: 1 };
    const x0 = Math.min(...dates);
    const x1 = Math.max(...dates, dateNum(idx.atlas.built_at.slice(0, 10)));
    return { x0, span: Math.max(1, x1 - x0) };
  }, [docs, loose, idx]);

  return (
    <aside className="panel mode-panel track-panel" aria-label="Track record">
      <h3>Track record</h3>
      <div className="chips-scroll scenario" role="tablist" aria-label="Company">
        {companies.map((id) => (
          <button key={id} role="tab" aria-selected={id === orgId} className={id === orgId ? "on" : ""} onClick={() => set({ trackOrg: id })}>{nodeName(idx, id)}</button>
        ))}
      </div>
      {orgId && <TrackCard idx={idx} orgId={orgId} />}
      <h4>Promise ledger</h4>
      <div className="ledger-scroll">
        <div className="ledger">
          {docs.map((d) => <LedgerDoc key={d.id} idx={idx} doc={d} x0={scale.x0} span={scale.span} />)}
          {!!loose.length && (
            <section className="ledger-doc">
              <header><b>Other published items</b><span className="doc-flag partial">Not grouped under a roadmap document</span></header>
              {loose.map((t) => <LedgerRow key={t.id} idx={idx} t={t} x0={scale.x0} span={scale.span} />)}
            </section>
          )}
          {!docs.length && !loose.length && <p className="muted small">No roadmap items are published for this company.</p>}
        </div>
      </div>
      <h4>Promised date versus actual date</h4>
      <SlipPlot idx={idx} />
      <h4>Projections versus reported figures</h4>
      <p className="muted small">Paired bars appear only where both a projected figure and a reported figure are published.</p>
      <ProjectionBars idx={idx} />
      <h4>Retractions and corrections</h4>
      <ul className="rev-list">
        {(idx.atlas.claim_revisions ?? []).slice().sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
          <li key={c.id}>
            <div className="rev-kicker"><span className="mono">{c.date}</span> · {REV_LABEL[c.kind]}</div>
            <div className="small muted">{c.subject}</div>
            <p>{c.statement}</p>
          </li>
        ))}
        {!(idx.atlas.claim_revisions ?? []).length && <li className="muted">None published.</li>}
      </ul>
    </aside>
  );
}
