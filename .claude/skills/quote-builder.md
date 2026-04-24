# Skill: quote-builder

Use this skill when building, modifying, or debugging any part of the
quote calculator — pricing logic, the new-quote UI flow, or quote
storage/retrieval.

## Before writing any code

1. Read `/docs/pricing-logic-local.md` if touching local pricing
2. Read `/docs/pricing-logic-long-dist.md` if touching LD / out-of-state
3. Read `/docs/pricing-logic-addons.md` if touching any add-on
4. Read `/docs/component-structure.md` for UI layout conventions
5. Read `/docs/schema.sql` for data shape

If the doc disagrees with existing code, the **doc wins**. Fix the code
and flag it in the PR description.

## Non-negotiable rules

1. **Never hardcode a rate.** All prices come from Supabase rate tables.
   Calculator reads; admin UI writes.

2. **Pricing functions are pure.** Input in, `PriceBreakdown` out.
   No side effects, no data fetching inside pricing functions.
   Fetch rates at the call-site, pass them into the function.

3. **Always return a full breakdown,** not just a total. Every line
   item the customer would see on an invoice must be a separate
   entry with `label`, `amount`, and `category`.

4. **Travel formula uses MAX, not MIN.** Protects margin. If you see
   MIN anywhere, that's a bug.

5. **HRA is applied AFTER everything except discount.** Order:
   base → travel → addons → sum → (×2 if HRA) → discount → final.

6. **When CuFT ≤ 400 and move is local, return both morning and
   afternoon totals.** Do not silently return one.

7. **Every quote saves on submit.** Draft or sent, it writes to
   `quotes` table with full breakdown JSON and agent attribution.

8. **Quote codes:** format `SQ-YYYY-MMDD-XXXX` where XXXX is
   4 random alphanumeric. Must be unique — retry on collision.

9. **File size ceiling: 200 lines.** Split earlier rather than later.

## When adding a new add-on

1. Add the rate to the appropriate `rates_*` table in `schema.sql`
2. Add the math to `/src/lib/pricing/addons.ts`
3. Add the UI input to `/src/components/quote-builder/`
4. Update `pricing-logic-addons.md` FIRST — doc is source of truth
5. Write a sanity test with a hand-computed expected value

## When adding a new move type or destination rate change

1. Update `rates_long_distance` or `rates_out_of_state` via admin UI
   (not via code migration — rates must be owner-editable)
2. If it's a new *structure* (e.g. new zone with different discount
   cap), update the schema + pricing function + docs together

## Typical failure modes to watch for

- Forgetting the 10% markup on long-distance → use `× 1.10` not `+ 10`
- Treating afternoon price as automatic for all CuFT → only ≤ 400
- Billing hourly below 3-hour minimum → clamp to 3
- Travel formula using sum instead of max → always MAX
- HRA doubling discount too → no, HRA doubles subtotal, then discount
- Overnight peak detection missing → check dates span end-of-month

## Testing before shipping

For any pricing change, run 3 example quotes end-to-end and compare
to a hand-calculated expected value. Put the examples in
`/src/lib/pricing/__tests__/` as Vitest tests.
