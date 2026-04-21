import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Heat, HeatPlayer, Player } from "@/lib/types";
import { HeatResultsForm } from "./results-form";

export const dynamic = "force-dynamic";

export default async function HeatPage({
  params,
}: {
  params: Promise<{ id: string; heatId: string }>;
}) {
  const { id, heatId } = await params;
  const supabase = await createClient();

  const { data: heat } = await supabase
    .from("heats")
    .select("*")
    .eq("id", heatId)
    .single();
  if (!heat || heat.tournament_id !== id) return notFound();
  const h = heat as Heat;
  if (h.heat_number === 999) redirect(`/t/${id}`);

  const { data: heatPlayers } = await supabase
    .from("heat_players")
    .select("*")
    .eq("heat_id", heatId);
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("tournament_id", id);

  const hps = (heatPlayers ?? []) as HeatPlayer[];
  const playerById = new Map(
    ((players ?? []) as Player[]).map((p) => [p.id, p]),
  );
  const roster = hps
    .map((hp) => ({
      heatPlayer: hp,
      player: playerById.get(hp.player_id)!,
    }))
    .filter((r) => r.player);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 flex-1 flex flex-col gap-6">
      <Link href={`/t/${id}`} className="text-sm text-white/60 hover:text-white/90">
        ← Back to bracket
      </Link>

      <header>
        <h1 className="mk-title text-3xl sm:text-4xl">
          Round {h.round} · Heat {h.heat_number}
        </h1>
        <p className="text-white/60 mt-1">
          {h.status === "done"
            ? "Results locked in."
            : `Tap each racer in finishing order (1st → ${roster.length}${roster.length === 1 ? "st" : roster.length === 2 ? "nd" : roster.length === 3 ? "rd" : "th"}). 🍺 chug within 3 laps!`}
        </p>
      </header>

      <HeatResultsForm
        heatId={heatId}
        roster={roster.map((r) => ({
          playerId: r.player.id,
          name: r.player.name,
          finishPosition: r.heatPlayer.finish_position,
        }))}
        locked={h.status === "done"}
        tournamentId={id}
      />
    </main>
  );
}
