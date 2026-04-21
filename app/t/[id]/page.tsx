import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Heat, HeatPlayer, Player, Tournament } from "@/lib/types";
import { JoinForm } from "./join-form";
import { LobbyActions } from "./lobby-actions";
import { Bracket } from "./bracket";
import { Leaderboard } from "./leaderboard";
import { RealtimeRefresher } from "./realtime";
import { ResetButton } from "./reset-button";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tournament }, { data: players }, { data: heats }, { data: heatPlayers }] =
    await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).single(),
      supabase
        .from("players")
        .select("*")
        .eq("tournament_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("heats")
        .select("*")
        .eq("tournament_id", id)
        .order("round", { ascending: true })
        .order("heat_number", { ascending: true }),
      supabase
        .from("heat_players")
        .select("heat_id, player_id, finish_position, is_bye, heats!inner(tournament_id)")
        .eq("heats.tournament_id", id),
    ]);

  if (!tournament) return notFound();
  const t = tournament as Tournament;
  const ps = (players ?? []) as Player[];
  const hs = (heats ?? []) as Heat[];
  const hps = ((heatPlayers ?? []) as unknown as HeatPlayer[]) ?? [];
  const winner = t.winner_id ? ps.find((p) => p.id === t.winner_id) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 flex-1 flex flex-col gap-8">
      <RealtimeRefresher tournamentId={t.id} />
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white/90"
          >
            ← Home
          </Link>
          <h1 className="mk-title text-4xl sm:text-5xl mt-1">{t.name}</h1>
          <p className="text-white/60 mt-1 text-sm">
            {t.status === "lobby" && `Lobby — ${ps.length} player${ps.length === 1 ? "" : "s"} joined`}
            {t.status === "active" && `🏁 Round ${t.current_round} in progress`}
            {t.status === "finished" && winner && `🏆 Winner: ${winner.name}`}
          </p>
        </div>
      </header>

      {t.status === "finished" && winner && (
        <section className="mk-card p-8 text-center">
          <div className="text-7xl mb-3">🏆🍺</div>
          <div className="mk-title text-3xl">{winner.name}</div>
          <p className="text-white/60 mt-2">drank the beers and won it all.</p>
        </section>
      )}

      {t.status === "lobby" && (
        <>
          <section className="mk-card p-6">
            <h2 className="text-xl font-bold mb-4">🎮 Join the tournament</h2>
            <JoinForm tournamentId={t.id} />
            <ul className="mt-6 flex flex-wrap gap-2">
              {ps.map((p) => (
                <li
                  key={p.id}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-sm font-medium"
                >
                  🏎️ {p.name}
                </li>
              ))}
              {ps.length === 0 && (
                <li className="text-white/50 text-sm">No racers yet.</li>
              )}
            </ul>
          </section>
          <LobbyActions tournamentId={t.id} playerCount={ps.length} />
        </>
      )}

      {(t.status === "active" || t.status === "finished") && (
        <Bracket
          tournamentId={t.id}
          heats={hs}
          heatPlayers={hps}
          players={ps}
        />
      )}

      <Leaderboard players={ps} winnerId={t.winner_id} />

      {t.status !== "lobby" && <ResetButton tournamentId={t.id} />}
    </main>
  );
}
