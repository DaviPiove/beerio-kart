import Link from "next/link";
import { createTournament } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { Beer, CheckerFlag, Kart, Star, Trophy } from "@/components/assets";
import { DeleteTournamentButton } from "@/components/delete-tournament-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 flex-1 flex flex-col gap-10">
      <header className="text-center pt-4 relative anim-pop">
        {/* Floating hero icons */}
        <div className="absolute -top-4 left-2 w-16 sm:w-20 anim-bob" aria-hidden>
          <Beer />
        </div>
        <div
          className="absolute -top-2 right-0 w-16 sm:w-20 anim-bob anim-glow"
          style={{ animationDelay: "0.4s" }}
          aria-hidden
        >
          <Star />
        </div>

        <div className="inline-flex items-center gap-2 mb-3 font-pixel text-[10px] px-3 py-1.5 rounded-full border-2 border-[#1a0030] bg-[#ffd83d] text-[#3a1600] shadow-[0_4px_0_#1a0030]">
          <span className="w-2 h-2 rounded-full bg-mario animate-pulse" />
          TOURNAMENT NIGHT
        </div>

        <h1 className="headline text-[3.2rem] sm:text-[5rem] leading-[0.9]">
          Beerio
          <br />
          <span className="rainbow-text" style={{ WebkitTextStroke: "0" }}>
            Kart
          </span>
        </h1>

        <p className="mt-5 text-white/80 text-base sm:text-lg max-w-xl mx-auto">
          Mario Kart × one full beer. <strong className="text-banana">Chug it within 3 laps.</strong>{" "}
          No joystick while drinking. Last kart standing wins.
        </p>

        <div className="flex justify-center gap-2 mt-5 flex-wrap">
          <span className="tag bg-luigi text-[#0a2e17]">🏁 4-player heats</span>
          <span className="tag bg-banana text-[#3a1600]">Top 2 advance</span>
          <span className="tag bg-peach text-white">Open bracket</span>
        </div>
      </header>

      <section className="card p-6 sm:p-8 anim-pop anim-pop-1 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 sm:w-28 anim-spin-slow opacity-80 pointer-events-none" aria-hidden>
          <CheckerFlag />
        </div>
        <h2 className="font-display uppercase text-xl sm:text-2xl mb-1 text-banana">
          Start a Tournament
        </h2>
        <p className="text-white/60 text-sm mb-5">
          Name it, share the link, get your crew drinking.
        </p>
        <form
          action={createTournament}
          className="flex gap-3 flex-col sm:flex-row"
        >
          <input
            name="name"
            placeholder="e.g. Friday Night Chaos"
            required
            maxLength={48}
            className="input flex-1"
          />
          <button type="submit" className="btn btn-primary btn-wiggle">
            Start 🚀
          </button>
        </form>
      </section>

      {tournaments && tournaments.length > 0 && (
        <section className="card p-6 sm:p-8 anim-pop anim-pop-2">
          <h2 className="font-display uppercase text-xl sm:text-2xl mb-4 flex items-center gap-3">
            <span className="w-7 h-7"><Trophy /></span>
            Recent Races
          </h2>
          <ul className="flex flex-col gap-3">
            {tournaments.map((t, i) => (
              <li key={t.id} className="relative">
                <div className="flex items-stretch gap-3">
                  <Link
                    href={`/t/${t.id}`}
                    className="flex items-center gap-4 flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-banana/50 transition group"
                  >
                    <div className="w-10 h-10 shrink-0 group-hover:rotate-12 transition">
                      <Kart />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display uppercase text-base truncate">
                        {t.name}
                      </div>
                      <div className="text-xs text-white/50">
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusTag status={t.status} />
                  </Link>
                  <DeleteTournamentButton
                    tournamentId={t.id}
                    tournamentName={t.name}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-white/40 text-[11px] font-pixel leading-loose pt-4 pb-2">
        DRINK RESPONSIBLY · BEER WITHIN 3 LAPS · GG WP
      </footer>
    </main>
  );
}

function StatusTag({ status }: { status: string }) {
  if (status === "finished")
    return <span className="tag bg-banana text-[#3a1600]">🏆 Done</span>;
  if (status === "active")
    return <span className="tag bg-mario text-white animate-pulse">🔥 Live</span>;
  return <span className="tag bg-luigi text-[#0a2e17]">Lobby</span>;
}
