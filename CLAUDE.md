# Seka Quote Calculator

Internal web app for Seka Moving sales agents to generate customer quotes.
Agents input job details → calculator returns a price based on pricing rules
maintained by ownership in Supabase.

## What this app does

- Local moves: CuFT-based pricing OR hourly rate (agent's choice per quote)
- Long-distance moves (NY/NJ origin): flat CuFT × state-rate pricing
- Out-of-state → out-of-state moves: 3rd-party carrier pricing
- Add-ons: packing, unpacking, stairs, heavy items, crating, storage, HRA
- Travel/tolls: mileage formula vs 1-hour-on-clock (whichever is higher)
- Every quote is saved with agent attribution, timestamp, and quote ID

## Who uses it

- Sales agents (Ashley, Sammy, Mason, Customer Service team) — create quotes
- Owner (Alex) — edits rates, views all quotes, audits

## Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Framer Motion
- Backend: Supabase (Postgres + Auth + RLS)
- APIs: Google Maps Distance Matrix (mileage), TollGuru (tolls)
- Hosting: Vercel

## Design system

- Aesthetic: minimal, editorial, motion-first
- Palette: stone / gray / white / blue-toned. Glass + depth effects.
- Dark mode: same aesthetic. Light/dark parity required.
- Status colors: green only when needed. Avoid red/saturated colors.
- Typography: Instrument Serif for headings, Inter for UI
- Motion: Framer Motion on every state change. No static UI.

## File structure

```
/src
  /components       UI components (shadcn + custom)
  /features
    /quote-builder  The main calculator flow
    /admin          Rate management (owner-only)
    /quotes         Saved quote list and detail view
  /lib
    pricing/        Pure functions — all calculation logic
    supabase/       Client + typed queries
    apis/           Google Maps + TollGuru wrappers
  /pages            Route components
/docs               Pricing logic reference (read these before editing pricing)
/supabase           schema.sql and migrations
```

## Critical rules for Claude Code

1. **Pricing logic lives in `/src/lib/pricing/` as pure functions.** No pricing
   math inside components. Every function takes typed inputs, returns a
   typed `PriceBreakdown`. This keeps it testable and auditable.

2. **Rates are never hardcoded.** All rates (hourly, per-CuFT, heavy items,
   box prices, etc.) are pulled from Supabase `rates` tables. The admin
   UI edits them; the calculator reads them.

3. **Every quote writes to `quotes` table** with: agent_id, timestamp,
   all inputs, full breakdown, final total, quote_id (short human-readable,
   e.g. `SQ-2026-0423-A1B2`).

4. **Read `/docs/pricing-logic-*.md` before touching any pricing code.**
   Those docs are the source of truth. If a doc contradicts the code,
   the doc wins — fix the code.

5. **Keep files under 200 lines.** Split when approaching the limit.

6. **Local moves always compute BOTH morning and afternoon prices when
   CuFT ≤ 400.** Agent presents both to customer. See
   `/docs/pricing-logic-local.md`.

7. **Travel formula: compute both (mileage×3 + tolls) AND (1hr at crew rate
   + tolls). Use the higher number.** Protects margin.

8. **HRA is a toggle.** When ON, final total × 2. Applied last, after all
   other math. See `/docs/pricing-logic-addons.md`.

## How to run locally

```bash
npm install
cp .env.example .env.local   # add Supabase + Google + TollGuru keys
npm run dev
```

## Deployment

Vercel auto-deploys on push to `main`. Preview branches on every PR.

## When adding a feature

1. Read the relevant `/docs/pricing-logic-*.md` doc
2. Update the doc first if logic changes
3. Update `/supabase/schema.sql` if data shape changes
4. Write the pure pricing function in `/src/lib/pricing/`
5. Wire it into the UI
6. Test with at least 3 example quotes and compare to manual calculation
