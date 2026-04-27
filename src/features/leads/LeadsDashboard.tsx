import { useMemo, useState } from 'react';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import type { Lead } from '@/lib/supabase/types';

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <GlassPanel className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </GlassPanel>
  );
}

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function LeadsDashboard({ leads }: { leads: Lead[] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const booked  = leads.filter(l => l.likelihood === 'booked');
  const lost    = leads.filter(l => l.likelihood === 'lost');
  const pending = leads.filter(l => l.likelihood === 'pending');
  const withRev = leads.filter(l => l.estimated_revenue != null);
  const totalRev = withRev.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const quoteSent = leads.filter(l => l.quote_sent_at != null).length;

  // By agent
  const agentMap = useMemo(() => {
    const m: Record<string, { leads: number; rev: number; booked: number; lost: number }> = {};
    for (const l of leads) {
      const a = l.sales_person ?? 'Unknown';
      if (!m[a]) m[a] = { leads: 0, rev: 0, booked: 0, lost: 0 };
      m[a].leads++;
      m[a].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[a].booked++;
      if (l.likelihood === 'lost')   m[a].lost++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // By referral source
  const sourceMap = useMemo(() => {
    const m: Record<string, { leads: number; rev: number; booked: number }> = {};
    for (const l of leads) {
      const s = l.referral_source ?? 'Unknown';
      if (!m[s]) m[s] = { leads: 0, rev: 0, booked: 0 };
      m[s].leads++;
      m[s].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // Date-range conversion
  const rangeLeads = useMemo(() => {
    if (!startDate && !endDate) return leads;
    return leads.filter(l => {
      if (!l.received_at) return false;
      const d = new Date(l.received_at);
      if (startDate && d < new Date(startDate)) return false;
      if (endDate   && d > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [leads, startDate, endDate]);

  const rangeBySource = useMemo(() => {
    const m: Record<string, { leads: number; booked: number }> = {};
    for (const l of rangeLeads) {
      const s = l.referral_source ?? 'Unknown';
      if (!m[s]) m[s] = { leads: 0, booked: 0 };
      m[s].leads++;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [rangeLeads]);

  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Leads"    value={leads.length} />
        <StatCard label="Total Est. Value" value={<MoneyDisplay value={totalRev} className="text-2xl font-bold" />} />
        <StatCard label="Quote Sent Rate" value={pct(quoteSent, leads.length)} sub={`${quoteSent} of ${leads.length}`} />
        <StatCard label="Booked Rate"    value={pct(booked.length, leads.length)} sub={`${booked.length} booked`} />
      </div>

      {/* Conversion pipeline */}
      <GlassPanel className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Conversion Pipeline</div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Booked',  count: booked.length,  cls: 'bg-green-500/10 text-green-600 dark:text-green-400' },
            { label: 'Pending', count: pending.length,  cls: 'bg-blue-500/10 text-blue-500' },
            { label: 'Lost',    count: lost.length,     cls: 'bg-red-500/10 text-red-500' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 text-center ${s.cls}`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        {/* By agent */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Agent</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Leads</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Booked</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Lost</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Pending</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Total $</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Avg Job</th>
              </tr>
            </thead>
            <tbody>
              {agentMap.map(([name, d]) => (
                <tr key={name} className="border-b border-border/20">
                  <td className="py-2 font-medium">{name}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{d.lost}</td>
                  <td className="py-2 text-right tabular-nums text-blue-500">{d.leads - d.booked - d.lost}</td>
                  <td className="py-2 text-right tabular-nums">{money(d.rev)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{d.leads ? money(d.rev / d.leads) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Referral sources */}
      <GlassPanel className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Referral Sources</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Source</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Leads</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Booked</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Conv %</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Total $</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Avg Job</th>
              </tr>
            </thead>
            <tbody>
              {sourceMap.map(([src, d]) => (
                <tr key={src} className="border-b border-border/20">
                  <td className="py-2 font-medium">{src}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                  <td className="py-2 text-right tabular-nums">{money(d.rev)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{d.leads ? money(d.rev / d.leads) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Date range conversion */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Range Analysis</div>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border/50 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border/50 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
            {(startDate || endDate) && (
              <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-3">{rangeLeads.length} leads in range</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Source</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground"># Leads</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground"># Booked</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {rangeBySource.map(([src, d]) => (
                <tr key={src} className="border-b border-border/20">
                  <td className="py-2 font-medium">{src}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right tabular-nums">{rangeLeads.length}</td>
                <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                  {rangeLeads.filter(l => l.likelihood === 'booked').length}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {pct(rangeLeads.filter(l => l.likelihood === 'booked').length, rangeLeads.length)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
