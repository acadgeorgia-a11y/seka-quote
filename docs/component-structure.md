# Component Structure & Routing

Reference for Claude Code when building UI. Matches the folder layout
declared in root CLAUDE.md.

## Routes

```
/login                        Supabase auth (magic link or email+password)
/                             Redirects to /new-quote
/new-quote                    Main calculator — agent's daily workspace
/quotes                       List view of all quotes agent has access to
/quotes/:quoteCode            Single quote detail + PDF export
/admin                        Owner-only: rate management
/admin/rates/local            Edit local CuFT + hourly rates
/admin/rates/long-distance    Edit LD rates + out-of-state rate
/admin/rates/addons           Edit boxes, heavy items, misc rates
/admin/settings               Office address, 4th man, min thresholds
/admin/agents                 Manage agents (invite, deactivate)
```

## New Quote flow (`/new-quote`)

Stepper with 4 logical steps. Agent can jump between them; price
updates live as inputs change.

### Step 1 — Move Type
- Radio: Local / Long Distance / Out-of-State
- Origin address + ZIP
- Destination address + ZIP
- Move date (date picker)
- On blur: auto-fetch mileage (Google Maps) + tolls (TollGuru). Show
  spinner, then a small readout: "42 mi round trip · $18 tolls."
  Editable if agent wants to override.

### Step 2 — Job Details
- Total CuFT (number input)
- Jobs on calendar (number input, with helper text "Check SmartMoving")
- Pricing method (only shown for Local): CuFT flat / Hourly
- If Hourly: hours input (step 0.5, min 3)
- Time slot radio: Morning / Afternoon (disabled if CuFT > 500)
- Crew size: auto-displayed based on CuFT, with override toggle
- 4th man: checkbox (+$40/hr)

### Step 3 — Add-ons
Organized as collapsible sections:
- Packing (box type grid with packing qty + sale qty per row)
- Unpacking (qty + "discount to $10" toggle)
- Stairs (flights-of-stairs number input — info icon shows formula)
- Heavy Items (searchable checklist with qty per item; custom-entry
  dialog for "Varies" items)
- Crating (soft crate qty; wood crate custom-entry with flag)
- Storage (overnight toggle + dates; long-term toggle with months)
- HRA (single toggle — prominent, warning color)

### Step 4 — Review & Send
- Full price breakdown (line items, not just total)
- If Local ≤ 400 CuFT: show Morning and Afternoon side-by-side cards
- Discount input (% — shows warning above cap)
- Customer info (name, email, phone — optional for draft)
- Actions: Save Draft / Send to Customer / Export PDF

## Components

```
/src/components/
  ui/                         shadcn primitives
  layout/
    TopNav.tsx
    MobileNav.tsx
  quote-builder/
    StepIndicator.tsx         4-dot stepper with Framer Motion
    MoveTypeSelect.tsx
    AddressInput.tsx          Google Places autocomplete
    MileageReadout.tsx        Animated number counter on fetch
    CuFTInput.tsx
    TierBadge.tsx             Visual chip showing current tier
    CrewDisplay.tsx           Auto crew size, override affordance
    TimeSlotToggle.tsx
    BoxGrid.tsx               2-column: packing / sale qty
    HeavyItemList.tsx
    CratingPicker.tsx
    StorageOptions.tsx
    HraToggle.tsx             Prominent, with confirmation
    PriceBreakdown.tsx        Line items + totals, animated reveal
    DualPriceCard.tsx         Morning + afternoon side-by-side
    DiscountInput.tsx
  quotes-list/
    QuotesTable.tsx
    QuoteStatusBadge.tsx
  shared/
    GlassPanel.tsx            Stone/gray glass background wrapper
    MoneyDisplay.tsx          Animated currency with Framer Motion
    LoadingShimmer.tsx
```

## Pricing lib (pure, testable, no React)

```
/src/lib/pricing/
  index.ts                    calculateQuote(input) -> PriceBreakdown
  local.ts                    calculateLocal()
  longDistance.ts             calculateLongDistance()
  outOfState.ts               calculateOutOfState()
  travel.ts                   calculateTravel() — MAX(A, B) + tolls
  addons.ts                   calculatePacking, calculateStairs, etc.
  hra.ts                      applyHra()
  discount.ts                 applyDiscount() + cap check
  types.ts                    QuoteInput, PriceBreakdown, LineItem
```

## API wrappers

```
/src/lib/apis/
  googleMaps.ts               getRoundTripMiles(office, origin, dest)
  tollguru.ts                 getTolls(waypoints)
  zipToState.ts               lookupState(zip) — static data or API
```

## Design notes (stone/gray/blue-toned, editorial, motion-first)

- Quote builder on a glass panel over a subtle blue-gray gradient
  background. Dark mode: deeper stone with a faint blue cast.
- Typography: headings in Instrument Serif, UI in Inter.
- Every price change animates via Framer Motion number spring.
- Step transitions: slide + fade, 220ms ease-out.
- Success states use muted green only (never saturated).
- Errors: use a dimmed stone/slate instead of red where possible.
  True errors can use a muted rust, not bright red.

## Mobile behavior

Primary target is desktop (agents work at desks), but quote-list and
quote-detail must be fully usable on mobile — agents open them on
phones during follow-up calls.
