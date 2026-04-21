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

1. **`lib/bracket.ts`** — pure functions, no DB deps. `planRound(players, round, rng?)` seeds a round into 4-player heats (top-2 advance), with `computeByes(n) = n % 4` giving the minimum byes when player count isn't a multiple of 4. When ≤4 players remain, a single final heat is returned with `isFinal: true`. Covered by `lib/bracket.test.ts`.
2. **`app/actions.ts`** — server actions that marry the pure logic to Supabase. The bracket's state lives entirely in the DB; these actions read it, call the pure planner, and write results back.

### The "bye heat" convention (important)

When a round has players skipping to the next round (byes), the actions create a **fake heat with `heat_number = 999` and `status = 'done'`**, containing the bye players. This keeps the schema simple — no separate "pending promotions" column — but means any code that iterates heats must filter out `heat_number === 999` (see `bracket.tsx` and `maybeAdvanceRound` in `actions.ts`). The heat detail page redirects to `/t/[id]` if someone navigates directly to a bye heat.

### Round advancement

`submitHeatResults` writes positions, marks the heat done, eliminates positions 3+, and calls `maybeAdvanceRound`. That function:
- Verifies all race heats in the round are done.
- Collects advancers (top 2 per race heat) + bye-heat players.
- If only one race heat existed this round, treats it as the final and sets `tournaments.winner_id`.
- Otherwise calls `planRound(advancers, round+1)` and inserts the next round's heats + heat_players + optional new bye heat.

### Schema

`tournaments` → `players` / `heats` → `heat_players` (pivot with `finish_position` and `is_bye`). RLS is enabled on all four tables with **permissive "public all" policies** — intentional for the open tournament night. All four tables are added to `supabase_realtime` publication.

### Realtime model

Every tournament detail page mounts `<RealtimeRefresher />`, which subscribes to `postgres_changes` on all four tables (filtered by `tournament_id` where possible) and calls `router.refresh()` on any event. This means **all state flows through server components** — no client-side data cache to invalidate. Any new mutation just needs to touch the DB; the UI re-renders automatically for every connected client.

### Styling conventions

- Tailwind v4 with custom theme in `app/globals.css` (`@theme inline { --color-banana: ...; --color-mario: ...; ... }`) — so `bg-banana`, `text-mario`, etc. are real utilities.
- Custom component classes: `.card`, `.card-sticker`, `.btn` + variants (`.btn-primary`, `.btn-green`, `.btn-sky`, `.btn-koopa`, etc.), `.input`, `.pos` / `.pos-1..4`, `.tag`, `.headline`, `.rainbow-text`, `.font-pixel`. Prefer these over raw utility soup for consistency with the arcade aesthetic.
- Animated background (`components/background.tsx`) and hand-drawn SVG assets (`components/assets.tsx`) are the visual identity — reuse the SVGs instead of introducing new icon sets.
- Fonts are loaded via `next/font/google` in `app/layout.tsx` (Bungee display, Fredoka body, Press Start 2P pixel).

### Deployment

Push to `main` → Vercel auto-deploys. The GitHub integration was wired up via `vercel link`. Supabase changes require a migration (use the Supabase MCP's `apply_migration` or the Supabase dashboard); there are no local Supabase migration files checked in.
