import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Heat, HeatPlayer, Player, Tournament } from "@/lib/types";
import { JoinForm } from "./join-form";
import { LobbyActions } from "./lobby-actions";
import { Bracket } from "./bracket";
import { FormatSelector } from "./format-selector";
import { Leaderboard } from "./leaderboard";
import { RealtimeRefresher } from "./realtime";
import { ResetButton } from "./reset-button";
import { WinnerCelebration } from "./winner-celebration";
import { DeleteTournamentButton } from "@/components/delete-tournament-button";
import { Kart, Mushroom } from "@/components/assets";
import { formatLabel } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: tournament },
    { data: players },
    { data: heats },
    { data: heatPlayers },
  ] = await Promise.all([
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
      .select(
        "heat_id, player_id, finish_position, is_bye, heats!inner(tournament_id)",
      )
      .eq("heats.tournament_id", id),
  ]);

  if (!tournament) return notFound();
  const t = tournament as Tournament;
  const ps = (players ?? []) as Player[];
  const hs = (heats ?? []) as Heat[];
  const hps = ((heatPlayers ?? []) as unknown as HeatPlayer[]) ?? [];
  const winner = t.winner_id ? ps.find((p) => p.id === t.winner_id) : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8 flex-1 flex flex-col gap-6 sm:gap-8">
      <RealtimeRefresher tournamentId={t.id} />
      {t.status === "finished" && winner && (
        <WinnerCelebration key={winner.id} />
      )}

      <header className="flex items-start justify-between gap-4 anim-pop">
        <div className="flex-1 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-pixel text-white/70 hover:text-banana transition"
          >
            ← HOME
          </Link>
          <h1 className="headline-sm text-3xl sm:text-5xl mt-2 break-words">
            {t.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {t.status === "lobby" && (
              <span className="tag bg-luigi text-[#0a2e17]">
                🕹 Lobby · {ps.length} {ps.length === 1 ? "racer" : "racers"}
              </span>
            )}
            {t.status === "active" && (
              <span className="tag bg-mario text-white animate-pulse">
                🔥 Round {t.current_round} Live
              </span>
            )}
            {t.status === "finished" && winner && (
              <span className="tag bg-banana text-[#3a1600]">
                🏆 {winner.name} wins!
              </span>
            )}
            <span className="tag bg-[#1a0030] text-white/80 border border-white/20">
              🎮 {formatLabel(t.format)}
            </span>
          </div>
        </div>
        <DeleteTournamentButton
          tournamentId={t.id}
          tournamentName={t.name}
        />
      </header>

      {t.status === "finished" && winner && (
        <section className="card-sticker bg-gradient-to-b from-banana to-shell text-center p-6 sm:p-10 anim-pop anim-pop-1 relative overflow-hidden">
          <div className="absolute -left-6 top-6 w-20 opacity-80 -rotate-12" aria-hidden>
            <Mushroom />
          </div>
          <div className="absolute -right-4 bottom-2 w-20 opacity-80 rotate-12" aria-hidden>
            <Kart />
          </div>
          <div className="text-6xl mb-2">🏆🍺</div>
          <div className="font-display uppercase text-4xl sm:text-5xl text-[#3a1600]" style={{ WebkitTextStroke: "2px #fff" }}>
            {winner.name}
          </div>
          <p className="text-[#3a1600]/90 mt-3 font-bold">
            drank the beers and won it all.
          </p>
        </section>
      )}

      {t.status === "lobby" && (
        <>
          <section className="card p-6 sm:p-8 anim-pop anim-pop-1">
            <h2 className="font-display uppercase text-xl sm:text-2xl mb-1 text-banana">
              🎮 Join the race
            </h2>
            <p className="text-white/60 text-sm mb-5">
              Type your racer name and jump into the lobby.
            </p>
            <JoinForm tournamentId={t.id} />
            <ul className="mt-6 flex flex-wrap gap-2">
              {ps.map((p, i) => (
                <li
                  key={p.id}
                  className="anim-pop"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <span className="tag bg-white text-[#1a0030]">
                    🏎️ {p.name}
                  </span>
                </li>
              ))}
              {ps.length === 0 && (
                <li className="text-white/50 text-sm italic">
                  No racers yet. Be the first.
                </li>
              )}
            </ul>
          </section>
          <FormatSelector
            tournamentId={t.id}
            currentFormat={t.format}
            playerCount={ps.length}
          />
          <div className="anim-pop anim-pop-2">
            <LobbyActions tournamentId={t.id} playerCount={ps.length} />
          </div>
        </>
      )}

      {(t.status === "active" || t.status === "finished") && (
        <div className="anim-pop anim-pop-1">
          <Bracket
            tournamentId={t.id}
            heats={hs}
            heatPlayers={hps}
            players={ps}
            format={t.format}
          />
        </div>
      )}

      <div className="anim-pop anim-pop-2">
        <Leaderboard
          players={ps}
          winnerId={t.winner_id}
          format={t.format}
          heats={hs}
          heatPlayers={hps}
        />
      </div>

      {t.status !== "lobby" && <ResetButton tournamentId={t.id} />}
    </main>
  );
}
