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
  if (!n) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
      {children}
    </div>
  );
}

const PIPELINE_STATUSES = [
  { key: 'booked',  label: 'Booked',  cls: 'bg-green-500/10 text-green-600 dark:text-green-400',  bar: 'bg-green-500' },
  { key: 'pending', label: 'Pending', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',     bar: 'bg-blue-500'  },
  { key: 'lost',    label: 'Lost',    cls: 'bg-red-500/10  text-red-600  dark:text-red-400',       bar: 'bg-red-500'   },
] as const;

export function LeadsDashboard({ leads }: { leads: Lead[] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  // ── core buckets ────────────────────────────────────────────────────────────
  const booked  = leads.filter(l => l.likelihood === 'booked');
  const lost    = leads.filter(l => l.likelihood === 'lost');
  const pending = leads.filter(l => l.likelihood === 'pending');

  const withRev   = leads.filter(l => l.estimated_revenue != null);
  const totalRev  = withRev.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const bookedRev = booked.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const quoteSent = leads.filter(l => l.quote_sent_at != null).length;

  const avgJobValue = withRev.length ? totalRev / withRev.length : 0;

  // ── agent performance ────────────────────────────────────────────────────────
  const agentRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; lost: number; totalRev: number; bookedRev: number; pendingRev: number; lostRev: number }> = {};
    for (const l of leads) {
      const a = l.sales_person ?? 'Unknown';
      if (!m[a]) m[a] = { leads: 0, booked: 0, lost: 0, totalRev: 0, bookedRev: 0, pendingRev: 0, lostRev: 0 };
      const rev = l.estimated_revenue ?? 0;
      m[a].leads++;
      m[a].totalRev += rev;
      if (l.likelihood === 'booked') { m[a].booked++;  m[a].bookedRev  += rev; }
      else if (l.likelihood === 'lost')  { m[a].lost++;    m[a].lostRev    += rev; }
      else                              {                   m[a].pendingRev += rev; }
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // ── referral sources ─────────────────────────────────────────────────────────
  const sourceRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; rev: number }> = {};
    for (const l of leads) {
      const s = l.referral_source ?? 'Unknown';
      if (!m[s]) m[s] = { leads: 0, booked: 0, rev: 0 };
      m[s].leads++;
      m[s].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // ── branch breakdown ─────────────────────────────────────────────────────────
  const branchRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; rev: number }> = {};
    for (const l of leads) {
      const b = l.branch_name ?? 'Unknown';
      if (!m[b]) m[b] = { leads: 0, booked: 0, rev: 0 };
      m[b].leads++;
      m[b].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[b].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // ── service type ─────────────────────────────────────────────────────────────
  const serviceRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; rev: number }> = {};
    for (const l of leads) {
      const s = l.service_type ?? 'Unknown';
      if (!m[s]) m[s] = { leads: 0, booked: 0, rev: 0 };
      m[s].leads++;
      m[s].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  // ── likelihood financial breakdown ────────────────────────────────────────────
  const likelihoodFinancial = useMemo(() => [
    { label: 'Booked',  count: booked.length,  rev: booked.reduce((s, l)  => s + (l.estimated_revenue ?? 0), 0), cls: 'text-green-600 dark:text-green-400' },
    { label: 'Pending', count: pending.length, rev: pending.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0), cls: 'text-blue-600 dark:text-blue-400'  },
    { label: 'Lost',    count: lost.length,    rev: lost.reduce((s, l)    => s + (l.estimated_revenue ?? 0), 0), cls: 'text-red-500'                       },
  ], [booked, pending, lost]);

  // ── date range ───────────────────────────────────────────────────────────────
  const rangeLeads = useMemo(() => {
    if (!startDate && !endDate) return leads;
    return leads.filter(l => {
      if (!l.received_at) return false;
      const d = new Date(l.received_at);
      if (startDate && d < new Date(startDate))              return false;
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

  const rangeBooked = rangeLeads.filter(l => l.likelihood === 'booked').length;

  return (
    <div className="space-y-8">

      {/* ── KEY METRICS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Leads"      value={leads.length} />
        <StatCard
          label="Total Est. Revenue"
          value={<MoneyDisplay value={totalRev} className="text-2xl font-bold" />}
          sub={`avg ${money(avgJobValue)} / job`}
        />
        <StatCard
          label="Quote Sent Rate"
          value={pct(quoteSent, leads.length)}
          sub={`${quoteSent} of ${leads.length}`}
        />
        <StatCard
          label="Booked Rate"
          value={pct(booked.length, leads.length)}
          sub={`${booked.length} booked · ${money(bookedRev)} rev`}
        />
      </div>

      {/* ── CONVERSION PIPELINE ──────────────────────────────────────────────── */}
      <GlassPanel className="p-5">
        <SectionHeader>Conversion Pipeline</SectionHeader>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {PIPELINE_STATUSES.map(s => {
            const count = s.key === 'booked' ? booked.length : s.key === 'lost' ? lost.length : pending.length;
            return (
              <div key={s.key} className={`rounded-xl p-4 text-center ${s.cls}`}>
                <div className="text-2xl font-bold tabular-nums">{count}</div>
                <div className="text-xs font-semibold mt-0.5">{s.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{pct(count, leads.length)}</div>
              </div>
            );
          })}
        </div>
        {/* progress bars */}
        <div className="space-y-2">
          {PIPELINE_STATUSES.map(s => {
            const count = s.key === 'booked' ? booked.length : s.key === 'lost' ? lost.length : pending.length;
            return (
              <div key={s.key} className="flex items-center gap-3 text-xs">
                <span className="w-14 text-muted-foreground font-medium">{s.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${s.bar}`}
                    style={{ width: leads.length ? `${(count / leads.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* ── AGENT FINANCIAL PERFORMANCE ───────────────────────────────────────── */}
      <GlassPanel className="p-5">
        <SectionHeader>Agent Financial Performance</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Agent','Leads','Booked','Lost','Conv%','Total $','Booked $','Pending $','Lost $','Avg Job'].map(h => (
                  <th key={h} className={`pb-2 text-xs font-semibold text-muted-foreground ${h === 'Agent' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentRows.map(([name, d]) => (
                <tr key={name} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                  <td className="py-2 font-medium">{name}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{d.lost}</td>
                  <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                  <td className="py-2 text-right tabular-nums">{money(d.totalRev)}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{money(d.bookedRev)}</td>
                  <td className="py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{money(d.pendingRev)}</td>
                  <td className="py-2 text-right tabular-nums text-red-500">{money(d.lostRev)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{money(d.leads ? d.totalRev / d.leads : 0)}</td>
                </tr>
              ))}
              {/* totals row */}
              <tr className="font-semibold border-t border-border/40">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right tabular-nums">{leads.length}</td>
                <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{booked.length}</td>
                <td className="py-2 text-right tabular-nums text-red-500">{lost.length}</td>
                <td className="py-2 text-right tabular-nums">{pct(booked.length, leads.length)}</td>
                <td className="py-2 text-right tabular-nums">{money(totalRev)}</td>
                <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{money(bookedRev)}</td>
                <td className="py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{money(pending.reduce((s,l)=>s+(l.estimated_revenue??0),0))}</td>
                <td className="py-2 text-right tabular-nums text-red-500">{money(lost.reduce((s,l)=>s+(l.estimated_revenue??0),0))}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{money(avgJobValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ── LIKELIHOOD FINANCIAL BREAKDOWN ───────────────────────────────────── */}
      <GlassPanel className="p-5">
        <SectionHeader>Likelihood Financial Breakdown</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Count</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">% of Total</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Est. Revenue</th>
                <th className="text-right pb-2 text-xs font-semibold text-muted-foreground">Avg Job</th>
              </tr>
            </thead>
            <tbody>
              {likelihoodFinancial.map(row => (
                <tr key={row.label} className="border-b border-border/20">
                  <td className={`py-2 font-semibold ${row.cls}`}>{row.label}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 text-right tabular-nums">{pct(row.count, leads.length)}</td>
                  <td className="py-2 text-right tabular-nums">{money(row.rev)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{money(row.count ? row.rev / row.count : 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t border-border/40">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right tabular-nums">{leads.length}</td>
                <td className="py-2 text-right tabular-nums">100%</td>
                <td className="py-2 text-right tabular-nums">{money(totalRev)}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{money(avgJobValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ── REFERRAL SOURCES ─────────────────────────────────────────────────── */}
      <GlassPanel className="p-5">
        <SectionHeader>Top Referral Sources</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Source','Leads','Booked','Conv%','Total $','Avg Job'].map(h => (
                  <th key={h} className={`pb-2 text-xs font-semibold text-muted-foreground ${h === 'Source' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sourceRows.map(([src, d]) => (
                <tr key={src} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                  <td className="py-2 font-medium">{src}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                  <td className="py-2 text-right tabular-nums">{money(d.rev)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{money(d.leads ? d.rev / d.leads : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ── BRANCH BREAKDOWN ─────────────────────────────────────────────────── */}
      {branchRows.length > 0 && (
        <GlassPanel className="p-5">
          <SectionHeader>Leads by Branch</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {['Branch','Leads','Booked','Conv%','Total $'].map(h => (
                    <th key={h} className={`pb-2 text-xs font-semibold text-muted-foreground ${h === 'Branch' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchRows.map(([branch, d]) => (
                  <tr key={branch} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 font-medium">{branch}</td>
                    <td className="py-2 text-right tabular-nums">{d.leads}</td>
                    <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                    <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                    <td className="py-2 text-right tabular-nums">{money(d.rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* ── SERVICE TYPE ─────────────────────────────────────────────────────── */}
      {serviceRows.length > 0 && (
        <GlassPanel className="p-5">
          <SectionHeader>Leads by Service Type</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {['Service Type','Leads','Booked','Conv%','Total $','Avg Job'].map(h => (
                    <th key={h} className={`pb-2 text-xs font-semibold text-muted-foreground ${h === 'Service Type' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceRows.map(([svc, d]) => (
                  <tr key={svc} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 font-medium">{svc}</td>
                    <td className="py-2 text-right tabular-nums">{d.leads}</td>
                    <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                    <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                    <td className="py-2 text-right tabular-nums">{money(d.rev)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{money(d.leads ? d.rev / d.leads : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* ── DATE RANGE CONVERSION ANALYSIS ───────────────────────────────────── */}
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <SectionHeader>Date Range Conversion Analysis</SectionHeader>
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
        <div className="text-xs text-muted-foreground mb-3">
          {rangeLeads.length} leads · {rangeBooked} booked · {pct(rangeBooked, rangeLeads.length)} conv rate
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Referral Source','# Leads','# Booked','Conv %'].map(h => (
                  <th key={h} className={`pb-2 text-xs font-semibold text-muted-foreground ${h === 'Referral Source' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rangeBySource.map(([src, d]) => (
                <tr key={src} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                  <td className="py-2 font-medium">{src}</td>
                  <td className="py-2 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{d.booked}</td>
                  <td className="py-2 text-right tabular-nums">{pct(d.booked, d.leads)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t border-border/40">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right tabular-nums">{rangeLeads.length}</td>
                <td className="py-2 text-right tabular-nums text-green-600 dark:text-green-400">{rangeBooked}</td>
                <td className="py-2 text-right tabular-nums">{pct(rangeBooked, rangeLeads.length)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>

    </div>
  );
}
