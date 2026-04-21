import Link from "next/link";
import type { Heat, HeatPlayer, Player } from "@/lib/types";

export function Bracket({
  tournamentId,
  heats,
  heatPlayers,
  players,
}: {
  tournamentId: string;
  heats: Heat[];
  heatPlayers: HeatPlayer[];
  players: Player[];
}) {
  const byRound = new Map<number, Heat[]>();
  for (const h of heats) {
    if (!byRound.has(h.round)) byRound.set(h.round, []);
    byRound.get(h.round)!.push(h);
  }
  const playerById = new Map(players.map((p) => [p.id, p]));

  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <section className="mk-card p-6">
      <h2 className="text-xl font-bold mb-4">🏁 Bracket</h2>
      <div className="flex flex-col gap-8">
        {rounds.map((round) => {
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
          return (
            <div key={round}>
              <h3 className="font-bold text-lg mb-3 text-mk-yellow">
                Round {round}
                {raceHeats.length === 1 && " — 🏆 Final"}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {raceHeats.map((h) => {
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
                  return (
                    <Link
                      key={h.id}
                      href={`/t/${tournamentId}/heat/${h.id}`}
                      className={`block rounded-xl p-4 border-2 transition hover:scale-[1.02] ${
                        h.status === "done"
                          ? "border-mk-green/40 bg-mk-green/5"
                          : "border-mk-yellow/40 bg-mk-yellow/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">
                          Heat {h.heat_number}
                        </span>
                        <span className="text-xs uppercase tracking-wider opacity-70">
                          {h.status === "done" ? "✓ done" : "pending"}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {hps.map((hp) => {
                          const p = playerById.get(hp.player_id);
                          return (
                            <li
                              key={hp.player_id}
                              className="flex items-center gap-2"
                            >
                              {hp.finish_position ? (
                                <span
                                  className={`pos-badge pos-${hp.finish_position}`}
                                >
                                  {hp.finish_position}
                                </span>
                              ) : (
                                <span className="pos-badge pos-4 opacity-40">
                                  —
                                </span>
                              )}
                              <span
                                className={
                                  hp.finish_position && hp.finish_position >= 3
                                    ? "line-through opacity-60"
                                    : "font-semibold"
                                }
                              >
                                {p?.name ?? "?"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </Link>
                  );
                })}
              </div>
              {byeIds.length > 0 && (
                <p className="text-sm text-white/60 mt-3">
                  🎫 Byes:{" "}
                  {byeIds
                    .map((id) => playerById.get(id)?.name ?? "?")
                    .join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
