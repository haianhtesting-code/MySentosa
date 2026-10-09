'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CaseLogTab } from '@/components/tabs/CaseLogTab';
import { IncidentLogTab } from '@/components/tabs/IncidentLogTab';
import { FaultLogTab } from '@/components/tabs/FaultLogTab';
import { TaskBoardTab } from '@/components/tabs/TaskBoardTab';
import { EDiaryTab } from '@/components/tabs/EDiaryTab';

type TabKey = 'cases' | 'incidents' | 'faults' | 'tasks' | 'ediary';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'cases',
    label: 'Case Log',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: 'incidents',
    label: 'Incident Log',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    key: 'faults',
    label: 'Fault Log',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    key: 'tasks',
    label: 'Task Board',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: 'ediary',
    label: 'e-Diary',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="14" y2="10" />
      </svg>
    ),
  },
];

function CaseManagementInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('tab') as TabKey) || 'cases';

  const setTab = (key: TabKey) => {
    router.replace(`/case-management?tab=${key}`);
  };

  return (
    <>
      {/* Shared Page Header */}
      <div className="page-header-bar glass">
        <div className="title-section">
          <h1 style={{ fontSize: '15px', textTransform: 'uppercase' }}>Case Management</h1>
          <p>Security, Safety, and Operational case management — Incidents, Tasks, e-Diary occurrences, and Faults</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="glass"
        style={{
          padding: '0 20px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
                padding: '14px 20px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'cases'     && <CaseLogTab />}
        {activeTab === 'incidents' && <IncidentLogTab />}
        {activeTab === 'faults'    && <FaultLogTab />}
        {activeTab === 'tasks'     && <TaskBoardTab />}
        {activeTab === 'ediary'    && <EDiaryTab />}
      </div>
    </>
  );
}

export default function CaseManagementPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <CaseManagementInner />
    </Suspense>
  );
}
