import type { RateTables } from '../types';

/**
 * Fixture rate tables matching the published docs. These drive the
 * example-quote tests. Keep in sync with /supabase/seed.sql.
 */
export const testRates: RateTables = {
  localCuft: [
    { tier: 't1', morning: 1.25, afternoon: 1.0 },
    { tier: 't2', morning: 1.35, afternoon: 1.0 },
    { tier: 't3', morning: 1.5, afternoon: 1.0 },
    { tier: 't4', morning: 1.75, afternoon: 1.0 },
    { tier: 't5', morning: 2.0, afternoon: 1.0 },
  ],
  localHourly: [
    { id: 1, crew_size: 2, tier: 't1', rate: 139 },
    { id: 2, crew_size: 2, tier: 't2', rate: 149 },
    { id: 3, crew_size: 2, tier: 't3', rate: 159 },
    { id: 4, crew_size: 2, tier: 't4', rate: 169 },
    { id: 5, crew_size: 2, tier: 't5', rate: 179 },
    { id: 6, crew_size: 3, tier: 't1', rate: 159 },
    { id: 7, crew_size: 3, tier: 't2', rate: 169 },
    { id: 8, crew_size: 3, tier: 't3', rate: 179 },
    { id: 9, crew_size: 3, tier: 't4', rate: 199 },
    { id: 10, crew_size: 3, tier: 't5', rate: 220 },
  ],
  longDistance: [
    { state_code: 'FL', state_name: 'Florida', rate_per_cuft: 6.0, delivery_window: '1–9 business days', max_discount_pct: 5 },
    { state_code: 'CA', state_name: 'California', rate_per_cuft: 6.5, delivery_window: '1–19 business days', max_discount_pct: 5 },
    { state_code: 'OR', state_name: 'Oregon', rate_per_cuft: 7.0, delivery_window: '1–19 business days', max_discount_pct: 10 },
  ],
  outOfState: { id: 1, rate_per_cuft: 7.5, markup_pct: 10, max_discount_pct: 5 },
  boxes: [
    { box_type: 'small', packing_cost: 15, sale_price: 5 },
    { box_type: 'medium', packing_cost: 15, sale_price: 5 },
    { box_type: 'large', packing_cost: 15, sale_price: 5 },
    { box_type: 'china', packing_cost: 15, sale_price: 10 },
    { box_type: 'wardrobe', packing_cost: 25, sale_price: 20 },
    { box_type: 'tv', packing_cost: 50, sale_price: 50 },
  ],
  heavyItems: [
    { id: 1, item_name: 'Upright Piano', charge: 250, is_custom: false, requires_photo: false, notes: null },
    { id: 2, item_name: 'Baby / Grand Piano', charge: 500, is_custom: false, requires_photo: false, notes: null },
    { id: 3, item_name: 'Pool Table', charge: 1000, is_custom: false, requires_photo: false, notes: null },
  ],
  misc: {
    stairs_multiplier: 0.15,
    soft_crate: 150,
    overnight_offpeak: 250,
    overnight_peak: 500,
    storage_per_cuft: 0.6,
    min_cuft: 300,
  },
  fourthManRate: 40,
  defaultUnpackingRate: 15,
  discountedUnpackingRate: 10,
  boxDeliveryMinimum: 75,
};
