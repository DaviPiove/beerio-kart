"use client";

import { useTransition } from "react";
import { deleteTournament } from "@/app/actions";

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  variant = "icon",
}: {
  tournamentId: string;
  tournamentName: string;
  variant?: "icon" | "text";
}) {
  const [pending, startTransition] = useTransition();
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Delete "${tournamentName}"? This wipes all players, heats and results.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteTournament(tournamentId);
      } catch (err) {
        // redirect() throws NEXT_REDIRECT which is expected; ignore
        if (!(err instanceof Error) || !err.message.includes("NEXT_REDIRECT")) {
          alert("Failed to delete");
        }
      }
    });
  };
  if (variant === "text") {
    return (
      <button
        className="btn btn-danger btn-sm"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "Deleting…" : "🗑 Delete"}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-label={`Delete ${tournamentName}`}
      className="w-9 h-9 rounded-full bg-black/40 hover:bg-mario hover:scale-110 transition border-2 border-[#1a0030] grid place-items-center shrink-0"
    >
      <span className="text-base">🗑</span>
    </button>
  );
}
