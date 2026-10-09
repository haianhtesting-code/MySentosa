'use client';

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/AdminGuard';
import { useRole } from '@/context/RoleContext';
import { getUsers, saveUsers } from '@/lib/users';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  scope: string;
  modules: string[];
  status: 'Active' | 'Inactive';
  isSystem: boolean;
}

interface ModulePermission {
  module: string;
  permissions: Record<string, { view: boolean; create: boolean; edit: boolean; approve: boolean; close: boolean }>;
}

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'system-administrator',
    name: 'System Administrator',
    description: 'Full system configuration, security, user onboarding and taxonomies setup.',
    scope: 'Global Administration & Settings',
    modules: ['All Modules'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'duty-manager',
    name: 'Duty Manager',
    description: 'Shift commander. Endorses incident completions, handles escalations, and approves NOP reviews.',
    scope: 'Full operations, management endorsement',
    modules: ['Incident Management', 'Case Log', 'Fault Log', 'Task Board', 'e-Diary', 'Events Masterlist', 'Broadcast & Notification', 'Crisis Management', 'No Objection Permit (NOP)', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'duty-officer',
    name: 'Duty Officer',
    description: 'Assisting shift officer. Eligible to elevate role to Duty Manager during shift changes or DM absence.',
    scope: 'Full operations, standard triage control',
    modules: ['Incident Management', 'Case Log', 'Fault Log', 'Task Board', 'e-Diary', 'Events Masterlist', 'Broadcast & Notification', 'Crisis Management', 'No Objection Permit (NOP)', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'controller',
    name: 'Controller',
    description: 'IOH Operators. Primary handlers for logging reports, dispatcher control, and task assignments.',
    scope: 'Full operational workflow creation/routing (excludes final close endorsements)',
    modules: ['Incident Management', 'Case Log', 'Fault Log', 'Task Board', 'e-Diary', 'Events Masterlist', 'Broadcast & Notification', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'responder-ranger',
    name: 'Responder (Ranger)',
    description: 'Field personnel performing inspections, crowd-control, or on-site safety audits.',
    scope: 'Limited to assigned Incident/Task records & on-site field audits',
    modules: ['Incident Management (Assigned only)', 'Task Board (Assigned only)', 'No Objection Permit (NOP)'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'technical-approver',
    name: 'Technical Approver',
    description: 'Statutory departmental technical reviewer for NOP permits (Sentosa Express, Cableway, Traffic, WSH, C&S PE, Geotechnical, Landscape, Marine, Precinct, Ops).',
    scope: 'Technical evaluation and statutory endorsement of NOP submissions',
    modules: ['No Objection Permit (NOP)', 'Pending Approvals', 'Work Boundary Map'],
    status: 'Active',
    isSystem: true
  },

  {
    id: 'liaison-officer',
    name: 'Liaison Officer',
    description: 'Conducts pre-screening of NOP permit submissions, verifies contractor credentials, RAMS, and certifications.',
    scope: 'Pre-screening & contractor verification',
    modules: ['No Objection Permit (NOP)', 'LO Pre-Screening', 'Work Boundary Map'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'applicant-contractor',
    name: 'Applicant (Contractor)',
    description: 'External contractor submitting Permit-to-Work applications, RAMS, and insurance documents.',
    scope: 'Contractor Portal submissions and permit tracking',
    modules: ['No Objection Permit (NOP)', 'Contractor Portal', 'Work Boundary Map'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'stakeholder-manager',
    name: 'Stakeholder Manager',
    description: 'Coordinates commercial stakeholders/tenants and endorses submissions on their behalf.',
    scope: 'Stakeholder NOP submissions and coordination',
    modules: ['No Objection Permit (NOP)', 'Contractor Portal', 'Work Boundary Map'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'nop-business-owner',
    name: 'NOP Business Owner',
    description: 'Business owner overseeing island-wide works and approving policy exceptions.',
    scope: 'Executive oversight & approval',
    modules: ['No Objection Permit (NOP)', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'sdc-stakeholder-or',
    name: 'SDC Stakeholder / Operational Viewer (incl. OR Team)',
    description: 'Island operations and resilience team viewer for active permits and blackout awareness.',
    scope: 'Read-only island wide operational awareness and data export',
    modules: ['No Objection Permit (NOP)', 'Work Boundary Map', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'stakeholder',
    name: 'Stakeholder',
    description: 'Internal SDC departments requiring read-only visibility into active/past cases.',
    scope: 'Read-only departmental visibility',
    modules: ['Incident Management', 'Case Log', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'broadcast-recipient',
    name: 'Broadcast Recipient',
    description: 'External and internal contact groups receiving dispatch templates.',
    scope: 'None (Receives SMS/Email only)',
    modules: ['Broadcast & Notification'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'operational-resilience-analyst',
    name: 'Operational Resilience Analyst',
    description: 'Read-only analyst checking case files for tagging, categorization and post-incident compliance.',
    scope: 'Read-only reports and analytical exports',
    modules: ['Incident Management', 'Case Log', 'Dashboard'],
    status: 'Active',
    isSystem: true
  },
  {
    id: 'non-sdc-term-contractor',
    name: 'Non-SDC Term Contractor',
    description: 'Contractors handling facility fixes, responding to CMMS-directed assignments.',
    scope: 'Limited to assigned CMMS tickets/tasks',
    modules: ['Fault Log', 'Task Board'],
    status: 'Active',
    isSystem: true
  }
];

const FULL_ACCESS = { view: true, create: true, edit: true, approve: true, close: true };
const READ_ONLY = { view: true, create: false, edit: false, approve: false, close: false };
const NO_ACCESS = { view: false, create: false, edit: false, approve: false, close: false };
const OPS_STAFF = { view: true, create: true, edit: true, approve: false, close: false };
const CLOSE_CAPABLE = { view: true, create: true, edit: true, approve: false, close: true };
const FIELD_STAFF = { view: true, create: false, edit: true, approve: false, close: false };

const DEFAULT_MATRIX: ModulePermission[] = [
  {
    module: 'Incident Management',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': OPS_STAFF,
      'Controller': OPS_STAFF,
      'Responder (Ranger)': FIELD_STAFF,
      'Technical Approver': READ_ONLY,
      'Liaison Officer': READ_ONLY,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': READ_ONLY,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': FIELD_STAFF,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'Case Management',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': OPS_STAFF,
      'Responder (Ranger)': NO_ACCESS,
      'Technical Approver': READ_ONLY,
      'Liaison Officer': READ_ONLY,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': READ_ONLY,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'Fault Reporting',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': CLOSE_CAPABLE,
      'Responder (Ranger)': READ_ONLY,
      'Technical Approver': READ_ONLY,
      'Liaison Officer': READ_ONLY,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': READ_ONLY,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': FIELD_STAFF
    }
  },
  {
    module: 'Task Management',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': CLOSE_CAPABLE,
      'Responder (Ranger)': FIELD_STAFF,
      'Technical Approver': READ_ONLY,
      'Liaison Officer': READ_ONLY,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': READ_ONLY,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': FIELD_STAFF
    }
  },
  {
    module: 'e-Diary',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': CLOSE_CAPABLE,
      'Duty Officer': CLOSE_CAPABLE,
      'Controller': CLOSE_CAPABLE,
      'Responder (Ranger)': NO_ACCESS,
      'Technical Approver': NO_ACCESS,
      'Liaison Officer': NO_ACCESS,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': NO_ACCESS,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'Events Masterlist',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': CLOSE_CAPABLE,
      'Responder (Ranger)': READ_ONLY,
      'Technical Approver': READ_ONLY,
      'Liaison Officer': READ_ONLY,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': READ_ONLY,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'Broadcast & Notification',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': OPS_STAFF,
      'Responder (Ranger)': NO_ACCESS,
      'Technical Approver': NO_ACCESS,
      'Liaison Officer': NO_ACCESS,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': NO_ACCESS,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': NO_ACCESS,
      'Broadcast Recipient': { view: true, create: false, edit: false, approve: false, close: false },
      'Operational Resilience Analyst': NO_ACCESS,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'Crisis Management',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Duty Officer': FULL_ACCESS,
      'Controller': OPS_STAFF,
      'Responder (Ranger)': READ_ONLY,
      'Technical Approver': NO_ACCESS,
      'Liaison Officer': NO_ACCESS,
      'Applicant (Contractor)': NO_ACCESS,
      'Stakeholder Manager': NO_ACCESS,
      'NOP Business Owner': READ_ONLY,
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Operational Resilience Analyst': READ_ONLY,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  },
  {
    module: 'No Objection Permit (NOP)',
    permissions: {
      'System Administrator': FULL_ACCESS,
      'Duty Manager': FULL_ACCESS,
      'Technical Approver': { view: true, create: false, edit: true, approve: true, close: false },
      'Liaison Officer': { view: true, create: false, edit: true, approve: false, close: false },
      'Applicant (Contractor)': { view: true, create: true, edit: true, approve: false, close: false },
      'Stakeholder Manager': { view: true, create: true, edit: true, approve: false, close: false },
      'NOP Business Owner': { view: true, create: false, edit: false, approve: true, close: true },
      'SDC Stakeholder / Operational Viewer (incl. OR Team)': READ_ONLY,
      'Duty Officer': READ_ONLY,
      'Controller': READ_ONLY,
      'Responder (Ranger)': FIELD_STAFF,
      'Operational Resilience Analyst': READ_ONLY,
      'Stakeholder': READ_ONLY,
      'Broadcast Recipient': NO_ACCESS,
      'Non-SDC Term Contractor': NO_ACCESS
    }
  }
];

const PC: Record<string, string> = { view: '#16A34A', create: '#D97706', edit: '#2563EB', approve: '#7C3AED', close: '#DC2626' };
const PB: Record<string, string> = { view: 'rgba(22,163,74,0.08)', create: 'rgba(217,119,6,0.08)', edit: 'rgba(37,99,235,0.08)', approve: 'rgba(124,58,237,0.08)', close: 'rgba(220,38,38,0.08)' };

const PERMISSION_LABELS: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', approve: 'Approve', close: 'Close' };
const ROLE_COLORS = [
  '#7C3AED', '#16A34A', '#D97706', '#2563EB', '#DC2626', '#0891B2',
  '#BE185D', '#059669', '#B45309', '#4F46E5', '#0D9488', '#EA580C',
  '#9333EA', '#65A30D', '#0284C7', '#64748B'
];

type PermKey = 'view' | 'create' | 'edit' | 'approve' | 'close';

interface PermissionMatrixTabProps {
  matrix: ModulePermission[];
  activeRoles: RoleDefinition[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveMatrix: () => void;
  onTogglePerm: (mod: string, role: string, p: PermKey) => void;
}

function PermissionMatrixTab({ matrix, activeRoles, isEditing, onStartEdit, onCancelEdit, onSaveMatrix, onTogglePerm }: PermissionMatrixTabProps) {
  const [searchPerm, setSearchPerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(activeRoles.slice(0, 5).map(r => r.name));

  const allModules = matrix.map(r => r.module);
  const PERMS: PermKey[] = ['view', 'create', 'edit', 'approve', 'close'];

  // flat rows: { module, perm } pairs
  const allRows: { module: string; perm: PermKey }[] = matrix.flatMap(row =>
    PERMS.map(p => ({ module: row.module, perm: p }))
  );

  const filteredRows = allRows.filter(row => {
    const matchModule = filterModule === 'all' || row.module === filterModule;
    const matchSearch = searchPerm === '' ||
      row.module.toLowerCase().includes(searchPerm.toLowerCase()) ||
      PERMISSION_LABELS[row.perm].toLowerCase().includes(searchPerm.toLowerCase());
    return matchModule && matchSearch;
  });

  const toggleRole = (name: string) => {
    setSelectedRoles(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);
  };

  const getRoleColor = (name: string) => {
    const idx = activeRoles.findIndex(r => r.name === name);
    return ROLE_COLORS[(idx >= 0 ? idx : 0) % ROLE_COLORS.length];
  };

  const getMatrixPerm = (mod: string, roleName: string, p: PermKey): boolean => {
    const row = matrix.find(r => r.module === mod);
    return !!(row?.permissions[roleName]?.[p]);
  };

  // group consecutive same-module rows for spanning
  const groupedRows: { module: string; perm: PermKey; isFirst: boolean; span: number }[] = [];
  filteredRows.forEach((row, i) => {
    const spanCount = filteredRows.filter(r => r.module === row.module).length;
    const isFirst = i === 0 || filteredRows[i - 1].module !== row.module;
    groupedRows.push({ ...row, isFirst, span: spanCount });
  });

  const displayedRoles = selectedRoles.length > 0 ? activeRoles.filter(r => selectedRoles.includes(r.name)) : activeRoles;

  return (
    <div className="glass" style={{ padding: '20px', background: 'var(--bg-card)', marginTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '14px', color: 'var(--text-main)', margin: 0 }}>CENTRALIZED PERMISSION MATRIX</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Enterprise workspace for viewing and bulk-modifying granular access levels across all operational and statutory NOP roles.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          {isEditing ? (
            <>
              <button onClick={onCancelEdit} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={onSaveMatrix} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: 'var(--color-primary-dark)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
            </>
          ) : (
            <button onClick={onStartEdit} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: 'var(--color-primary-dark)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>✏️ Edit Permissions</button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Module filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module</span>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} style={{ padding: '7px 10px', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', minWidth: '180px' }}>
            <option value="all">All Modules</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Permission search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Permissions</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', pointerEvents: 'none' }}>🔍</span>
            <input value={searchPerm} onChange={e => setSearchPerm(e.target.value)} placeholder="Search module or permission..." style={{ width: '100%', boxSizing: 'border-box', padding: '7px 12px 7px 32px', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Compare Roles (chip selector) */}
      <div style={{ marginBottom: '16px', padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-inset)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Compare Roles:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {activeRoles.map(role => {
              const color = getRoleColor(role.name);
              const selected = selectedRoles.includes(role.name);
              return (
                <button key={role.name} onClick={() => toggleRole(role.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (selected ? color : 'var(--border-color)'), background: selected ? color + '15' : 'transparent', color: selected ? color : 'var(--text-muted)', transition: 'all 0.15s ease' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: selected ? color : 'var(--border-color)', display: 'inline-block', transition: 'all 0.15s' }} />
                  {role.name}
                  {selected && <span style={{ fontSize: '11px', lineHeight: 1 }}>×</span>}
                </button>
              );
            })}
          </div>
          {selectedRoles.length !== activeRoles.length && (
            <button onClick={() => setSelectedRoles(activeRoles.map(r => r.name))} style={{ fontSize: '11.5px', color: 'var(--color-primary-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', whiteSpace: 'nowrap', fontWeight: 600 }}>Select All</button>
          )}
          {selectedRoles.length > 0 && (
            <button onClick={() => setSelectedRoles([])} style={{ fontSize: '11.5px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', whiteSpace: 'nowrap' }}>Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-inset)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '11px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '180px', borderRight: '1px solid var(--border-color)' }}>Module</th>
              <th style={{ padding: '11px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '150px', borderRight: '1px solid var(--border-color)' }}>Action / Permission</th>
              {displayedRoles.map(role => {
                const color = getRoleColor(role.name);
                return (
                  <th key={role.name} style={{ padding: '11px 16px', fontSize: '11.5px', fontWeight: 700, color, textTransform: 'none', textAlign: 'center', borderRight: '1px solid var(--border-color)', minWidth: '120px' }}>
                    {role.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groupedRows.length === 0 ? (
              <tr>
                <td colSpan={2 + displayedRoles.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No permissions match your filters.
                </td>
              </tr>
            ) : groupedRows.map((row, i) => {
              const isModuleFirst = row.isFirst;
              const isEven = Math.floor(i / PERMS.length) % 2 === 0;
              const rowBg = isEven ? 'var(--bg-card)' : 'var(--bg-inset)';
              return (
                <tr key={row.module + '-' + row.perm} style={{ borderBottom: '1px solid var(--border-color)', background: rowBg }}>
                  {/* Module cell */}
                  {isModuleFirst ? (
                    <td rowSpan={row.span} style={{ padding: '12px 16px', fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)', verticalAlign: 'middle', borderRight: '1px solid var(--border-color)', background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-color)' }}>
                      {row.module}
                    </td>
                  ) : null}
                  {/* Permission label */}
                  <td style={{ padding: '10px 16px', borderRight: '1px solid var(--border-color)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: PC[row.perm], background: PB[row.perm], padding: '2px 8px', borderRadius: '4px' }}>
                      {PERMISSION_LABELS[row.perm]}
                    </span>
                  </td>
                  {/* Checkboxes per role */}
                  {displayedRoles.map(role => {
                    const checked = getMatrixPerm(row.module, role.name, row.perm);
                    const color = getRoleColor(role.name);
                    return (
                      <td key={role.name} style={{ padding: '10px 16px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                        {isEditing ? (
                          <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input type="checkbox" checked={checked} onChange={() => onTogglePerm(row.module, role.name, row.perm)} style={{ display: 'none' }} />
                            <span style={{ width: '18px', height: '18px', borderRadius: '4px', border: '2px solid ' + (checked ? color : 'var(--border-color)'), background: checked ? color : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0 }}>
                              {checked && <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1, fontWeight: 900 }}>✓</span>}
                            </span>
                          </label>
                        ) : (
                          checked
                            ? <span style={{ color, fontSize: '15px' }}>✓</span>
                            : <span style={{ color: 'var(--border-color)', fontSize: '15px' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isEditing && (
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '10px' }}>
          Click checkboxes to toggle permissions. Press <strong>Save Changes</strong> when done.
        </p>
      )}
    </div>
  );
}

function getRoles(): RoleDefinition[] {
  if (typeof window === 'undefined') return DEFAULT_ROLES;
  const s = localStorage.getItem('admin_roles');
  if (s) {
    try {
      const parsed: RoleDefinition[] = JSON.parse(s);
      const existingIds = new Set(parsed.map(r => r.id));
      const missing = DEFAULT_ROLES.filter(r => !existingIds.has(r.id));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem('admin_roles', JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      /* fall through */
    }
  }
  localStorage.setItem('admin_roles', JSON.stringify(DEFAULT_ROLES));
  return DEFAULT_ROLES;
}

function saveRoles(r: RoleDefinition[]) {
  if (typeof window !== 'undefined') localStorage.setItem('admin_roles', JSON.stringify(r));
}

export default function RoleManagementPage() {
  const { username } = useRole();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [matrix, setMatrix] = useState<ModulePermission[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix'>('roles');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cErr, setCErr] = useState('');

  // Edit modal
  const [editRole, setEditRole] = useState<RoleDefinition | null>(null);
  const [eName, setEName] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eStatus, setEStatus] = useState<'Active' | 'Inactive'>('Active');
  const [eTarget, setETarget] = useState('');
  const [eErr, setEErr] = useState('');

  useEffect(() => {
    setRoles(getRoles());
    const s = localStorage.getItem('admin_role_matrix');
    if (s) {
      try {
        const parsed: ModulePermission[] = JSON.parse(s);
        const merged = DEFAULT_MATRIX.map(defMod => {
          const found = parsed.find(p => p.module === defMod.module);
          if (!found) return defMod;
          return {
            module: defMod.module,
            permissions: {
              ...defMod.permissions,
              ...found.permissions
            }
          };
        });
        setMatrix(merged);
        localStorage.setItem('admin_role_matrix', JSON.stringify(merged));
      } catch {
        setMatrix(DEFAULT_MATRIX);
        localStorage.setItem('admin_role_matrix', JSON.stringify(DEFAULT_MATRIX));
      }
    } else {
      setMatrix(DEFAULT_MATRIX);
      localStorage.setItem('admin_role_matrix', JSON.stringify(DEFAULT_MATRIX));
    }
  }, []);

  const showT = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const audit = async (action: string, before: unknown, after: unknown, details: string) => {
    try {
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: username || 'Admin Root',
          action,
          module: 'Role Management',
          details,
          beforeSnapshot: JSON.stringify(before),
          afterSnapshot: JSON.stringify(after),
          correlationId: 'ROLE-' + Date.now()
        })
      });
    } catch {
      /* silent */
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset roles and permission matrix to system defaults (including all NOP & Technical Approver roles)?')) {
      setRoles(DEFAULT_ROLES);
      saveRoles(DEFAULT_ROLES);
      setMatrix(DEFAULT_MATRIX);
      localStorage.setItem('admin_role_matrix', JSON.stringify(DEFAULT_MATRIX));
      showT('Roles and Permission Matrix reset to defaults.');
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const n = cName.trim();
    if (!n) { setCErr('Role name is required.'); return; }
    if (roles.some(r => r.name.toLowerCase() === n.toLowerCase())) { setCErr('A role with this name already exists.'); return; }
    const nr: RoleDefinition = { id: 'custom-' + Date.now(), name: n, description: cDesc.trim() || '—', scope: '—', modules: [], status: 'Active', isSystem: false };
    const upd = [...roles, nr]; setRoles(upd); saveRoles(upd);
    audit('Create Role', null, nr, 'Created: ' + n);
    showT('Role "' + n + '" created.');
    setShowCreate(false); setCName(''); setCDesc(''); setCErr('');
  };

  const openEdit = (role: RoleDefinition) => {
    setEditRole(role); setEName(role.name); setEDesc(role.description === '—' ? '' : role.description);
    setEStatus(role.status); setEErr('');
    const first = roles.find(r => r.name !== role.name && r.status === 'Active');
    setETarget(first?.name ?? '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    const n = eName.trim();
    if (!n) { setEErr('Role name is required.'); return; }
    if (n.toLowerCase() !== editRole.name.toLowerCase() && roles.some(r => r.name.toLowerCase() === n.toLowerCase())) { setEErr('Another role with this name already exists.'); return; }
    const deactivating = editRole.status === 'Active' && eStatus === 'Inactive';
    const affected = deactivating ? getUsers().filter(u => u.role === editRole.name) : [];
    if (deactivating && affected.length > 0 && !eTarget) { setEErr('Please choose a role to reassign affected users to.'); return; }
    if (deactivating && affected.length > 0 && eTarget) {
      saveUsers(getUsers().map(u => affected.some(a => a.id === u.id) ? { ...u, role: eTarget } : u));
      audit('Reassign on Deactivation', { role: editRole.name }, { role: eTarget }, affected.length + ' user(s) reassigned to "' + eTarget + '".');
    }
    const updated: RoleDefinition = { ...editRole, name: n, description: eDesc.trim() || '—', status: eStatus };
    const upd = roles.map(r => r.id === editRole.id ? updated : r); setRoles(upd); saveRoles(upd);
    audit('Edit Role', editRole, updated, 'Role "' + editRole.name + '" updated.');
    const parts: string[] = [];
    if (n !== editRole.name) parts.push('renamed to "' + n + '"');
    if (eStatus !== editRole.status) parts.push('status → ' + eStatus);
    if (deactivating && affected.length > 0) parts.push(affected.length + ' user(s) → "' + eTarget + '"');
    showT('Role updated' + (parts.length ? ': ' + parts.join(', ') : '') + '.');
    setEditRole(null);
  };

  const handleStartEdit = () => { localStorage.setItem('admin_role_matrix_prev', JSON.stringify(matrix)); setIsEditing(true); };
  const handleCancelEdit = () => { const s = localStorage.getItem('admin_role_matrix'); setMatrix(s ? JSON.parse(s) : DEFAULT_MATRIX); setIsEditing(false); };
  const handleSaveMatrix = async () => {
    localStorage.setItem('admin_role_matrix', JSON.stringify(matrix)); setIsEditing(false);
    showT('Permission matrix changes saved successfully.');
    try {
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: username || 'Admin Root',
          action: 'Update Role Matrix',
          module: 'Role Management',
          details: 'Updated permission matrix.',
          beforeSnapshot: localStorage.getItem('admin_role_matrix_prev') || '',
          afterSnapshot: JSON.stringify(matrix)
        })
      });
      localStorage.setItem('admin_role_matrix_prev', JSON.stringify(matrix));
    } catch {
      /* silent */
    }
  };
  const togglePerm = (mod: string, role: string, p: 'view' | 'create' | 'edit' | 'approve' | 'close') => {
    if (!isEditing) return;
    setMatrix(prev => prev.map(row => { if (row.module !== mod) return row; const cur = row.permissions[role] || { view: false, create: false, edit: false, approve: false, close: false }; return { ...row, permissions: { ...row.permissions, [role]: { ...cur, [p]: !cur[p] } } }; }));
  };

  return (
    <AdminGuard pageTitle="Role Management & Permissions">
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Page Header Card (White rounded card matching mockup) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h1 style={{
            fontFamily: 'var(--font-headline, sans-serif)',
            fontSize: '18px',
            fontWeight: 800,
            color: '#0F172A',
            margin: 0,
            letterSpacing: '0.02em'
          }}>
            ROLE MANAGEMENT & PERMISSIONS
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#64748B',
            marginTop: '6px',
            marginBottom: 0
          }}>
            Audit the role architecture, access scopes, and module permission matrix mapping.
          </p>
        </div>

        {/* Tab Switcher Bar */}
        <div style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1.5px solid #E2E8F0',
          paddingLeft: '4px',
          marginBottom: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '8px 4px 12px 4px',
              fontSize: '13.5px',
              fontWeight: activeTab === 'roles' ? 700 : 500,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'roles' ? '#C2410C' : '#64748B',
              borderBottom: activeTab === 'roles' ? '2.5px solid #C2410C' : '2.5px solid transparent',
              marginBottom: '-1.5px',
              transition: 'all 0.15s ease'
            }}
          >
            System Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            style={{
              padding: '8px 4px 12px 4px',
              fontSize: '13.5px',
              fontWeight: activeTab === 'matrix' ? 700 : 500,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'matrix' ? '#C2410C' : '#64748B',
              borderBottom: activeTab === 'matrix' ? '2.5px solid #C2410C' : '2.5px solid transparent',
              marginBottom: '-1.5px',
              transition: 'all 0.15s ease'
            }}
          >
            Role &amp; Status Action Permission Matrix
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', background: toast.type === 'success' ? '#16A34A' : '#DC2626', color: '#fff', fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999 }}>
            {toast.msg}
          </div>
        )}

        {/* Tab Content 1: System Roles Table (Matching Mockup Image) */}
        {activeTab === 'roles' ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '22px 26px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Top Toolbar inside card */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}>
                  SYSTEM ROLES
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                  {roles.length} roles total — {roles.filter(r => r.status === 'Active').length} active
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(true); setCErr(''); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    background: '#7C2D12',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <span>+ Create Role</span>
                </button>
              </div>
            </div>

            {/* Clean Table View matching Mockup */}
            <div style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#FFFFFF'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '220px' }}>
                        ROLE NAME
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        DESCRIPTION
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '110px', textAlign: 'center' }}>
                        STATUS
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', width: '90px', textAlign: 'center' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r, idx) => {
                      const isActive = r.status === 'Active';
                      return (
                        <tr
                          key={r.id || idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Role Name */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                              {r.name}
                            </div>
                            {r.scope && r.scope !== '—' && (
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                {r.scope}
                              </div>
                            )}
                          </td>

                          {/* Description */}
                          <td style={{ padding: '14px 16px', color: '#475569', fontSize: '12.5px', lineHeight: 1.5, verticalAlign: 'middle' }}>
                            {r.description}
                          </td>

                          {/* Status Pill Badge */}
                          <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 10px',
                              borderRadius: '20px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: isActive ? '#ECFDF5' : '#FEF2F2',
                              border: `1px solid ${isActive ? '#A7F3D0' : '#FECACA'}`,
                              color: isActive ? '#059669' : '#DC2626'
                            }}>
                              <span style={{ fontSize: '9px' }}>●</span>
                              <span>{r.status}</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                color: '#334155',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <PermissionMatrixTab
            matrix={matrix}
            activeRoles={roles.filter(r => r.status === 'Active')}
            isEditing={isEditing}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveMatrix={handleSaveMatrix}
            onTogglePerm={togglePerm}
          />
        )}

        {/* Create modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Create New Custom Role</h3>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Role Name *</label>
                  <input value={cName} onChange={e => setCName(e.target.value)} placeholder="e.g. Lead Ropeway Inspector" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</label>
                  <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Describe role responsibilities and statutory authority..." rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                </div>
                {cErr && <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>{cErr}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--color-primary-dark)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Create Role</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editRole && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Edit Role: {editRole.name}</h3>
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Role Name *</label>
                  <input value={eName} onChange={e => setEName(e.target.value)} disabled={editRole.isSystem} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: editRole.isSystem ? 'var(--bg-card)' : 'var(--bg-inset)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', opacity: editRole.isSystem ? 0.7 : 1 }} />
                  {editRole.isSystem && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>System role names cannot be modified.</div>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</label>
                  <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Status</label>
                  <select value={eStatus} onChange={e => setEStatus(e.target.value as 'Active' | 'Inactive')} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-inset)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                {eErr && <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>{eErr}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setEditRole(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--color-primary-dark)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
