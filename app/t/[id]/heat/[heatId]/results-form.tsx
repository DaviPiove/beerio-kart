"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitHeatResults } from "@/app/actions";

type Racer = {
  playerId: string;
  name: string;
  finishPosition: number | null;
};

const MEDAL = ["🏆", "🥈", "🥉", "🍺"];

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
  const [assigned, setAssigned] = useState<Racer[]>(
    locked ? initialOrder : [],
  );
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

  const canSubmit =
    !locked && remaining.length === 0 && assigned.length === roster.length;

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
      {/* Podium */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display uppercase text-lg sm:text-xl mb-4 flex items-center gap-2 text-banana">
          🏁 Podium
        </h2>
        {assigned.length === 0 && (
          <p className="text-white/50 text-sm italic">
            No racers placed yet. Tap below in finishing order.
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {assigned.map((r, i) => {
            const eliminated = i >= 2;
            return (
              <li
                key={r.playerId}
                className={`card-sticker stripes flex items-center gap-3 anim-flash ${
                  i === 0
                    ? "bg-gradient-to-r from-banana to-shell"
                    : i === 1
                    ? "bg-gradient-to-r from-[#e0e0e0] to-[#9aa0aa] text-[#1a0030]"
                    : i === 2
                    ? "bg-gradient-to-r from-[#ffb073] to-[#cd7f32]"
                    : "bg-gradient-to-r from-[#3a3a3a] to-[#1a1a1a]"
                }`}
              >
                <span className={`pos pos-${i + 1}`}>{i + 1}</span>
                <span
                  className={`font-display uppercase text-base sm:text-lg flex-1 truncate ${
                    eliminated ? "opacity-80" : ""
                  } ${i === 1 ? "text-[#1a0030]" : ""}`}
                >
                  {r.name}
                </span>
                <span className="text-xl">{MEDAL[i] ?? "—"}</span>
                {!locked && (
                  <button
                    onClick={() => unpick(r)}
                    className="font-pixel text-[10px] bg-[#1a0030]/60 px-2 py-1 rounded-full hover:bg-[#1a0030]"
                    aria-label={`Undo ${r.name}`}
                  >
                    UNDO
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Racer picker */}
      {!locked && remaining.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-display uppercase text-lg sm:text-xl mb-4">
            Who finished{" "}
            <span className="text-banana">{ordinal(assigned.length + 1)}</span>?
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {remaining.map((r) => (
              <button
                key={r.playerId}
                className="btn btn-sky btn-wiggle"
                onClick={() => pick(r)}
              >
                🏎️ {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="text-[#ffcccc] text-sm font-bold">⚠ {error}</div>
      )}

      {!locked && (
        <div className="flex gap-3 sticky bottom-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={reset}
            disabled={pending || assigned.length === 0}
          >
            Clear
          </button>
          <button
            className="btn btn-primary flex-[2] btn-wiggle"
            onClick={submit}
            disabled={!canSubmit || pending}
          >
            {pending ? "Locking…" : "✅ Lock in results"}
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
