import { describe, it, expect } from "vitest";
import {
  computeByes,
  planRound,
  advancingFromResults,
  eliminatedFromResults,
  type SeedPlayer,
} from "./bracket";

const mkPlayers = (n: number): SeedPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));

const staticRng = () => 0.42;

describe("computeByes", () => {
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

describe("planRound", () => {
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
      // All players accounted for exactly once.
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

describe("full tournament simulation", () => {
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

  it("6 players -> 1 heat + 2 byes -> round 2 has 4 (2 adv + 2 byes) -> final", () => {
    const r1 = planRound(mkPlayers(6), 1, staticRng);
    expect(r1.heats).toHaveLength(1);
    expect(r1.byePlayerIds).toHaveLength(2);
    const advancers = r1.heats[0].slots
      .slice(0, 2)
      .map((s) => s.playerId)
      .concat(r1.byePlayerIds);
    expect(advancers).toHaveLength(4);
    const r2 = planRound(
      advancers.map((id) => ({ id, name: id })),
      2,
      staticRng,
    );
    expect(r2.heats[0].isFinal).toBe(true);
  });
});
