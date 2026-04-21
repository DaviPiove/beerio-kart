import Link from "next/link";
import { createTournament } from "./actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 flex-1 flex flex-col gap-10">
      <header className="text-center mt-8">
        <div className="text-6xl mb-3">🍺🏁</div>
        <h1 className="mk-title text-5xl sm:text-6xl">Beerio Kart</h1>
        <p className="mt-3 text-white/70">
          Mario Kart. One full beer. Finish it within 3 laps. No joystick while
          drinking.
        </p>
      </header>

      <section className="mk-card p-6">
        <h2 className="text-xl font-bold mb-4">🏆 New tournament</h2>
        <form action={createTournament} className="flex gap-3 flex-col sm:flex-row">
          <input
            name="name"
            placeholder="Tournament name (e.g. 'Friday Night Chaos')"
            required
            maxLength={48}
            className="mk-input flex-1"
          />
          <button type="submit" className="mk-btn mk-btn-primary">
            Start ✨
          </button>
        </form>
      </section>

      {tournaments && tournaments.length > 0 && (
        <section className="mk-card p-6">
          <h2 className="text-xl font-bold mb-4">Recent</h2>
          <ul className="flex flex-col gap-2">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/t/${t.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-sm text-white/60 capitalize">
                    {t.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-white/40 text-xs mt-auto pt-8">
        Drink responsibly. The beer must be finished within the 3 laps.
      </footer>
    </main>
  );
}
