import { useEffect, useState } from 'react';
import { Plus, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { listContracts, listTemplates } from '@/lib/supabase/queries/contracts';
import type { Contract, ContractTemplate } from '@/lib/supabase/types';
import { ContractSendModal } from './ContractSendModal';
import { TemplateManager } from './TemplateManager';

const statusVariant: Record<string, 'muted' | 'accent' | 'success'> = {
  draft: 'muted',
  sender_signed: 'accent',
  sent: 'accent',
  completed: 'success',
};

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  sender_signed: 'Awaiting Send',
  sent: 'Sent',
  completed: 'Completed',
};

export function ContractList() {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [showSend, setShowSend] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  async function reload() {
    try {
      const [c, t] = await Promise.all([listContracts(), listTemplates()]);
      setContracts(c);
      setTemplates(t);
    } catch (e) {
      toast({ title: 'Load failed', description: (e as Error).message, variant: 'error' });
    }
  }

  useEffect(() => { reload(); }, []);

  function getSigningUrl(token: string) {
    return `${window.location.origin}/sign/${token}`;
  }

  if (!contracts) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Send contracts for electronic signature.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            <FileText className="h-4 w-4" /> Manage Templates
          </Button>
          <Button onClick={() => setShowSend(true)} disabled={templates.filter(t => t.active).length === 0}>
            <Plus className="h-4 w-4" /> New Contract
          </Button>
        </div>
      </div>

      {templates.filter(t => t.active).length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Upload a contract template first to get started.</p>
          <Button className="mt-4" variant="outline" onClick={() => setShowTemplates(true)}>
            Upload Template
          </Button>
        </div>
      )}

      {contracts.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.customer_name}</TableCell>
                <TableCell className="text-muted-foreground">{c.job_number ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[c.status] ?? 'muted'}>{statusLabel[c.status] ?? c.status}</Badge>
                </TableCell>
                <TableCell>
                  {c.sender_signed_at
                    ? <Badge variant="success">Signed</Badge>
                    : <Badge variant="muted">Pending</Badge>}
                </TableCell>
                <TableCell>
                  {c.client_signed_at
                    ? <Badge variant="success">Signed</Badge>
                    : <Badge variant="muted">Pending</Badge>}
                </TableCell>
                <TableCell>
                  {c.status === 'sent' || c.status === 'sender_signed' ? (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(getSigningUrl(c.token)); toast({ title: 'Link copied', variant: 'success' }); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Copy link
                    </button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showSend && (
        <ContractSendModal
          templates={templates.filter(t => t.active)}
          onClose={() => setShowSend(false)}
          onCreated={() => { setShowSend(false); reload(); }}
        />
      )}

      {showTemplates && (
        <TemplateManager
          templates={templates}
          onClose={() => { setShowTemplates(false); reload(); }}
        />
      )}
    </div>
  );
}
