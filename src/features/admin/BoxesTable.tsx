import { useState } from 'react';
import { updateBoxes } from '@/lib/supabase/queries/rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { RateBox } from '@/lib/supabase/types';
import { useEditableRows } from './useEditableRows';

const ORDER = ['small', 'medium', 'large', 'china', 'wardrobe', 'tv'];

export function BoxesTable({ rates, onSaved }: { rates: RateBox[]; onSaved: () => void }) {
  const sorted = [...rates].sort((a, b) => ORDER.indexOf(a.box_type) - ORDER.indexOf(b.box_type));
  const { rows, updateRow, dirtyRows, isDirty } = useEditableRows(sorted, (r) => r.box_type);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateBoxes(dirtyRows);
      toast({ title: 'Box rates saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h3 className="font-serif text-2xl tracking-tight2 mb-1">Boxes</h3>
      <p className="text-muted-foreground text-sm mb-4">Two charges per box: packing labor and box sale price.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Packing labor ($)</TableHead>
            <TableHead>Sale price ($)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.box_type}>
              <TableCell className="font-mono capitalize">{r.box_type}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="1"
                  value={r.packing_cost}
                  onChange={(e) => updateRow(r.box_type, { packing_cost: Number(e.target.value) })}
                  className="h-9 max-w-28"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="1"
                  value={r.sale_price}
                  onChange={(e) => updateRow(r.box_type, { sale_price: Number(e.target.value) })}
                  className="h-9 max-w-28"
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
