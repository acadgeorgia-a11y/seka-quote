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
  const pageRef = useRef<HTMLDivElement>(null);
  const interacting = useRef(false);

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
    if (!adding || interacting.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange([...fields, {
      id: crypto.randomUUID(),
      type: adding,
      page: pageIndex + 1,
      x, y,
      width: 22,
      height: 7,
    }]);
    setAdding(null);
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    interacting.current = true;
    const field = fields.find(f => f.id === id)!;
    const startX = e.clientX, startY = e.clientY;
    const origX = field.x, origY = field.y;

    function onMove(ev: MouseEvent) {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      onChange(fields.map(f => f.id === id ? {
        ...f,
        x: Math.max(0, Math.min(100 - f.width, origX + dx)),
        y: Math.max(0, Math.min(100 - f.height, origY + dy)),
      } : f));
    }
    function onUp() {
      interacting.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startResize(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    interacting.current = true;
    const field = fields.find(f => f.id === id)!;
    const startX = e.clientX, startY = e.clientY;
    const origW = field.width, origH = field.height;

    function onMove(ev: MouseEvent) {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dw = ((ev.clientX - startX) / rect.width) * 100;
      const dh = ((ev.clientY - startY) / rect.height) * 100;
      onChange(fields.map(f => f.id === id ? {
        ...f,
        width: Math.max(10, Math.min(100 - f.x, origW + dw)),
        height: Math.max(4, Math.min(100 - f.y, origH + dh)),
      } : f));
    }
    function onUp() {
      interacting.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function removeField(id: string) {
    onChange(fields.filter(f => f.id !== id));
  }

  if (pages.length === 0) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading PDF…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Add field:</span>
        <button type="button" onClick={() => setAdding(adding === 'sender' ? null : 'sender')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors', adding === 'sender' ? 'bg-blue-500 text-white border-blue-500' : 'border-input hover:bg-secondary')}>
          Sender signature
        </button>
        <button type="button" onClick={() => setAdding(adding === 'client' ? null : 'client')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors', adding === 'client' ? 'bg-emerald-500 text-white border-emerald-500' : 'border-input hover:bg-secondary')}>
          Client signature
        </button>
        {adding && <span className="text-sm text-muted-foreground animate-pulse">Click on the PDF to place</span>}
        {!adding && fields.length > 0 && <span className="text-sm text-muted-foreground">Drag to move · drag corner to resize</span>}
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
              {fields.filter(f => f.page === pageIndex + 1).map(f => (
                <div
                  key={f.id}
                  style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, cursor: 'grab' }}
                  className={cn('absolute border-2 rounded flex items-center justify-between px-1 text-xs font-medium shadow-sm',
                    f.type === 'sender' ? 'border-blue-500 bg-blue-500/10 text-blue-700' : 'border-emerald-500 bg-emerald-500/10 text-emerald-700')}
                  onMouseDown={(e) => startDrag(e, f.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{f.type === 'sender' ? 'Sender' : 'Client'}</span>
                  <button type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                    className="hover:opacity-70 ml-1 shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {/* Resize handle */}
                  <div
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, cursor: 'se-resize' }}
                    className={cn('rounded-tl', f.type === 'sender' ? 'bg-blue-500' : 'bg-emerald-500')}
                    onMouseDown={(e) => startResize(e, f.id)}
                  />
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
