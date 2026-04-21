// Pure bracket logic - no DB dependencies so it's unit-testable.
// Rules:
// - 4-player heats, single elimination, top 2 advance.
// - If player count doesn't fit groups of 4, top seeds get byes into the next round.
// - Final round: when 2-4 players remain they form a single final heat; 1st = winner.

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

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

  // Final: 2-4 players -> one heat.
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
