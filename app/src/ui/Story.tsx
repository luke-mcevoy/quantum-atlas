import { useEffect, useMemo } from "react";
import { STORIES, type Story, quoteOf } from "../stories";
import { type Index, nodeName, entityOf } from "../atlas";
import { DOC_LABEL } from "../theme";
import { useStore } from "../store";
import { TierBadge, PreprintBadge } from "./Evidence";

export function useStory(): { story: Story; step: number } | null {
  const st = useStore((s) => s.story);
  return useMemo(() => {
    const story = st && STORIES.find((x) => x.id === st.id);
    return story ? { story, step: st!.step } : null;
  }, [st]);
}

/** What to highlight for the current story step: orgs/systems (nodes), relationship and access arcs, and what to frame. */
export function useStoryFocus(idx: Index) {
  const cur = useStory();
  return useMemo(() => {
    const step = cur?.story.steps[cur.step];
    if (!step) return null;
    const nodes = new Set<string>(), rels = new Set<string>(), access = new Set<string>(), frame = new Set<string>();
    const node = (id: string) => { nodes.add(id); frame.add(id); };
    for (const id of step.focus) {
      const ms = idx.milestone.get(id), tg = idx.target.get(id), ac = idx.access.get(id), r = idx.rel.get(id);
      const uc = idx.useCase.get(id), out = idx.outcome.get(id), pr = idx.projection.get(id);
      if (ms) { ms.orgs.forEach(node); (ms.systems ?? []).forEach(node); }
      else if (tg) { node(tg.org); if (tg.system) node(tg.system); }
      else if (ac) { access.add(id); nodes.add(ac.platform); node(ac.system ?? ac.target_org); }
      else if (r) { rels.add(id); node(r.from); node(r.to); }
      else if (uc) node(uc.platform);
      else if (out) { const host = idx.target.get(out.target); if (host) { node(host.org); if (host.system) node(host.system); } }
      else if (pr) node(pr.org);
      else if (idx.system.has(id)) { node(id); nodes.add(idx.system.get(id)!.operator); }
      else if (idx.org.has(id) || idx.site.has(id)) node(id);
    }
    return { nodes, rels, access, frame };
  }, [cur, idx]);
}

export function startStory(id: string) {
  useStore.getState().set({ story: { id, step: 0 }, storyPicker: false, railOpen: window.innerWidth > 900 ? useStore.getState().railOpen : false });
}

export function StoryPicker() {
  const { storyPicker, set } = useStore();
  if (!storyPicker) return null;
  return (
    <div className="scrim" onClick={() => set({ storyPicker: false })}>
      <div className="story-picker" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={() => set({ storyPicker: false })} aria-label="Close">✕</button>
        <h1>Stories</h1>
        <p className="muted">Guided walks through the atlas. Every claim on screen is a verbatim quote from a verified document. The captions only connect them.</p>
        <ul>
          {STORIES.map((s) => (
            <li key={s.id}>
              <button onClick={() => startStory(s.id)}>
                <b>{s.title}</b>
                <span>{s.dek}</span>
                <span className="mono muted small">{s.steps.length} steps →</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function StoryPanel({ idx }: { idx: Index }) {
  const cur = useStory();
  const set = useStore((s) => s.set);
  const select = useStore((s) => s.select);
  const step = cur?.story.steps[cur.step];

  useEffect(() => {
    if (!step) return;
    const patch: Record<string, unknown> = { mode: step.mode };
    if (step.date) patch.roadmapDate = step.date === "today" ? Date.now() : Date.parse(step.date);
    set(patch);
    if (step.select && entityOf(idx, step.select)) select(step.select);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cur) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") go(cur.step + 1);
      if (e.key === "ArrowLeft") go(cur.step - 1);
      if (e.key === "Escape") set({ story: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!cur || !step) return null;
  const { story } = cur;
  function go(i: number) { set({ story: { id: story.id, step: Math.max(0, Math.min(story.steps.length - 1, i)) } }); }

  return (
    <div className="panel tour story" role="region" aria-label={`Story: ${story.title}`}>
      <div className="tour-head">
        <span className="tour-kicker">Story</span>
        <b className="story-title">{story.title}</b>
        <button className="linkish" onClick={() => set({ storyPicker: true })}>All stories</button>
        <button className="close" onClick={() => set({ story: null })} aria-label="End story">✕</button>
      </div>
      <ol className="tour-steps">
        {story.steps.map((s, i) => (
          <li key={i} className={i === cur.step ? "on" : i < cur.step ? "done" : ""}>
            <button onClick={() => go(i)} title={s.title}><i style={{ background: "var(--accent)" }} /><span>{s.title}</span></button>
          </li>
        ))}
      </ol>
      <div className="tour-body">
        <div className="tour-title">
          <span className="mono muted">{String(cur.step + 1).padStart(2, "0")}/{String(story.steps.length).padStart(2, "0")}</span>
          <h3>{step.title}</h3>
        </div>
        <p className="story-caption">{step.caption}</p>
        {step.quotes.map((q, i) => {
          const ev = quoteOf(idx, q);
          const src = ev && idx.source.get(ev.source);
          if (!ev || !src) return null;
          return (
            <figure key={i} className="story-quote">
              <blockquote>“{ev.quote}”</blockquote>
              <figcaption>
                <TierBadge tier={src.tier} /> {src.doc_type === "preprint" && <PreprintBadge />} <a href={src.url} target="_blank" rel="noreferrer noopener">{DOC_LABEL[src.doc_type] ?? src.doc_type} · {src.publisher}</a>
                <span className="muted"> · {src.document_date} · on </span>
                <button className="link" onClick={() => select(q.entity)}>{nodeName(idx, q.entity) !== q.entity ? nodeName(idx, q.entity) : "this item"}</button>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="tour-nav">
        <button onClick={() => go(cur.step - 1)} disabled={cur.step === 0}>← Prev</button>
        <span className="muted small hide-sm">← → keys</span>
        {cur.step < story.steps.length - 1
          ? <button className="primary" onClick={() => go(cur.step + 1)}>Next →</button>
          : <button className="primary" onClick={() => set({ story: null, storyPicker: true })}>More stories</button>}
      </div>
    </div>
  );
}
