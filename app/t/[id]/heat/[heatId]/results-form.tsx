"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitHeatResults } from "@/app/actions";

type Racer = {
  playerId: string;
  name: string;
  finishPosition: number | null;
};

export function HeatResultsForm({
  heatId,
  roster,
  locked,
  tournamentId,
}: {
  heatId: string;
  roster: Racer[];
  locked: boolean;
  tournamentId: string;
}) {
  const router = useRouter();
  const initialOrder = locked
    ? [...roster].sort(
        (a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99),
      )
    : roster;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Racer[]>(locked ? initialOrder : []);
  const [remaining, setRemaining] = useState<Racer[]>(
    locked ? [] : initialOrder,
  );

  function pick(r: Racer) {
    setAssigned((a) => [...a, r]);
    setRemaining((rem) => rem.filter((x) => x.playerId !== r.playerId));
  }
  function unpick(r: Racer) {
    setAssigned((a) => a.filter((x) => x.playerId !== r.playerId));
    setRemaining((rem) => [...rem, r]);
  }
  function reset() {
    setAssigned([]);
    setRemaining(roster);
    setError(null);
  }

  const canSubmit = !locked && remaining.length === 0 && assigned.length === roster.length;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitHeatResults({
          heatId,
          positions: assigned.map((r, i) => ({
            playerId: r.playerId,
            position: i + 1,
          })),
        });
        router.push(`/t/${tournamentId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="mk-card p-5">
        <h2 className="font-bold mb-3 text-mk-yellow">Podium</h2>
        {assigned.length === 0 && (
          <p className="text-white/50 text-sm">
            Tap racers below in finishing order.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {assigned.map((r, i) => (
            <li
              key={r.playerId}
              className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/5"
            >
              <span className={`pos-badge pos-${i + 1}`}>{i + 1}</span>
              <span className="font-bold flex-1">{r.name}</span>
              {!locked && (
                <button
                  onClick={() => unpick(r)}
                  className="text-xs text-white/60 hover:text-white"
                >
                  undo
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!locked && remaining.length > 0 && (
        <section className="mk-card p-5">
          <h2 className="font-bold mb-3">
            Who finished {ordinal(assigned.length + 1)}?
          </h2>
          <div className="flex flex-wrap gap-2">
            {remaining.map((r) => (
              <button
                key={r.playerId}
                className="mk-btn mk-btn-ghost"
                onClick={() => pick(r)}
              >
                🏎️ {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <div className="text-red-300 text-sm">{error}</div>}

      {!locked && (
        <div className="flex gap-3">
          <button
            className="mk-btn mk-btn-ghost flex-1"
            onClick={reset}
            disabled={pending || assigned.length === 0}
          >
            Clear
          </button>
          <button
            className="mk-btn mk-btn-primary flex-[2]"
            onClick={submit}
            disabled={!canSubmit || pending}
          >
            {pending ? "Submitting…" : "✅ Lock in results"}
          </button>
        </div>
      )}
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
