import type {
  MoveType,
  PricingMethod,
  TimeSlot,
  Tier,
  RateLocalCuft,
  RateLocalHourly,
  RateLongDistance,
  RateOutOfState,
  RateBox,
  RateHeavyItem,
} from '../supabase/types';

export type { MoveType, PricingMethod, TimeSlot, Tier };

export type LineCategory =
  | 'base'
  | 'travel'
  | 'packing'
  | 'boxes'
  | 'unpacking'
  | 'stairs'
  | 'heavy_item'
  | 'crating'
  | 'storage'
  | 'hra'
  | 'discount';

export interface LineItem {
  label: string;
  amount: number;
  category: LineCategory;
  detail?: string;
}

export interface BoxSelection {
  /** key into rates_boxes.box_type — e.g. 'small', 'china', 'tv' */
  box_type: string;
  packing_qty: number;
  sale_qty: number;
}

export interface HeavyItemSelection {
  /** matches rates_heavy_items.item_name */
  item_name: string;
  qty: number;
  /** agent-entered override for is_custom items */
  custom_amount?: number;
  note?: string;
}

export interface CratingSelection {
  soft_qty: number;
  wood_amount?: number;
  wood_note?: string;
}

export interface StorageSelection {
  overnight: boolean;
  overnight_start?: string;
  overnight_end?: string;
  long_term_months?: number;
}

export interface QuoteInput {
  move_type: MoveType;
  pricing_method?: PricingMethod;
  tier: Tier;
  jobs_on_calendar: number;
  total_cuft: number;

  // Local-only
  time_slot?: TimeSlot;
  hours?: number;
  crew_override?: 2 | 3 | 4;
  fourth_man?: boolean;

  // Long-distance
  destination_state?: string;

  // Travel
  round_trip_miles: number;
  tolls: number;

  // Add-ons
  boxes?: BoxSelection[];
  customer_provides_boxes?: boolean;
  unpacking_qty?: number;
  unpacking_discounted?: boolean;
  stairs_flights?: number;
  heavy_items?: HeavyItemSelection[];
  crating?: CratingSelection;
  storage?: StorageSelection;

  // Final
  is_hra?: boolean;
  discount_pct?: number;
}

export interface RateTables {
  localCuft: RateLocalCuft[];
  localHourly: RateLocalHourly[];
  longDistance: RateLongDistance[];
  outOfState: RateOutOfState;
  boxes: RateBox[];
  heavyItems: RateHeavyItem[];
  misc: Record<string, number>;
  fourthManRate: number;
  defaultUnpackingRate: number;
  discountedUnpackingRate: number;
  boxDeliveryMinimum: number;
}

export interface PriceBreakdown {
  move_type: MoveType;
  lines: LineItem[];
  subtotal: number;
  hra_applied: boolean;
  discount_pct: number;
  discount_amount: number;
  final_total: number;

  /** Populated when local + CuFT ≤ 400 and CuFT-flat method. */
  morning_total?: number;
  afternoon_total?: number;

  /** Long-distance only */
  delivery_window?: string;

  /** Long-term storage displayed separately, not in final_total. */
  monthly_storage?: { cuft: number; amount: number };

  /** Flags for owner review */
  flags: string[];

  crew_size: 2 | 3 | 4;
  tier: Tier;
}

export class PricingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
