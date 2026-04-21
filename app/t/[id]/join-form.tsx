"use client";

import { useState, useTransition } from "react";
import { joinTournament } from "@/app/actions";

export function JoinForm({ tournamentId }: { tournamentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-3 flex-col sm:flex-row"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          try {
            await joinTournament(tournamentId, fd);
            const input = document.getElementById(
              "join-input",
            ) as HTMLInputElement | null;
            if (input) input.value = "";
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
    >
      <input
        id="join-input"
        name="name"
        placeholder="Your racer name"
        required
        maxLength={24}
        className="input flex-1"
        disabled={pending}
      />
      <button
        type="submit"
        className="btn btn-green btn-wiggle"
        disabled={pending}
      >
        {pending ? "Joining…" : "Join 🏁"}
      </button>
      {error && (
        <div className="w-full text-sm text-[#ffcccc] font-bold">⚠ {error}</div>
      )}
    </form>
  );
}
