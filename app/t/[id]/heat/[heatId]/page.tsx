import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Heat, HeatPlayer, Player } from "@/lib/types";
import { HeatResultsForm } from "./results-form";
import { Beer, CheckerFlag } from "@/components/assets";

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
    <main className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8 flex-1 flex flex-col gap-6">
      <Link
        href={`/t/${id}`}
        className="inline-flex items-center gap-2 text-xs font-pixel text-white/70 hover:text-banana transition"
      >
        ← BRACKET
      </Link>

      <header className="relative anim-pop">
        <div
          className="absolute -top-4 -right-2 w-16 anim-bob opacity-80"
          aria-hidden
        >
          <CheckerFlag />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-pixel text-[10px] px-2.5 py-1.5 rounded-full border-2 border-[#1a0030] bg-sky text-[#002a4a] shadow-[0_3px_0_#1a0030]">
            ROUND {h.round}
          </span>
          <span className="font-pixel text-[10px] px-2.5 py-1.5 rounded-full border-2 border-[#1a0030] bg-peach text-white shadow-[0_3px_0_#1a0030]">
            HEAT {h.heat_number}
          </span>
        </div>
        <h1 className="headline-sm text-3xl sm:text-4xl">
          {h.status === "done" ? "Results" : "Tap the finish order"}
        </h1>
        {h.status !== "done" && (
          <p className="text-white/70 mt-2 flex items-start gap-2">
            <span className="w-5 h-5 shrink-0 mt-0.5"><Beer /></span>
            Chug within 3 laps. No joystick while drinking. 1st → last.
          </p>
        )}
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
