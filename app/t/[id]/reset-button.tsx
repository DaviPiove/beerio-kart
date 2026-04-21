"use client";

import { useTransition } from "react";
import { resetTournament } from "@/app/actions";

export function ResetButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="text-center">
      <button
        className="mk-btn mk-btn-ghost text-sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Reset the tournament? Bracket will be wiped."))
            return;
          startTransition(async () => {
            await resetTournament(tournamentId);
          });
        }}
      >
        {pending ? "Resetting…" : "↺ Reset tournament"}
      </button>
    </div>
  );
}
