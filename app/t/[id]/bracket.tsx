import Link from "next/link";
import type { Heat, HeatPlayer, Player } from "@/lib/types";
import type { TournamentFormat } from "@/lib/bracket";
import { Beer, CheckerFlag, Trophy } from "@/components/assets";

export function Bracket({
  tournamentId,
  heats,
  heatPlayers,
  players,
  format,
}: {
  tournamentId: string;
  heats: Heat[];
  heatPlayers: HeatPlayer[];
  players: Player[];
  format: TournamentFormat;
}) {
  const byRound = new Map<number, Heat[]>();
  for (const h of heats) {
    if (!byRound.has(h.round)) byRound.set(h.round, []);
    byRound.get(h.round)!.push(h);
  }
  const playerById = new Map(players.map((p) => [p.id, p]));
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <section className="card p-5 sm:p-7 relative overflow-hidden">
      <div className="absolute -top-4 -right-4 w-20 opacity-80 anim-spin-slow" aria-hidden>
        <CheckerFlag />
      </div>
      <h2 className="font-display uppercase text-xl sm:text-2xl mb-5 flex items-center gap-3">
        🏁 Bracket
      </h2>
      <div className="flex flex-col gap-8">
        {rounds.map((round, idx) => {
          const roundHeats = byRound
            .get(round)!
            .sort((a, b) => a.heat_number - b.heat_number);
          const raceHeats = roundHeats.filter((h) => h.heat_number !== 999);
          const byeHeat = roundHeats.find((h) => h.heat_number === 999);
          const byeIds = byeHeat
            ? heatPlayers
                .filter((hp) => hp.heat_id === byeHeat.id)
                .map((hp) => hp.player_id)
            : [];
          const isFinal = raceHeats.length === 1;
          const isGroupStageRound =
            format === "group_stage" && round === 1 && !isFinal;
          const label = isFinal
            ? "Grand Final"
            : isGroupStageRound
            ? "Group Stage"
            : `Round ${round}`;
          return (
            <div
              key={round}
              className="anim-pop"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="font-pixel text-[11px] px-2.5 py-1.5 rounded-full border-2 border-[#1a0030] bg-sky text-[#002a4a] shadow-[0_3px_0_#1a0030]">
                  {isGroupStageRound ? "GS" : `R${round}`}
                </div>
                <h3 className="font-display uppercase text-lg sm:text-xl">
                  {isFinal ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-6 h-6"><Trophy /></span>
                      Grand Final
                    </span>
                  ) : (
                    label
                  )}
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {raceHeats.map((h, hi) => {
                  const hps = heatPlayers
                    .filter((hp) => hp.heat_id === h.id)
                    .slice()
                    .sort((a, b) => {
                      if (a.finish_position && b.finish_position)
                        return a.finish_position - b.finish_position;
                      if (a.finish_position) return -1;
                      if (b.finish_position) return 1;
                      return 0;
                    });
                  const done = h.status === "done";
                  return (
                    <Link
                      key={h.id}
                      href={`/t/${tournamentId}/heat/${h.id}`}
                      className={`card-sticker anim-pop stripes block ${
                        done
                          ? "bg-gradient-to-br from-luigi to-[#1e8b4c]"
                          : isFinal
                          ? "bg-gradient-to-br from-banana to-shell"
                          : "bg-gradient-to-br from-sky to-koopa"
                      }`}
                      style={{ animationDelay: `${(idx + hi) * 0.08}s` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-display uppercase text-sm">
                          Heat {h.heat_number}
                        </span>
                        <span className="font-pixel text-[9px] px-2 py-1 rounded-full bg-[#1a0030]/60">
                          {done ? "✓ DONE" : "PENDING"}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-2">
                        {hps.map((hp) => {
                          const p = playerById.get(hp.player_id);
                          const eliminated =
                            hp.finish_position && hp.finish_position >= 3;
                          return (
                            <li
                              key={hp.player_id}
                              className="flex items-center gap-2.5"
                            >
                              {hp.finish_position ? (
                                <span className={`pos pos-${hp.finish_position}`}>
                                  {hp.finish_position}
                                </span>
                              ) : (
                                <span className="pos bg-black/30 text-white/50 border-[#1a0030]">
                                  ?
                                </span>
                              )}
                              <span
                                className={`font-display uppercase text-sm flex-1 truncate ${
                                  eliminated ? "line-through opacity-60" : ""
                                }`}
                              >
                                {p?.name ?? "—"}
                              </span>
                              {hp.finish_position === 1 && (
                                <span className="text-sm">🏆</span>
                              )}
                              {hp.finish_position === 4 && (
                                <span className="w-5 h-5"><Beer /></span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </Link>
                  );
                })}
              </div>
              {byeIds.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-pixel text-[10px] text-white/60">
                    BYES →
                  </span>
                  {byeIds.map((id) => (
                    <span
                      key={id}
                      className="tag bg-star text-[#3a1600]"
                    >
                      🎫 {playerById.get(id)?.name ?? "?"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
