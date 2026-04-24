import { create } from 'zustand';
import type { QuoteInput } from '@/lib/pricing/types';
import type { ExtraStop } from '@/lib/supabase/types';

export interface DraftCustomer {
  job_number: string;
  email: string;
}

export interface QuoteDraft extends Partial<QuoteInput> {
  origin_address: string;
  origin_zip: string;
  origin_zone: string;
  destination_address: string;
  destination_zip: string;
  destination_zone: string;
  extra_stops: ExtraStop[];
  move_date: string | null;
  customer: DraftCustomer;
  auto_mileage_loading: boolean;
  calculated_toll: number;
  toll_breakdown: string;
  toll_notes: string;
}

const EMPTY: QuoteDraft = {
  move_type: 'local',
  pricing_method: 'cuft',
  total_cuft: 300,
  jobs_on_calendar: 0,
  tier: 't1',
  round_trip_miles: 0,
  tolls: 0,
  origin_address: '',
  origin_zip: '',
  origin_zone: '',
  destination_address: '',
  destination_zip: '',
  destination_zone: '',
  extra_stops: [],
  move_date: null,
  time_slot: 'morning',
  customer: { job_number: '', email: '' },
  auto_mileage_loading: false,
  calculated_toll: 0,
  toll_breakdown: '',
  toll_notes: '',
  boxes: [],
  heavy_items: [],
  crating: { soft_qty: 0 },
  storage: { overnight: false },
  is_hra: false,
  discount_pct: 0,
};

interface DraftStore {
  draft: QuoteDraft;
  step: number;
  setStep: (s: number) => void;
  update: (patch: Partial<QuoteDraft>) => void;
  setCustomer: (patch: Partial<DraftCustomer>) => void;
  reset: () => void;
}

export const useQuoteDraft = create<DraftStore>((set) => ({
  draft: EMPTY,
  step: 0,
  setStep: (step) => set({ step }),
  update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setCustomer: (patch) =>
    set((s) => ({ draft: { ...s.draft, customer: { ...s.draft.customer, ...patch } } })),
  reset: () => set({ draft: EMPTY, step: 0 }),
}));
