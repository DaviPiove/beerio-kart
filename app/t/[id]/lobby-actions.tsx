"use client";

import { useTransition } from "react";
import { startTournament } from "@/app/actions";

export function LobbyActions({
  tournamentId,
  playerCount,
}: {
  tournamentId: string;
  playerCount: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="text-center">
      <button
        className="mk-btn mk-btn-primary text-lg px-8"
        disabled={playerCount < 2 || pending}
        onClick={() =>
          startTransition(async () => {
            await startTournament(tournamentId);
          })
        }
      >
        {pending ? "Starting…" : "🚦 Start tournament"}
      </button>
      {playerCount < 2 && (
        <p className="text-sm text-white/50 mt-2">
          Add at least 2 racers to start.
        </p>
      )}
    </div>
  );
}
