import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  deleteHeavyItem,
  insertHeavyItem,
  updateHeavyItems,
} from '@/lib/supabase/queries/rates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import type { RateHeavyItem } from '@/lib/supabase/types';
import { useEditableRows } from './useEditableRows';

export function HeavyItemsTable({ rates, onSaved }: { rates: RateHeavyItem[]; onSaved: () => void }) {
  const { rows, updateRow, removeRow, dirtyRows, isDirty } = useEditableRows(rates, (r) => String(r.id));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateHeavyItems(dirtyRows);
      toast({ title: 'Heavy items saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const name = window.prompt('New heavy item name?');
    if (!name) return;
    try {
      await insertHeavyItem({
        item_name: name,
        charge: 150,
        is_custom: false,
        requires_photo: false,
        notes: null,
      });
      toast({ title: `Added ${name}`, variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Add failed', description: (e as Error).message, variant: 'error' });
    }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await deleteHeavyItem(id);
      removeRow(String(id));
      toast({ title: `Removed ${name}`, variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Remove failed', description: (e as Error).message, variant: 'error' });
    }
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="font-serif text-2xl tracking-tight2 mb-1">Heavy items</h3>
          <p className="text-muted-foreground text-sm">Flat charges. "Custom" items require agent-entered amount per quote.</p>
        </div>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4" />Add</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Charge ($)</TableHead>
            <TableHead>Custom</TableHead>
            <TableHead>Photo</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Input
                  value={r.item_name}
                  onChange={(e) => updateRow(String(r.id), { item_name: e.target.value })}
                  className="h-9 min-w-52"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="10"
                  value={r.charge ?? ''}
                  placeholder={r.is_custom ? 'Varies' : '150'}
                  onChange={(e) =>
                    updateRow(String(r.id), { charge: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  className="h-9 max-w-28"
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={r.is_custom}
                  onCheckedChange={(v) => updateRow(String(r.id), { is_custom: v === true })}
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={r.requires_photo}
                  onCheckedChange={(v) => updateRow(String(r.id), { requires_photo: v === true })}
                />
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id, r.item_name)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
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
