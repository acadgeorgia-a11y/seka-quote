import { useEffect, useRef } from 'react';
import SignaturePadLib from 'signature_pad';
import { Button } from '@/components/ui/button';

interface Props {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  label?: string;
}

export function SignaturePad({ onSave, onCancel, label = 'Draw your signature' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    padRef.current = new SignaturePadLib(canvas, { penColor: '#171717' });
    return () => padRef.current?.off();
  }, []);

  function handleSave() {
    if (!padRef.current || padRef.current.isEmpty()) return;
    onSave(padRef.current.toDataURL('image/png'));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="border rounded-xl bg-secondary/20 relative">
        <canvas ref={canvasRef} className="w-full h-40 rounded-xl cursor-crosshair" />
        <div className="absolute bottom-2 left-3 text-xs text-muted-foreground pointer-events-none select-none">Sign here</div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => padRef.current?.clear()}>Clear</Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave}>Save Signature</Button>
      </div>
    </div>
  );
}
