import { useEffect, useState } from 'react';
import { Plus, Download, Send } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { listInvoices, updateInvoiceStatus } from '@/lib/supabase/queries/invoices';
import type { Invoice } from '@/lib/supabase/types';
import { InvoiceModal } from './InvoiceModal';
import { InvoicePDFDocument } from './InvoicePDF';

const statusVariant: Record<string, 'muted' | 'accent' | 'success'> = {
  draft: 'muted',
  sent: 'accent',
  paid: 'success',
};

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  async function reload() {
    try { setInvoices(await listInvoices()); }
    catch (e) { toast({ title: 'Load failed', description: (e as Error).message, variant: 'error' }); }
  }

  useEffect(() => { reload(); }, []);

  async function downloadPDF(inv: Invoice) {
    const blob = await pdf(<InvoicePDFDocument invoice={inv} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendInvoice(inv: Invoice) {
    if (!inv.customer_email) {
      toast({ title: 'No email on file', variant: 'error' });
      return;
    }
    setSending(inv.id);
    try {
      const blob = await pdf(<InvoicePDFDocument invoice={inv} />).toBlob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { error } = await (await import('@/lib/supabase/client')).supabase.functions.invoke('send-invoice', {
          body: { invoice: inv, pdfBase64: base64 },
        });
        if (error) throw new Error(error.message);
        await updateInvoiceStatus(inv.id, 'sent');
        toast({ title: `Invoice sent to ${inv.customer_email}`, variant: 'success' });
        reload();
        setSending(null);
      };
    } catch (e) {
      toast({ title: 'Send failed', description: (e as Error).message, variant: 'error' });
      setSending(null);
    }
  }

  if (!invoices) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and send invoices to customers.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">No invoices yet.</p>
          <Button className="mt-4" onClick={() => setShowModal(true)}>Create your first invoice</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                <TableCell>{inv.customer_name}</TableCell>
                <TableCell className="text-muted-foreground">{inv.job_number ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </TableCell>
                <TableCell className="font-medium">${inv.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[inv.status] ?? 'muted'}>{inv.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => downloadPDF(inv)} title="Download PDF" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                    {inv.status !== 'paid' && (
                      <button type="button" onClick={() => sendInvoice(inv)} disabled={sending === inv.id} title="Send to customer" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {inv.status === 'sent' && (
                      <button type="button" onClick={() => { updateInvoiceStatus(inv.id, 'paid').then(reload); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xs font-medium">
                        ✓ Paid
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showModal && (
        <InvoiceModal
          onClose={() => setShowModal(false)}
          onCreated={(inv) => { setShowModal(false); setInvoices((p) => [inv, ...(p ?? [])]); }}
        />
      )}
    </div>
  );
}
