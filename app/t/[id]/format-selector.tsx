"use client";

import { useTransition } from "react";
import { setTournamentFormat } from "@/app/actions";
import {
  formatLabel,
  recommendFormat,
  type TournamentFormat,
} from "@/lib/bracket";

type Option = {
  id: TournamentFormat;
  tagline: string;
  details: string;
  emoji: string;
};

const OPTIONS: Option[] = [
  {
    id: "single_elim",
    emoji: "🏁",
    tagline: "Classic knockout",
    details:
      "4-player heats, top 2 advance, bottom 2 drink & exit. Cleanest at 8 / 12 / 16 players.",
  },
  {
    id: "group_stage",
    emoji: "🍻",
    tagline: "Group stage + final",
    details:
      "Everyone races 2-3 heats earning points (4/3/2/1). Top 4 go to the Grand Final. Best for 5-7 racers.",
  },
  {
    id: "double_elim",
    emoji: "♻️",
    tagline: "Two-lives bracket",
    details:
      "Everyone starts with 2 lives. Finishing 3rd or 4th costs one. Last racer standing wins. Great when nobody wants to bust out early.",
  },
];

export function FormatSelector({
  tournamentId,
  currentFormat,
  playerCount,
}: {
  tournamentId: string;
  currentFormat: TournamentFormat;
  playerCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const recommended = recommendFormat(Math.max(playerCount, 2));

  const choose = (f: TournamentFormat) => {
    if (pending || f === currentFormat) return;
    startTransition(async () => {
      await setTournamentFormat(tournamentId, f);
    });
  };

  return (
    <section className="card p-6 sm:p-8 anim-pop anim-pop-1">
      <h2 className="font-display uppercase text-xl sm:text-2xl mb-1 text-peach">
        🏆 Pick the format
      </h2>
      <p className="text-white/60 text-sm mb-5">
        Auto-picked for your player count. Host can swap it before launch.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {OPTIONS.map((opt) => {
          const selected = opt.id === currentFormat;
          const isRecommended = opt.id === recommended;
          const disabled =
            pending ||
            (opt.id === "group_stage" && (playerCount < 5 || playerCount > 7));
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => choose(opt.id)}
              className={`card-sticker text-left block transition p-4 relative ${
                selected
                  ? "bg-gradient-to-br from-banana to-shell text-[#3a1600]"
                  : "bg-[#1a0030]/60 hover:bg-[#1a0030]/80"
              } ${disabled && !selected ? "opacity-45 cursor-not-allowed" : ""}`}
              aria-pressed={selected}
            >
              {isRecommended && (
                <span className="absolute -top-2 -right-2 font-pixel text-[9px] px-2 py-1 rounded-full bg-luigi text-[#0a2e17] border-2 border-[#1a0030] shadow-[0_2px_0_#1a0030]">
                  ★ PICKED
                </span>
              )}
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <div className="font-display uppercase text-base leading-tight mb-0.5">
                {formatLabel(opt.id)}
              </div>
              <div
                className={`font-pixel text-[10px] mb-2 ${
                  selected ? "text-[#3a1600]/80" : "text-banana"
                }`}
              >
                {opt.tagline}
              </div>
              <p
                className={`text-xs leading-snug ${
                  selected ? "text-[#3a1600]/90" : "text-white/70"
                }`}
              >
                {opt.details}
              </p>
            </button>
          );
        })}
      </div>
      {playerCount > 0 && playerCount < 5 && (
        <p className="text-white/55 text-xs italic mt-3">
          With {playerCount} racer{playerCount === 1 ? "" : "s"} a single final
          heat is used regardless of format.
        </p>
      )}
      {playerCount > 7 && currentFormat === "group_stage" && (
        <p className="text-banana text-xs italic mt-3">
          Group stage only supports 5-7 racers. Will auto-switch on start.
        </p>
      )}
    </section>
  );
}
