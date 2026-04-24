# Pricing Logic — Long Distance Moves

Source of truth for long-distance and out-of-state pricing. Do not
change code without updating this doc first.

## Minimum CuFT

300 CuFT for long distance. Below this, calculator refuses to quote.

## Two move types

1. **NY/NJ → other state** (Seka handles directly)
2. **Out-of-state → out-of-state** (3rd-party carrier)

## Type 1: NY/NJ origin, interstate

Formula:
```
base = cuft × rate_per_cuft[destination_state] × 1.10
```

The 10% is built into the formula (“+10%”). Max discount 5% unless
destination is in the 10%-discount zone (Dakotas / Montana / Idaho /
Washington / Oregon) — those allow max 10% discount.

### Rate table (per CuFT, before the 10% markup)

| Rate | Destination states | Delivery window |
|---|---|---|
| $6.00 | OH, IN, KY, WV, IL, WI, GA | 1–9 business days |
| $6.00 | VA, NC, SC, FL | 1–9 business days |
| $6.50 | UT, NV, NM, AZ, CA, TX, AL, OK, MN | 1–19 business days |
| $6.50 | AL, TN, MO, IA, LA | 1–14 business days |
| $7.00 | SD, ND, MT, ID, WA, OR | 1–19 business days |

(Rates above already include the +$0.50 bump from previous pricing.)

Alabama appears in two rows — when in doubt, use $6.50 (higher).
Calculator should treat duplicates as: take the higher rate.

### What the long-distance rate INCLUDES

- CuFT charge
- Travel time
- Tolls
- Truck cost

### What the long-distance rate does NOT include (charged as add-ons)

- Packing labor and boxes
- Unpacking
- Stairs
- Heavy items (piano, safe, fridge, etc.)
- Crating (soft/hard)
- Storage (overnight or long-term)
- HRA doubling (if applicable)

All add-on rates are the same as local moves — see
`pricing-logic-addons.md`.

## Type 2: Out-of-state → out-of-state (3rd-party carrier)

For moves that don't touch NY/NJ (e.g. CA → FL, TX → NC).

Formula:
```
base = cuft × 7.50 × 1.10
+ add-ons (same as local)
```

Max discount: 5%.

## Delivery window

Display the delivery window from the rate table on the quote so
customer knows the spread (e.g. "Delivery: 1–9 business days").

## Example quote (Type 1)

- 800 CuFT, NY → Florida, no add-ons

```
base = 800 × 6.00 × 1.10 = $5,280
```

Delivery window: 1–9 business days.

## Example quote (Type 1, with add-ons)

- 800 CuFT, NY → California
- Packing: 30 small/medium/large boxes + 5 wardrobe + 1 TV
- 2 flights of stairs at origin
- 1 Upright piano

```
base = 800 × 6.50 × 1.10 = $5,720
packing = (30 × 15) + (5 × 25) + (1 × 50) = 450 + 125 + 50 = $625
box sales = (30 × 5) + (5 × 20) + (1 × 50) = 150 + 100 + 50 = $300
stairs = 0.15 × 2 × 800 = $240
piano = $250
total = 5,720 + 625 + 300 + 240 + 250 = $7,135
```

## Example quote (Type 2)

- 1,000 CuFT, CA → FL, no add-ons

```
base = 1,000 × 7.50 × 1.10 = $8,250
```

## Validation rules

- If origin ZIP is in NY or NJ AND destination ZIP is out-of-state →
  use Type 1 pricing.
- If origin ZIP is NOT in NY or NJ AND destination ZIP is different
  state → use Type 2 pricing.
- If origin + destination are both NY/NJ (or same metro) → it's a
  local move. Redirect to local calculator.

Use ZIP-to-state lookup (maintain a `zip_to_state` table in Supabase
or use a free public dataset).
