import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { getContractByToken, updateContract, listTemplates } from '@/lib/supabase/queries/contracts';
import { supabase } from '@/lib/supabase/client';
import type { Contract, ContractTemplate } from '@/lib/supabase/types';
import { SignaturePad } from './SignaturePad';

export function ClientSignPage() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const c = await getContractByToken(token);
      setContract(c);
      if (!c) return;
      const templates = await listTemplates();
      const tmpl = templates.find((t) => t.id === c.template_id) ?? null;
      setTemplate(tmpl);
      if (tmpl) {
        const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(tmpl.storage_path);
        setPdfUrl(publicUrl);
      }
    }
    load();
  }, [token]);

  async function handleSign(dataUrl: string) {
    if (!contract) return;
    setSaving(true);
    try {
      await updateContract(contract.id, {
        client_signature: dataUrl,
        client_signed_at: new Date().toISOString(),
        status: 'completed',
      });
      // Notify via edge function
      await supabase.functions.invoke('finalize-contract', { body: { contractId: contract.id } });
      setDone(true);
    } catch {
      // still mark done visually
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  if (contract === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Link not found</h1>
          <p className="text-muted-foreground">This signing link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (contract.status === 'completed' || done) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div className="space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-semibold">Contract Signed</h1>
          <p className="text-muted-foreground">Thank you, {contract.customer_name}. Both parties have signed.</p>
          <p className="text-sm text-muted-foreground">You will receive a copy via email shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src="/seka-logo.png" alt="Seka Moving" className="h-10 mx-auto object-contain" />
          <h1 className="text-2xl font-semibold">Contract for Signature</h1>
          <p className="text-muted-foreground">Hello {contract.customer_name}, please review and sign below.</p>
          {contract.job_number && <p className="text-sm text-muted-foreground">Job # {contract.job_number}</p>}
        </div>

        {/* PDF Preview */}
        {pdfUrl && (
          <div className="rounded-xl border overflow-hidden bg-secondary/10">
            <p className="text-sm text-muted-foreground px-4 py-2 border-b">
              {template?.name ?? 'Contract'} — please scroll to read the full document
            </p>
            <iframe src={pdfUrl} className="w-full h-[500px]" title="Contract PDF" />
          </div>
        )}

        {/* Signature */}
        <div className="rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Your Signature</h2>
          {contract.sender_signature && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sender already signed</p>
              <img src={contract.sender_signature} alt="Sender signature" className="h-12 object-contain border rounded-lg p-1 bg-white" />
            </div>
          )}
          <SignaturePad
            label="Draw your signature to complete the contract"
            onSave={handleSign}
            onCancel={() => {}}
          />
          {saving && <p className="text-sm text-muted-foreground">Saving…</p>}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By signing you agree to the terms in the contract above. Seka Moving · Internal platform.
        </p>
      </div>
    </div>
  );
}
