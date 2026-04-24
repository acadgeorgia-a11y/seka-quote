import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { RateHeavyItem } from '@/lib/supabase/types';
import type { HeavyItemSelection } from '@/lib/pricing/types';
import { NumberInput } from '@/components/shared/NumberInput';
import { formatMoney } from '@/lib/utils';

interface Props {
  items: RateHeavyItem[];
  selections: HeavyItemSelection[];
  onChange: (s: HeavyItemSelection[]) => void;
}

function getQty(selections: HeavyItemSelection[], item_name: string) {
  return selections.find((s) => s.item_name === item_name)?.qty ?? 0;
}

function patchItem(selections: HeavyItemSelection[], item: RateHeavyItem, qty: number, custom?: number): HeavyItemSelection[] {
  const filtered = selections.filter((s) => s.item_name !== item.item_name);
  if (qty <= 0) return filtered;
  return [...filtered, { item_name: item.item_name, qty, custom_amount: custom }];
}

export function HeavyItemList({ items, selections, onChange }: Props) {
  const [query, setQuery] = useState('');
  const filtered = items.filter((i) => i.item_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items…"
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="space-y-0 max-h-56 overflow-y-auto">
        {filtered.map((item) => {
          const qty = getQty(selections, item.item_name);
          const sel = selections.find((s) => s.item_name === item.item_name);
          return (
            <div key={item.item_name} className="grid grid-cols-[1fr_60px_80px] gap-2 items-center py-1.5 border-b border-border/30 last:border-0">
              <div>
                <div className="text-sm">{item.item_name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.is_custom ? 'Custom price' : item.charge ? formatMoney(item.charge) : '—'}
                </div>
              </div>
              <NumberInput
                value={qty}
                onChange={(n) => onChange(patchItem(selections, item, n))}
                min={0} className="h-7 text-center px-1"
              />
              {item.is_custom && qty > 0 && (
                <NumberInput
                  value={sel?.custom_amount ?? 0}
                  onChange={(n) => onChange(patchItem(selections, item, qty, n || undefined))}
                  min={0} step={5} className="h-7 px-1 text-sm"
                  placeholder="$amt"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
