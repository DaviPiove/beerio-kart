# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Realtime) · Vitest. Deployed on Vercel with auto-deploy on push to `main`. No auth — the tournament UI is open by design.

The referenced `AGENTS.md` flag applies: this Next.js is newer than most training data, so consult `node_modules/next/dist/docs/` before writing non-obvious Next APIs.

## Commands

```bash
pnpm dev                      # local dev (Turbopack)
pnpm build                    # production build — run this to typecheck
pnpm lint                     # ESLint
pnpm vitest run               # run all tests once
pnpm vitest run lib/bracket   # run a single test file
pnpm vitest                   # watch mode
```

Env vars (also set in Vercel for production + development): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Local values live in `.env.local` (gitignored).

## Architecture

### Tournament logic is split in two

1. **`lib/bracket.ts`** — pure, unit-testable format strategies (no DB deps). Covered by `lib/bracket.test.ts`.
2. **`app/actions.ts`** — server actions that marry the pure logic to Supabase. The bracket's state lives entirely in the DB; these actions read it, call the pure planner, and write results back.

### Tournament formats

Three formats are supported, each auto-recommended based on player count via `recommendFormat(n)` but overridable by the host in the lobby (`FormatSelector` → `setTournamentFormat` action). The chosen format is persisted on `tournaments.format`.

| Format | Default for | Round 1 shape | Advancement |
|---|---|---|---|
| `single_elim` | 2-4, 8+ | `planRound` — heats of 4, byes for `n % 4` remainder | Top 2 per heat advance; 3rd/4th eliminated immediately in `submitHeatResults` |
| `group_stage` | 5-7 | `planGroupStage` — `ceil(n*2/4)` heats (everyone plays 2, a few play 3), no byes | After **all** heats done, `computeGroupStandings` ranks by points (4/3/2/1) with tiebreakers (#1sts, then #2nds, then seed order); top 4 seeded into a Grand Final heat, rest marked eliminated at round 1 |
| `double_elim` | 8+ (alt to single_elim) | Same shape as single_elim (`planDoubleElimRound` is currently a thin wrapper around `planRound`) | `applyLifeDeductions` logic lives in `submitHeatResults` per-heat: 3rd/4th lose 1 life; when `players.lives` hits 0 the player is eliminated. `advanceDoubleElim` just checks who's still alive and builds the next round until ≤4 remain for the final. `players.lives` resets to `DEFAULT_LIVES` (2) on `startTournament` / `resetTournament` |

If the host picks `group_stage` but the count leaves the 5-7 window by the time they hit start, `startTournament` auto-falls-back to `recommendFormat(n)`.

### The "bye heat" convention (important)

When a single-elim or double-elim round has players skipping to the next round (byes), the actions create a **fake heat with `heat_number = 999` and `status = 'done'`**, containing the bye players. This keeps the schema simple — no separate "pending promotions" column — but means any code that iterates heats must filter out `heat_number === 999` (see `bracket.tsx` and `maybeAdvanceRound` in `actions.ts`). The heat detail page redirects to `/t/[id]` if someone navigates directly to a bye heat. Group stage never produces byes.

### Round advancement

`submitHeatResults` writes positions, marks the heat done, applies **per-heat** side effects scoped to the active format (single_elim: eliminate 3rd/4th; double_elim: decrement lives and eliminate at 0; group_stage: nothing yet), and calls `maybeAdvanceRound`. That function:
- Loads `tournaments.format` and verifies all race heats in the round are done.
- Dispatches to `advanceSingleElim` / `advanceGroupStage` / `advanceDoubleElim`.
- Each strategy either marks a winner on `tournaments.winner_id` or calls the shared `buildNextRound` which re-plans (via `planRound` for elim/final, `planDoubleElimRound` for 2-life), inserts heats + heat_players, and optionally a new bye heat.

### Schema

`tournaments` (`format`, `current_round`, `winner_id`, …) → `players` (`eliminated`, `eliminated_round`, `lives`) / `heats` → `heat_players` (pivot with `finish_position` and `is_bye`). RLS is enabled on all four tables with **permissive "public all" policies** — intentional for the open tournament night. All four tables are added to `supabase_realtime` publication.

`tournaments.format` is a text column with a CHECK constraint (`single_elim | group_stage | double_elim`). `players.lives` defaults to 2 and is only meaningful for `double_elim` runs; other formats leave it at the default.

### Realtime model

Every tournament detail page mounts `<RealtimeRefresher />`, which subscribes to `postgres_changes` on all four tables (filtered by `tournament_id` where possible) and calls `router.refresh()` on any event. This means **all state flows through server components** — no client-side data cache to invalidate. Any new mutation just needs to touch the DB; the UI re-renders automatically for every connected client.

### Styling conventions

- Tailwind v4 with custom theme in `app/globals.css` (`@theme inline { --color-banana: ...; --color-mario: ...; ... }`) — so `bg-banana`, `text-mario`, etc. are real utilities.
- Custom component classes: `.card`, `.card-sticker`, `.btn` + variants (`.btn-primary`, `.btn-green`, `.btn-sky`, `.btn-koopa`, etc.), `.input`, `.pos` / `.pos-1..4`, `.tag`, `.headline`, `.rainbow-text`, `.font-pixel`. Prefer these over raw utility soup for consistency with the arcade aesthetic.
- Animated background (`components/background.tsx`) and hand-drawn SVG assets (`components/assets.tsx`) are the visual identity — reuse the SVGs instead of introducing new icon sets.
- Fonts are loaded via `next/font/google` in `app/layout.tsx` (Bungee display, Fredoka body, Press Start 2P pixel).

### Deployment

Push to `main` → Vercel auto-deploys. The GitHub integration was wired up via `vercel link`. Supabase changes require a migration (use the Supabase MCP's `apply_migration` or the Supabase dashboard); there are no local Supabase migration files checked in.
