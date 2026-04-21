"use client";

import { useState, useTransition } from "react";
import { startTournament } from "@/app/actions";

export function LobbyActions({
  tournamentId,
  playerCount,
}: {
  tournamentId: string;
  playerCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState<number | null>(null);

  const begin = () => {
    if (playerCount < 2 || pending) return;
    // Red / yellow / green / GO starting lights (2.4s) then fire the action.
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), 700);
    const t2 = setTimeout(() => setCountdown(1), 1400);
    const t3 = setTimeout(() => {
      setCountdown(0);
      startTransition(async () => {
        await startTournament(tournamentId);
      });
    }, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  return (
    <div className="text-center relative">
      {countdown !== null && (
        <div className="fixed inset-0 grid place-items-center bg-black/75 backdrop-blur z-50 anim-pop">
          <div className="flex gap-4 sm:gap-8">
            {[3, 2, 1].map((n) => (
              <div
                key={n}
                className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#1a0030] grid place-items-center font-display text-4xl sm:text-6xl shadow-[0_8px_0_#1a0030] ${
                  countdown !== null && countdown >= n
                    ? n === 3
                      ? "bg-mario text-white anim-glow"
                      : n === 2
                      ? "bg-banana text-[#3a1600] anim-glow"
                      : "bg-luigi text-[#0a2e17] anim-glow"
                    : "bg-[#1a0030] text-white/20"
                }`}
              >
                {n}
              </div>
            ))}
          </div>
          {countdown === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="headline text-7xl sm:text-9xl anim-pop">GO!</div>
            </div>
          )}
        </div>
      )}
      <button
        className="btn btn-primary text-xl px-8 py-4 btn-wiggle"
        disabled={playerCount < 2 || pending || countdown !== null}
        onClick={begin}
      >
        {pending ? "Starting…" : "🚦 Start tournament"}
      </button>
      {playerCount < 2 && (
        <p className="text-sm text-white/60 mt-3">
          Need at least 2 racers to start.
        </p>
      )}
    </div>
  );
}
