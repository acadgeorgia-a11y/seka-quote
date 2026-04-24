import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value: number;
  onChange: (v: number) => void;
  cap: number;
}

export function DiscountInput({ value, onChange, cap }: Props) {
  const overCap = value > cap;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">Discount (%)</Label>
      <Input
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        className="w-28 tabular-nums"
        placeholder="0"
      />
      {overCap && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Over {cap}% cap — flagged for owner review
        </div>
      )}
    </div>
  );
}
