import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceBreakdown } from '@/components/quote-builder/PriceBreakdown';
import { DualPriceCard } from '@/components/quote-builder/DualPriceCard';
import { DiscountInput } from '@/components/quote-builder/DiscountInput';
import { useQuoteDraft, type QuoteDraft } from '@/stores/useQuoteDraft';
import { useAgent } from '@/stores/useAgent';
import { toast } from '@/components/ui/toast';
import { createQuote } from '@/lib/supabase/queries/quotes';
import { sendQuoteEmail } from '@/lib/apis/sendQuote';
import { listActiveAgents } from '@/lib/supabase/queries/agents';
import type { PriceBreakdown as Breakdown, RateTables } from '@/lib/pricing/types';
import type { QuoteInsert } from '@/lib/supabase/types';

interface Props {
  breakdown: Breakdown;
  rates: RateTables;
  onBack: () => void;
}

function buildInsert(
  draft: QuoteDraft,
  breakdown: Breakdown,
  agentId: string,
  status: 'draft' | 'sent',
): Omit<QuoteInsert, 'quote_code'> {
  return {
    agent_id: agentId,
    customer_name: draft.customer.name || null,
    customer_email: draft.customer.email || null,
    customer_phone: draft.customer.phone || null,
    move_type: draft.move_type ?? 'local',
    pricing_method: draft.pricing_method ?? null,
    is_hra: draft.is_hra ?? false,
    origin_address: draft.origin_address,
    origin_zip: draft.origin_zip,
    destination_address: draft.destination_address,
    destination_zip: draft.destination_zip,
    round_trip_miles: draft.round_trip_miles ?? null,
    tolls_amount: draft.tolls ?? null,
    total_cuft: draft.total_cuft ?? null,
    crew_size: breakdown.crew_size,
    fourth_man: draft.fourth_man ?? false,
    hours: draft.hours ?? null,
    time_slot: draft.time_slot ?? null,
    move_date: draft.move_date ?? null,
    jobs_on_calendar: draft.jobs_on_calendar ?? null,
    tier: breakdown.tier,
    breakdown: breakdown as unknown,
    addons: {
      boxes: draft.boxes,
      unpacking_qty: draft.unpacking_qty,
      stairs_flights: draft.stairs_flights,
      heavy_items: draft.heavy_items,
      crating: draft.crating,
      storage: draft.storage,
    },
    subtotal: breakdown.subtotal,
    discount_pct: breakdown.discount_pct,
    final_total: breakdown.final_total,
    morning_total: breakdown.morning_total ?? null,
    afternoon_total: breakdown.afternoon_total ?? null,
    monthly_storage_cuft: breakdown.monthly_storage?.cuft ?? null,
    monthly_storage_amount: breakdown.monthly_storage?.amount ?? null,
    needs_owner_review: breakdown.flags.length > 0,
    review_note: breakdown.flags.length > 0 ? breakdown.flags.join('; ') : null,
    status,
  };
}

export function Step4Review({ breakdown, rates: _rates, onBack }: Props) {
  const navigate = useNavigate();
  const { draft, update, setCustomer, reset } = useQuoteDraft();
  const agentId = useAgent((s) => s.agentId);
  const [saving, setSaving] = useState(false);

  const discountCap = breakdown.move_type === 'long_distance' ? 10 : 5;
  const missingEmail = !draft.customer.email;

  async function save(status: 'draft' | 'sent') {
    if (!agentId) {
      toast({ title: 'Select an agent first', variant: 'error' });
      return;
    }
    if (status === 'sent' && missingEmail) {
      toast({ title: 'Customer email required to send', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const row = await createQuote(buildInsert(draft, breakdown, agentId, status));

      if (status === 'sent' && draft.customer.email) {
        // Look up agent name for the email
        const agents = await listActiveAgents();
        const agent = agents.find((a) => a.id === agentId);

        await sendQuoteEmail({
          to: draft.customer.email,
          customerName: draft.customer.name || 'there',
          quoteCode: row.quote_code,
          agentName: agent?.full_name ?? 'Your agent',
          moveType: draft.move_type ?? 'local',
          moveDate: draft.move_date,
          originAddress: draft.origin_address,
          destinationAddress: draft.destination_address,
          crewSize: breakdown.crew_size,
          lines: breakdown.lines,
          subtotal: breakdown.subtotal,
          discountAmount: breakdown.discount_amount,
          finalTotal: breakdown.final_total,
          morningTotal: breakdown.morning_total ?? null,
          afternoonTotal: breakdown.afternoon_total ?? null,
          monthlyStorage: breakdown.monthly_storage ?? null,
          flags: breakdown.flags,
        });

        toast({ title: `Quote sent to ${draft.customer.email}`, variant: 'success' });
      } else {
        toast({ title: `Quote ${row.quote_code} saved`, variant: 'success' });
      }

      reset();
      navigate(`/quotes/${row.quote_code}`);
    } catch (e) {
      toast({ title: 'Something went wrong', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {breakdown.morning_total != null && breakdown.afternoon_total != null && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Price options</div>
          <DualPriceCard morning={breakdown.morning_total} afternoon={breakdown.afternoon_total} />
        </div>
      )}

      <PriceBreakdown breakdown={breakdown} />

      <DiscountInput
        value={draft.discount_pct ?? 0}
        onChange={(v) => update({ discount_pct: v })}
        cap={discountCap}
      />

      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="text-sm font-medium">
          Customer info{' '}
          <span className="text-muted-foreground font-normal">(email required to send)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.customer.name}
              onChange={(e) => setCustomer({ name: e.target.value })}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={draft.customer.phone}
              onChange={(e) => setCustomer({ phone: e.target.value })}
              placeholder="(917) 555-0000"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={draft.customer.email}
              onChange={(e) => setCustomer({ email: e.target.value })}
              placeholder="jane@example.com"
              className={missingEmail ? '' : 'border-success/60 focus-visible:ring-success/30'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Coming soon"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button
            type="button"
            onClick={() => save('sent')}
            disabled={saving || missingEmail}
            title={missingEmail ? 'Enter customer email first' : 'Send quote by email'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Sending…' : 'Send'}
          </button>
          <button
            type="button"
            onClick={() => save('draft')}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-foreground text-background text-sm font-bold tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Logging…' : 'LOG'}
          </button>
        </div>
      </div>
    </div>
  );
}
