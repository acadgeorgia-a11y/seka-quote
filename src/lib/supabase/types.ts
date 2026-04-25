export type TaskStatus = 'not_started' | 'planning' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskAssignee = 'Alex' | 'Terry' | 'Chris' | 'Rob';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: TaskAssignee | null;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

export type Tier = 't1' | 't2' | 't3' | 't4' | 't5';
export type TimeSlot = 'morning' | 'afternoon';
export type MoveType = 'local' | 'long_distance' | 'out_of_state';
export type PricingMethod = 'cuft' | 'hourly';
export type QuoteStatus = 'draft' | 'sent' | 'booked' | 'lost';
export type AgentRole = 'agent' | 'owner' | 'dispatch';

export type Agent = {
  id: string;
  email: string;
  full_name: string;
  role: AgentRole;
  active: boolean;
  created_at: string;
};

export type Settings = {
  id: number;
  office_address: string;
  office_lat: number | null;
  office_lng: number | null;
  fourth_man_rate: number;
  default_unpacking_rate: number;
  discounted_unpacking_rate: number;
  box_delivery_minimum: number;
  updated_at: string;
};

export type RateLocalCuft = {
  tier: Tier;
  morning: number;
  afternoon: number;
};

export type RateLocalHourly = {
  id: number;
  crew_size: number;
  tier: Tier;
  rate: number;
};

export type RateLongDistance = {
  state_code: string;
  state_name: string;
  rate_per_cuft: number;
  delivery_window: string;
  max_discount_pct: number;
};

export type RateOutOfState = {
  id: number;
  rate_per_cuft: number;
  markup_pct: number;
  max_discount_pct: number;
};

export type RateBox = {
  box_type: string;
  packing_cost: number;
  sale_price: number;
};

export type RateHeavyItem = {
  id: number;
  item_name: string;
  charge: number | null;
  is_custom: boolean;
  requires_photo: boolean;
  notes: string | null;
};

export type RateMisc = {
  key: string;
  value: number;
  notes: string | null;
};

export type QuoteRow = {
  id: string;
  quote_code: string;
  agent_id: string;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  move_type: MoveType;
  pricing_method: PricingMethod | null;
  is_hra: boolean;
  origin_address: string;
  origin_zip: string;
  destination_address: string;
  destination_zip: string;
  round_trip_miles: number | null;
  tolls_amount: number | null;
  origin_zone: string | null;
  destination_zone: string | null;
  extra_stops: ExtraStop[] | null;
  calculated_toll: number | null;
  total_cuft: number | null;
  crew_size: number | null;
  fourth_man: boolean;
  hours: number | null;
  time_slot: TimeSlot | null;
  move_date: string | null;
  jobs_on_calendar: number | null;
  tier: Tier | null;
  breakdown: unknown;
  addons: unknown;
  subtotal: number;
  discount_pct: number;
  final_total: number;
  morning_total: number | null;
  afternoon_total: number | null;
  monthly_storage_cuft: number | null;
  monthly_storage_amount: number | null;
  needs_owner_review: boolean;
  review_note: string | null;
  status: QuoteStatus;
};

export type TollZone = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type TollRoute = {
  id: string;
  from_zone: string;
  to_zone: string;
  round_trip_toll: number;
  crz_applies: boolean;
  notes: string | null;
  effective_date: string;
  updated_at: string;
};

export type CrzRate = {
  id: string;
  rate_type: 'peak' | 'off_peak';
  amount: number;
  effective_date: string;
};

export type ExtraStop = {
  address: string;
  zip: string;
  zone: string;
};

export type AgentInsert = {
  id?: string;
  email: string;
  full_name: string;
  role?: AgentRole;
  active?: boolean;
  created_at?: string;
};

export type QuoteInsert = {
  id?: string;
  quote_code: string;
  agent_id: string;
  created_at?: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  move_type: MoveType;
  pricing_method?: PricingMethod | null;
  is_hra?: boolean;
  origin_address: string;
  origin_zip: string;
  destination_address: string;
  destination_zip: string;
  round_trip_miles?: number | null;
  tolls_amount?: number | null;
  origin_zone?: string | null;
  destination_zone?: string | null;
  extra_stops?: ExtraStop[] | null;
  calculated_toll?: number | null;
  total_cuft?: number | null;
  crew_size?: number | null;
  fourth_man?: boolean;
  hours?: number | null;
  time_slot?: TimeSlot | null;
  move_date?: string | null;
  jobs_on_calendar?: number | null;
  tier?: Tier | null;
  breakdown: unknown;
  addons?: unknown;
  subtotal: number;
  discount_pct?: number;
  final_total: number;
  morning_total?: number | null;
  afternoon_total?: number | null;
  monthly_storage_cuft?: number | null;
  monthly_storage_amount?: number | null;
  needs_owner_review?: boolean;
  review_note?: string | null;
  status?: QuoteStatus;
};

export type Database = {
  public: {
    Tables: {
      agents: { Row: Agent; Insert: AgentInsert; Update: Partial<Agent>; Relationships: [] };
      settings: { Row: Settings; Insert: Partial<Settings>; Update: Partial<Settings>; Relationships: [] };
      rates_local_cuft: { Row: RateLocalCuft; Insert: RateLocalCuft; Update: Partial<RateLocalCuft>; Relationships: [] };
      rates_local_hourly: { Row: RateLocalHourly; Insert: Omit<RateLocalHourly, 'id'> & { id?: number }; Update: Partial<RateLocalHourly>; Relationships: [] };
      rates_long_distance: { Row: RateLongDistance; Insert: RateLongDistance; Update: Partial<RateLongDistance>; Relationships: [] };
      rates_out_of_state: { Row: RateOutOfState; Insert: Partial<RateOutOfState>; Update: Partial<RateOutOfState>; Relationships: [] };
      rates_boxes: { Row: RateBox; Insert: RateBox; Update: Partial<RateBox>; Relationships: [] };
      rates_heavy_items: { Row: RateHeavyItem; Insert: Omit<RateHeavyItem, 'id'> & { id?: number }; Update: Partial<RateHeavyItem>; Relationships: [] };
      rates_misc: { Row: RateMisc; Insert: RateMisc; Update: Partial<RateMisc>; Relationships: [] };
      quotes: { Row: QuoteRow; Insert: QuoteInsert; Update: Partial<QuoteRow>; Relationships: [] };
      toll_zones: { Row: TollZone; Insert: Omit<TollZone, 'created_at'> & { created_at?: string }; Update: Partial<TollZone>; Relationships: [] };
      toll_routes: { Row: TollRoute; Insert: Omit<TollRoute, 'id' | 'effective_date' | 'updated_at'> & { id?: string; effective_date?: string; updated_at?: string }; Update: Partial<TollRoute>; Relationships: [] };
      crz_rates: { Row: CrzRate; Insert: Omit<CrzRate, 'id' | 'effective_date'> & { id?: string; effective_date?: string }; Update: Partial<CrzRate>; Relationships: [] };
      tasks: { Row: Task; Insert: TaskInsert; Update: Partial<TaskInsert>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
