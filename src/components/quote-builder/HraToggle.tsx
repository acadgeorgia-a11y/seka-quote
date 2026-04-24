import { AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function HraToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${
        checked ? 'border-destructive/40 bg-destructive/5' : 'border-border/60'
      }`}
    >
      <div className="space-y-0.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle className={`h-3.5 w-3.5 ${checked ? 'text-destructive' : 'text-muted-foreground'}`} />
          HRA (Holiday / Rush / After-hours)
        </Label>
        <div className="text-xs text-muted-foreground">Final total × 2 — applied last</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
