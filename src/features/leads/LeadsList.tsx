import { useState, useMemo, useRef, useEffect } from 'react';
import type { Lead, LeadLikelihood } from '@/lib/supabase/types';
import { updateLeadSource } from '@/lib/supabase/queries/leads';

const LIKELIHOOD_LABEL: Record<LeadLikelihood, string> = {
  booked:  'Booked',
  lost:    'Lost',
  pending: 'Pending',
};
const LIKELIHOOD_STYLE: Record<LeadLikelihood, string> = {
  booked:  'bg-green-500/10 text-green-600 dark:text-green-400',
  lost:    'bg-red-500/10 text-red-500',
  pending: 'bg-blue-500/10 text-blue-500',
};

function normalizeSource(raw: string | null): string {
  const s = (raw ?? 'Unknown').trim();
  if (/^google/i.test(s)) return 'Google Search';
  return s;
}

function fmt(val: string | null, type: 'date' | 'money' | 'text' = 'text') {
  if (!val && type !== 'money') return '—';
  if (type === 'date' && val) {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }
  if (type === 'money') {
    const n = typeof val === 'number' ? val : parseFloat(val ?? '');
    if (isNaN(n)) return '—';
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return val ?? '—';
}

const KNOWN_SOURCES = [
  'Google Search',
  'Referral - Customer',
  'Referral - Broker/Realtor',
  'Repeat Customer',
  'Thumbtack',
  'Yelp',
  'Facebook',
  'Instagram',
  'Other',
  'Email',
  'Postcard',
  'Saw a Truck',
];

function SourceCell({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, source: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(normalizeSource(lead.referral_source));
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === normalizeSource(lead.referral_source)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateLeadSource(lead.id, trimmed);
      onUpdate(lead.id, trimmed);
    } catch { /* silent — value reverts */ }
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[160px]">
        <input
          ref={inputRef}
          list="source-options"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="h-7 w-full px-2 rounded-lg border border-accent/50 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <datalist id="source-options">
          {KNOWN_SOURCES.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setValue(normalizeSource(lead.referral_source)); setEditing(true); }}
      disabled={saving}
      className="text-left whitespace-nowrap hover:text-accent hover:underline underline-offset-2 transition-colors disabled:opacity-50"
      title="Click to edit"
    >
      {saving ? '…' : normalizeSource(lead.referral_source)}
    </button>
  );
}

export function LeadsList({ leads: initialLeads, onLeadsChange }: { leads: Lead[]; onLeadsChange?: (leads: Lead[]) => void }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  useEffect(() => { setLeads(initialLeads); }, [initialLeads]);

  function handleSourceUpdate(id: string, newSource: string) {
    const updated = leads.map(l => l.id === id ? { ...l, referral_source: newSource } : l);
    setLeads(updated);
    onLeadsChange?.(updated);
  }
  const [search, setSearch]       = useState('');
  const [agent, setAgent]         = useState('');
  const [status, setStatus]       = useState<LeadLikelihood | ''>('');
  const [source, setSource]       = useState('');

  const agents  = useMemo(() => [...new Set(leads.map(l => l.sales_person).filter(Boolean))].sort() as string[], [leads]);
  const sources = useMemo(() => [...new Set(leads.map(l => normalizeSource(l.referral_source)))].sort(), [leads]);

  const filtered = useMemo(() => leads.filter(l => {
    if (agent  && l.sales_person    !== agent)  return false;
    if (status && l.likelihood      !== status) return false;
    if (source && normalizeSource(l.referral_source) !== source) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.quote_number.toLowerCase().includes(q) ||
        (l.sales_person ?? '').toLowerCase().includes(q) ||
        (l.referral_source ?? '').toLowerCase().includes(q) ||
        (l.status_raw ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [leads, agent, status, source, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search quote #, agent, source…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border/50 bg-card text-sm w-56 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <select
          value={agent}
          onChange={e => setAgent(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All agents</option>
          {agents.map(a => <option key={a} value={a!}>{a}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as LeadLikelihood | '')}
          className="h-9 px-3 rounded-lg border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          <option value="booked">Booked</option>
          <option value="pending">Pending</option>
          <option value="lost">Lost</option>
        </select>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All sources</option>
          {sources.map(s => <option key={s} value={s!}>{s}</option>)}
        </select>
        <span className="ml-auto self-center text-xs text-muted-foreground">{filtered.length} leads</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/30">
              {['Quote #', 'Agent', 'Source', 'Service', 'Received', 'Svc Date', 'Revenue', 'Status'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                <td className="px-3 py-2.5 font-mono text-xs font-medium">{l.quote_number}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{l.sales_person ?? '—'}</td>
                <td className="px-3 py-2.5"><SourceCell lead={l} onUpdate={handleSourceUpdate} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{l.service_type ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmt(l.received_at, 'date')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmt(l.service_date, 'date')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium">{l.estimated_revenue != null ? fmt(String(l.estimated_revenue), 'money') : '—'}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${LIKELIHOOD_STYLE[l.likelihood]}`}>
                    {LIKELIHOOD_LABEL[l.likelihood]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">No leads match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
