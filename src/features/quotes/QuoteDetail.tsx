import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy } from 'lucide-react';
import { PriceBreakdown } from '@/components/quote-builder/PriceBreakdown';
import { DualPriceCard } from '@/components/quote-builder/DualPriceCard';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { LoadingShimmer } from '@/components/shared/LoadingShimmer';
import { toast } from '@/components/ui/toast';
import { getQuoteByCode, updateQuoteStatus, type QuoteListRow } from '@/lib/supabase/queries/quotes';
import { formatMoney } from '@/lib/utils';
import type { QuoteStatus, MoveType } from '@/lib/supabase/types';
import type { PriceBreakdown as Breakdown } from '@/lib/pricing/types';

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
];

const MOVE_LABEL: Record<MoveType, string> = {
  local: 'Local', long_distance: 'Long Distance', out_of_state: 'Out-of-State',
};

export function QuoteDetail() {
  const { quoteCode } = useParams<{ quoteCode: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteListRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteCode) return;
    getQuoteByCode(quoteCode)
      .then(setQuote)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [quoteCode]);

  async function changeStatus(status: QuoteStatus) {
    if (!quote) return;
    try {
      await updateQuoteStatus(quote.id, status);
      setQuote({ ...quote, status });
      toast({ title: `Status → ${status}`, variant: 'success' });
    } catch (e) {
      toast({ title: 'Failed to update', description: (e as Error).message, variant: 'error' });
    }
  }

  if (loading) return (
    <div className="py-6 space-y-4">
      <LoadingShimmer className="h-8 w-48" />
      <LoadingShimmer className="h-96 w-full" />
    </div>
  );

  if (!quote) return (
    <div className="py-20 text-center text-muted-foreground text-sm">
      Quote not found. <Link to="/quotes" className="text-accent">Back to list</Link>
    </div>
  );

  const breakdown = quote.breakdown as Breakdown | null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/quotes')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{quote.quote_code}</span>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(quote.quote_code); toast({ title: 'Copied', variant: 'info' }); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <h1 className="font-serif text-3xl tracking-tight2">
            {quote.customer_name || 'Draft quote'}
          </h1>
        </div>
      </div>

      {quote.needs_owner_review && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Flagged for owner review: {quote.review_note}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <GlassPanel className="p-6 space-y-6">
          {quote.morning_total != null && quote.afternoon_total != null && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Price options</div>
              <DualPriceCard morning={quote.morning_total} afternoon={quote.afternoon_total} />
            </div>
          )}
          {breakdown ? (
            <PriceBreakdown breakdown={breakdown} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Final total: <span className="font-mono">{formatMoney(quote.final_total)}</span>
            </div>
          )}
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel className="p-4 space-y-3 text-sm">
            <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Job details</div>
            <Row label="Move type" value={MOVE_LABEL[quote.move_type]} />
            <Row label="Move date" value={quote.move_date ?? '—'} />
            <Row label="CuFT" value={quote.total_cuft?.toString() ?? '—'} />
            <Row label="Crew" value={quote.crew_size?.toString() ?? '—'} />
            {quote.fourth_man && <Row label="4th man" value="Yes" />}
            <Row label="Tier" value={quote.tier?.toUpperCase() ?? '—'} />
            {quote.round_trip_miles && <Row label="Miles (RT)" value={`${quote.round_trip_miles} mi`} />}
            {quote.tolls_amount != null && <Row label="Tolls" value={formatMoney(quote.tolls_amount)} />}
          </GlassPanel>

          {(quote.customer_name || quote.customer_email || quote.customer_phone) && (
            <GlassPanel className="p-4 space-y-3 text-sm">
              <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Customer</div>
              {quote.customer_name && <Row label="Name" value={quote.customer_name} />}
              {quote.customer_email && <Row label="Email" value={quote.customer_email} />}
              {quote.customer_phone && <Row label="Phone" value={quote.customer_phone} />}
            </GlassPanel>
          )}

          <GlassPanel className="p-4 space-y-3">
            <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide text-sm">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeStatus(value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    quote.status === value
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'border-border/60 text-muted-foreground hover:border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-4 space-y-2">
            <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide text-sm">Attribution</div>
            <div className="text-sm">
              {(quote as unknown as { agent: { full_name: string } | null }).agent?.full_name ?? 'Unknown agent'}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(quote.created_at).toLocaleString()}
            </div>
          </GlassPanel>

          <Link
            to="/new-quote"
            className="block text-center w-full px-4 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            Duplicate to new quote →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}
