'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Case, Fault, Task } from '@/lib/db';
import { loadStoredNops, NOPApplication } from '@/lib/nopData';

type StatPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export default function StatisticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<StatPeriod>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nops, setNops] = useState<NOPApplication[]>([]);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [casesRes, faultsRes, tasksRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/faults'),
        fetch('/api/tasks'),
      ]);

      if (casesRes.ok) {
        const cData = await casesRes.json();
        setCases(Array.isArray(cData) ? cData : cData.cases || []);
      }
      if (faultsRes.ok) {
        const fData = await faultsRes.json();
        setFaults(fData.faults || []);
      }
      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(Array.isArray(tData) ? tData : tData.tasks || []);
      }
      setNops(loadStoredNops());
    } catch (err) {
      console.error('Failed loading statistics data:', err);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setRefreshing(false), 400);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter items by selected period
  const filterByPeriod = useCallback((dateString: string | undefined): boolean => {
    if (!dateString || period === 'all') return true;
    const itemDate = new Date(dateString);
    if (isNaN(itemDate.getTime())) return true;
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return itemDate >= startOfDay;
    }
    if (period === 'week') {
      const day = now.getDay() || 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek;
    }
    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth;
    }
    if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return itemDate >= startOfYear;
    }
    return true;
  }, [period]);

  const periodCases = useMemo(() => cases.filter(c => filterByPeriod(c.createdAt)), [cases, filterByPeriod]);
  const periodFaults = useMemo(() => faults.filter(f => filterByPeriod(f.createdAt)), [faults, filterByPeriod]);
  const periodTasks = useMemo(() => tasks.filter(t => filterByPeriod(t.createdDate || t.dueDate)), [tasks, filterByPeriod]);
  const periodNops = useMemo(() => nops.filter(n => filterByPeriod(n.submittedAt || n.startDateTime)), [nops, filterByPeriod]);

  // Derived KPI metrics
  const incidents = useMemo(() => periodCases.map(c => c.incident).filter(Boolean), [periodCases]);
  const closedIncidents = useMemo(() => incidents.filter(i => i?.status === 'Closed'), [incidents]);
  const incidentResolutionRate = incidents.length > 0
    ? Math.round((closedIncidents.length / incidents.length) * 100)
    : 100;

  const closedTasks = useMemo(() => periodTasks.filter(t => t.status === 'Closed'), [periodTasks]);
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return periodTasks.filter(t => t.status !== 'Closed' && t.dueDate && new Date(t.dueDate) < now);
  }, [periodTasks]);
  const taskCompletionRate = periodTasks.length > 0
    ? Math.round((closedTasks.length / periodTasks.length) * 100)
    : 100;

  const activePermitsCount = useMemo(() => periodNops.filter(n => n.permitStatus === 'Active').length, [periodNops]);
  const pendingApprovalsCount = useMemo(() => {
    return periodNops.reduce((acc, n) => acc + (n.domainApprovals?.filter(d => d.status === 'Pending').length || 0), 0);
  }, [periodNops]);

  // Incident categories breakdown
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      'Operational': 0,
      'Informational': 0,
      'Backdated': 0,
    };
    incidents.forEach(inc => {
      const cat = inc?.category || 'Operational';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts['Operational']++;
    });
    return counts;
  }, [incidents]);

  // Crisis level breakdown
  const crisisStats = useMemo(() => {
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };
    incidents.forEach(inc => {
      const lvl = String(inc?.crisisLevel || '3');
      if (counts[lvl] !== undefined) counts[lvl]++;
      else counts['3']++;
    });
    return counts;
  }, [incidents]);

  // Fault taxonomy breakdown
  const faultTypeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    periodFaults.forEach(f => {
      const t = f.faultType || 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [periodFaults]);

  // NOP Permit status breakdown
  const nopStatusStats = useMemo(() => {
    const counts: Record<string, number> = {
      'Active': 0,
      'Approved': 0,
      'Under Review': 0,
      'Submitted': 0,
      'Draft': 0,
      'Completed': 0,
    };
    periodNops.forEach(n => {
      const s = n.permitStatus || 'Draft';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [periodNops]);

  // Export CSV of aggregated metrics & cases
  const handleExportSummaryCSV = () => {
    const rows: string[][] = [
      ['Sentosa JOC — Operational Analytics Export'],
      [`Period: ${period.toUpperCase()}`, `Generated: ${new Date().toLocaleString('en-SG')}`],
      [],
      ['Metric', 'Value'],
      ['Total Cases', String(periodCases.length)],
      ['Total Incidents', String(incidents.length)],
      ['Closed Incidents', String(closedIncidents.length)],
      ['Incident Resolution Rate', `${incidentResolutionRate}%`],
      ['Total Ranger Tasks', String(periodTasks.length)],
      ['Closed Tasks', String(closedTasks.length)],
      ['Overdue Tasks', String(overdueTasks.length)],
      ['Task Completion Rate', `${taskCompletionRate}%`],
      ['Total Faults', String(periodFaults.length)],
      ['Active NOP Permits', String(activePermitsCount)],
      ['Pending Domain Clearances', String(pendingApprovalsCount)],
      [],
      ['Incident Category Breakdown'],
      ['Operational', String(categoryStats['Operational'])],
      ['Informational', String(categoryStats['Informational'])],
      ['Backdated', String(categoryStats['Backdated'])],
      [],
      ['Case ID', 'Title', 'Status', 'Has Incident', 'Created At'],
      ...periodCases.map(c => [
        `"${c.id}"`,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        `"${c.status || ''}"`,
        c.incident ? 'Yes' : 'No',
        `"${new Date(c.createdAt).toLocaleString('en-SG')}"`,
      ]),
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sentosa_Analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Page Header Bar ── */}
      <div className="page-header-bar glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '18px 24px', borderRadius: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              OPERATIONAL ANALYTICS & STATISTICS
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Sentosa Joint Operations Centre — Shift Performance, SLA Adherence & Cross-Domain Intelligence
          </p>
        </div>

        {/* Controls: Period Selector, Refresh, Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Period Pills */}
          <div style={{ display: 'inline-flex', background: 'var(--bg-inset)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {(['today', 'week', 'month', 'year', 'all'] as StatPeriod[]).map((p) => {
              const active = period === p;
              const labels: Record<StatPeriod, string> = {
                today: 'Today',
                week: 'This Week',
                month: 'This Month',
                year: 'This Year',
                all: 'All Time',
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12px', padding: '0 12px' }}
            title="Reload data"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>

          {/* Export CSV Button */}
          <button
            className="btn btn-secondary"
            onClick={handleExportSummaryCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12px', padding: '0 12px' }}
            title="Export CSV summary report"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Calculating Operational Statistics…</div>
        </div>
      ) : (
        <>
          {/* ── Top Executive KPI Ribbon ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            
            {/* KPI 1: Incident Resolution */}
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '10px', borderLeft: '4px solid var(--color-critical)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Incident Resolution</span>
                <span style={{ color: 'var(--color-critical)' }}>{closedIncidents.length}/{incidents.length}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {incidentResolutionRate}%
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-sub)' }}>
                Target SLA: &gt;85% within shift
              </div>
            </div>

            {/* KPI 2: Task Completion */}
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '10px', borderLeft: '4px solid var(--color-active)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Task SLA Adherence</span>
                <span style={{ color: 'var(--color-active)' }}>{closedTasks.length}/{periodTasks.length}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {taskCompletionRate}%
              </div>
              <div style={{ fontSize: '11.5px', color: overdueTasks.length > 0 ? 'var(--color-critical)' : 'var(--text-sub)' }}>
                {overdueTasks.length} overdue task{overdueTasks.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* KPI 3: Fault Resolution Rate */}
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '10px', borderLeft: '4px solid var(--color-high)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>CMMS Faults Logged</span>
                <span>{periodFaults.filter(f => f.status === 'Closed').length}/{periodFaults.length}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {periodFaults.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-sub)' }}>
                {periodFaults.filter(f => f.status === 'Pending Submission').length} awaiting CMMS sync
              </div>
            </div>

            {/* KPI 4: Active NOP Permits */}
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '10px', borderLeft: '4px solid var(--color-primary)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Active NOP Permits</span>
                <span style={{ color: 'var(--color-primary)' }}>In Effect</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {activePermitsCount}
              </div>
              <div style={{ fontSize: '11.5px', color: pendingApprovalsCount > 0 ? 'var(--color-high)' : 'var(--text-sub)' }}>
                {pendingApprovalsCount} clearance review{pendingApprovalsCount === 1 ? '' : 's'} pending
              </div>
            </div>

            {/* KPI 5: Total Cases Handled */}
            <div className="glass" style={{ padding: '18px 20px', borderRadius: '10px', borderLeft: '4px solid var(--color-info)', background: 'var(--bg-card)' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Master Cases</span>
                <span style={{ color: 'var(--color-info)' }}>{periodCases.filter(c => c.status === 'Active').length} Active</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 4px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {periodCases.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-sub)' }}>
                {periodCases.filter(c => c.status === 'Closed').length} fully resolved & closed
              </div>
            </div>

          </div>

          {/* ── Main Breakdown Grid (2x2) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
            
            {/* Card 1: Incidents by Category */}
            <div className="glass" style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Incidents by Category
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{incidents.length} Total</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Operational Incidents', key: 'Operational', color: 'var(--color-critical)', desc: 'Real-time frontline security, crowd, safety events' },
                  { label: 'Informational Incidents', key: 'Informational', color: 'var(--color-info)', desc: 'Pre-planned operations, VIP visits, public advisories' },
                  { label: 'Backdated Incidents', key: 'Backdated', color: 'var(--color-high)', desc: 'Post-event retrospective incident logs' },
                ].map((item) => {
                  const val = categoryStats[item.key] || 0;
                  const pct = incidents.length > 0 ? Math.round((val / incidents.length) * 100) : 0;
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '12.5px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: item.color }}>{val} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-inset)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Crisis Severity Distribution */}
            <div className="glass" style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Crisis Severity Distribution
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Severity Tiers</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { lvl: '1', name: 'Crisis Level 1', sub: 'Severe / Life Threat', color: '#EF4444', bg: '#FEF2F2' },
                  { lvl: '2', name: 'Crisis Level 2', sub: 'High Impact / Major Ops', color: '#F97316', bg: '#FFF7ED' },
                  { lvl: '3', name: 'Crisis Level 3', sub: 'Moderate / Standard Event', color: '#3B82F6', bg: '#EFF6FF' },
                  { lvl: '4', name: 'Crisis Level 4', sub: 'Minor / Low Impact', color: '#6B7280', bg: '#F3F4F6' },
                ].map((tier) => {
                  const count = crisisStats[tier.lvl] || 0;
                  return (
                    <div
                      key={tier.lvl}
                      style={{
                        padding: '14px',
                        background: tier.bg,
                        borderRadius: '8px',
                        borderLeft: `3px solid ${tier.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: tier.color }}>{tier.name}</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: tier.color, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '6px' }}>{tier.sub}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Top Infrastructure Fault Categories */}
            <div className="glass" style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  Fault Taxonomy Breakdown
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{periodFaults.length} Faults</span>
              </div>

              {faultTypeStats.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No fault records logged in this timeframe.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {faultTypeStats.map(([type, count]) => {
                    const pct = Math.round((count / periodFaults.length) * 100);
                    return (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '130px', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {type}
                        </span>
                        <div style={{ flex: 1, height: '7px', background: 'var(--bg-inset)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-high)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ width: '55px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card 4: NOP Permit Pipeline & Governance */}
            <div className="glass" style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  NOP Permit Governance Pipeline
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{periodNops.length} Permits</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { status: 'Active', count: nopStatusStats['Active'], color: 'var(--color-active)', bg: 'var(--color-active-bg)' },
                  { status: 'Approved', count: nopStatusStats['Approved'], color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
                  { status: 'Under Review', count: nopStatusStats['Under Review'], color: 'var(--color-high)', bg: 'var(--color-high-bg)' },
                  { status: 'Submitted', count: nopStatusStats['Submitted'], color: 'var(--color-review)', bg: 'var(--color-review-bg)' },
                  { status: 'Draft', count: nopStatusStats['Draft'], color: 'var(--color-closed)', bg: 'var(--color-closed-bg)' },
                  { status: 'Completed', count: nopStatusStats['Completed'], color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
                ].map((item) => (
                  <div
                    key={item.status}
                    style={{
                      padding: '12px 10px',
                      background: item.bg,
                      borderRadius: '8px',
                      border: `1px solid var(--border-color)`,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                      {item.count}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)', marginTop: '3px' }}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  href="/nops"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Manage All Permits
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            </div>

          </div>

          {/* ── Recent Active Operations Table ── */}
          <div className="glass" style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Key Cases in Period
              </h3>
              <Link
                href="/case-management?tab=cases"
                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                View Master Case Log →
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Case ID</th>
                    <th style={{ padding: '8px 12px' }}>Title</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Incident Attached</th>
                    <th style={{ padding: '8px 12px' }}>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {periodCases.slice(0, 8).map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/cases/${c.id}`)}
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span className="mono-id" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-bg)', borderColor: 'var(--color-primary-border)', fontSize: '11px' }}>
                          {c.id}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-main)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={c.status === 'Active' ? 'badge badge-onsite' : 'badge badge-closed'}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: c.incident ? 'var(--color-critical)' : 'var(--text-muted)', fontWeight: c.incident ? 600 : 400 }}>
                        {c.incident ? `Yes (${c.incident.priority} Priority)` : 'No'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-SG')} {new Date(c.createdAt).toLocaleTimeString('en-SG', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

    </div>
  );
}
