import { describe, it, expect } from "vitest";
import {
  computeByes,
  planRound,
  planGroupStage,
  computeGroupStageHeatCount,
  computeGroupStandings,
  applyLifeDeductions,
  recommendFormat,
  advancingFromResults,
  eliminatedFromResults,
  GROUP_STAGE_POINTS,
  DEFAULT_LIVES,
  type SeedPlayer,
  type LivedPlayer,
} from "./bracket";

const mkPlayers = (n: number): SeedPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));

const mkLived = (n: number, lives = DEFAULT_LIVES): LivedPlayer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    lives,
  }));

const staticRng = () => 0.42;

describe("recommendFormat", () => {
  it.each([
    [2, "single_elim"],
    [3, "single_elim"],
    [4, "single_elim"],
    [5, "group_stage"],
    [6, "group_stage"],
    [7, "group_stage"],
    [8, "double_elim"],
    [12, "double_elim"],
    [16, "double_elim"],
  ] as const)("%i players -> %s", (n, expected) => {
    expect(recommendFormat(n)).toBe(expected);
  });
});

describe("computeByes (single elim)", () => {
  it.each([
    [4, 0],
    [5, 1],
    [6, 2],
    [7, 3],
    [8, 0],
    [9, 1],
    [12, 0],
    [16, 0],
    [3, 0],
    [2, 0],
  ])("n=%i -> byes=%i", (n, expected) => {
    expect(computeByes(n)).toBe(expected);
  });
});

describe("planRound (single elim)", () => {
  it.each([4, 5, 6, 7, 8, 9, 12, 16])(
    "%i players produces clean 4-player heats",
    (n) => {
      const plan = planRound(mkPlayers(n), 1, staticRng);
      if (n <= 4) {
        expect(plan.heats).toHaveLength(1);
        expect(plan.heats[0].isFinal).toBe(true);
        expect(plan.byePlayerIds).toEqual([]);
      } else {
        expect(plan.heats.every((h) => h.slots.length === 4)).toBe(true);
        expect(plan.heats.every((h) => !h.isFinal)).toBe(true);
        expect(plan.heats.length * 4 + plan.byePlayerIds.length).toBe(n);
      }
      const all = [
        ...plan.heats.flatMap((h) => h.slots.map((s) => s.playerId)),
        ...plan.byePlayerIds,
      ];
      expect(new Set(all).size).toBe(n);
    },
  );

  it("4 players -> single final heat", () => {
    const plan = planRound(mkPlayers(4), 1, staticRng);
    expect(plan.heats).toHaveLength(1);
    expect(plan.heats[0].isFinal).toBe(true);
  });
});

describe("advancingFromResults", () => {
  it("takes top 2 from each heat in heat order", () => {
    const r = advancingFromResults([
      { heatNumber: 2, finishersByPosition: ["b1", "b2", "b3", "b4"] },
      { heatNumber: 1, finishersByPosition: ["a1", "a2", "a3", "a4"] },
    ]);
    expect(r).toEqual(["a1", "a2", "b1", "b2"]);
  });
});

describe("eliminatedFromResults", () => {
  it("takes 3rd and below", () => {
    const r = eliminatedFromResults([
      { finishersByPosition: ["a1", "a2", "a3", "a4"] },
    ]);
    expect(r).toEqual(["a3", "a4"]);
  });
});

describe("full single-elim tournament simulation", () => {
  it("8 players -> 2 heats -> 4 -> 1 final heat", () => {
    const r1 = planRound(mkPlayers(8), 1, staticRng);
    expect(r1.heats).toHaveLength(2);
    const advancers = r1.heats.flatMap((h) =>
      h.slots.slice(0, 2).map((s) => s.playerId),
    );
    expect(advancers).toHaveLength(4);
    const r2 = planRound(
      advancers.map((id) => ({ id, name: id })),
      2,
      staticRng,
    );
    expect(r2.heats).toHaveLength(1);
    expect(r2.heats[0].isFinal).toBe(true);
  });
});

describe("group stage", () => {
  it.each([
    [5, 3],
    [6, 3],
    [7, 4],
  ])("n=%i -> %i heats", (n, expected) => {
    expect(computeGroupStageHeatCount(n)).toBe(expected);
  });

  it("rejects out-of-range player counts", () => {
    expect(() => computeGroupStageHeatCount(4)).toThrow();
    expect(() => computeGroupStageHeatCount(8)).toThrow();
  });

  it.each([5, 6, 7])(
    "n=%i: every heat has 4 distinct players and nobody races 0 heats",
    (n) => {
      const plan = planGroupStage(mkPlayers(n), 1, staticRng);
      expect(plan.heats).toHaveLength(computeGroupStageHeatCount(n));
      for (const h of plan.heats) {
        expect(h.slots).toHaveLength(4);
        expect(new Set(h.slots.map((s) => s.playerId)).size).toBe(4);
      }
      // Each player appears at least once, and appearance counts are within 1.
      const counts = new Map<string, number>();
      for (const h of plan.heats) {
        for (const s of h.slots) {
          counts.set(s.playerId, (counts.get(s.playerId) ?? 0) + 1);
        }
      }
      expect(counts.size).toBe(n);
      const values = [...counts.values()];
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    },
  );

  it("6 players -> everyone races exactly 2 heats", () => {
    const plan = planGroupStage(mkPlayers(6), 1, staticRng);
    const counts = new Map<string, number>();
    for (const h of plan.heats) {
      for (const s of h.slots) {
        counts.set(s.playerId, (counts.get(s.playerId) ?? 0) + 1);
      }
    }
    for (const v of counts.values()) expect(v).toBe(2);
  });

  it("computeGroupStandings ranks by points then 1sts then 2nds", () => {
    // Heat 1 order: p1=1st(4), p2=2nd(3), p4=3rd(2), p3=4th(1)
    // Heat 2 order: p4=1st(4), p2=2nd(3), p3=3rd(2), p1=4th(1)
    // Totals → p4=6, p2=6, p1=5, p3=3. p4 ahead of p2 on 1sts.
    const standings = computeGroupStandings(
      ["p1", "p2", "p3", "p4"],
      [
        { finishersByPosition: ["p1", "p2", "p4", "p3"] },
        { finishersByPosition: ["p4", "p2", "p3", "p1"] },
      ],
    );
    expect(standings.map((s) => s.playerId)).toEqual(["p4", "p2", "p1", "p3"]);
    expect(standings[0].points).toBe(6);
    expect(standings[0].finishes[0]).toBe(1);
    expect(standings[1].points).toBe(6);
    expect(standings[1].finishes[0]).toBe(0);
  });

  it("points constants are 4/3/2/1", () => {
    expect(GROUP_STAGE_POINTS).toEqual([4, 3, 2, 1]);
  });
});

describe("double elimination (2-life)", () => {
  it("applyLifeDeductions takes 1 life from 3rd and 4th", () => {
    const { lives, eliminatedIds } = applyLifeDeductions(
      { p1: 2, p2: 2, p3: 2, p4: 2 },
      [{ finishersByPosition: ["p1", "p2", "p3", "p4"] }],
    );
    expect(lives).toEqual({ p1: 2, p2: 2, p3: 1, p4: 1 });
    expect(eliminatedIds).toEqual([]);
  });

  it("eliminates a player when their lives go from 1 to 0", () => {
    const { lives, eliminatedIds } = applyLifeDeductions(
      { p1: 2, p2: 2, p3: 1, p4: 1 },
      [{ finishersByPosition: ["p1", "p2", "p3", "p4"] }],
    );
    expect(lives).toEqual({ p1: 2, p2: 2, p3: 0, p4: 0 });
    expect(eliminatedIds.sort()).toEqual(["p3", "p4"]);
  });

  it("8-player 2-life bracket eventually produces a final", () => {
    // Simulate: in every heat, players are finished in seed order (P1=1st, P2=2nd, P3=3rd, P4=4th).
    // Life accounting: bottom 2 of each heat lose a life.
    const players = mkLived(8);
    const lives: Record<string, number> = Object.fromEntries(
      players.map((p) => [p.id, p.lives]),
    );
    let round = 1;
    let alive = [...players];
    // Cap iterations to avoid runaway loops on regression.
    for (let guard = 0; guard < 20; guard++) {
      const plan = planRound(alive, round, staticRng);
      // Stop if we're at the final.
      if (plan.heats.length <= 1) {
        expect(plan.heats[0]?.isFinal).toBe(true);
        break;
      }
      // Heat results: take the current slot order as finish order (P_i at
      // position i+1). Bottom 2 of every heat lose a life.
      const results = plan.heats.map((h) => ({
        finishersByPosition: h.slots.map((s) => s.playerId),
      }));
      const res = applyLifeDeductions(lives, results);
      Object.assign(lives, res.lives);
      alive = alive.filter((p) => (lives[p.id] ?? 0) > 0);
      round++;
    }
    expect(alive.length).toBeLessThanOrEqual(4);
  });
});
