"use client";

import { useTransition } from "react";
import { resetTournament } from "@/app/actions";

export function ResetButton({ tournamentId }: { tournamentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="text-center pt-4">
      <button
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Reset the tournament? Bracket will be wiped."))
            return;
          startTransition(async () => {
            await resetTournament(tournamentId);
          });
        }}
      >
        {pending ? "Resetting…" : "↺ Reset bracket"}
      </button>
    </div>
  );
}
