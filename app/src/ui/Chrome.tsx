import { useEffect, useMemo, useRef, useState } from "react";
import { MODALITIES, type Index, nodeName, locateAny, formatMoney, roadmapState, timeOf, orgModality, targetChain } from "../atlas";
import { MODALITY_COLOR, MODALITY_LABEL, MODALITY_CODE, DOC_LABEL, ROUTE_LABEL, ROUTE_COLOR, TIER_ACCESS_LABEL, REL_LABEL, REL_COLOR, PEER_LABEL, css } from "../theme";
import { useStore, type Mode } from "../store";

// ─── Top bar ────────────────────────────────────────────────────────────────

export function TopBar({ idx }: { idx: Index }) {
  const { mode, setMode, set } = useStore();
  const modes: [Mode, string, string][] = [
    ["modality", "Modality", "Machines coloured by qubit technology, where they physically are"],
    ["roadmap", "Roadmap", "What has been achieved vs what is targeted, over time"],
    ["access", "Access", "Which cloud platforms reach which machines, and how to submit a program"],
    ["today", "Run today", "Which machines accept a problem now, with a tested example, pricing and limits"],
    ["track", "Track record", "What past roadmaps and investor projections delivered"],
  ];
  const peer = idx.atlas.milestones.filter((m) => m.peer_review === "peer_reviewed").length;
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.1" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.1" transform="rotate(-60 12 12)" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /></svg>
        <span className="brand-name">QUANTUM COMPUTING ATLAS</span>
        {idx.atlas.draft && <span className="draft-flag" title="Built with --draft: includes unverified research. Not for publication.">DRAFT BUILD</span>}
      </div>
      <nav className="modes" role="tablist">
        {modes.map(([m, label, title]) => (
          <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} title={title} onClick={() => setMode(m)}>{label}</button>
        ))}
      </nav>
      <div className="top-right">
        <button className="walk-btn story-btn" onClick={() => set({ storyPicker: true })} title="Guided stories with verbatim, sourced quotes">◆ <span>Stories</span></button>
        <button className="search-btn" onClick={() => set({ paletteOpen: true })}><span>Search</span><kbd>⌘K</kbd></button>
        <div className="meta mono" title="Machines, documented achievements (peer-reviewed share) and cited documents">
          {idx.atlas.systems.length} SYSTEMS · {idx.atlas.milestones.length} ACHIEVED ({peer} PEER-REVIEWED) · {idx.atlas.sources.length} SOURCES
        </div>
        <button className="about-btn data-btn" onClick={() => set({ dataOpen: true })} title="Every system, milestone, target, access route and source as a sortable table, with CSV export">Data</button>
        <button className="about-btn" onClick={() => set({ aboutOpen: true })}>Method</button>
      </div>
    </header>
  );
}

// ─── Left rail ──────────────────────────────────────────────────────────────

export function Rail({ idx }: { idx: Index }) {
  const s = useStore();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const y of idx.atlas.systems) m.set(y.modality, (m.get(y.modality) ?? 0) + 1);
    return m;
  }, [idx]);
  const largest = useMemo(() => MODALITIES.flatMap((m) => {
    if (!s.modalities.has(m)) return [];
    const top = idx.atlas.systems.filter((y) => y.modality === m && y.physical_qubits)
      .sort((a, b) => b.physical_qubits!.value - a.physical_qubits!.value)[0];
    return top ? [top] : [];
  }), [idx, s.modalities]);
  if (s.mode === "today" || s.mode === "track") return null;
  if (!s.railOpen) return <button className="rail-toggle" onClick={() => s.set({ railOpen: true })} aria-label="Open panel">☰</button>;
  return (
    <aside className="panel rail">
      <button className="close" onClick={() => s.set({ railOpen: false })} aria-label="Collapse panel">‹</button>
      <h3>Modalities</h3>
      <ol className="chain">
        {MODALITIES.map((m) => {
          const on = s.modalities.has(m);
          return (
            <li key={m} className={on ? "" : "off"}>
              <button className="stage" onClick={() => s.toggleModality(m)} onDoubleClick={() => s.soloModality(m)} title="Click to toggle · double-click to solo">
                <span className="stage-n mono">{MODALITY_CODE[m]}</span>
                <i className="swatch" style={{ background: css(MODALITY_COLOR[m]), boxShadow: on ? `0 0 10px ${css(MODALITY_COLOR[m], 0.6)}` : "none" }} />
                <span className="stage-name">{MODALITY_LABEL[m]}</span>
                <span className="stage-count mono">{counts.get(m) ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <button className="rail-data" onClick={() => s.set({ dataOpen: true })}>▦ Open data table · CSV</button>

      <h3>Show</h3>
      <label className="check"><input type="checkbox" checked={s.showAnnounced} onChange={(e) => s.set({ showAnnounced: e.target.checked })} /> Announced systems <span className="muted">(hollow)</span></label>
      <label className="check"><input type="checkbox" checked={s.showRetired} onChange={(e) => s.set({ showRetired: e.target.checked })} /> Retired systems</label>
      <label className="check"><input type="checkbox" checked={s.showFlagged} onChange={(e) => s.set({ showFlagged: e.target.checked })} /> Flagged items</label>
      <label className="check"><input type="checkbox" checked={s.showRelationships} onChange={(e) => s.set({ showRelationships: e.target.checked })} /> Acquisitions, partnerships, awards <span className="muted">(Modality view)</span></label>

      {s.mode === "access" && (
        <>
          <h3>Access tier</h3>
          {(["open_free", "paid", "application", "restricted"] as const).map((t) => (
            <label key={t} className="check"><input type="checkbox" checked={s.accessTiers.has(t)} onChange={() => {
              const n = new Set(s.accessTiers); if (n.has(t)) n.delete(t); else n.add(t); s.set({ accessTiers: n });
            }} /> {TIER_ACCESS_LABEL[t]} <span className="muted mono">{idx.atlas.access.filter((a) => a.tier === t).length}</span></label>
          ))}
        </>
      )}

      <h3 title="The largest count each modality states for itself. These numbers are not comparable across modalities.">Largest stated count in each modality</h3>
      <div className="muted small spof-note">One machine per modality, using that source’s own count. A qubit count is not a measure of capability, and these numbers are not comparable with each other.</div>
      <ol className="choke">
        {largest.slice(0, 10).map((y) => {
          const p = locateAny(idx, y.id);
          return (
            <li key={y.id}>
              <button onClick={() => { s.select(y.id); if (p) s.focus(p[0], p[1], 2.8); }}>
                <i className="dot" style={{ background: css(MODALITY_COLOR[y.modality]) }} />
                <span className="choke-name">{y.name}<span className="muted small"> · {MODALITY_LABEL[y.modality]} · {nodeName(idx, y.operator)}{y.status !== "online" ? ` · ${y.status}` : ""}</span></span>
                <span className="mono choke-n">{y.physical_qubits!.value.toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

// ─── Hover tooltip ──────────────────────────────────────────────────────────

export function Tooltip({ idx }: { idx: Index }) {
  const hover = useStore((s) => s.hover);
  const mode = useStore((s) => s.mode);
  const date = useStore((s) => s.roadmapDate);
  if (!hover) return null;
  const { id, x, y } = hover;
  let title = "", sub = "", color = "";
  const sys = idx.system.get(id), org = idx.org.get(id), acc = idx.access.get(id), rel = idx.rel.get(id);
  if (sys) {
    title = sys.name;
    sub = `${MODALITY_LABEL[sys.modality]} · ${nodeName(idx, sys.operator)} · ${sys.status}${sys.physical_qubits ? ` · ${sys.physical_qubits.value.toLocaleString()} qubits (stated)` : ""}${sys.location_basis === "hq" ? " · at HQ" : ""}`;
    color = css(MODALITY_COLOR[sys.modality]);
  } else if (acc) {
    title = `${acc.platform_name} → ${acc.system ? nodeName(idx, acc.system) : acc.system_hint}`;
    sub = `${TIER_ACCESS_LABEL[acc.tier]} · ${acc.sdks.slice(0, 3).join(", ")}`;
    color = css(ROUTE_COLOR[acc.route] ?? [200, 200, 200]);
  } else if (rel) {
    title = `${REL_LABEL[rel.kind]}${rel.amount ? ` · ${formatMoney(rel.amount)}` : ""}`;
    sub = `${nodeName(idx, rel.from)} → ${nodeName(idx, rel.to)} · ${rel.date}`;
    color = css(REL_COLOR[rel.kind] ?? [200, 200, 200]);
  } else if (org) {
    title = org.name;
    if (mode === "roadmap") {
      const st = roadmapState(idx, date);
      const a = st.achieved.filter((m) => m.orgs.includes(id)).length, p = st.pending.filter((t) => t.org === id).length;
      sub = `${a} achieved by ${new Date(date).toISOString().slice(0, 7)} · ${p} open target${p === 1 ? "" : "s"}`;
    } else sub = `${org.country}${org.modalities.length ? " · " + org.modalities.map((m) => MODALITY_LABEL[m]).join(", ") : ""}`;
    const m = orgModality(idx, id);
    color = m ? css(MODALITY_COLOR[m]) : "";
  } else title = nodeName(idx, id);
  return (
    <div className="tooltip" style={{ left: x + 14, top: y + 14, borderLeftColor: color || undefined }}>
      <div className="tt-title">{title}</div>
      <div className="tt-sub">{sub}</div>
    </div>
  );
}

// ─── Bottom: legend / roadmap timeline ──────────────────────────────────────

export function Bottom({ idx }: { idx: Index }) {
  const mode = useStore((s) => s.mode);
  const story = useStore((s) => !!s.story);
  if (story || mode === "today" || mode === "track") return null;
  if (mode === "roadmap") return <Timeline idx={idx} />;
  return (
    <div className="legend">
      {mode === "modality" ? (
        <>
          <span><i className="lg-dot" style={{ background: "#4c90f0" }} /> Machine at a documented site</span>
          <span><i className="lg-dot" style={{ background: "rgba(76,144,240,.6)" }} /> Drawn at HQ (site undocumented)</span>
          <span><i className="lg-dot ring" style={{ borderColor: "#4c90f0", background: "transparent" }} /> Announced</span>
          <span><i className="lg-dot ring" /> Amber ring = flagged</span>
          <span className="muted">Size ∝ log₂(stated qubits)</span>
          <span><i className="lg-line" style={{ background: "#f0c450" }} /> Acquisition</span>
          <span><i className="lg-line" style={{ background: "#60a0ff" }} /> Gov. award / contract</span>
          <span><i className="lg-line dashed" /> Partnership</span>
        </>
      ) : (
        <>
          {Object.entries(ROUTE_LABEL).filter(([k]) => idx.atlas.access.some((a) => a.route === k)).map(([k, label]) => (
            <span key={k}><i className="lg-line" style={{ background: css(ROUTE_COLOR[k]) }} /> {label}</span>
          ))}
          <span><i className="lg-line dashed" /> By application / restricted</span>
          <span><i className="lg-dot ring" style={{ borderColor: "#f0c450", background: "#10141a" }} /> Platform</span>
        </>
      )}
    </div>
  );
}

const T0 = Date.UTC(2016, 0, 1);
const T1 = Date.UTC(2036, 0, 1);

export function Timeline({ idx }: { idx: Index }) {
  const { roadmapDate, set, select, selected, modalities } = useStore();
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = (t: number) => ((Math.max(T0, Math.min(T1, t)) - T0) / (T1 - T0)) * 100;
  const st = useMemo(() => roadmapState(idx, roadmapDate), [idx, roadmapDate]);
  const vis = (orgId: string) => { const m = orgModality(idx, orgId); return !m || modalities.has(m); };
  const ms = useMemo(() => idx.atlas.milestones.filter((m) => vis(m.orgs[0])), [idx, modalities]); // eslint-disable-line react-hooks/exhaustive-deps
  const tg = useMemo(() => idx.atlas.targets.filter((t) => vis(t.org)), [idx, modalities]); // eslint-disable-line react-hooks/exhaustive-deps
  const links = useMemo(() => tg.filter((t) => t.superseded_by && idx.target.has(t.superseded_by)).map((t) => [t, idx.target.get(t.superseded_by!)!] as const), [tg, idx]);
  const drag = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    set({ roadmapDate: T0 + f * (T1 - T0) });
  };
  const years: number[] = [];
  for (let y = 2016; y <= 2035; y++) years.push(y);
  const sel = selected && idx.target.get(selected);
  const chainIds = new Set(sel ? targetChain(idx, sel).map((x) => x.id) : []);
  return (
    <div className="timeline roadmap-tl">
      <div className="tl-head">
        <span className="mono">{new Date(roadmapDate).toISOString().slice(0, 10)}</span>
        <span className="muted"><b className="t-ach">{st.achieved.length}</b> achieved by this date · <b className="t-tgt">{st.pending.length}</b> stated targets still ahead · filled = achieved (documented) · hollow ◇ = target (a plan, not a result) · dotted = target revised</span>
        <button className="linkish" onClick={() => set({ roadmapDate: Date.now() })}>Today</button>
      </div>
      <div className="tl-track road" ref={trackRef}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons) drag(e.clientX); }}>
        {years.map((y) => <span key={y} className={`tl-year mono${y % 2 ? " odd" : ""}`} style={{ left: `${pct(Date.UTC(y, 0, 1))}%` }}>{y}</span>)}
        <span className="lane-label ach">ACHIEVED</span>
        <span className="lane-label tgt">TARGETED</span>
        <div className="tl-today" style={{ left: `${pct(Date.now())}%` }} title="Today" />
        <svg className="tl-links" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
          {links.map(([a, b]) => (
            <line key={a.id} x1={pct(timeOf(a.target_date))} x2={pct(timeOf(b.target_date))} y1={5} y2={5} className={chainIds.has(a.id) ? "on" : ""} />
          ))}
        </svg>
        {ms.map((m) => {
          const mod = orgModality(idx, m.orgs[0]);
          return (
            <button key={m.id} className={`tl-tick ms achieved p-${m.peer_review}${selected === m.id ? " sel" : ""}`} style={{ left: `${pct(timeOf(m.date, false))}%`, background: mod ? css(MODALITY_COLOR[mod]) : undefined }}
              title={`${m.date} · ${nodeName(idx, m.orgs[0])} · ${PEER_LABEL[m.peer_review]}\n${m.claim}`}
              onClick={(e) => { e.stopPropagation(); set({ roadmapDate: timeOf(m.date, false) + 864e5 }); select(m.id); }} />
          );
        })}
        {tg.map((t) => (
          <button key={t.id} className={`tl-tick tgt st-${t.status}${selected === t.id || chainIds.has(t.id) ? " sel" : ""}`} style={{ left: `${pct(timeOf(t.target_date))}%` }}
            title={`Target · due ${t.target_date} · stated ${t.stated_on} · ${t.status}\n${t.statement}`}
            onClick={(e) => { e.stopPropagation(); select(t.id); }} />
        ))}
        <div className="tl-cursor" style={{ left: `${pct(roadmapDate)}%` }} />
      </div>
    </div>
  );
}

// ─── ⌘K palette ─────────────────────────────────────────────────────────────

interface Hit { id: string; label: string; sub: string; kind: string; mode?: Mode }

export function Palette({ idx }: { idx: Index }) {
  const { paletteOpen, set, select, focus } = useStore();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const all: Hit[] = useMemo(() => [
    ...idx.atlas.systems.map((y) => ({ id: y.id, label: y.name, sub: `${MODALITY_LABEL[y.modality]} · ${nodeName(idx, y.operator)} · ${y.status}`, kind: "SYS" })),
    ...idx.atlas.orgs.map((o) => ({ id: o.id, label: o.name, sub: `${o.kind.replace("_", " ")} · ${o.country}`, kind: "ORG" })),
    ...idx.atlas.milestones.map((m) => ({ id: m.id, label: m.claim, sub: `${m.date} · ${m.orgs.map((o) => nodeName(idx, o)).join(", ")} · ${PEER_LABEL[m.peer_review]}`, kind: "DONE", mode: "roadmap" as Mode })),
    ...idx.atlas.targets.map((t) => ({ id: t.id, label: t.statement, sub: `target · due ${t.target_date} · ${t.status}`, kind: "TGT", mode: "roadmap" as Mode })),
    ...idx.atlas.access.map((a) => ({ id: a.id, label: `${a.platform_name} → ${a.system ? nodeName(idx, a.system) : a.system_hint}`, sub: `${TIER_ACCESS_LABEL[a.tier]} · ${a.sdks.join(", ")}`, kind: "ACC", mode: "access" as Mode })),
    ...idx.atlas.relationships.map((r) => ({ id: r.id, label: `${nodeName(idx, r.from)} → ${nodeName(idx, r.to)}`, sub: `${REL_LABEL[r.kind]} · ${r.date}${r.amount ? " · " + formatMoney(r.amount) : ""}`, kind: "REL" })),
  ], [idx]);
  const hits = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all.filter((h) => h.kind === "SYS" || h.kind === "ORG").slice(0, 12);
    return all.filter((h) => terms.every((t) => `${h.label} ${h.sub}`.toLowerCase().includes(t))).slice(0, 40);
  }, [q, all]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); set({ paletteOpen: !useStore.getState().paletteOpen }); }
      if (e.key === "Escape") set({ paletteOpen: false, aboutOpen: false, dataOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);
  useEffect(() => { setCur(0); }, [q]);

  if (!paletteOpen) return null;
  const choose = (h: Hit) => {
    select(h.id);
    const anchor = idx.milestone.get(h.id)?.orgs[0] ?? idx.target.get(h.id)?.org ?? idx.access.get(h.id)?.system ?? idx.access.get(h.id)?.target_org ?? idx.rel.get(h.id)?.to ?? h.id;
    const p = locateAny(idx, anchor);
    if (p) focus(p[0], p[1]);
    if (h.mode) set({ mode: h.mode });
    if (h.kind === "DONE") set({ roadmapDate: timeOf(idx.milestone.get(h.id)!.date, false) + 864e5 });
    set({ paletteOpen: false });
    setQ("");
  };
  return (
    <div className="scrim" onClick={() => set({ paletteOpen: false })}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Search machines, companies, results, targets, platforms…" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(hits.length - 1, c + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
            if (e.key === "Enter" && hits[cur]) choose(hits[cur]);
          }} />
        <ul>
          {hits.map((h, i) => (
            <li key={h.id} className={i === cur ? "cur" : ""} onMouseEnter={() => setCur(i)} onClick={() => choose(h)}>
              <span className="pk mono">{h.kind}</span>
              <span className="pl">{h.label}</span>
              <span className="ps">{h.sub}</span>
            </li>
          ))}
          {!hits.length && <li className="muted">No matches.</li>}
        </ul>
      </div>
    </div>
  );
}

// ─── Methodology ────────────────────────────────────────────────────────────

export function About({ idx }: { idx: Index }) {
  const { aboutOpen, set } = useStore();
  if (!aboutOpen) return null;
  const a = idx.atlas;
  const tiers = [1, 2, 3].map((t) => a.sources.filter((s) => s.tier === t).length);
  const docTypes = Object.entries(a.sources.reduce<Record<string, number>>((m, s) => ((m[s.doc_type] = (m[s.doc_type] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1]);
  const peer = (k: string) => a.milestones.filter((m) => m.peer_review === k).length;
  const sims = a.access.filter((x) => x.snippet);
  return (
    <div className="scrim" onClick={() => set({ aboutOpen: false })}>
      <article className="about" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => set({ aboutOpen: false })}>✕</button>
        <h1>Method</h1>
        <p className="lede">Every machine, result, target and access route on this globe traces to a quoted passage in a primary document. A separate reviewer re-fetched every document and checked every quote before anything was published.</p>
        <div className="stat-row">
          <div><b className="mono">{a.orgs.filter((o) => o.roles.includes("hardware")).length}</b><span>hardware builders</span></div>
          <div><b className="mono">{a.systems.length}</b><span>systems</span></div>
          <div><b className="mono">{a.milestones.length}</b><span>achievements ({peer("peer_reviewed")} peer-reviewed, {peer("preprint")} preprint, {peer("company_claim")} company claim)</span></div>
          <div><b className="mono">{a.targets.length}</b><span>roadmap targets</span></div>
          <div><b className="mono">{a.access.length}</b><span>access routes</span></div>
          <div><b className="mono">{a.sources.length}</b><span>source documents</span></div>
        </div>
        <h2>Evidence tiers</h2>
        <table className="tbl"><tbody>
          <tr><td><span className="tier t1">T1</span></td><td>Peer-reviewed journal articles (DOI), SEC filings, government awards, contracts and agency releases.</td><td className="mono">{tiers[0]}</td></tr>
          <tr><td><span className="tier t2">T2</span></td><td>Official company and institution material: releases, roadmaps, documentation, technical blogs, investor presentations. arXiv preprints are T2 and always labelled <span className="peer p-preprint">PREPRINT</span>.</td><td className="mono">{tiers[1]}</td></tr>
          <tr><td><span className="tier t3">T3</span></td><td>Secondary sources, only when no primary source exists. Always flagged.</td><td className="mono">{tiers[2]}</td></tr>
        </tbody></table>
        <h2>Rules the data follows</h2>
        <ul>
          <li><b>Achieved and targeted are kept apart.</b> An achievement is something a document says has been done. A target is something a document says will be done. Every target reads "&lt;organisation&gt; targets … by &lt;date&gt;" and is drawn hollow. When a later document moved a target, both versions are kept and linked.</li>
          <li><b>Every achievement shows its peer-review status</b>: peer-reviewed (journal article cited by DOI), preprint, or company claim.</li>
          <li><b>Contested words are quoted, never asserted.</b> "Advantage", "supremacy", "logical qubit", "error-corrected", "fault-tolerant", "beyond-classical" and "utility" appear only inside quotation marks, attributed to the source, and the quoted words appear verbatim in that item's evidence. A test enforces this.</li>
          <li><b>Metrics are as stated, never ranked.</b> Each figure keeps the source's own definition (which gate, median or average or best, which date). Vendors measure differently, so the atlas never compares them across vendors. Qubit counts measure size, not capability.</li>
          <li><b>Logical qubits</b> appear only where the source states both the number and the code used.</li>
          <li><b>Locations.</b> A machine is drawn at a specific site only when a document places that machine there. Otherwise it is drawn at its operator's headquarters and labelled that way.</li>
          <li><b>Access.</b> Each route records the platform, SDKs, authentication and access tier as the platform's own documentation states them, with a minimal example copied verbatim from the official docs. {sims.filter((x) => x.snippet!.sim_check.status === "passed").length} of {sims.length} examples were run against the SDK's local simulator, with only the device swapped. No real or paid machine was called.</li>
        </ul>
        <h2>Pipeline</h2>
        <ol className="pipeline">
          <li><b>Analysts</b>, one per modality group plus one for access and one for deals, extract claims with verbatim quotes, checked by script against saved copies of each document.</li>
          <li><b>Counsel</b>, a separate agent on a different model, re-fetches every document and marks each quote verified, not found, doesn't support, superseded, insufficient tier, or unreachable.</li>
          <li><b>Build</b> publishes only approved items, drops failed evidence, applies corrections, re-checks the language rules, and derives each result's peer-review status from its surviving evidence.</li>
        </ol>
        <h2>Document types</h2>
        <div className="doc-types">{docTypes.map(([k, n]) => <span key={k}>{DOC_LABEL[k] ?? k} <b className="mono">{n}</b></span>)}</div>
        <h2>Known gaps <span className="muted small">({a.gaps.length})</span></h2>
        <p className="muted small">These could not be sourced to Tier 1 or Tier 2, so they are left off the globe instead of estimated.</p>
        <ul className="gaps">{a.gaps.map((g, i) => <li key={i}><b>{g.topic}</b><div className="small">{g.why} <i>Would need: {g.would_need}</i></div></li>)}</ul>
        <p className="muted small">Built {a.built_at.slice(0, 10)}. Not investment advice. Descriptions restate what the cited documents say; a simulated or announced result is not a guarantee of performance.</p>
      </article>
    </div>
  );
}
