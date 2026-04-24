# Pricing Logic — Local Moves

Source of truth for all local-move pricing. Do not change code without
updating this doc first.

## Minimum CuFT

300 CuFT. Below this, the calculator refuses to quote and shows
"Minimum 300 CuFT for local moves."

## Crew sizing (automatic from CuFT)

| CuFT range | Crew |
|---|---|
| 300–500 | 2 men |
| 501–1000 | 3 men |
| 1001+ | 4 men |

Agent can override and add a 4th man on any job for **+$40/hr flat**.

## Calendar tier (agent-entered)

Agent opens SmartMoving calendar, counts jobs booked for the target
date, enters that number. Calculator maps to tier:

| Jobs booked | Tier |
|---|---|
| 0–1 | `t1` (Up to 1) |
| 2–3 | `t2` (1–3) |
| 3–5 | `t3` (3–5) |
| 5–7 | `t4` (5–7) |
| 7+ | `t5` (7+) |

The job-count entered is logged on the quote for later review.

## Pricing Method A — CuFT-based (flat rate)

```
base = cuft × rate_per_cuft[tier][time_slot]
```

### Morning rates (9–11 AM), $ per CuFT

| Tier | Rate |
|---|---|
| t1 | 1.25 |
| t2 | 1.35 |
| t3 | 1.50 |
| t4 | 1.75 |
| t5 | 2.00 |

### Afternoon rates (1–3 PM, 2–4 PM, 3–6 PM — all 3 overlap, agent picks)

Afternoon is only available for jobs ≤ 400 CuFT.

| All tiers | $1.00 / CuFT |

### When to show both morning and afternoon

- CuFT ≤ 400: calculator returns BOTH prices. Agent presents both
  so customer feels the gap (morning at 1.5× vs afternoon at 1×).
- CuFT 401–500: morning only, but encourage afternoon if available.
- CuFT > 500: morning only.

## Pricing Method B — Hourly (minimum 3 hours, billed in 30-min increments)

Agent chooses hourly when the customer prefers it or the job is small/uncertain.

### 2 men hourly (under 600 CuFT — prefer afternoon)

| Tier | Rate |
|---|---|
| t1 | $139/hr |
| t2 | $149/hr |
| t3 | $159/hr |
| t4 | $169/hr |
| t5 | $179/hr |

### 3 men hourly (over 600 CuFT — prefer morning)

| Tier | Rate |
|---|---|
| t1 | $159/hr |
| t2 | $169/hr |
| t3 | $179/hr |
| t4 | $199/hr |
| t5 | $220/hr |

### 4th man

+$40/hr on top of whichever tier/crew size is selected.

### Hourly calculation

```
labor = hourly_rate × hours (min 3, step 0.5)
+ travel_charge (see below)
+ add-ons (see pricing-logic-addons.md)
```

## Travel / tolls formula (applies to both methods)

Compute **both** of these, use the **higher**:

```
option_A = round_trip_miles × 3   // office→origin→destination→office
option_B = 1 × hourly_rate_for_selected_crew
travel_charge = MAX(option_A, option_B) + tolls
```

Tolls are fetched via TollGuru API using the route:
`office → origin → destination → office`.

For CuFT-based (flat-rate) jobs, use the 3-men hourly rate at the
current tier as the basis for option_B.

**Office origin for mileage calc:** Seka HQ address (stored in Supabase
`settings` table — do not hardcode).

## Final price assembly

```
subtotal = base_or_labor + travel_charge + add_ons
if HRA_toggle: subtotal × 2
final = subtotal
```

Discounts: agent can apply up to 5% discount on the final. Anything
above 5% requires owner override (flag in UI, not auto-blocked).

## Example quote

- 450 CuFT, tier t2 (2 jobs booked), morning, no add-ons
- Crew: 2 men (auto)
- Round trip: 40 mi, tolls $24
- Method: CuFT flat

```
base = 450 × 1.35 = $607.50
option_A = 40 × 3 = $120
option_B = 1 × $149 (2-men t2) = $149
travel = MAX(120, 149) + 24 = $173
total = $607.50 + $173 = $780.50
```

Also show afternoon:
```
base_afternoon = 450 × 1.00 = $450
travel same = $173
total_afternoon = $623
```

Agent presents both: "$780 morning / $623 afternoon."
