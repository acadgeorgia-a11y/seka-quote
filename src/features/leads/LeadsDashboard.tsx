import { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Send, CheckCircle } from 'lucide-react';
import type { Lead } from '@/lib/supabase/types';

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${Math.round((n / d) * 100)}%`;
}

function money(n: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function moneyFull(n: number) {
  if (!n) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function normalizeSource(raw: string | null): string {
  const s = (raw ?? 'Unknown').trim();
  if (/^google/i.test(s)) return 'Google Search';
  return s;
}

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-0.5">{label}</div>
        <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function Badge({ status }: { status: 'booked' | 'pending' | 'lost' }) {
  const cfg = {
    booked:  { label: 'Booked',  cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20' },
    pending: { label: 'Pending', cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20' },
    lost:    { label: 'Lost',    cls: 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20' },
  }[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function BarCell({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className="tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

function PctCell({ value, max }: { value: number; max: number }) {
  const p = max ? Math.round((value / max) * 100) : 0;
  const color = p >= 40 ? 'text-emerald-600 dark:text-emerald-400' : p >= 20 ? 'text-amber-500' : 'text-rose-500';
  return <span className={`tabular-nums font-semibold ${color}`}>{p}%</span>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/30 bg-secondary/20">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

export function LeadsDashboard({ leads }: { leads: Lead[] }) {
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const booked  = leads.filter(l => l.likelihood === 'booked');
  const lost    = leads.filter(l => l.likelihood === 'lost');
  const pending = leads.filter(l => l.likelihood === 'pending');

  const withRev    = leads.filter(l => l.estimated_revenue != null);
  const totalRev   = withRev.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const bookedRev  = booked.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const pendingRev = pending.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const lostRev    = lost.reduce((s, l) => s + (l.estimated_revenue ?? 0), 0);
  const quoteSent  = leads.filter(l => l.quote_sent_at != null).length;
  const avgJob     = withRev.length ? totalRev / withRev.length : 0;

  const agentRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; lost: number; totalRev: number; bookedRev: number; pendingRev: number; lostRev: number }> = {};
    for (const l of leads) {
      const a = l.sales_person ?? 'Unknown';
      if (!m[a]) m[a] = { leads: 0, booked: 0, lost: 0, totalRev: 0, bookedRev: 0, pendingRev: 0, lostRev: 0 };
      const rev = l.estimated_revenue ?? 0;
      m[a].leads++;
      m[a].totalRev += rev;
      if (l.likelihood === 'booked')      { m[a].booked++;  m[a].bookedRev  += rev; }
      else if (l.likelihood === 'lost')   { m[a].lost++;    m[a].lostRev    += rev; }
      else                                {                  m[a].pendingRev += rev; }
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  const sourceRows = useMemo(() => {
    const m: Record<string, { leads: number; booked: number; rev: number }> = {};
    for (const l of leads) {
      const s = normalizeSource(l.referral_source);
      if (!m[s]) m[s] = { leads: 0, booked: 0, rev: 0 };
      m[s].leads++;
      m[s].rev += l.estimated_revenue ?? 0;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [leads]);

  const maxSourceLeads = sourceRows[0]?.[1].leads ?? 1;

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
      const s = normalizeSource(l.referral_source);
      if (!m[s]) m[s] = { leads: 0, booked: 0 };
      m[s].leads++;
      if (l.likelihood === 'booked') m[s].booked++;
    }
    return Object.entries(m).sort((a, b) => b[1].leads - a[1].leads);
  }, [rangeLeads]);

  const rangeBooked = rangeLeads.filter(l => l.likelihood === 'booked').length;
  const maxAgentLeads = agentRows[0]?.[1].leads ?? 1;

  return (
    <div className="space-y-6">

      {/* ── KEY METRICS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Leads" value={leads.length}
          sub={`${quoteSent} quotes sent`}
          icon={TrendingUp} accent="bg-violet-500/10 text-violet-500"
        />
        <MetricCard
          label="Est. Revenue" value={money(totalRev)}
          sub={`avg ${money(avgJob)} / job`}
          icon={DollarSign} accent="bg-emerald-500/10 text-emerald-500"
        />
        <MetricCard
          label="Quote Sent" value={pct(quoteSent, leads.length)}
          sub={`${quoteSent} of ${leads.length}`}
          icon={Send} accent="bg-sky-500/10 text-sky-500"
        />
        <MetricCard
          label="Booked Rate" value={pct(booked.length, leads.length)}
          sub={`${booked.length} booked · ${money(bookedRev)}`}
          icon={CheckCircle} accent="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* ── PIPELINE ─────────────────────────────────────────────────────── */}
      <Panel title="Conversion Pipeline">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Booked',  count: booked.length,  rev: bookedRev,  bg: 'bg-emerald-500/8 dark:bg-emerald-500/10', num: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
            { label: 'Pending', count: pending.length, rev: pendingRev, bg: 'bg-sky-500/8 dark:bg-sky-500/10',         num: 'text-sky-600 dark:text-sky-400',         bar: 'bg-sky-500'     },
            { label: 'Lost',    count: lost.length,    rev: lostRev,    bg: 'bg-rose-500/8 dark:bg-rose-500/10',       num: 'text-rose-600 dark:text-rose-400',       bar: 'bg-rose-500'    },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
              <div className={`text-3xl font-bold tabular-nums ${s.num}`}>{s.count}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</div>
              <div className={`text-xs font-medium mt-1 ${s.num}`}>{pct(s.count, leads.length)}</div>
              <div className="mt-2 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: pct(s.count, leads.length) }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">{money(s.rev)}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── AGENT PERFORMANCE ────────────────────────────────────────────── */}
      <Panel title="Agent Financial Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <Th>Agent</Th>
                <Th right>Leads</Th>
                <Th right>Booked</Th>
                <Th right>Conv%</Th>
                <Th right>Total $</Th>
                <Th right>Booked $</Th>
                <Th right>Pending $</Th>
                <Th right>Lost $</Th>
                <Th right>Avg Job</Th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map(([name, d], i) => (
                <tr key={name} className={`border-b border-border/20 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="py-2.5 font-semibold">{name}</td>
                  <td className="py-2.5 text-right"><BarCell value={d.leads} max={maxAgentLeads} color="bg-violet-500" /></td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Badge status="booked" />
                      <span className="tabular-nums font-medium">{d.booked}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right"><PctCell value={d.booked} max={d.leads} /></td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{moneyFull(d.totalRev)}</td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{moneyFull(d.bookedRev)}</td>
                  <td className="py-2.5 text-right tabular-nums text-sky-600 dark:text-sky-400">{moneyFull(d.pendingRev)}</td>
                  <td className="py-2.5 text-right tabular-nums text-rose-500">{moneyFull(d.lostRev)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{money(d.leads ? d.totalRev / d.leads : 0)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border/50 bg-secondary/20 font-bold">
                <td className="py-2.5">TOTAL</td>
                <td className="py-2.5 text-right tabular-nums">{leads.length}</td>
                <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{booked.length}</td>
                <td className="py-2.5 text-right"><PctCell value={booked.length} max={leads.length} /></td>
                <td className="py-2.5 text-right tabular-nums">{moneyFull(totalRev)}</td>
                <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{moneyFull(bookedRev)}</td>
                <td className="py-2.5 text-right tabular-nums text-sky-600 dark:text-sky-400">{moneyFull(pendingRev)}</td>
                <td className="py-2.5 text-right tabular-nums text-rose-500">{moneyFull(lostRev)}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{money(avgJob)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── REFERRAL SOURCES ─────────────────────────────────────────────── */}
      <Panel title="Top Referral Sources">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <Th>Source</Th>
                <Th right>Leads</Th>
                <Th right>Booked</Th>
                <Th right>Conv%</Th>
                <Th right>Revenue</Th>
                <Th right>Avg Job</Th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.map(([src, d], i) => (
                <tr key={src} className={`border-b border-border/20 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="py-2.5 font-medium">{src}</td>
                  <td className="py-2.5 text-right"><BarCell value={d.leads} max={maxSourceLeads} color="bg-violet-500" /></td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{d.booked}</td>
                  <td className="py-2.5 text-right"><PctCell value={d.booked} max={d.leads} /></td>
                  <td className="py-2.5 text-right tabular-nums">{moneyFull(d.rev)}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{money(d.leads ? d.rev / d.leads : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── BRANCH + SERVICE TYPE (side by side on desktop) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {branchRows.length > 0 && (
          <Panel title="Leads by Branch">
            <div className="space-y-2">
              {branchRows.map(([branch, d]) => (
                <div key={branch} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 truncate">{branch}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.round((d.leads / leads.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{d.leads}</span>
                  <PctCell value={d.booked} max={d.leads} />
                </div>
              ))}
            </div>
          </Panel>
        )}

        {serviceRows.length > 0 && (
          <Panel title="Leads by Service Type">
            <div className="space-y-2">
              {serviceRows.map(([svc, d]) => (
                <div key={svc} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 truncate">{svc}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.round((d.leads / leads.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{d.leads}</span>
                  <PctCell value={d.booked} max={d.leads} />
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* ── LIKELIHOOD FINANCIAL BREAKDOWN ───────────────────────────────── */}
      <Panel title="Likelihood Financial Breakdown">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { status: 'booked'  as const, count: booked.length,  rev: bookedRev,  border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
            { status: 'pending' as const, count: pending.length, rev: pendingRev, border: 'border-sky-500/30',     bg: 'bg-sky-500/5'     },
            { status: 'lost'    as const, count: lost.length,    rev: lostRev,    border: 'border-rose-500/30',    bg: 'bg-rose-500/5'    },
          ].map(row => (
            <div key={row.status} className={`rounded-xl border p-4 ${row.border} ${row.bg}`}>
              <Badge status={row.status} />
              <div className="text-2xl font-bold tabular-nums mt-2">{row.count}</div>
              <div className="text-xs text-muted-foreground">{pct(row.count, leads.length)} of leads</div>
              <div className="mt-3 pt-3 border-t border-border/30 space-y-0.5">
                <div className="text-xs text-muted-foreground">Est. Revenue</div>
                <div className="text-sm font-bold tabular-nums">{moneyFull(row.rev)}</div>
                <div className="text-xs text-muted-foreground">avg {money(row.count ? row.rev / row.count : 0)} / job</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── DATE RANGE ANALYSIS ──────────────────────────────────────────── */}
      <Panel title="Date Range Conversion Analysis">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border/50 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <span className="text-xs text-muted-foreground">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border/50 bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30" />
            {(startDate || endDate) && (
              <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors">
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-muted-foreground">{rangeLeads.length} leads</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              {rangeBooked} booked · {pct(rangeBooked, rangeLeads.length)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <Th>Referral Source</Th>
                <Th right># Leads</Th>
                <Th right># Booked</Th>
                <Th right>Conv %</Th>
              </tr>
            </thead>
            <tbody>
              {rangeBySource.map(([src, d], i) => (
                <tr key={src} className={`border-b border-border/20 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="py-2.5 font-medium">{src}</td>
                  <td className="py-2.5 text-right tabular-nums">{d.leads}</td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{d.booked}</td>
                  <td className="py-2.5 text-right"><PctCell value={d.booked} max={d.leads} /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border/50 bg-secondary/20 font-bold">
                <td className="py-2.5">TOTAL</td>
                <td className="py-2.5 text-right tabular-nums">{rangeLeads.length}</td>
                <td className="py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{rangeBooked}</td>
                <td className="py-2.5 text-right"><PctCell value={rangeBooked} max={rangeLeads.length} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}
