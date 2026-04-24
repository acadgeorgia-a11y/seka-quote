import { useState, useMemo } from 'react';
import { updateMisc } from '@/lib/supabase/queries/rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';

const LABELS: Record<string, string> = {
  stairs_multiplier: 'Stairs ($/flight/CuFT)',
  soft_crate: 'Soft crate ($)',
  overnight_offpeak: 'Overnight storage — off-peak ($)',
  overnight_peak: 'Overnight storage — peak ($)',
  storage_per_cuft: 'Long-term storage ($/CuFT/month)',
  min_cuft: 'Minimum CuFT to quote',
};

const ORDER = ['min_cuft', 'stairs_multiplier', 'soft_crate', 'overnight_offpeak', 'overnight_peak', 'storage_per_cuft'];

export function MiscTable({ misc, onSaved }: { misc: Record<string, number>; onSaved: () => void }) {
  const initial = useMemo(() => ({ ...misc }), [misc]);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(form);

  async function save() {
    setSaving(true);
    try {
      const rows = Object.entries(form).map(([key, value]) => ({ key, value: Number(value) }));
      await updateMisc(rows);
      toast({ title: 'Misc rates saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const keys = ORDER.filter((k) => k in form);

  return (
    <section>
      <h3 className="font-serif text-2xl tracking-tight2 mb-1">Misc</h3>
      <p className="text-muted-foreground text-sm mb-4">Stairs multiplier, crate, storage, and the min-CuFT threshold.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Setting</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((k) => (
            <TableRow key={k}>
              <TableCell>{LABELS[k] ?? k}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  value={form[k] ?? 0}
                  onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                  className="h-9 max-w-28"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Button disabled={!dirty || saving} onClick={save} size="sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </section>
  );
}
