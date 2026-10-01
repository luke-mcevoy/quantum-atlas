import { create } from "zustand";
import { MODALITIES, type Modality } from "./atlas";

export type Mode = "modality" | "roadmap" | "access";

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

  setMode: (m: Mode) => void;
  toggleModality: (m: Modality) => void;
  soloModality: (m: Modality) => void;
  set: (p: Partial<State>) => void;
  select: (id: string | null) => void;
  focus: (lon: number, lat: number, zoom?: number) => void;
}

const readHash = () => new URLSearchParams(typeof location !== "undefined" ? location.hash.slice(1) : "");
const MODES: Mode[] = ["modality", "roadmap", "access"];

export const useStore = create<State>((set, get) => ({
  mode: (MODES.find((m) => m === readHash().get("mode")) ?? "modality"),
  modalities: new Set(MODALITIES),
  showFlagged: true,
  showAnnounced: true,
  showRetired: false,
  showRelationships: true,
  accessTiers: new Set(["open_free", "paid", "application", "restricted"]),
  selected: readHash().get("sel"),
  hover: null,
  roadmapDate: Date.now(),
  paletteOpen: false,
  aboutOpen: false,
  dataOpen: false,
  railOpen: typeof window !== "undefined" ? window.innerWidth > 900 : true,
  flyTo: null,
  story: null,
  storyPicker: false,

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
  select: (selected) => set({ selected }),
  focus: (lon, lat, zoom) => set({ flyTo: { lon, lat, zoom, t: Date.now() } }),
}));

// Shareable URLs: mode and selection live in the hash.
useStore.subscribe((s) => {
  const p = new URLSearchParams();
  if (s.mode !== "modality") p.set("mode", s.mode);
  if (s.selected) p.set("sel", s.selected);
  const h = p.toString();
  if (h !== location.hash.slice(1)) history.replaceState(null, "", h ? `#${h}` : location.pathname);
});
