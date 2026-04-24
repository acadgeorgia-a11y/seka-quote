import { useState } from 'react';
import { useRates } from '@/hooks/useRates';
import { updateLongDistance, updateOutOfState } from '@/lib/supabase/queries/rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { RateLongDistance, RateOutOfState } from '@/lib/supabase/types';
import { useEditableRows } from './useEditableRows';

export function AdminRatesLongDistance() {
  const { rates, loading, reload } = useRates();
  if (loading || !rates) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-10">
      <LongDistanceTable rates={rates.longDistance} onSaved={reload} />
      <OutOfStateCard rate={rates.outOfState} onSaved={reload} />
    </div>
  );
}

function LongDistanceTable({ rates, onSaved }: { rates: RateLongDistance[]; onSaved: () => void }) {
  const sorted = [...rates].sort((a, b) => a.state_name.localeCompare(b.state_name));
  const { rows, updateRow, dirtyRows, isDirty } = useEditableRows(sorted, (r) => r.state_code);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateLongDistance(dirtyRows);
      toast({ title: 'Long-distance rates saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-3xl tracking-tight2 mb-1">Long-distance — NY/NJ origin</h2>
      <p className="text-muted-foreground text-sm mb-4">Per-CuFT rate by destination state. A 10% markup is applied automatically on top.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>State</TableHead>
            <TableHead>Rate ($/CuFT)</TableHead>
            <TableHead>Delivery window</TableHead>
            <TableHead>Max discount (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.state_code}>
              <TableCell className="font-mono">{r.state_code} — {r.state_name}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.25"
                  value={r.rate_per_cuft}
                  onChange={(e) => updateRow(r.state_code, { rate_per_cuft: Number(e.target.value) })}
                  className="h-9 max-w-28"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={r.delivery_window}
                  onChange={(e) => updateRow(r.state_code, { delivery_window: e.target.value })}
                  className="h-9 max-w-52"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="1"
                  value={r.max_discount_pct}
                  onChange={(e) => updateRow(r.state_code, { max_discount_pct: Number(e.target.value) })}
                  className="h-9 max-w-20"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Button disabled={!isDirty || saving} onClick={save} size="sm">
          {saving ? 'Saving…' : `Save${dirtyRows.length ? ` ${dirtyRows.length} change${dirtyRows.length === 1 ? '' : 's'}` : ''}`}
        </Button>
      </div>
    </section>
  );
}

function OutOfStateCard({ rate, onSaved }: { rate: RateOutOfState; onSaved: () => void }) {
  const [form, setForm] = useState(rate);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(rate);

  async function save() {
    setSaving(true);
    try {
      await updateOutOfState(form);
      toast({ title: 'Out-of-state rate saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-3xl tracking-tight2 mb-1">Out-of-state carrier</h2>
      <p className="text-muted-foreground text-sm mb-4">Flat rate for moves that don't touch NY/NJ (e.g. CA → FL).</p>
      <div className="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <div className="space-y-1.5">
          <Label>Rate ($/CuFT)</Label>
          <Input type="number" step="0.25" value={form.rate_per_cuft}
            onChange={(e) => setForm({ ...form, rate_per_cuft: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Markup (%)</Label>
          <Input type="number" step="1" value={form.markup_pct}
            onChange={(e) => setForm({ ...form, markup_pct: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Max discount (%)</Label>
          <Input type="number" step="1" value={form.max_discount_pct}
            onChange={(e) => setForm({ ...form, max_discount_pct: Number(e.target.value) })} />
        </div>
      </div>
      <div className="mt-4">
        <Button disabled={!dirty || saving} onClick={save} size="sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </section>
  );
}
