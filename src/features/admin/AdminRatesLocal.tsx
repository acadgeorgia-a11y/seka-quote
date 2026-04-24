import { useState } from 'react';
import { useRates } from '@/hooks/useRates';
import { updateLocalCuft, updateLocalHourly } from '@/lib/supabase/queries/rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { RateLocalCuft, RateLocalHourly, Tier } from '@/lib/supabase/types';
import { useEditableRows } from './useEditableRows';

const TIERS: Tier[] = ['t1', 't2', 't3', 't4', 't5'];

export function AdminRatesLocal() {
  const { rates, loading, reload } = useRates();
  if (loading || !rates) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-10">
      <CuftTable rates={rates.localCuft} onSaved={reload} />
      <HourlyTable rates={rates.localHourly} onSaved={reload} />
    </div>
  );
}

function CuftTable({ rates, onSaved }: { rates: RateLocalCuft[]; onSaved: () => void }) {
  const ordered = TIERS.map((t) => rates.find((r) => r.tier === t)).filter(Boolean) as RateLocalCuft[];
  const { rows, updateRow, dirtyRows, isDirty } = useEditableRows(ordered, (r) => r.tier);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateLocalCuft(dirtyRows);
      toast({ title: 'CuFT rates saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-3xl tracking-tight2 mb-1">Local — CuFT flat</h2>
      <p className="text-muted-foreground text-sm mb-4">Per-CuFT rates by tier. Morning uses the full rate; afternoon is for jobs ≤ 400 CuFT only.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tier</TableHead>
            <TableHead>Morning ($/CuFT)</TableHead>
            <TableHead>Afternoon ($/CuFT)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.tier}>
              <TableCell className="font-mono uppercase">{r.tier}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.05"
                  value={r.morning}
                  onChange={(e) => updateRow(r.tier, { morning: Number(e.target.value) })}
                  className="h-9 max-w-32"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.05"
                  value={r.afternoon}
                  onChange={(e) => updateRow(r.tier, { afternoon: Number(e.target.value) })}
                  className="h-9 max-w-32"
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

function HourlyTable({ rates, onSaved }: { rates: RateLocalHourly[]; onSaved: () => void }) {
  const ordered = [...rates].sort((a, b) => a.crew_size - b.crew_size || a.tier.localeCompare(b.tier));
  const { rows, updateRow, dirtyRows, isDirty } = useEditableRows(ordered, (r) => String(r.id));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateLocalHourly(dirtyRows);
      toast({ title: 'Hourly rates saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="font-serif text-3xl tracking-tight2 mb-1">Local — Hourly</h2>
      <p className="text-muted-foreground text-sm mb-4">2-men and 3-men hourly rates by tier. 4th-man flat add-on is in Settings.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Crew</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Rate ($/hr)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{r.crew_size} men</TableCell>
              <TableCell className="font-mono uppercase">{r.tier}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="1"
                  value={r.rate}
                  onChange={(e) => updateRow(String(r.id), { rate: Number(e.target.value) })}
                  className="h-9 max-w-32"
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
