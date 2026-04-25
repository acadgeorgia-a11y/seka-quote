import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { createInvoice } from '@/lib/supabase/queries/invoices';
import { useAgent } from '@/stores/useAgent';
import type { LineItem, Invoice } from '@/lib/supabase/types';
import { InvoicePDFDocument } from './InvoicePDF';

interface Props {
  onClose: () => void;
  onCreated: (inv: Invoice) => void;
}

const emptyLine = (): LineItem => ({ description: '', quantity: 1, unit_price: 0, amount: 0 });

export function InvoiceModal({ onClose, onCreated }: Props) {
  const { agentId } = useAgent();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [taxPct, setTaxPct] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function updateLine(i: number, field: keyof LineItem, raw: string) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[i] } as LineItem;
      if (field === 'description') {
        line.description = raw;
      } else {
        const n = parseFloat(raw) || 0;
        (line as Record<string, unknown>)[field] = n;
        line.amount = (line.quantity ?? 0) * (line.unit_price ?? 0);
      }
      next[i] = line;
      return next;
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const total = subtotal + subtotal * taxPct / 100;

  async function save(andDownload = false) {
    if (!customerName.trim()) {
      toast({ title: 'Customer name required', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const inv = await createInvoice({
        agent_id: agentId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        job_number: jobNumber.trim() || null,
        line_items: lines.filter((l) => l.description.trim()),
        subtotal,
        tax_pct: taxPct,
        total,
        notes: notes.trim() || null,
        status: 'draft',
      });
      toast({ title: `Invoice ${inv.invoice_number} created`, variant: 'success' });
      if (andDownload) await downloadPDF(inv);
      onCreated(inv);
    } catch (e) {
      toast({ title: 'Failed to save', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function downloadPDF(inv: Invoice) {
    const blob = await pdf(<InvoicePDFDocument invoice={inv} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">New Invoice</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Job #</Label>
              <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="JOB-001" />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Description</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide text-center">Qty</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">Unit Price</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">Amount</span>
              <span />
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center">
                  <Input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Moving service" />
                  <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className="text-center" />
                  <Input type="number" min="0" step="0.01" value={line.unit_price || ''} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} placeholder="0.00" className="text-right" />
                  <div className="text-right text-sm font-medium py-2">${line.amount.toFixed(2)}</div>
                  <button type="button" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])} className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="h-4 w-4" /> Add line item
            </button>
          </div>

          {/* Totals + Tax */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="text-muted-foreground">Tax (%)</span>
                <Input type="number" min="0" max="100" value={taxPct || ''} onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)} placeholder="0" className="w-20 text-right h-8" />
              </div>
              <div className="flex justify-between text-base font-semibold border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment terms, thank you message..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>Save Draft</Button>
          <Button onClick={() => save(true)} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
