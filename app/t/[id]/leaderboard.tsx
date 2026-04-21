import type { HeatPlayer, Player, Heat } from "@/lib/types";
import {
  computeGroupStandings,
  type TournamentFormat,
} from "@/lib/bracket";

export function Leaderboard({
  players,
  winnerId,
  format,
  heats,
  heatPlayers,
}: {
  players: Player[];
  winnerId: string | null;
  format: TournamentFormat;
  heats: Heat[];
  heatPlayers: HeatPlayer[];
}) {
  const alive = players.filter((p) => !p.eliminated && p.id !== winnerId);
  const eliminated = players
    .filter((p) => p.eliminated)
    .sort((a, b) => (b.eliminated_round ?? 0) - (a.eliminated_round ?? 0));
  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;

  if (players.length === 0) return null;

  // For group stage, compute per-player points from round-1 heats.
  const standingsById =
    format === "group_stage"
      ? groupStagePointsById(players, heats, heatPlayers)
      : null;

  return (
    <section className="card p-5 sm:p-7">
      <h2 className="font-display uppercase text-xl sm:text-2xl mb-5 flex items-center gap-3">
        📊 Leaderboard
      </h2>
      <ul className="flex flex-col gap-2">
        {winner && (
          <li className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-banana to-shell border-2 border-[#1a0030] shadow-[0_4px_0_#1a0030]">
            <span className="text-2xl">🏆</span>
            <span className="font-display uppercase text-[#3a1600] flex-1">
              {winner.name}
            </span>
            <span className="font-pixel text-[10px] text-[#3a1600]/80">
              WINNER
            </span>
          </li>
        )}
        {alive.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 py-2 px-4 rounded-xl bg-white/5 border border-white/10"
          >
            <span>🏎️</span>
            <span className="font-semibold flex-1">{p.name}</span>
            {format === "double_elim" && (
              <span
                className="font-pixel text-[10px] text-banana"
                title="Lives remaining"
              >
                {"❤️".repeat(Math.max(0, p.lives ?? 0))}
                {"🖤".repeat(Math.max(0, 2 - (p.lives ?? 0)))}
              </span>
            )}
            {format === "group_stage" && standingsById && (
              <span className="font-pixel text-[10px] text-banana">
                {standingsById.get(p.id) ?? 0} PTS
              </span>
            )}
            <span className="tag bg-luigi text-[#0a2e17] text-[10px]">
              Alive
            </span>
          </li>
        ))}
        {eliminated.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 py-2 px-4 rounded-xl opacity-55"
          >
            <span>💀</span>
            <span className="line-through flex-1">{p.name}</span>
            {format === "group_stage" && standingsById && (
              <span className="font-pixel text-[10px] text-white/60">
                {standingsById.get(p.id) ?? 0} PTS
              </span>
            )}
            <span className="font-pixel text-[10px] text-white/60">
              OUT R{p.eliminated_round}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function groupStagePointsById(
  players: Player[],
  heats: Heat[],
  heatPlayers: HeatPlayer[],
): Map<string, number> {
  const round1Heats = heats.filter(
    (h) => h.round === 1 && h.heat_number !== 999,
  );
  const hpByHeat = new Map<string, HeatPlayer[]>();
  for (const hp of heatPlayers) {
    if (!hpByHeat.has(hp.heat_id)) hpByHeat.set(hp.heat_id, []);
    hpByHeat.get(hp.heat_id)!.push(hp);
  }
  const results = round1Heats
    .map((h) => {
      const inHeat = (hpByHeat.get(h.id) ?? [])
        .slice()
        .sort(
          (a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99),
        )
        .filter((hp) => hp.finish_position != null);
      return {
        heatNumber: h.heat_number,
        finishersByPosition: inHeat.map((hp) => hp.player_id),
      };
    })
    .filter((r) => r.finishersByPosition.length > 0);
  const standings = computeGroupStandings(
    players.map((p) => p.id),
    results,
  );
  return new Map(standings.map((s) => [s.playerId, s.points]));
}
