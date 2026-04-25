import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { createContract, updateContract } from '@/lib/supabase/queries/contracts';
import { supabase } from '@/lib/supabase/client';
import { useAgent } from '@/stores/useAgent';
import type { ContractTemplate } from '@/lib/supabase/types';

interface Props {
  templates: ContractTemplate[];
  onClose: () => void;
  onCreated: () => void;
}

export function ContractSendModal({ templates, onClose, onCreated }: Props) {
  const { agentId } = useAgent();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    if (!customerName.trim() || !customerEmail.trim()) {
      toast({ title: 'Customer name and email required', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const contract = await createContract({
        template_id: templateId,
        agent_id: agentId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        job_number: jobNumber.trim() || null,
        notes: notes.trim() || null,
        sender_signature: null,
        sender_signed_at: null,
        client_signature: null,
        client_signed_at: null,
        status: 'sent',
        signed_pdf_path: null,
      });

      const { data } = await supabase.from('contracts' as never).select('token').eq('id', contract.id).single() as { data: { token: string } | null };
      const token = data?.token;

      if (token) {
        const url = `${window.location.origin}/sign/${token}`;
        setSigningUrl(url);

        await supabase.functions.invoke('send-contract', {
          body: { customerEmail: customerEmail.trim(), customerName: customerName.trim(), signingUrl: url, jobNumber: jobNumber || null },
        });

        await updateContract(contract.id, { status: 'sent' });
      }

      onCreated();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!signingUrl) return;
    navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied!', variant: 'success' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {signingUrl ? 'Share Signing Link' : 'Send Contract'}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!signingUrl ? (
            <>
              {templates.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Template</Label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Customer Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Customer Email *</Label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Job #</Label>
                <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="JOB-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={send} disabled={saving}>
                  {saving ? 'Sending…' : 'Send to Customer'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this link and send it to <strong>{customerName}</strong> — they can open it on any device to sign.
              </p>
              <div className="p-3 rounded-xl bg-secondary text-sm font-mono break-all">
                {signingUrl}
              </div>
              <div className="flex gap-2">
                <Button onClick={copyLink} className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" onClick={onClose}>Done</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                An email was also sent to {customerEmail} with this link.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
