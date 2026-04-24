import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import { formatMoney } from '@/lib/utils';
import type { PriceBreakdown as Breakdown } from '@/lib/pricing/types';

export function PriceBreakdown({ breakdown, compact = false }: { breakdown: Breakdown; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {breakdown.lines.map((line, i) => (
            <motion.div
              key={`${line.label}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex items-baseline justify-between gap-4 text-sm py-1.5 border-b border-border/40 last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate">{line.label}</div>
                {line.detail && !compact && (
                  <div className="text-xs text-muted-foreground truncate">{line.detail}</div>
                )}
              </div>
              <div className="font-mono tabular-nums">{formatMoney(line.amount)}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="pt-2 border-t border-border/70 space-y-1.5 text-sm">
        <Row label="Subtotal" value={breakdown.subtotal} muted />
        {breakdown.discount_amount > 0 && (
          <Row label={`Discount (${breakdown.discount_pct.toFixed(1)}%)`} value={-breakdown.discount_amount} muted />
        )}
        <div className="flex items-baseline justify-between pt-2 border-t border-border/60">
          <div className="font-serif text-2xl tracking-tight2">Total</div>
          <MoneyDisplay value={breakdown.final_total} className="font-serif text-3xl tracking-tight2 tabular-nums" />
        </div>
      </div>

      {breakdown.monthly_storage && (
        <div className="rounded-md border border-border/70 bg-secondary/40 p-3 text-sm flex items-baseline justify-between">
          <div>
            <div className="font-medium">Long-term storage</div>
            <div className="text-xs text-muted-foreground">
              {breakdown.monthly_storage.cuft} CuFT · charged monthly, separate from move
            </div>
          </div>
          <div className="font-mono tabular-nums">{formatMoney(breakdown.monthly_storage.amount)}/mo</div>
        </div>
      )}

      {breakdown.delivery_window && (
        <div className="text-sm text-muted-foreground">
          Delivery window: <span className="text-foreground">{breakdown.delivery_window}</span>
        </div>
      )}

      {breakdown.flags.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <AlertTriangle className="h-4 w-4" /> Needs owner review
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-5">
            {breakdown.flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Badge variant="muted">crew: {breakdown.crew_size} men</Badge>
        <Badge variant="muted">tier: {breakdown.tier.toUpperCase()}</Badge>
        {breakdown.hra_applied && <Badge variant="accent">HRA ×2</Badge>}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${muted ? 'text-muted-foreground' : ''}`}>
      <div>{label}</div>
      <div className="font-mono tabular-nums">{formatMoney(value)}</div>
    </div>
  );
}
