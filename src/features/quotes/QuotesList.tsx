import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QuoteStatusBadge } from '@/components/quotes-list/QuoteStatusBadge';
import { LoadingShimmer } from '@/components/shared/LoadingShimmer';
import { formatMoney } from '@/lib/utils';
import { listQuotes, type QuoteListRow } from '@/lib/supabase/queries/quotes';
import type { QuoteStatus, MoveType } from '@/lib/supabase/types';

const MOVE_TYPE_LABEL: Record<MoveType, string> = {
  local: 'Local',
  long_distance: 'Long Distance',
  out_of_state: 'Out-of-State',
};

export function QuotesList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<MoveType | ''>('');

  useEffect(() => {
    setLoading(true);
    listQuotes({ status: statusFilter || undefined, moveType: typeFilter || undefined })
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter]);

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight2">Quotes</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | '')}
            className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="booked">Booked</option>
            <option value="lost">Lost</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MoveType | '')}
            className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm font-medium"
          >
            <option value="">All types</option>
            <option value="local">Local</option>
            <option value="long_distance">Long Distance</option>
            <option value="out_of_state">Out-of-State</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <LoadingShimmer key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : quotes.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground text-sm">No quotes yet.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl bg-card shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-secondary/40">
              <div>Quote / Customer</div>
              <div>Date</div>
              <div>Agent</div>
              <div>Type</div>
              <div>Total</div>
              <div>Status</div>
            </div>
            {quotes.map((q, i) => (
              <motion.button
                key={q.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.18 }}
                onClick={() => navigate(`/quotes/${q.quote_code}`)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 w-full text-left border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors text-sm"
              >
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{q.quote_code}</div>
                  <div className="font-semibold truncate">{q.customer_name || '—'}</div>
                </div>
                <div className="text-muted-foreground text-sm">
                  {q.move_date ?? new Date(q.created_at).toLocaleDateString()}
                </div>
                <div className="text-muted-foreground truncate text-sm">
                  {(q as unknown as { agent: { full_name: string } | null }).agent?.full_name ?? '—'}
                </div>
                <div className="text-muted-foreground text-sm">{MOVE_TYPE_LABEL[q.move_type]}</div>
                <div className="font-semibold tabular-nums">{formatMoney(q.final_total)}</div>
                <QuoteStatusBadge status={q.status} />
              </motion.button>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {quotes.map((q, i) => (
              <motion.button
                key={q.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.18 }}
                onClick={() => navigate(`/quotes/${q.quote_code}`)}
                className="w-full text-left bg-card rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-base">{q.customer_name || 'No name'}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">{q.quote_code}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-lg tabular-nums">{formatMoney(q.final_total)}</div>
                    <QuoteStatusBadge status={q.status} />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>{MOVE_TYPE_LABEL[q.move_type]}</span>
                  <span>·</span>
                  <span>{q.move_date ?? new Date(q.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{(q as unknown as { agent: { full_name: string } | null }).agent?.full_name ?? 'No agent'}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
