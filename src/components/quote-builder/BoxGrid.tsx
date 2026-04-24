import type { RateBox } from '@/lib/supabase/types';
import type { BoxSelection } from '@/lib/pricing/types';
import { NumberInput } from '@/components/shared/NumberInput';
import { formatMoney } from '@/lib/utils';

interface Props {
  boxes: RateBox[];
  selections: BoxSelection[];
  onChange: (s: BoxSelection[]) => void;
  customerProvidesBoxes: boolean;
}

function getOrDefault(selections: BoxSelection[], box_type: string): BoxSelection {
  return selections.find((s) => s.box_type === box_type) ?? { box_type, packing_qty: 0, sale_qty: 0 };
}

function patch(selections: BoxSelection[], box_type: string, field: 'packing_qty' | 'sale_qty', val: number): BoxSelection[] {
  const existing = getOrDefault(selections, box_type);
  const updated = { ...existing, [field]: Math.max(0, val) };
  const filtered = selections.filter((s) => s.box_type !== box_type);
  if (updated.packing_qty === 0 && updated.sale_qty === 0) return filtered;
  return [...filtered, updated];
}

export function BoxGrid({ boxes, selections, onChange, customerProvidesBoxes }: Props) {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground px-1 pb-1">
        <div>Box type</div>
        <div className="text-center">Pack qty</div>
        {!customerProvidesBoxes && <div className="text-center">Sale qty</div>}
      </div>
      {boxes.map((box) => {
        const sel = getOrDefault(selections, box.box_type);
        return (
          <div key={box.box_type} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-1.5 border-b border-border/30 last:border-0">
            <div>
              <div className="text-sm capitalize">{box.box_type}</div>
              <div className="text-xs text-muted-foreground">
                Pack {formatMoney(box.packing_cost)} · Sale {formatMoney(box.sale_price)}
              </div>
            </div>
            <NumberInput
              value={sel.packing_qty}
              onChange={(n) => onChange(patch(selections, box.box_type, 'packing_qty', n))}
              min={0} className="h-8 text-center px-1"
            />
            {!customerProvidesBoxes && (
              <NumberInput
                value={sel.sale_qty}
                onChange={(n) => onChange(patch(selections, box.box_type, 'sale_qty', n))}
                min={0} className="h-8 text-center px-1"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
