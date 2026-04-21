"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planRound, type SeedPlayer } from "@/lib/bracket";

const NameSchema = z.string().trim().min(1).max(24);

export async function createTournament(formData: FormData) {
  const name = NameSchema.parse(formData.get("name"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/t/${data.id}`);
}

export async function joinTournament(tournamentId: string, formData: FormData) {
  const name = NameSchema.parse(formData.get("name"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .insert({ tournament_id: tournamentId, name });
  if (error) {
    if (error.code === "23505") {
      throw new Error("That name's taken. Pick another.");
    }
    throw error;
  }
  revalidatePath(`/t/${tournamentId}`);
}

export async function removePlayer(tournamentId: string, playerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw error;
  revalidatePath(`/t/${tournamentId}`);
}

export async function startTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name")
    .eq("tournament_id", tournamentId);
  if (pErr) throw pErr;
  if (!players || players.length < 2) {
    throw new Error("Need at least 2 players to start.");
  }

  const plan = planRound(players as SeedPlayer[], 1);

  // Insert heats, then heat_players.
  const heatsToInsert = plan.heats.map((h) => ({
    tournament_id: tournamentId,
    round: 1,
    heat_number: h.heatNumber,
  }));
  const { data: insertedHeats, error: hErr } = await supabase
    .from("heats")
    .insert(heatsToInsert)
    .select("id, heat_number");
  if (hErr) throw hErr;

  const heatIdByNumber = new Map(
    (insertedHeats ?? []).map((h) => [h.heat_number, h.id]),
  );

  const heatPlayers = plan.heats.flatMap((h) =>
    h.slots.map((s) => ({
      heat_id: heatIdByNumber.get(h.heatNumber)!,
      player_id: s.playerId,
      is_bye: false,
    })),
  );

  if (heatPlayers.length > 0) {
    const { error: hpErr } = await supabase
      .from("heat_players")
      .insert(heatPlayers);
    if (hpErr) throw hpErr;
  }

  // If there are round-1 byes, create a "virtual" bye marker so we know
  // to carry these players into round 2 when the round advances.
  // We'll store byes in a round-0 heat per tournament. Simpler: track on
  // players via a dedicated "bye_pending_round" column? We didn't add that.
  // Workaround: create an extra heat with heat_number = 999 for byes and
  // status = 'done' so they're picked up at round advancement.
  if (plan.byePlayerIds.length > 0) {
    const { data: byeHeat, error: bhErr } = await supabase
      .from("heats")
      .insert({
        tournament_id: tournamentId,
        round: 1,
        heat_number: 999,
        status: "done",
      })
      .select("id")
      .single();
    if (bhErr) throw bhErr;
    const { error: bhpErr } = await supabase.from("heat_players").insert(
      plan.byePlayerIds.map((pid, idx) => ({
        heat_id: byeHeat.id,
        player_id: pid,
        is_bye: true,
        finish_position: idx + 1,
      })),
    );
    if (bhpErr) throw bhpErr;
  }

  const { error: tErr } = await supabase
    .from("tournaments")
    .update({ status: "active", current_round: 1 })
    .eq("id", tournamentId);
  if (tErr) throw tErr;

  revalidatePath(`/t/${tournamentId}`);
}

const ResultsSchema = z.object({
  heatId: z.string().uuid(),
  positions: z.array(z.object({ playerId: z.string().uuid(), position: z.number().int().min(1).max(4) })),
});

export async function submitHeatResults(input: z.infer<typeof ResultsSchema>) {
  const { heatId, positions } = ResultsSchema.parse(input);
  const supabase = await createClient();

  // 1. Get heat context.
  const { data: heat, error: hErr } = await supabase
    .from("heats")
    .select("id, tournament_id, round")
    .eq("id", heatId)
    .single();
  if (hErr) throw hErr;

  // 2. Write finish positions.
  for (const p of positions) {
    const { error } = await supabase
      .from("heat_players")
      .update({ finish_position: p.position })
      .eq("heat_id", heatId)
      .eq("player_id", p.playerId);
    if (error) throw error;
  }

  // 3. Mark heat as done.
  const { error: updErr } = await supabase
    .from("heats")
    .update({ status: "done" })
    .eq("id", heatId);
  if (updErr) throw updErr;

  // 4. Eliminate bottom 2 (positions 3 and 4). Record round.
  const eliminated = positions
    .filter((p) => p.position >= 3)
    .map((p) => p.playerId);
  if (eliminated.length > 0) {
    const { error: elErr } = await supabase
      .from("players")
      .update({ eliminated: true, eliminated_round: heat.round })
      .in("id", eliminated);
    if (elErr) throw elErr;
  }

  // 5. If this heat was the final and there are 4 slots, pick the winner
  //    (position 1 of a final).
  await maybeAdvanceRound(heat.tournament_id, heat.round);

  revalidatePath(`/t/${heat.tournament_id}`);
}

async function maybeAdvanceRound(tournamentId: string, round: number) {
  const supabase = await createClient();

  // Get all heats for this round (real race heats only, not the bye marker 999).
  const { data: heats, error: hErr } = await supabase
    .from("heats")
    .select("id, heat_number, status")
    .eq("tournament_id", tournamentId)
    .eq("round", round);
  if (hErr) throw hErr;

  const raceHeats = (heats ?? []).filter((h) => h.heat_number !== 999);
  const allDone = raceHeats.every((h) => h.status === "done");
  if (!allDone) return;

  // Check if this was the final: one race heat with exactly 2-4 real players.
  const { data: heatPlayers } = await supabase
    .from("heat_players")
    .select("heat_id, player_id, finish_position, is_bye, heats!inner(heat_number, round)")
    .eq("heats.tournament_id", tournamentId)
    .eq("heats.round", round);

  // Advancers = finish_position 1..2 from race heats + bye players (heat_number=999).
  const advancers: string[] = [];
  for (const h of raceHeats) {
    const inHeat = (heatPlayers ?? []).filter((hp) => hp.heat_id === h.id);
    const top2 = inHeat
      .filter((hp) => hp.finish_position === 1 || hp.finish_position === 2)
      .map((hp) => hp.player_id);
    advancers.push(...top2);
  }
  const byeHeat = (heats ?? []).find((h) => h.heat_number === 999);
  if (byeHeat) {
    const byes = (heatPlayers ?? [])
      .filter((hp) => hp.heat_id === byeHeat.id)
      .map((hp) => hp.player_id);
    advancers.push(...byes);
  }

  // Tournament finished if exactly 1 advancer (final had 2 players & top1 advanced alone),
  // OR if the completed round was a "final" (single heat with <=4 players and no byes pending).
  // Simpler rule: if advancers.length <= 1 → winner. Else build next round.
  if (advancers.length <= 1) {
    const winnerId = advancers[0] ?? null;
    await supabase
      .from("tournaments")
      .update({ status: "finished", winner_id: winnerId })
      .eq("id", tournamentId);
    return;
  }

  // If only one race heat this round and it was the final (≤4 players total), mark winner.
  // Detect: no byes pending + this round's race-heat count was 1 AND round's entrants = raceHeats*4 + byes <=4.
  // Actually advancers.length==1 already covers it. If final had 2 players (top1 advances only) we want winner.
  // If a final had 3-4 players, we still pick top-1 as winner.
  const { data: thisRoundEntries } = await supabase
    .from("heat_players")
    .select("player_id, finish_position, heats!inner(round, tournament_id, heat_number)")
    .eq("heats.tournament_id", tournamentId)
    .eq("heats.round", round);
  const realEntries = (thisRoundEntries ?? []).filter(
    (e) => (e as any).heats.heat_number !== 999,
  );
  // If only one race heat, treat as final: winner is position 1.
  if (raceHeats.length === 1) {
    const winner = realEntries.find((e) => e.finish_position === 1);
    if (winner) {
      await supabase
        .from("tournaments")
        .update({ status: "finished", winner_id: winner.player_id })
        .eq("id", tournamentId);
      return;
    }
  }

  // Otherwise, plan next round.
  const { data: advancingPlayers } = await supabase
    .from("players")
    .select("id, name")
    .in("id", advancers);

  const plan = planRound((advancingPlayers ?? []) as SeedPlayer[], round + 1);

  if (plan.heats.length > 0) {
    const { data: newHeats, error: newErr } = await supabase
      .from("heats")
      .insert(
        plan.heats.map((h) => ({
          tournament_id: tournamentId,
          round: round + 1,
          heat_number: h.heatNumber,
        })),
      )
      .select("id, heat_number");
    if (newErr) throw newErr;
    const idByNum = new Map(
      (newHeats ?? []).map((h) => [h.heat_number, h.id]),
    );
    await supabase.from("heat_players").insert(
      plan.heats.flatMap((h) =>
        h.slots.map((s) => ({
          heat_id: idByNum.get(h.heatNumber)!,
          player_id: s.playerId,
          is_bye: false,
        })),
      ),
    );
  }

  if (plan.byePlayerIds.length > 0) {
    const { data: bye } = await supabase
      .from("heats")
      .insert({
        tournament_id: tournamentId,
        round: round + 1,
        heat_number: 999,
        status: "done",
      })
      .select("id")
      .single();
    if (bye) {
      await supabase.from("heat_players").insert(
        plan.byePlayerIds.map((pid, idx) => ({
          heat_id: bye.id,
          player_id: pid,
          is_bye: true,
          finish_position: idx + 1,
        })),
      );
    }
  }

  await supabase
    .from("tournaments")
    .update({ current_round: round + 1 })
    .eq("id", tournamentId);
}

export async function resetTournament(tournamentId: string) {
  const supabase = await createClient();
  // Wipe heats (cascades to heat_players). Un-eliminate players.
  await supabase.from("heats").delete().eq("tournament_id", tournamentId);
  await supabase
    .from("players")
    .update({ eliminated: false, eliminated_round: null })
    .eq("tournament_id", tournamentId);
  await supabase
    .from("tournaments")
    .update({ status: "lobby", current_round: 0, winner_id: null })
    .eq("id", tournamentId);
  revalidatePath(`/t/${tournamentId}`);
}
