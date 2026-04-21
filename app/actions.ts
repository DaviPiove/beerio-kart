"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  planRound,
  planGroupStage,
  planDoubleElimRound,
  computeGroupStandings,
  recommendFormat,
  DEFAULT_LIVES,
  type SeedPlayer,
  type LivedPlayer,
  type PlannedHeat,
  type TournamentFormat,
} from "@/lib/bracket";

const NameSchema = z.string().trim().min(1).max(24);
const FormatSchema = z.enum(["single_elim", "group_stage", "double_elim"]);

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

export async function setTournamentFormat(
  tournamentId: string,
  format: TournamentFormat,
) {
  const parsed = FormatSchema.parse(format);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ format: parsed })
    .eq("id", tournamentId)
    .eq("status", "lobby");
  if (error) throw error;
  revalidatePath(`/t/${tournamentId}`);
}

// Shared helper: insert a set of planned heats + their players for a given
// round, and return the inserted heats (with ids) keyed by heat_number.
async function insertPlannedHeats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  round: number,
  heats: PlannedHeat[],
) {
  if (heats.length === 0) return new Map<number, string>();
  const { data: inserted, error: hErr } = await supabase
    .from("heats")
    .insert(
      heats.map((h) => ({
        tournament_id: tournamentId,
        round,
        heat_number: h.heatNumber,
      })),
    )
    .select("id, heat_number");
  if (hErr) throw hErr;

  const idByNum = new Map((inserted ?? []).map((h) => [h.heat_number, h.id]));

  const heatPlayers = heats.flatMap((h) =>
    h.slots.map((s) => ({
      heat_id: idByNum.get(h.heatNumber)!,
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
  return idByNum;
}

// Shared helper: create a heat_number=999 bye marker for the given round,
// containing the specified players. Marked status='done' so round-advancement
// treats its occupants as advancers immediately.
async function insertByeHeat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  round: number,
  byePlayerIds: string[],
) {
  if (byePlayerIds.length === 0) return;
  const { data: byeHeat, error: bhErr } = await supabase
    .from("heats")
    .insert({
      tournament_id: tournamentId,
      round,
      heat_number: 999,
      status: "done",
    })
    .select("id")
    .single();
  if (bhErr) throw bhErr;
  const { error: bhpErr } = await supabase.from("heat_players").insert(
    byePlayerIds.map((pid, idx) => ({
      heat_id: byeHeat.id,
      player_id: pid,
      is_bye: true,
      finish_position: idx + 1,
    })),
  );
  if (bhpErr) throw bhpErr;
}

export async function startTournament(tournamentId: string) {
  const supabase = await createClient();

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, format, status")
    .eq("id", tournamentId)
    .single();
  if (tErr) throw tErr;
  if (tournament.status !== "lobby") {
    throw new Error("Tournament already started.");
  }

  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name")
    .eq("tournament_id", tournamentId);
  if (pErr) throw pErr;
  if (!players || players.length < 2) {
    throw new Error("Need at least 2 players to start.");
  }

  // Resolve format. Use what's stored on the tournament, but if the player
  // count doesn't fit the chosen format, fall back to the recommendation.
  // e.g. host picked group_stage, then extra players joined → switch to
  // double_elim. Or only 3 players → single final heat.
  let format = tournament.format as TournamentFormat;
  const rec = recommendFormat(players.length);
  if (format === "group_stage" && (players.length < 5 || players.length > 7)) {
    format = rec;
  }
  if (format !== tournament.format) {
    await supabase
      .from("tournaments")
      .update({ format })
      .eq("id", tournamentId);
  }

  const seeds = players as SeedPlayer[];

  if (format === "group_stage") {
    const plan = planGroupStage(seeds, 1);
    await insertPlannedHeats(supabase, tournamentId, 1, plan.heats);
    // No byes in group stage.
  } else {
    // single_elim OR double_elim — same round 1 shape.
    if (format === "double_elim") {
      // Reset lives before starting.
      await supabase
        .from("players")
        .update({ lives: DEFAULT_LIVES })
        .eq("tournament_id", tournamentId);
    }
    const plan = planRound(seeds, 1);
    await insertPlannedHeats(supabase, tournamentId, 1, plan.heats);
    await insertByeHeat(supabase, tournamentId, 1, plan.byePlayerIds);
  }

  const { error: updErr } = await supabase
    .from("tournaments")
    .update({ status: "active", current_round: 1 })
    .eq("id", tournamentId);
  if (updErr) throw updErr;

  revalidatePath(`/t/${tournamentId}`);
}

const ResultsSchema = z.object({
  heatId: z.string().uuid(),
  positions: z.array(
    z.object({
      playerId: z.string().uuid(),
      position: z.number().int().min(1).max(4),
    }),
  ),
});

export async function submitHeatResults(input: z.infer<typeof ResultsSchema>) {
  const { heatId, positions } = ResultsSchema.parse(input);
  const supabase = await createClient();

  const { data: heat, error: hErr } = await supabase
    .from("heats")
    .select("id, tournament_id, round")
    .eq("id", heatId)
    .single();
  if (hErr) throw hErr;

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("format")
    .eq("id", heat.tournament_id)
    .single();
  if (tErr) throw tErr;
  const format = tournament.format as TournamentFormat;

  for (const p of positions) {
    const { error } = await supabase
      .from("heat_players")
      .update({ finish_position: p.position })
      .eq("heat_id", heatId)
      .eq("player_id", p.playerId);
    if (error) throw error;
  }

  const { error: updErr } = await supabase
    .from("heats")
    .update({ status: "done" })
    .eq("id", heatId);
  if (updErr) throw updErr;

  // Immediate per-heat side effects so the leaderboard updates in real time
  // without waiting for every heat in the round to finish. The round-level
  // advancement in `maybeAdvanceRound` still runs afterwards.
  const bottom = positions.filter((p) => p.position >= 3).map((p) => p.playerId);
  if (format === "single_elim" && bottom.length > 0) {
    await supabase
      .from("players")
      .update({ eliminated: true, eliminated_round: heat.round })
      .in("id", bottom);
  }
  if (format === "double_elim" && bottom.length > 0) {
    const { data: affected } = await supabase
      .from("players")
      .select("id, lives")
      .in("id", bottom);
    for (const p of affected ?? []) {
      const next = Math.max(0, (p.lives ?? DEFAULT_LIVES) - 1);
      const update: { lives: number; eliminated?: boolean; eliminated_round?: number } = {
        lives: next,
      };
      if (next === 0) {
        update.eliminated = true;
        update.eliminated_round = heat.round;
      }
      await supabase.from("players").update(update).eq("id", p.id);
    }
  }

  await maybeAdvanceRound(heat.tournament_id, heat.round);

  revalidatePath(`/t/${heat.tournament_id}`);
}

async function maybeAdvanceRound(tournamentId: string, round: number) {
  const supabase = await createClient();

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("format")
    .eq("id", tournamentId)
    .single();
  if (tErr) throw tErr;
  const format = tournament.format as TournamentFormat;

  const { data: heats, error: hErr } = await supabase
    .from("heats")
    .select("id, heat_number, status")
    .eq("tournament_id", tournamentId)
    .eq("round", round);
  if (hErr) throw hErr;

  const raceHeats = (heats ?? []).filter((h) => h.heat_number !== 999);
  if (!raceHeats.every((h) => h.status === "done")) return;

  type HpRow = {
    heat_id: string;
    player_id: string;
    finish_position: number | null;
    is_bye: boolean;
  };
  const { data: heatPlayersRaw } = await supabase
    .from("heat_players")
    .select("heat_id, player_id, finish_position, is_bye")
    .in(
      "heat_id",
      (heats ?? []).map((h) => h.id),
    );
  const heatPlayers = (heatPlayersRaw ?? []) as HpRow[];
  const hpByHeat = new Map<string, HpRow[]>();
  for (const hp of heatPlayers) {
    if (!hpByHeat.has(hp.heat_id)) hpByHeat.set(hp.heat_id, []);
    hpByHeat.get(hp.heat_id)!.push(hp);
  }

  // Finish orders per race heat (sorted by finish_position).
  const raceHeatResults = raceHeats.map((h) => {
    const inHeat = (hpByHeat.get(h.id) ?? [])
      .slice()
      .sort(
        (a, b) => (a.finish_position ?? 99) - (b.finish_position ?? 99),
      );
    return {
      heatNumber: h.heat_number,
      finishersByPosition: inHeat.map((hp) => hp.player_id),
    };
  });

  if (format === "group_stage") {
    await advanceGroupStage(tournamentId, round, raceHeatResults);
    return;
  }
  if (format === "double_elim") {
    await advanceDoubleElim(tournamentId, round, raceHeatResults);
    return;
  }
  await advanceSingleElim(
    tournamentId,
    round,
    raceHeats,
    heats ?? [],
    hpByHeat,
    raceHeatResults,
  );
}

// ---------------------------------------------------------------------------
// Single elimination (original behavior).
// ---------------------------------------------------------------------------

async function advanceSingleElim(
  tournamentId: string,
  round: number,
  raceHeats: { id: string; heat_number: number }[],
  allHeats: { id: string; heat_number: number }[],
  hpByHeat: Map<
    string,
    { player_id: string; finish_position: number | null; is_bye: boolean }[]
  >,
  raceHeatResults: { heatNumber: number; finishersByPosition: string[] }[],
) {
  const supabase = await createClient();

  // Eliminations already happened per-heat in submitHeatResults.
  // Here we just compute advancers and either build the next round or mark a winner.
  const advancers: string[] = [];
  for (const r of raceHeatResults) advancers.push(...r.finishersByPosition.slice(0, 2));
  const byeHeat = allHeats.find((h) => h.heat_number === 999);
  if (byeHeat) {
    const byes = (hpByHeat.get(byeHeat.id) ?? []).map((hp) => hp.player_id);
    advancers.push(...byes);
  }

  // 1 race heat and nobody advancing past it → final.
  if (raceHeats.length === 1 && !byeHeat) {
    const winner = raceHeatResults[0]?.finishersByPosition[0];
    if (winner) {
      await supabase
        .from("tournaments")
        .update({ status: "finished", winner_id: winner })
        .eq("id", tournamentId);
      return;
    }
  }
  if (advancers.length <= 1) {
    await supabase
      .from("tournaments")
      .update({ status: "finished", winner_id: advancers[0] ?? null })
      .eq("id", tournamentId);
    return;
  }

  await buildNextRound(tournamentId, round + 1, advancers, "single_elim");
}

// ---------------------------------------------------------------------------
// Group stage: everyone races ~2 heats; top 4 by points go to final.
// ---------------------------------------------------------------------------

async function advanceGroupStage(
  tournamentId: string,
  round: number,
  raceHeatResults: { heatNumber: number; finishersByPosition: string[] }[],
) {
  const supabase = await createClient();

  // Round 1 = the whole group stage. Round 2 = grand final.
  if (round === 1) {
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("tournament_id", tournamentId);
    const allIds = (players ?? []).map((p) => p.id);
    const standings = computeGroupStandings(allIds, raceHeatResults);

    const finalists = standings.slice(0, 4).map((s) => s.playerId);
    const eliminated = standings.slice(4).map((s) => s.playerId);

    if (eliminated.length > 0) {
      await supabase
        .from("players")
        .update({ eliminated: true, eliminated_round: round })
        .in("id", eliminated);
    }

    if (finalists.length <= 1) {
      await supabase
        .from("tournaments")
        .update({ status: "finished", winner_id: finalists[0] ?? null })
        .eq("id", tournamentId);
      return;
    }

    await buildNextRound(tournamentId, round + 1, finalists, "group_stage");
    return;
  }

  // Round 2+: final heat was played. Position 1 wins.
  const winner = raceHeatResults[0]?.finishersByPosition[0];
  // Eliminate the rest of the final heat's field for the leaderboard.
  const losers = (raceHeatResults[0]?.finishersByPosition ?? []).slice(1);
  if (losers.length > 0) {
    await supabase
      .from("players")
      .update({ eliminated: true, eliminated_round: round })
      .in("id", losers);
  }
  await supabase
    .from("tournaments")
    .update({ status: "finished", winner_id: winner ?? null })
    .eq("id", tournamentId);
}

// ---------------------------------------------------------------------------
// Double elim (2-life): 3rd/4th lose 1 life; 0-life players are eliminated.
// ---------------------------------------------------------------------------

async function advanceDoubleElim(
  tournamentId: string,
  round: number,
  raceHeatResults: { heatNumber: number; finishersByPosition: string[] }[],
) {
  const supabase = await createClient();

  // Life deductions and eliminations already applied per-heat in
  // submitHeatResults. Here we just check who is still standing and either
  // finish the tournament or build the next round.
  const { data: players } = await supabase
    .from("players")
    .select("id, eliminated")
    .eq("tournament_id", tournamentId);
  const stillAlive = (players ?? [])
    .filter((p) => !p.eliminated)
    .map((p) => p.id);

  // Final round: exactly one heat and everyone in it is still alive.
  if (raceHeatResults.length === 1) {
    const finalIds = raceHeatResults[0].finishersByPosition;
    const allAlive = finalIds.every((id) => stillAlive.includes(id));
    if (allAlive && finalIds.length <= 4) {
      const winner = finalIds[0];
      // Mark runners-up of the final as eliminated so the leaderboard renders them under "out".
      const losers = finalIds.slice(1).filter((id) => stillAlive.includes(id));
      if (losers.length > 0) {
        await supabase
          .from("players")
          .update({ eliminated: true, eliminated_round: round })
          .in("id", losers);
      }
      await supabase
        .from("tournaments")
        .update({ status: "finished", winner_id: winner ?? null })
        .eq("id", tournamentId);
      return;
    }
  }

  if (stillAlive.length <= 1) {
    await supabase
      .from("tournaments")
      .update({ status: "finished", winner_id: stillAlive[0] ?? null })
      .eq("id", tournamentId);
    return;
  }

  await buildNextRound(tournamentId, round + 1, stillAlive, "double_elim");
}

// ---------------------------------------------------------------------------
// Shared next-round builder: fetches names for advancers, calls the
// format-appropriate planner, inserts heats + byes.
// ---------------------------------------------------------------------------

async function buildNextRound(
  tournamentId: string,
  nextRound: number,
  playerIds: string[],
  format: TournamentFormat,
) {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, name, lives")
    .in("id", playerIds);

  const ordered = playerIds
    .map((id) => (players ?? []).find((p) => p.id === id))
    .filter((p): p is { id: string; name: string; lives: number } => !!p);

  let heats: PlannedHeat[] = [];
  let byePlayerIds: string[] = [];

  if (format === "double_elim") {
    const lived: LivedPlayer[] = ordered.map((p) => ({
      id: p.id,
      name: p.name,
      lives: p.lives ?? DEFAULT_LIVES,
    }));
    const plan = planDoubleElimRound(lived, nextRound);
    heats = plan.heats;
    byePlayerIds = plan.byePlayerIds;
  } else {
    // single_elim and group-stage grand final both use the plain round planner.
    const seeds: SeedPlayer[] = ordered.map((p) => ({ id: p.id, name: p.name }));
    const plan = planRound(seeds, nextRound);
    heats = plan.heats;
    byePlayerIds = plan.byePlayerIds;
  }

  await insertPlannedHeats(supabase, tournamentId, nextRound, heats);
  await insertByeHeat(supabase, tournamentId, nextRound, byePlayerIds);

  await supabase
    .from("tournaments")
    .update({ current_round: nextRound })
    .eq("id", tournamentId);
}

export async function deleteTournament(tournamentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}

export async function resetTournament(tournamentId: string) {
  const supabase = await createClient();
  await supabase.from("heats").delete().eq("tournament_id", tournamentId);
  await supabase
    .from("players")
    .update({ eliminated: false, eliminated_round: null, lives: DEFAULT_LIVES })
    .eq("tournament_id", tournamentId);
  await supabase
    .from("tournaments")
    .update({ status: "lobby", current_round: 0, winner_id: null })
    .eq("id", tournamentId);
  revalidatePath(`/t/${tournamentId}`);
}
