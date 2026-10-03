import { create } from "zustand";
import { MODALITIES, type Modality } from "./atlas";
import type { ProblemPick } from "./display";

export type Mode = "modality" | "roadmap" | "access" | "today" | "track";

export interface Hover { id: string; kind: string; x: number; y: number }

interface State {
  mode: Mode;
  modalities: Set<Modality>;
  showFlagged: boolean;
  showAnnounced: boolean;
  showRetired: boolean;
  showRelationships: boolean;
  /** Access view: which tiers to draw. */
  accessTiers: Set<string>;
  selected: string | null;
  hover: Hover | null;
  /** Roadmap view: the scrubbed date (ms). */
  roadmapDate: number;
  paletteOpen: boolean;
  aboutOpen: boolean;
  dataOpen: boolean;
  railOpen: boolean;
  flyTo: { lon: number; lat: number; zoom?: number; t: number } | null;
  story: { id: string; step: number } | null;
  storyPicker: boolean;
  /** Run today: which problem class the board is filtered to. */
  problem: ProblemPick;
  /** Track record: which company's ledger is open. */
  trackOrg: string | null;

  setMode: (m: Mode) => void;
  toggleModality: (m: Modality) => void;
  soloModality: (m: Modality) => void;
  set: (p: Partial<State>) => void;
  select: (id: string | null) => void;
  /** Previously selected items, most recent last (inspector Back button). */
  trail: string[];
  back: () => void;
  focus: (lon: number, lat: number, zoom?: number) => void;
}

const readHash = () => new URLSearchParams(typeof location !== "undefined" ? location.hash.slice(1) : "");
const MODES: Mode[] = ["modality", "roadmap", "access", "today", "track"];

export const useStore = create<State>((set, get) => ({
  mode: (MODES.find((m) => m === readHash().get("mode")) ?? "modality"),
  modalities: new Set(MODALITIES),
  showFlagged: true,
  showAnnounced: true,
  showRetired: false,
  showRelationships: true,
  accessTiers: new Set(["open_free", "paid", "application", "restricted"]),
  selected: readHash().get("sel"),
  trail: [],
  hover: null,
  roadmapDate: Date.now(),
  paletteOpen: false,
  aboutOpen: false,
  dataOpen: false,
  railOpen: typeof window !== "undefined" ? window.innerWidth > 900 : true,
  flyTo: null,
  story: null,
  storyPicker: false,
  problem: "all",
  trackOrg: null,

  setMode: (mode) => set({ mode }),
  toggleModality: (m) => {
    const modalities = new Set(get().modalities);
    if (modalities.has(m)) modalities.delete(m); else modalities.add(m);
    set({ modalities });
  },
  soloModality: (m) => {
    const cur = get().modalities;
    set({ modalities: cur.size === 1 && cur.has(m) ? new Set(MODALITIES) : new Set([m]) });
  },
  set: (p) => set(p),
  select: (selected) => {
    const cur = get().selected;
    const trail = !selected ? [] : cur && cur !== selected ? [...get().trail, cur].slice(-50) : get().trail;
    set({ selected , trail });
  },
  back: () => {
    const trail = [...get().trail];
    const prev = trail.pop();
    if (prev) set({ selected: prev, trail });
  },
  focus: (lon, lat, zoom) => set({ flyTo: { lon, lat, zoom, t: Date.now() } }),
}));

// Shareable URLs: mode and selection live in the hash.
let lastSel: string | null = useStore.getState().selected;
let fromPopstate = false;
// Browser Back/Forward restores the selection recorded in the URL.
if (typeof window !== "undefined") window.addEventListener("popstate", () => {
  const sel = new URLSearchParams(location.hash.slice(1)).get("sel");
  const st = useStore.getState();
  fromPopstate = true;
  const trail = st.trail.at(-1) === sel ? st.trail.slice(0, -1) : st.trail;
  useStore.setState({ selected: sel, trail });
  lastSel = sel;
  fromPopstate = false;
});
useStore.subscribe((s) => {
  const p = new URLSearchParams();
  if (s.mode !== "modality") p.set("mode", s.mode);
  if (s.selected) p.set("sel", s.selected);
  const h = p.toString();
  if (h === location.hash.slice(1)) return;
  const url = h ? `#${h}` : location.pathname;
  if (s.selected !== lastSel && !fromPopstate) history.pushState(null, "", url); else history.replaceState(null, "", url);
  lastSel = s.selected;
});
