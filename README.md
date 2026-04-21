# Beerio Kart 🍺🏁

Mario Kart tournament app with a beer twist: finish one full beer within 3 laps, and **no joystick while drinking**.

## Format

- Single elimination, 4-player heats.
- Top 2 advance per heat; bottom 2 are eliminated.
- Auto-byes when the player count isn't a multiple of 4.
- When ≤4 players remain → final heat → 1st place = champion.

## Stack

- Next.js 16 (App Router, TS, Turbopack)
- Tailwind CSS v4
- Supabase (Postgres + Realtime)
- Vitest for the bracket logic
- Deployed on Vercel; auto-deploys on push to `main`

## Local dev

```bash
pnpm install
# fill in Supabase URL + anon key in .env.local
pnpm dev
```

## Env vars

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing

```bash
pnpm vitest run
```
