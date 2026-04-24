# Pricing Logic — Add-ons

Source of truth for every add-on charge. Applies to both local and
long-distance moves unless noted. Do not change code without updating
this doc first.

## Packing (labor + box sale)

Two separate charges per box: packing labor AND box sale price.
When the customer provides their own boxes, charge packing only.
When customer requests box delivery only (no packing), charge
box sale + box-delivery travel (see below).

| Box type | Packing labor | Box sale |
|---|---|---|
| Small / Medium / Large | $15/box | $5/box |
| China | $15/box | $10/box |
| Wardrobe | $25/box | $20/box |
| TV | $50/box | $50/box |

UI: two number inputs per box type — "packing qty" and "sale qty".
Allow them to differ (customer may buy 10 boxes but only have 5
packed by the crew).

## Unpacking

- Default: $15 per box
- Agent toggle: "Discount unpacking to $10/box" (boolean)

## Stairs

Formula:
```
stairs_charge = 0.15 × number_of_stair_flights × total_cuft
```

Count flights at **both origin AND destination combined**.
One flight = one floor above ground (or below, for basements).

Example:
- 600 CuFT, 2 flights at origin + 1 at destination = 3 total
- `0.15 × 3 × 600 = $270`

## Heavy items

Flat charges on top of the base quote. Some are $/hr — these mean a
flat charge equal to 1 hour at the selected crew's hourly rate
(legacy naming; keep as flat for now unless owner confirms otherwise).

| Item | Charge |
|---|---|
| Heavy Large Safes | Varies — require photo, custom entry |
| Grandfather Clock (small) | $150 |
| Grandfather Clock (large) | $250 |
| Washer / Dryer | $150 |
| Large Refrigerator | $150 |
| Double Door Refrigerator | $250+ (custom entry, photo required) |
| Bunk Bed | $150 |
| Platform Bed | $150 |
| Large Entertainment Center | $150 |
| Large China Cabinet | $150 |
| Motorcycle | $250–$500 (custom, photo + model) |
| Lawn Mower | $150 |
| Wardrobe | $150 |
| Baby / Grand Piano | $500 |
| Upright Piano | $250 |
| Pool Table | $500 move + $500 reassembly = $1,000 |

UI: checkbox list with qty selector. For "custom entry" items, open
a dialog — agent enters amount and attaches photo reference note.

## Crating

| Crate type | Charge |
|---|---|
| Soft crate | $150/each |
| Wood (hard) crate | Requires consultation — custom entry, owner approves |

Wood crate UI: agent enters custom amount; quote is flagged
"Pending owner approval" until reviewed. Quote can still be sent to
customer with a note — the owner can clear the flag after review.

## Storage

### Overnight storage (one-time)

- Default: $250 (off-peak)
- Peak: $500 — when overnight falls on last day of month AND move-out
  is 1st of next month. Calculator auto-detects from selected dates
  and applies $500 automatically.

### Long-term storage (monthly recurring)

```
monthly_storage = 0.60 × total_cuft
minimum 300 CuFT
```

Display clearly: "Long-term storage: $X/month, minimum 300 CuFT."
Store as a separate line item in the quote — not rolled into the
move total. Customer sees move total + separate monthly storage.

## Box delivery (no-pack service)

When customer buys boxes but packs themselves:
```
box_delivery_total = (box_sale_prices) + travel_charge
```

Travel charge uses the same formula as a move:
```
option_A = round_trip_miles × 3   // office→customer→office
option_B = 1 hour at 2-men hourly rate at current tier
travel = MAX(A, B) + tolls
```

Minimum: if the travel charge is under $75, round up to $75 (customers
can't abuse free delivery).

## HRA Moves

Agent checkbox: "HRA Move".

When ON:
```
final_subtotal = (base + travel + all_addons) × 2
```

Applied AFTER every other calculation, BEFORE any agent discount.

## Discount rules

- Standard: max 5% off final total
- Long-distance to Dakotas/MT/ID/WA/OR: max 10%
- Above cap: UI shows warning, requires "Owner override" note field —
  quote still saves, flagged for owner review

## Order of operations (critical)

1. Calculate `base` (CuFT flat OR hourly)
2. Calculate `travel_charge` (MAX of formulas + tolls)
3. Sum all `add_ons`
4. `subtotal = base + travel_charge + add_ons`
5. If HRA: `subtotal × 2`
6. Apply `discount_percent` (0–5% standard, 0–10% for NW zone)
7. `final = subtotal after discount`
8. Long-term storage is displayed separately, never added to `final`
