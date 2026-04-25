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
  const [pages, setPages] = useState<string[]>([]);
  const [adding, setAdding] = useState<AddingType>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp } as unknown as Parameters<typeof page.render>[0]).promise;
        rendered.push(canvas.toDataURL());
      }
      setPages(rendered);
    }
    render().catch(console.error);
  }, [pdfUrl]);

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>, pageIndex: number) {
    if (!adding || dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const field: SignatureField = {
      id: crypto.randomUUID(),
      type: adding,
      page: pageIndex + 1,
      x,
      y,
      width: 22,
      height: 7,
    };
    onChange([...fields, field]);
    setAdding(null);
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    const field = fields.find(f => f.id === id);
    if (!field) return;
    dragging.current = { id, startX: e.clientX, startY: e.clientY, origX: field.x, origY: field.y };

    function onMove(ev: MouseEvent) {
      if (!dragging.current || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragging.current.startX) / rect.width) * 100;
      const dy = ((ev.clientY - dragging.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(78, dragging.current.origX + dx));
      const newY = Math.max(0, Math.min(93, dragging.current.origY + dy));
      onChange(fields.map(f => f.id === dragging.current!.id ? { ...f, x: newX, y: newY } : f));
    }

    function onUp() {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
        {!adding && fields.length > 0 && <span className="text-sm text-muted-foreground">Drag fields to reposition</span>}
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

      <div className="relative border rounded-xl overflow-hidden" style={{ cursor: adding ? 'crosshair' : 'default' }}>
        {pages.map((dataUrl, pageIndex) => (
          pageIndex + 1 === currentPage && (
            <div key={pageIndex} ref={pageRef} className="relative select-none" onClick={(e) => handlePageClick(e, pageIndex)}>
              <img src={dataUrl} alt={`Page ${pageIndex + 1}`} className="w-full block" draggable={false} />
              {fields.filter((f) => f.page === pageIndex + 1).map((f) => (
                <div
                  key={f.id}
                  style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, cursor: 'grab' }}
                  className={cn('absolute border-2 rounded flex items-center justify-between px-1 text-xs font-medium shadow-sm',
                    f.type === 'sender' ? 'border-blue-500 bg-blue-500/10 text-blue-700' : 'border-emerald-500 bg-emerald-500/10 text-emerald-700')}
                  onMouseDown={(e) => startDrag(e, f.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{f.type === 'sender' ? 'Sender' : 'Client'}</span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                    className="hover:opacity-70 ml-1"
                  >
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
