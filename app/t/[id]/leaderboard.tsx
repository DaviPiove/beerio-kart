import type { Player } from "@/lib/types";

export function Leaderboard({
  players,
  winnerId,
}: {
  players: Player[];
  winnerId: string | null;
}) {
  const alive = players.filter((p) => !p.eliminated && p.id !== winnerId);
  const eliminated = players
    .filter((p) => p.eliminated)
    .sort((a, b) => (b.eliminated_round ?? 0) - (a.eliminated_round ?? 0));
  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;

  return (
    <section className="mk-card p-6">
      <h2 className="text-xl font-bold mb-4">📊 Leaderboard</h2>
      <ul className="flex flex-col gap-1.5">
        {winner && (
          <li className="flex items-center gap-3 py-2 px-3 rounded-lg bg-mk-yellow/15 border border-mk-yellow/30">
            <span className="text-2xl">🏆</span>
            <span className="font-black text-mk-yellow">{winner.name}</span>
            <span className="text-xs ml-auto uppercase tracking-wider text-mk-yellow/80">
              Winner
            </span>
          </li>
        )}
        {alive.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5"
          >
            <span>🏎️</span>
            <span className="font-semibold">{p.name}</span>
            <span className="text-xs ml-auto text-white/50">Alive</span>
          </li>
        ))}
        {eliminated.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg opacity-50"
          >
            <span>💀</span>
            <span className="line-through">{p.name}</span>
            <span className="text-xs ml-auto">
              Out R{p.eliminated_round}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
