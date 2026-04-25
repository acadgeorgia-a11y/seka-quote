import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import type { SignatureField } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  pdfUrl: string;
  fields: SignatureField[];
  onChange: (fields: SignatureField[]) => void;
}

type AddingType = 'sender' | 'client' | null;

export function PDFFieldPlacer({ pdfUrl, fields, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [adding, setAdding] = useState<AddingType>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function render() {
      const doc = await pdfjs.getDocument(pdfUrl).promise;
      const rendered: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d')! as never, viewport: vp }).promise;
        rendered.push(canvas.toDataURL());
      }
      setPages(rendered);
    }
    render().catch(console.error);
  }, [pdfUrl]);

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>, pageIndex: number) {
    if (!adding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const field: SignatureField = {
      id: crypto.randomUUID(),
      type: adding,
      page: pageIndex + 1,
      x,
      y,
      width: 20,
      height: 6,
    };
    onChange([...fields, field]);
    setAdding(null);
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  if (pages.length === 0) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading PDF…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Add field:</span>
        <button
          type="button"
          onClick={() => setAdding(adding === 'sender' ? null : 'sender')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors', adding === 'sender' ? 'bg-blue-500 text-white border-blue-500' : 'border-input hover:bg-secondary')}
        >
          Sender signature
        </button>
        <button
          type="button"
          onClick={() => setAdding(adding === 'client' ? null : 'client')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors', adding === 'client' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-input hover:bg-secondary')}
        >
          Client signature
        </button>
        {adding && <span className="text-sm text-muted-foreground animate-pulse">Click on the PDF to place the field</span>}
      </div>

      {pages.length > 1 && (
        <div className="flex gap-1">
          {pages.map((_, i) => (
            <button key={i} type="button" onClick={() => setCurrentPage(i + 1)}
              className={cn('px-3 py-1 rounded-md text-sm', currentPage === i + 1 ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground')}>
              Page {i + 1}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative border rounded-xl overflow-hidden" style={{ cursor: adding ? 'crosshair' : 'default' }}>
        {pages.map((dataUrl, pageIndex) => (
          pageIndex + 1 === currentPage && (
            <div key={pageIndex} className="relative" onClick={(e) => handlePageClick(e, pageIndex)}>
              <img src={dataUrl} alt={`Page ${pageIndex + 1}`} className="w-full block" draggable={false} />
              {fields.filter((f) => f.page === pageIndex + 1).map((f) => (
                <div
                  key={f.id}
                  style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%` }}
                  className={cn('absolute border-2 rounded flex items-center justify-between px-1 text-xs font-medium',
                    f.type === 'sender' ? 'border-blue-500 bg-blue-500/10 text-blue-700' : 'border-emerald-500 bg-emerald-500/10 text-emerald-700')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{f.type === 'sender' ? 'Sender' : 'Client'}</span>
                  <button type="button" onClick={() => removeField(f.id)} className="hover:opacity-70">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )
        ))}
      </div>

      {fields.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {fields.length} field{fields.length !== 1 ? 's' : ''} placed
          {fields.filter(f => f.type === 'sender').length > 0 && ` · ${fields.filter(f => f.type === 'sender').length} sender`}
          {fields.filter(f => f.type === 'client').length > 0 && ` · ${fields.filter(f => f.type === 'client').length} client`}
        </div>
      )}
    </div>
  );
}
