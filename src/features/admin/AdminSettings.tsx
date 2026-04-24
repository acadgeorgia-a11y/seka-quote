import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/supabase/queries/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import type { Settings } from '@/lib/supabase/types';

export function AdminSettings() {
  const [form, setForm] = useState<Settings | null>(null);
  const [original, setOriginal] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setForm(s);
      setOriginal(s);
    }).catch((e) => toast({ title: 'Load failed', description: e.message, variant: 'error' }));
  }, []);

  if (!form) return <Skeleton className="h-96" />;

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await updateSettings(form);
      toast({ title: 'Settings saved', variant: 'success' });
      setOriginal(form);
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-serif text-3xl tracking-tight2 mb-1">Settings</h2>
        <p className="text-muted-foreground text-sm">Office address and shared defaults. All other rates live under Rates.</p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Office address (used for mileage calc)</Label>
          <Input value={form.office_address} onChange={(e) => set('office_address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Office lat</Label>
            <Input type="number" step="any" value={form.office_lat ?? ''}
              onChange={(e) => set('office_lat', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Office lng</Label>
            <Input type="number" step="any" value={form.office_lng ?? ''}
              onChange={(e) => set('office_lng', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-serif text-xl tracking-tight2">Defaults</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>4th man flat ($/hr)</Label>
            <Input type="number" step="5" value={form.fourth_man_rate}
              onChange={(e) => set('fourth_man_rate', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Box delivery minimum ($)</Label>
            <Input type="number" step="5" value={form.box_delivery_minimum}
              onChange={(e) => set('box_delivery_minimum', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unpacking ($/box)</Label>
            <Input type="number" step="1" value={form.default_unpacking_rate}
              onChange={(e) => set('default_unpacking_rate', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Unpacking (discounted)</Label>
            <Input type="number" step="1" value={form.discounted_unpacking_rate}
              onChange={(e) => set('discounted_unpacking_rate', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <Button disabled={!dirty || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  );
}
