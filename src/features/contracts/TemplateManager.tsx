import { useRef, useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase/client';
import { createTemplate, updateTemplate } from '@/lib/supabase/queries/contracts';
import type { ContractTemplate, SignatureField } from '@/lib/supabase/types';
import { PDFFieldPlacer } from './PDFFieldPlacer';

interface Props {
  templates: ContractTemplate[];
  onClose: () => void;
}

export function TemplateManager({ templates, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedTemplate, setUploadedTemplate] = useState<ContractTemplate | null>(null);
  const [fields, setFields] = useState<SignatureField[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savingFields, setSavingFields] = useState(false);

  async function handleUpload(file: File) {
    if (!name.trim()) { toast({ title: 'Enter a template name first', variant: 'error' }); return; }
    setUploading(true);
    try {
      const path = `templates/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(path);
      const tmpl = await createTemplate({ name: name.trim(), storage_path: path, signature_fields: [], active: true });
      setUploadedTemplate(tmpl);
      setPdfUrl(publicUrl);
      setFields([]);
      toast({ title: 'Template uploaded', variant: 'success' });
    } catch (e) {
      toast({ title: 'Upload failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function saveFields() {
    if (!uploadedTemplate) return;
    setSavingFields(true);
    try {
      await updateTemplate(uploadedTemplate.id, { signature_fields: fields });
      toast({ title: 'Signature fields saved', variant: 'success' });
      setUploadedTemplate(null);
      setPdfUrl(null);
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'error' });
    } finally {
      setSavingFields(false);
    }
  }

  async function deactivate(id: string) {
    try {
      await updateTemplate(id, { active: false });
      toast({ title: 'Template removed', variant: 'success' });
      onClose();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'error' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Contract Templates</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Existing templates */}
          {templates.filter(t => t.active).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Active Templates</h3>
              {templates.filter(t => t.active).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.signature_fields.length} signature field{t.signature_fields.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button type="button" onClick={() => deactivate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload new */}
          {!uploadedTemplate && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Upload New Template</h3>
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Moving Contract 2026" />
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Choose PDF'}
              </Button>
            </div>
          )}

          {/* Field placement */}
          {uploadedTemplate && pdfUrl && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Place Signature Fields — {uploadedTemplate.name}</h3>
              <PDFFieldPlacer pdfUrl={pdfUrl} fields={fields} onChange={setFields} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setUploadedTemplate(null); setPdfUrl(null); }}>Cancel</Button>
                <Button onClick={saveFields} disabled={savingFields || fields.length === 0}>
                  {savingFields ? 'Saving…' : 'Save Fields'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
