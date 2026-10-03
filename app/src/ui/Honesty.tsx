import { NO_ADVANTAGE, honestyItems, type ProblemPick } from "../display";
import type { Index } from "../atlas";
import { PEER_LABEL } from "../theme";
import { PeerBadge } from "./Evidence";

export function HonestyPanel({ idx, systemId, orgIds, problem, includeMilestones }: {
  idx: Index;
  systemId?: string;
  orgIds: string[];
  problem?: ProblemPick;
  includeMilestones?: boolean;
}) {
  const items = honestyItems(idx, { systemId, orgIds, problem, includeMilestones });
  return (
    <section className="honesty sec" aria-label="Will this beat my laptop?">
      <h4>Will this beat my laptop?</h4>
      {items.length === 0 ? (
        <p className="honesty-empty">{NO_ADVANTAGE}</p>
      ) : (
        <ul className="honesty-list">
          {items.map((item) => (
            <li key={item.id}>
              {item.kind === "milestone" && item.peer && <PeerBadge status={item.peer as keyof typeof PEER_LABEL} />}
              {item.kind === "milestone"
                ? <span>{item.text}</span>
                : <blockquote>“{item.text}”</blockquote>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
