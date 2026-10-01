import { useMemo, useState, type ReactNode } from "react";
import { type Index, type Evidence, nodeName, formatMoney, locateAny, timeOf, allEvidence } from "../atlas";
import { MODALITY_LABEL, DOC_LABEL, ROUTE_LABEL, TIER_ACCESS_LABEL, REL_LABEL, PEER_LABEL, SIM_LABEL } from "../theme";
import { useStore, type Mode } from "../store";

type Tab = "systems" | "orgs" | "milestones" | "targets" | "access" | "relationships" | "sources";

interface Col<R> { key: string; label: string; get: (r: R) => string | number; render?: (r: R) => ReactNode; num?: boolean; width?: string }
interface Spec<R> { rows: R[]; cols: Col<R>[]; id: (r: R) => string; evidence?: (r: R) => Evidence[]; url?: (r: R) => string; mode?: Mode }

const review = (r: { review: string }) => r.review;
const TABS: [Tab, string][] = [["systems", "Systems"], ["orgs", "Organisations"], ["milestones", "Achieved"], ["targets", "Targets"],
  ["access", "Access"], ["relationships", "Deals & awards"], ["sources", "Sources"]];

export default function DataTable({ idx }: { idx: Index }) {
  const { dataOpen, set, select, focus } = useStore();
  const [tab, setTab] = useState<Tab>("systems");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const citedBy = useMemo(() => {
    const m = new Map<string, number>();
    const a = idx.atlas;
    for (const e of [...a.systems, ...a.milestones, ...a.targets, ...a.access, ...a.relationships, ...a.sites, ...a.orgs])
      for (const ev of allEvidence(e as never)) m.set(ev.source, (m.get(ev.source) ?? 0) + 1);
    return m;
  }, [idx]);

  const spec = useMemo((): Spec<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const a = idx.atlas;
    switch (tab) {
      case "systems": return {
        rows: a.systems, id: (r) => r.id, evidence: (r) => allEvidence(r), mode: "modality",
        cols: [
          { key: "name", label: "System", get: (r) => r.name, width: "16%" },
          { key: "op", label: "Operator", get: (r) => nodeName(idx, r.operator) },
          { key: "mod", label: "Modality", get: (r) => MODALITY_LABEL[r.modality as keyof typeof MODALITY_LABEL] },
          { key: "status", label: "Status", get: (r) => r.status },
          { key: "q", label: "Physical qubits (stated)", num: true, get: (r) => r.physical_qubits?.value ?? "" },
          { key: "lq", label: "Logical (stated, code)", get: (r) => (r.logical_qubits ? `${r.logical_qubits.value} · ${r.logical_qubits.code}` : "") },
          { key: "metrics", label: "Metrics (as stated)", get: (r) => (r.metrics ?? []).map((m: { name: string; value: number; unit: string }) => `${m.name}: ${m.value}${m.unit}`).join("; "), width: "18%" },
          { key: "where", label: "Location", get: (r) => (r.location_basis === "site" ? nodeName(idx, r.site) : `HQ (${r.country})`) },
          { key: "review", label: "Review", get: review },
        ] };
      case "orgs": return {
        rows: a.orgs, id: (r) => r.id, evidence: (r) => r.evidence, mode: "modality",
        cols: [
          { key: "name", label: "Organisation", get: (r) => r.name, width: "22%" },
          { key: "kind", label: "Kind", get: (r) => r.kind.replace("_", " ") },
          { key: "cc", label: "Country", get: (r) => r.country },
          { key: "mods", label: "Modalities", get: (r) => r.modalities.map((m: keyof typeof MODALITY_LABEL) => MODALITY_LABEL[m]).join(", ") },
          { key: "sys", label: "Systems", num: true, get: (r) => idx.systemsByOrg.get(r.id)?.length ?? 0 },
          { key: "ms", label: "Achieved", num: true, get: (r) => idx.msByOrg.get(r.id)?.length ?? 0 },
          { key: "tg", label: "Targets", num: true, get: (r) => idx.tgtByOrg.get(r.id)?.length ?? 0 },
          { key: "tick", label: "Tickers", get: (r) => (r.tickers ?? []).join(" ") },
        ] };
      case "milestones": return {
        rows: a.milestones, id: (r) => r.id, evidence: (r) => r.evidence, mode: "roadmap",
        cols: [
          { key: "date", label: "Date", get: (r) => r.date },
          { key: "orgs", label: "Credited to", get: (r) => r.orgs.map((o: string) => nodeName(idx, o)).join(", ") },
          { key: "claim", label: "Claim", get: (r) => r.claim, width: "42%" },
          { key: "peer", label: "Peer review", get: (r) => PEER_LABEL[r.peer_review as keyof typeof PEER_LABEL] },
          { key: "cat", label: "Category", get: (r) => r.category.replace("_", " ") },
          { key: "review", label: "Review", get: review },
        ] };
      case "targets": return {
        rows: a.targets, id: (r) => r.id, evidence: (r) => r.evidence, mode: "roadmap",
        cols: [
          { key: "org", label: "Organisation", get: (r) => nodeName(idx, r.org) },
          { key: "stmt", label: "Target (as stated)", get: (r) => r.statement, width: "42%" },
          { key: "due", label: "Due", get: (r) => r.target_date },
          { key: "stated", label: "Stated", get: (r) => r.stated_on },
          { key: "status", label: "Status", get: (r) => r.status },
          { key: "rev", label: "Revised by", get: (r) => (r.superseded_by ? idx.target.get(r.superseded_by)?.stated_on ?? "" : "") },
          { key: "review", label: "Review", get: review },
        ] };
      case "access": return {
        rows: a.access, id: (r) => r.id, evidence: (r) => r.evidence, mode: "access",
        cols: [
          { key: "plat", label: "Platform", get: (r) => r.platform_name },
          { key: "sys", label: "Machine", get: (r) => (r.system ? nodeName(idx, r.system) : r.system_hint) },
          { key: "route", label: "Route", get: (r) => ROUTE_LABEL[r.route] ?? r.route },
          { key: "tier", label: "Tier", get: (r) => TIER_ACCESS_LABEL[r.tier as keyof typeof TIER_ACCESS_LABEL] },
          { key: "sdks", label: "SDKs", get: (r) => r.sdks.join(", ") },
          { key: "auth", label: "Auth", get: (r) => r.auth_model, width: "16%" },
          { key: "sim", label: "Example", get: (r) => (r.snippet ? SIM_LABEL[r.snippet.sim_check.status as keyof typeof SIM_LABEL] : "") },
          { key: "docs", label: "Docs", get: (r) => r.docs_url, render: (r) => <a href={r.docs_url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>docs ↗</a> },
        ] };
      case "relationships": return {
        rows: a.relationships, id: (r) => r.id, evidence: (r) => r.evidence, mode: "modality",
        cols: [
          { key: "from", label: "From", get: (r) => nodeName(idx, r.from) },
          { key: "to", label: "To", get: (r) => nodeName(idx, r.to) },
          { key: "kind", label: "Kind", get: (r) => REL_LABEL[r.kind] ?? r.kind },
          { key: "amt", label: "Amount (as stated)", num: true, get: (r) => r.amount?.value ?? 0, render: (r) => (r.amount ? formatMoney(r.amount) : "") },
          { key: "date", label: "Date", get: (r) => r.date },
          { key: "prog", label: "Programme", get: (r) => r.program ?? "" },
          { key: "desc", label: "Description", get: (r) => r.description, width: "30%" },
        ] };
      case "sources": return {
        rows: a.sources, id: (r) => r.id, url: (r) => r.url,
        cols: [
          { key: "title", label: "Document", get: (r) => r.title, width: "34%" },
          { key: "pub", label: "Publisher", get: (r) => r.publisher },
          { key: "type", label: "Type", get: (r) => DOC_LABEL[r.doc_type] ?? r.doc_type },
          { key: "tier", label: "Tier", num: true, get: (r) => r.tier },
          { key: "date", label: "Date", get: (r) => r.document_date },
          { key: "id", label: "DOI / arXiv / accession", get: (r) => r.doi ?? r.arxiv ?? r.identifier ?? "" },
          { key: "cited", label: "Cited by", num: true, get: (r) => citedBy.get(r.id) ?? 0 },
        ] };
    }
  }, [tab, idx, citedBy]);

  const rows = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    let out = spec.rows;
    if (terms.length) out = out.filter((r) => { const t = spec.cols.map((c) => String(c.get(r))).join(" ").toLowerCase(); return terms.every((w) => t.includes(w)); });
    if (sort) {
      const c = spec.cols.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((x, y) => { const a = c.get(x), b = c.get(y); return (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))) * sort.dir; });
    }
    return out;
  }, [spec, q, sort]);

  if (!dataOpen) return null;

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const head = [...spec.cols.map((c) => c.label), "id", ...(spec.evidence ? ["source_urls", "quotes"] : spec.url ? ["url"] : [])];
    const lines = rows.map((r) => {
      const base = spec.cols.map((c) => (c.key === "amt" ? (r.amount ? formatMoney(r.amount) : "") : c.get(r)));
      const ev = spec.evidence?.(r) ?? [];
      const extra = spec.evidence
        ? [ev.map((e) => idx.source.get(e.source)?.url).filter(Boolean).join(" | "), ev.map((e) => e.quote).join(" | ")]
        : spec.url ? [spec.url(r)] : [];
      return [...base, spec.id(r), ...extra].map(esc).join(",");
    });
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `quantum-computing-atlas-${tab}-${idx.atlas.built_at.slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(el.href);
  };

  const open = (r: { id: string }) => {
    if (tab === "sources") { const u = spec.url?.(r); if (u) window.open(u, "_blank", "noopener"); return; }
    set({ dataOpen: false, mode: spec.mode ?? "modality" });
    select(r.id);
    const m = idx.milestone.get(r.id);
    if (m) set({ roadmapDate: timeOf(m.date, false) + 864e5 });
    const anchor = m?.orgs[0] ?? idx.target.get(r.id)?.org ?? idx.access.get(r.id)?.system ?? idx.access.get(r.id)?.target_org ?? idx.rel.get(r.id)?.to ?? r.id;
    const p = locateAny(idx, anchor);
    if (p) focus(p[0], p[1]);
  };
  const count = (k: Tab) => (k === "milestones" ? idx.atlas.milestones.length : (idx.atlas as unknown as Record<string, unknown[]>)[k]?.length ?? 0);

  return (
    <div className="scrim data-scrim" onClick={() => set({ dataOpen: false })}>
      <section className="datatable" onClick={(e) => e.stopPropagation()} aria-label="Data table">
        <header className="dt-head">
          <nav className="dt-tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setSort(null); }}>
                {label} <span className="mono muted">{count(k)}</span>
              </button>
            ))}
          </nav>
          <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter rows" />
          <button className="dt-csv" onClick={exportCsv} title="Download the filtered rows, with source URLs and verbatim quotes">⇩ CSV ({rows.length})</button>
          <button className="close" onClick={() => set({ dataOpen: false })} aria-label="Close table">✕</button>
        </header>
        <div className="dt-scroll">
          <table>
            <thead>
              <tr>{spec.cols.map((c) => (
                <th key={c.key} style={{ width: c.width }} className={c.num ? "num" : ""}
                  onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: c.num ? -1 : 1 }))}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  {c.label}{sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={spec.id(r)} onClick={() => open(r)}>
                  {spec.cols.map((c) => (
                    <td key={c.key} className={`${c.num ? "num mono" : ""}${c.key === "review" ? ` rv-${c.get(r)}` : ""}`}>
                      {c.render ? c.render(r) : String(c.get(r))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="muted dt-empty">No rows match.</div>}
        </div>
        <footer className="dt-foot muted small">
          Click a row to show it on the globe (sources open the document). CSV includes each row's source URLs and verbatim quotes.
          Figures are as stated by each source; they are not comparable across vendors.
        </footer>
      </section>
    </div>
  );
}
