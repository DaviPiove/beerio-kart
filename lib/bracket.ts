// Pure bracket logic - no DB dependencies so it's unit-testable.
// Supports three tournament formats, all built around 4-player Mario Kart heats:
//
//   - single_elim: classic knockout. Top 2 advance, bottom 2 eliminated.
//                  Byes handed out when player count isn't divisible by 4.
//   - group_stage: everyone plays 2-3 heats in a single round, earning
//                  points (4/3/2/1 for 1st/2nd/3rd/4th). Top 4 by points
//                  advance to a grand final heat. Ideal for 5-7 players.
//   - double_elim: each player starts with 2 lives. In each round everyone
//                  still alive races in 4-player heats (byes for the
//                  remainder). Finishing 3rd or 4th costs one life. Players
//                  at 0 lives are out. Continues until ≤4 alive → final.

export type TournamentFormat = "single_elim" | "group_stage" | "double_elim";

export type SeedPlayer = { id: string; name: string };

export type HeatSlot = {
  playerId: string;
  isBye: boolean;
};

export type PlannedHeat = {
  round: number;
  heatNumber: number;
  slots: HeatSlot[]; // exactly 4 entries for full heats; may be 2-3 for the final
  isFinal: boolean;
};

export type RoundPlan = {
  round: number;
  heats: PlannedHeat[];
  byePlayerIds: string[]; // players skipping this round into round+1
};

export const GROUP_STAGE_MIN = 5;
export const GROUP_STAGE_MAX = 7;
export const DEFAULT_LIVES = 2;

// Pick a sensible default format given how many players joined.
// The host can still override this in the lobby.
export function recommendFormat(playerCount: number): TournamentFormat {
  if (playerCount <= 4) return "single_elim";
  if (playerCount >= GROUP_STAGE_MIN && playerCount <= GROUP_STAGE_MAX)
    return "group_stage";
  return "double_elim";
}

export function formatLabel(f: TournamentFormat): string {
  switch (f) {
    case "single_elim":
      return "Single Elimination";
    case "group_stage":
      return "Group Stage + Final";
    case "double_elim":
      return "Double Elimination";
  }
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Single elimination (and shared "round of 4-heats" helper).
// ---------------------------------------------------------------------------

// Given N players, figure out how many byes to hand out so the racing
// remainder is a clean set of 4-player heats.
// - N <= 4: single final heat, 0 byes.
// - Else: byes = N mod 4 (so racing = N - (N mod 4), divisible by 4).
export function computeByes(n: number): number {
  if (n <= 4) return 0;
  return n % 4;
}

export function planRound(
  players: SeedPlayer[],
  round: number,
  rng: () => number = Math.random,
): RoundPlan {
  if (players.length < 2) {
    return { round, heats: [], byePlayerIds: [] };
  }

  if (players.length <= 4) {
    return {
      round,
      heats: [
        {
          round,
          heatNumber: 1,
          slots: players.map((p) => ({ playerId: p.id, isBye: false })),
          isFinal: true,
        },
      ],
      byePlayerIds: [],
    };
  }

  const byes = computeByes(players.length);
  const shuffled = shuffle(players, rng);
  // First `byes` players in the shuffled order get the bye. Random = fair.
  const byePlayers = shuffled.slice(0, byes);
  const racing = shuffled.slice(byes);

  const heats: PlannedHeat[] = [];
  for (let i = 0; i < racing.length; i += 4) {
    const chunk = racing.slice(i, i + 4);
    heats.push({
      round,
      heatNumber: heats.length + 1,
      slots: chunk.map((p) => ({ playerId: p.id, isBye: false })),
      isFinal: false,
    });
  }

  return {
    round,
    heats,
    byePlayerIds: byePlayers.map((p) => p.id),
  };
}

// After all heats in a round are done, figure out who advances.
// Input: for each completed heat, an ordered list of player IDs by finish (1st..Nth).
// Output: list of advancing player IDs (top 2 per heat).
export function advancingFromResults(
  results: { heatNumber: number; finishersByPosition: string[] }[],
): string[] {
  const advancing: string[] = [];
  // Preserve heat order so seeding next round is deterministic-ish.
  const sorted = [...results].sort((a, b) => a.heatNumber - b.heatNumber);
  for (const r of sorted) {
    advancing.push(...r.finishersByPosition.slice(0, 2));
  }
  return advancing;
}

export function eliminatedFromResults(
  results: { finishersByPosition: string[] }[],
): string[] {
  const out: string[] = [];
  for (const r of results) {
    out.push(...r.finishersByPosition.slice(2));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Group stage: one round of many heats, points decide who makes the final.
// ---------------------------------------------------------------------------

// Points for finishing 1st / 2nd / 3rd / 4th in a group-stage heat.
export const GROUP_STAGE_POINTS: readonly number[] = [4, 3, 2, 1];

// For 5-7 players we aim for "everyone races ~2 heats" (with a tiny overflow
// so the total slot count is divisible by 4). See SKILL/docs for rationale.
// - 5 players -> 3 heats (12 slots → 3 players race 3 heats, 2 race 2)
// - 6 players -> 3 heats (12 slots → everyone races exactly 2 heats)
// - 7 players -> 4 heats (16 slots → 2 players race 3 heats, 5 race 2)
export function computeGroupStageHeatCount(n: number): number {
  if (n < GROUP_STAGE_MIN || n > GROUP_STAGE_MAX) {
    throw new Error(
      `Group stage expects ${GROUP_STAGE_MIN}-${GROUP_STAGE_MAX} players, got ${n}`,
    );
  }
  return Math.ceil((n * 2) / 4);
}

// Build the group stage schedule. Walk a shuffled roster in a circular
// fashion, 4 at a time. For n in 5..7 this produces heats with no internal
// duplicates (|k - k'| ≤ 3 < n so `(i*4 + k) % n` is unique across the 4
// slots). Appearance counts stay within 1 of each other.
export function planGroupStage(
  players: SeedPlayer[],
  round: number,
  rng: () => number = Math.random,
): RoundPlan {
  const n = players.length;
  const heatCount = computeGroupStageHeatCount(n);
  const shuffled = shuffle(players, rng);

  const heats: PlannedHeat[] = [];
  for (let i = 0; i < heatCount; i++) {
    const slots: HeatSlot[] = [];
    for (let k = 0; k < 4; k++) {
      const p = shuffled[(i * 4 + k) % n];
      slots.push({ playerId: p.id, isBye: false });
    }
    heats.push({
      round,
      heatNumber: i + 1,
      slots,
      isFinal: false,
    });
  }

  return { round, heats, byePlayerIds: [] };
}

// Tally points from completed group-stage heats. Returns per-player totals
// sorted best → worst, with tiebreakers: (1) more 1st-place finishes wins,
// (2) more 2nd-place finishes wins, (3) original seed order (stable sort).
export type GroupStanding = {
  playerId: string;
  points: number;
  finishes: number[]; // counts of 1st, 2nd, 3rd, 4th placings
  heatsRaced: number;
};

export function computeGroupStandings(
  playerIds: string[],
  heatResults: { finishersByPosition: string[] }[],
): GroupStanding[] {
  const standings = new Map<string, GroupStanding>(
    playerIds.map((id) => [
      id,
      { playerId: id, points: 0, finishes: [0, 0, 0, 0], heatsRaced: 0 },
    ]),
  );
  for (const h of heatResults) {
    for (let i = 0; i < h.finishersByPosition.length; i++) {
      const pid = h.finishersByPosition[i];
      const s = standings.get(pid);
      if (!s) continue;
      s.points += GROUP_STAGE_POINTS[i] ?? 0;
      s.finishes[i] = (s.finishes[i] ?? 0) + 1;
      s.heatsRaced += 1;
    }
  }
  return [...standings.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.finishes[0] !== a.finishes[0]) return b.finishes[0] - a.finishes[0];
    if (b.finishes[1] !== a.finishes[1]) return b.finishes[1] - a.finishes[1];
    // Preserve original order as stable tiebreak.
    return playerIds.indexOf(a.playerId) - playerIds.indexOf(b.playerId);
  });
}

// ---------------------------------------------------------------------------
// Double elimination (2-life model).
// ---------------------------------------------------------------------------

export type LivedPlayer = SeedPlayer & { lives: number };

// Plan one round of a 2-life double-elim tournament. Mechanically this is the
// same round shape as single elim (heats of 4 + byes for remainder); what
// differs is the post-round handling - see `applyLifeDeductions`.
export function planDoubleElimRound(
  players: LivedPlayer[],
  round: number,
  rng: () => number = Math.random,
): RoundPlan {
  return planRound(players, round, rng);
}

// Deduct lives for 3rd/4th finishers in a double-elim round. Returns the new
// lives-per-player map plus the list of players who were eliminated this
// round (lives hit 0).
export function applyLifeDeductions(
  currentLives: Record<string, number>,
  heatResults: { finishersByPosition: string[] }[],
): { lives: Record<string, number>; eliminatedIds: string[] } {
  const next = { ...currentLives };
  const eliminated: string[] = [];
  for (const h of heatResults) {
    for (let i = 0; i < h.finishersByPosition.length; i++) {
      if (i >= 2) {
        const pid = h.finishersByPosition[i];
        const before = next[pid] ?? DEFAULT_LIVES;
        const after = Math.max(0, before - 1);
        next[pid] = after;
        if (before > 0 && after === 0) eliminated.push(pid);
      }
    }
  }
  return { lives: next, eliminatedIds: eliminated };
}
