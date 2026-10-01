// Guided stories. Grounding rule (same as the sister atlas): captions only frame and connect. They state no number
// and no fact that the quoted, counsel-verified evidence of that step doesn't state, and hype terms appear only
// inside quotation marks, attributed, verbatim from the step's quotes. The quotes carry the claims.
// test/stories.test.ts fails the build if a referenced entity or quote is missing from the published atlas,
// if a caption number isn't in the step's quotes, or if a caption breaks the hype-term rule.

import type { Evidence, Index } from "./atlas";
import { entityOf } from "./atlas";
import type { Mode } from "./store";

export interface QuoteRef {
  entity: string;
  /** Index into the entity's evidence[], or into a nested list given by `path` ("physical_qubits", "metrics.0"). */
  ev: number;
  path?: string;
}

export interface StoryStep {
  title: string;
  caption: string;
  mode: Mode;
  /** Orgs, systems, milestones, targets, access routes or relationships to highlight; the camera frames them. */
  focus: string[];
  quotes: QuoteRef[];
  select?: string;
  /** Roadmap view: date to scrub to. */
  date?: string;
}

export interface Story { id: string; title: string; dek: string; steps: StoryStep[] }

export function quoteOf(idx: Index, q: QuoteRef): Evidence | undefined {
  const e = entityOf(idx, q.entity) as unknown as Record<string, unknown> | undefined;
  if (!e) return undefined;
  if (!q.path) return (e.evidence as Evidence[] | undefined)?.[q.ev];
  const [k, i] = q.path.split(".");
  const holder = (i !== undefined ? (e[k] as Record<string, unknown>[] | undefined)?.[+i] : e[k]) as { evidence?: Evidence[] } | undefined;
  return holder?.evidence?.[q.ev];
}

export const STORIES: Story[] = [];
