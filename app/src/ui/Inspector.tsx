import { useEffect, useState, type ReactNode } from "react";
import {
  type Index, type Org, type Site, type System, type Milestone, type Target, type AccessRoute, type Relationship, type Figure,
  nodeName, locateAny, formatMoney, targetChain, orgModality,
} from "../atlas";
import { MODALITY_COLOR, MODALITY_LABEL, MODALITY_CODE, SUB_LABEL, ROUTE_LABEL, TIER_ACCESS_LABEL, REL_LABEL, SIM_LABEL, css } from "../theme";
import { useStore } from "../store";
import { EvidenceList, ReviewBadge, TierBadge, PeerBadge } from "./Evidence";

export default function Inspector({ idx }: { idx: Index }) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const [peek, setPeek] = useState(false);
  useEffect(() => setPeek(false), [selected]);
  if (!selected) return null;

  let body: ReactNode = <div className="muted">Not found: {selected}</div>;
  if (idx.system.has(selected)) body = <SystemView idx={idx} y={idx.system.get(selected)!} />;
  else if (idx.org.has(selected)) body = <OrgView idx={idx} o={idx.org.get(selected)!} />;
  else if (idx.site.has(selected)) body = <SiteView idx={idx} s={idx.site.get(selected)!} />;
  else if (idx.milestone.has(selected)) body = <MilestoneView idx={idx} m={idx.milestone.get(selected)!} />;
  else if (idx.target.has(selected)) body = <TargetView idx={idx} t={idx.target.get(selected)!} />;
  else if (idx.access.has(selected)) body = <AccessView idx={idx} a={idx.access.get(selected)!} />;
  else if (idx.rel.has(selected)) body = <RelView idx={idx} r={idx.rel.get(selected)!} />;

  return (
    <aside className={`panel inspector${peek ? " peek" : ""}`} key={selected}>
      <button className="sheet-handle" onClick={() => setPeek((p) => !p)} aria-label={peek ? "Expand details" : "Collapse details"} />
      <button className="close" onClick={() => select(null)} aria-label="Close inspector">✕</button>
      {body}
    </aside>
  );
}

// ─── shared bits ───

function Link({ id, idx, children }: { id: string; idx: Index; children?: ReactNode }) {
  const select = useStore((s) => s.select);
  const focus = useStore((s) => s.focus);
  const m = idx.system.get(id)?.modality ?? orgModality(idx, id);
  return (
    <button className="link" onClick={() => { select(id); const p = locateAny(idx, id); if (p) focus(p[0], p[1]); }}>
      {m && <i className="dot" style={{ background: css(MODALITY_COLOR[m]) }} />}
      {children ?? nodeName(idx, id)}
    </button>
  );
}

function Kicker({ modality, children }: { modality?: keyof typeof MODALITY_COLOR; children: ReactNode }) {
  return (
    <div className="kicker">
      {modality && <span className="layer-chip" style={{ borderColor: css(MODALITY_COLOR[modality], 0.6), color: css(MODALITY_COLOR[modality]) }}>{MODALITY_CODE[modality]}</span>}
      <span>{children}</span>
    </div>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="rows">
      {rows.filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

function Section({ title, count, children, note }: { title: string; count?: number; children: ReactNode; note?: string }) {
  return (
    <section className="sec">
      <h4>{title}{count !== undefined && <span className="count">{count}</span>}</h4>
      {note && <div className="muted small sec-note">{note}</div>}
      {children}
    </section>
  );
}

function FigureRow({ idx, f, label, extra }: { idx: Index; f: Figure; label: string; extra?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="figure">
      <button className="fig-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <b className="mono fig-v">{f.value.toLocaleString()}</b> <span>{label}</span>{extra}
        <span className="muted small"> · as of {f.as_of} · {open ? "hide" : "show"} source</span>
      </button>
      {f.note && <div className="muted small">{f.note}</div>}
      {open && <EvidenceList idx={idx} evidence={f.evidence} />}
    </div>
  );
}

function MilestoneList({ idx, items }: { idx: Index; items: Milestone[] }) {
  const select = useStore((s) => s.select);
  if (!items.length) return <div className="muted small">None recorded.</div>;
  return (
    <ul className="flowlist">
      {[...items].sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
        <li key={m.id}><button className="flowrow ms-row" onClick={() => select(m.id)}>
          <span className="basis b-ms" title="Achieved">✓</span>
          <span className="fl-node">{m.claim}</span>
          <span className="fl-comm mono">{m.date.slice(0, 7)} <PeerBadge status={m.peer_review} /></span>
        </button></li>
      ))}
    </ul>
  );
}

function TargetList({ idx, items }: { idx: Index; items: Target[] }) {
  const select = useStore((s) => s.select);
  void idx;
  if (!items.length) return <div className="muted small">None recorded.</div>;
  return (
    <ul className="flowlist">
      {[...items].sort((a, b) => a.target_date.localeCompare(b.target_date)).map((t) => (
        <li key={t.id}><button className={`flowrow tgt-row st-${t.status}`} onClick={() => select(t.id)}>
          <span className="basis b-tgt" title="Target (not an achievement)">◇</span>
          <span className="fl-node">{t.statement}</span>
          <span className="fl-comm mono">by {t.target_date} · {t.status}</span>
        </button></li>
      ))}
    </ul>
  );
}

function AccessList({ idx, items, side }: { idx: Index; items: AccessRoute[]; side: "platform" | "machine" }) {
  const select = useStore((s) => s.select);
  if (!items.length) return <div className="muted small">None recorded.</div>;
  return (
    <ul className="flowlist">
      {items.map((a) => (
        <li key={a.id}><button className="flowrow" onClick={() => select(a.id)}>
          <span className={`basis acc-${a.tier}`}>{TIER_ACCESS_LABEL[a.tier].split(" ")[0].toUpperCase()}</span>
          <span className="fl-node">{side === "platform" ? a.platform_name : a.system ? nodeName(idx, a.system) : a.system_hint}</span>
          <span className="fl-comm">{side === "platform" ? a.sdks.slice(0, 3).join(", ") : a.platform_name}</span>
        </button></li>
      ))}
    </ul>
  );
}

function RelList({ idx, items, self }: { idx: Index; items: Relationship[]; self: string }) {
  const select = useStore((s) => s.select);
  if (!items.length) return <div className="muted small">None recorded.</div>;
  return (
    <ul className="flowlist">
      {[...items].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
        <li key={r.id}><button className="flowrow" onClick={() => select(r.id)}>
          <span className="basis b-rel">{REL_LABEL[r.kind]?.split(" ").at(-1)?.slice(0, 5).toUpperCase()}</span>
          <span className="fl-node">{nodeName(idx, r.from === self ? r.to : r.from)}</span>
          <span className="fl-comm mono">{r.amount ? formatMoney(r.amount) + " · " : ""}{r.date.slice(0, 7)}</span>
        </button></li>
      ))}
    </ul>
  );
}

function FlyTo({ idx, id }: { idx: Index; id: string }) {
  const focus = useStore((s) => s.focus);
  const p = locateAny(idx, id);
  return p ? <div className="actions"><button onClick={() => focus(p[0], p[1], 3.2)}>◎ Fly to</button></div> : null;
}

const Counsel = ({ review, note }: { review: string; note?: string }) =>
  note && review !== "verified" ? <div className="note warn">Counsel: {note}</div> : null;

// ─── entity views ───

function OrgView({ idx, o }: { idx: Index; o: Org }) {
  const systems = idx.systemsByOrg.get(o.id) ?? [];
  const sites = idx.sitesByOrg.get(o.id) ?? [];
  const ms = idx.msByOrg.get(o.id) ?? [];
  const tg = idx.tgtByOrg.get(o.id) ?? [];
  const acc = idx.accessByOrg.get(o.id) ?? [];
  const asPlatform = acc.filter((a) => a.platform === o.id);
  const asHw = acc.filter((a) => a.target_org === o.id);
  const rels = idx.relsByOrg.get(o.id) ?? [];
  const select = useStore((s) => s.select);
  const kind = o.kind === "government" ? "Government" : o.kind === "research_institution" ? "Research institution" : "Company";
  return (
    <>
      <Kicker modality={o.modalities[0]}>{kind} · {o.country}{o.tickers?.length ? ` · ${o.tickers.join(" · ")}` : ""}</Kicker>
      <h2>{o.name}</h2>
      {!!o.modalities.length && <div className="chips mod-chips">{o.modalities.map((m) => <span key={m} className="chip" style={{ borderColor: css(MODALITY_COLOR[m], 0.6) }}><i className="dot" style={{ background: css(MODALITY_COLOR[m]) }} />{MODALITY_LABEL[m]}</span>)}</div>}
      <Rows rows={[
        ["HQ", <>{o.hq.address ?? `${o.hq.lat.toFixed(2)}, ${o.hq.lon.toFixed(2)}`} <span className="muted">· {o.hq.precision} precision</span></>],
        ["Parent", o.parent ? <Link idx={idx} id={o.parent} /> : undefined],
        ["Website", o.website ? <a href={o.website} target="_blank" rel="noreferrer noopener">{o.website.replace(/^https?:\/\//, "")}</a> : undefined],
      ]} />
      <FlyTo idx={idx} id={o.id} />
      {(systems.length > 0 || o.roles.includes("hardware")) && (
        <Section title="Systems" count={systems.length}>
          <ul className="flowlist">
            {systems.map((y) => (
              <li key={y.id}><button className="flowrow" onClick={() => select(y.id)}>
                <i className="dot" style={{ background: css(MODALITY_COLOR[y.modality]) }} />
                <span className="fl-node">{y.name}</span>
                <span className="fl-comm">{y.physical_qubits ? `${y.physical_qubits.value.toLocaleString()} qubits · ` : ""}{y.status}</span>
              </button></li>
            ))}
            {!systems.length && <li className="muted small">None recorded.</li>}
          </ul>
        </Section>
      )}
      {!!ms.length && <Section title="Achieved (as documented)" count={ms.length}><MilestoneList idx={idx} items={ms} /></Section>}
      {!!tg.length && <Section title="Roadmap targets (not achievements)" count={tg.length}><TargetList idx={idx} items={tg} /></Section>}
      {!!asHw.length && <Section title="How to submit a program" count={asHw.length}><AccessList idx={idx} items={asHw} side="platform" /></Section>}
      {!!asPlatform.length && <Section title="Machines offered on this platform" count={asPlatform.length}><AccessList idx={idx} items={asPlatform} side="machine" /></Section>}
      {!!sites.length && (
        <Section title="Sites" count={sites.length}>
          <ul className="flowlist">{sites.map((s) => <li key={s.id}><button className="flowrow" onClick={() => select(s.id)}><span className="fl-node">{s.name}</span><span className="fl-comm">{s.kind.replaceAll("_", " ")} · {s.status}</span></button></li>)}</ul>
        </Section>
      )}
      {!!rels.length && <Section title="Acquisitions, partnerships, awards" count={rels.length}><RelList idx={idx} items={rels} self={o.id} /></Section>}
      <Section title="Evidence" count={o.evidence.length}><EvidenceList idx={idx} evidence={o.evidence} /></Section>
    </>
  );
}

function SiteView({ idx, s }: { idx: Index; s: Site }) {
  const here = idx.atlas.systems.filter((y) => y.site === s.id);
  const select = useStore((st) => st.select);
  return (
    <>
      <Kicker modality={orgModality(idx, s.operator)}>Site · {s.kind.replaceAll("_", " ")}</Kicker>
      <h2>{s.name}</h2>
      <div className="badges"><ReviewBadge review={s.review} note={s.review_note} /><span className={`status s-${s.status}`}>{s.status.replaceAll("_", " ").toUpperCase()}</span><TierBadge tier={s.best_tier} /></div>
      <Rows rows={[
        ["Operator", <Link idx={idx} id={s.operator} />],
        ["Location", <>{s.location.address ?? `${s.location.lat.toFixed(3)}, ${s.location.lon.toFixed(3)}`} <span className="muted">· {s.location.precision} precision</span></>],
        ["Country", s.country],
      ]} />
      <Counsel review={s.review} note={s.review_note} />
      <FlyTo idx={idx} id={s.id} />
      {!!here.length && <Section title="Systems documented here" count={here.length}><ul className="flowlist">{here.map((y) => <li key={y.id}><button className="flowrow" onClick={() => select(y.id)}><span className="fl-node">{y.name}</span><span className="fl-comm">{y.status}</span></button></li>)}</ul></Section>}
      <Section title="Evidence" count={s.evidence.length}><EvidenceList idx={idx} evidence={s.evidence} /></Section>
    </>
  );
}

function SystemView({ idx, y }: { idx: Index; y: System }) {
  const ms = idx.msBySystem.get(y.id) ?? [];
  const tg = idx.atlas.targets.filter((t) => t.system === y.id);
  const acc = idx.accessBySystem.get(y.id) ?? [];
  return (
    <>
      <Kicker modality={y.modality}>{MODALITY_LABEL[y.modality]}{y.submodality ? ` · ${SUB_LABEL[y.submodality] ?? y.submodality}` : ""}</Kicker>
      <h2>{y.name}</h2>
      <div className="badges">
        <ReviewBadge review={y.review} note={y.review_note} />
        <span className={`status sys-${y.status}`}>{y.status.toUpperCase()}</span>
        <TierBadge tier={y.best_tier} />
      </div>
      <Rows rows={[
        ["Operator", <Link idx={idx} id={y.operator} />],
        ["Location", y.location_basis === "site" && y.site
          ? <><Link idx={idx} id={y.site} /> <span className="muted">· {y.location.precision} precision</span></>
          : <span className="muted">Drawn at {nodeName(idx, y.operator)} headquarters: no document places this machine at a specific site.</span>],
        ["Announced", y.announced], ["Online since", y.online_since], ["Retired", y.retired],
      ]} />
      <Counsel review={y.review} note={y.review_note} />
      <FlyTo idx={idx} id={y.id} />
      {(y.physical_qubits || y.logical_qubits) && (
        <Section title="Qubits (as stated)">
          {y.physical_qubits && <FigureRow idx={idx} f={y.physical_qubits} label="physical qubits" />}
          {y.logical_qubits && <FigureRow idx={idx} f={y.logical_qubits} label="logical qubits, as the source terms them" extra={<span className="muted small"> · code: {y.logical_qubits.code}</span>} />}
        </Section>
      )}
      {!!y.metrics?.length && (
        <Section title="Headline metrics" count={y.metrics.length} note="Each figure is as stated by its source, with the source's own definition. Vendors define and measure these differently; they are not comparable across vendors.">
          {y.metrics.map((m, i) => (
            <div key={i} className="metric">
              <FigureRow idx={idx} f={{ value: m.value, as_of: m.as_of, evidence: m.evidence }} label={`${m.unit && m.unit !== "" ? m.unit + " · " : ""}${m.name}`} />
              <div className="small metric-def"><span className="muted">Definition as stated:</span> {m.definition}</div>
            </div>
          ))}
        </Section>
      )}
      <Section title="How to submit a program" count={acc.length}><AccessList idx={idx} items={acc} side="platform" /></Section>
      {!!ms.length && <Section title="Achieved on this system" count={ms.length}><MilestoneList idx={idx} items={ms} /></Section>}
      {!!tg.length && <Section title="Targets naming this system" count={tg.length}><TargetList idx={idx} items={tg} /></Section>}
      <Section title="Evidence" count={y.evidence.length}><EvidenceList idx={idx} evidence={y.evidence} /></Section>
    </>
  );
}

const CATEGORY: Record<string, string> = {
  qubit_count: "Qubit count", fidelity: "Fidelity", error_correction: "Error correction", computational_task: "Computational task",
  system_launch: "System launch", manufacturing: "Manufacturing", networking: "Networking", other: "Other",
};

function MilestoneView({ idx, m }: { idx: Index; m: Milestone }) {
  const meets = idx.atlas.targets.filter((t) => t.met_by === m.id);
  const select = useStore((s) => s.select);
  return (
    <>
      <Kicker modality={orgModality(idx, m.orgs[0])}>Achieved · {m.date} · {CATEGORY[m.category] ?? m.category}</Kicker>
      <h2 className="claim">{m.claim}</h2>
      <div className="badges"><PeerBadge status={m.peer_review} /><ReviewBadge review={m.review} note={m.review_note} /><TierBadge tier={m.best_tier} /></div>
      <Rows rows={[
        ["Credited to", <div className="chips">{m.orgs.map((o) => <Link key={o} idx={idx} id={o} />)}</div>],
        ["Systems", m.systems?.length ? <div className="chips">{m.systems.map((s) => <Link key={s} idx={idx} id={s} />)}</div> : undefined],
        ["Paper", m.doi ? <a href={`https://doi.org/${m.doi}`} target="_blank" rel="noreferrer noopener">doi:{m.doi}</a> : undefined],
        ["Preprint", m.arxiv ? <a href={`https://arxiv.org/abs/${m.arxiv}`} target="_blank" rel="noreferrer noopener">arXiv:{m.arxiv}</a> : undefined],
      ]} />
      {m.peer_review !== "peer_reviewed" && <div className="note small">{m.peer_review === "preprint" ? "Reported in a preprint. No peer-reviewed version is cited here." : "Company or institution claim. No paper is cited for it."}</div>}
      <Counsel review={m.review} note={m.review_note} />
      {!!meets.length && <Section title="Meets the stated target" count={meets.length}><ul className="flowlist">{meets.map((t) => <li key={t.id}><button className="flowrow" onClick={() => select(t.id)}><span className="basis b-tgt">◇</span><span className="fl-node">{t.statement}</span></button></li>)}</ul></Section>}
      <Section title="Evidence" count={m.evidence.length}><EvidenceList idx={idx} evidence={m.evidence} /></Section>
    </>
  );
}

function TargetView({ idx, t }: { idx: Index; t: Target }) {
  const chain = targetChain(idx, t);
  const select = useStore((s) => s.select);
  return (
    <>
      <Kicker modality={orgModality(idx, t.org)}>Roadmap target · due {t.target_date} · stated {t.stated_on}</Kicker>
      <h2 className="claim target">{t.statement}</h2>
      <div className="badges">
        <span className="tgt-flag" title="A stated plan, not an achievement">TARGET · NOT AN ACHIEVEMENT</span>
        <span className={`status tg-${t.status}`}>{t.status.toUpperCase()}</span>
        <ReviewBadge review={t.review} note={t.review_note} /><TierBadge tier={t.best_tier} />
      </div>
      <Rows rows={[
        ["Organisation", <Link idx={idx} id={t.org} />],
        ["System", t.system ? <Link idx={idx} id={t.system} /> : t.system_name],
        ["Met by", t.met_by ? <button className="link" onClick={() => select(t.met_by!)}>{idx.milestone.get(t.met_by)?.claim ?? t.met_by}</button> : undefined],
      ]} />
      <Counsel review={t.review} note={t.review_note} />
      {chain.length > 1 && (
        <Section title="Revision history" count={chain.length} note="Each version is a separate statement in a dated document. Later documents revised earlier ones.">
          <ol className="revisions">
            {chain.map((x) => (
              <li key={x.id} className={x.id === t.id ? "on" : ""}>
                <button className="flowrow" onClick={() => select(x.id)}>
                  <span className="mono rev-date">{x.stated_on}</span>
                  <span className="fl-node">{x.statement}</span>
                  <span className="fl-comm mono">{x.status}</span>
                </button>
              </li>
            ))}
          </ol>
        </Section>
      )}
      <Section title="Evidence" count={t.evidence.length}><EvidenceList idx={idx} evidence={t.evidence} /></Section>
    </>
  );
}

function AccessView({ idx, a }: { idx: Index; a: AccessRoute }) {
  const sys = a.system ? idx.system.get(a.system) : undefined;
  return (
    <>
      <Kicker modality={sys?.modality ?? orgModality(idx, a.target_org)}>Access · {ROUTE_LABEL[a.route] ?? a.route}</Kicker>
      <h2>{a.platform_name} → {sys?.name ?? a.system_hint}</h2>
      <div className="badges">
        <span className={`acc-tier acc-${a.tier}`}>{TIER_ACCESS_LABEL[a.tier].toUpperCase()}</span>
        <ReviewBadge review={a.review} note={a.review_note} /><TierBadge tier={a.best_tier} />
      </div>
      <Rows rows={[
        ["Platform", <Link idx={idx} id={a.platform}>{a.platform_name}</Link>],
        ["Machine", sys ? <Link idx={idx} id={sys.id} /> : <>{a.system_hint} <span className="muted">({nodeName(idx, a.target_org)})</span></>],
        ["SDKs", a.sdks.join(", ")],
        ["Authentication", a.auth_model],
        ["Access tier", a.tier_note ?? TIER_ACCESS_LABEL[a.tier]],
        ["Get started", <a href={a.docs_url} target="_blank" rel="noreferrer noopener">Official docs ↗</a>],
      ]} />
      <Counsel review={a.review} note={a.review_note} />
      {a.snippet && (
        <Section title="Minimal official example" note="Copied verbatim from the official documentation.">
          <pre className="snippet"><code>{a.snippet.code}</code></pre>
          <div className="snippet-meta small">
            <a href={a.snippet.source_url} target="_blank" rel="noreferrer noopener">Source: {a.snippet.source_url.replace(/^https?:\/\//, "").slice(0, 70)} ↗</a>
            <div className={`sim sim-${a.snippet.sim_check.status}`}>
              <b>{SIM_LABEL[a.snippet.sim_check.status]}</b>
              {a.snippet.sim_check.simulator && <> · {a.snippet.sim_check.simulator}</>}
              {a.snippet.sim_check.sdk_version && <> · {a.snippet.sdk} {a.snippet.sim_check.sdk_version}</>}
              {a.snippet.sim_check.python_version && <> · Python {a.snippet.sim_check.python_version}</>}
              {a.snippet.sim_check.ran_at && <> · {a.snippet.sim_check.ran_at.slice(0, 10)}</>}
            </div>
            {a.snippet.sim_check.substitution && <div className="muted">Changed to run locally: {a.snippet.sim_check.substitution}</div>}
            {a.snippet.sim_check.output_excerpt && <pre className="snippet out"><code>{a.snippet.sim_check.output_excerpt}</code></pre>}
            {a.snippet.sim_check.notes && <div className="muted">{a.snippet.sim_check.notes}</div>}
            <div className="muted">The check ran the snippet against the SDK's local simulator only. No real or paid QPU was called.</div>
          </div>
        </Section>
      )}
      <Section title="Evidence" count={a.evidence.length}><EvidenceList idx={idx} evidence={a.evidence} /></Section>
    </>
  );
}

function RelView({ idx, r }: { idx: Index; r: Relationship }) {
  return (
    <>
      <Kicker modality={orgModality(idx, r.to)}>{REL_LABEL[r.kind] ?? r.kind} · {r.date}</Kicker>
      <h2>{r.amount ? formatMoney(r.amount) : REL_LABEL[r.kind]}</h2>
      <div className="badges"><ReviewBadge review={r.review} note={r.review_note} /><TierBadge tier={r.best_tier} />{r.status && <span className="status">{r.status.toUpperCase()}</span>}</div>
      <div className="route"><Link idx={idx} id={r.from} /><span className="arrow">→</span><Link idx={idx} id={r.to} /></div>
      {r.program && <Rows rows={[["Programme", r.program]]} />}
      <p className="desc">{r.description}</p>
      {r.amount?.note && <div className="note small">{r.amount.note}</div>}
      <Counsel review={r.review} note={r.review_note} />
      <Section title="Evidence" count={r.evidence.length}><EvidenceList idx={idx} evidence={r.evidence} /></Section>
    </>
  );
}
