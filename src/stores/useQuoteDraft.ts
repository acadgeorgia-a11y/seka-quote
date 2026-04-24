import { create } from 'zustand';
import type { QuoteInput } from '@/lib/pricing/types';

export interface DraftCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface QuoteDraft extends Partial<QuoteInput> {
  origin_address: string;
  origin_zip: string;
  destination_address: string;
  destination_zip: string;
  move_date: string | null;
  customer: DraftCustomer;
  auto_mileage_loading: boolean;
  auto_tolls_loading: boolean;
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
  destination_address: '',
  destination_zip: '',
  move_date: null,
  time_slot: 'morning',
  customer: { name: '', email: '', phone: '' },
  auto_mileage_loading: false,
  auto_tolls_loading: false,
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
