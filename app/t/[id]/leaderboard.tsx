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

  if (players.length === 0) return null;

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
            <span className="font-pixel text-[10px] text-white/60">
              OUT R{p.eliminated_round}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
