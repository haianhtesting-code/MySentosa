'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useRole();

  const isExternalApplicantRole = role === 'Applicant (Contractor)' || role === 'Stakeholder Manager';
  const isInternalRole = !isExternalApplicantRole;

  // 1. External Applicant and Stakeholder Manager route restrictions (P0-12)
  if (isExternalApplicantRole) {
    const isAllowedExternalPath =
      pathname === '/nops' ||
      pathname === '/nops/new' ||
      pathname === '/nops/map' ||
      (pathname.startsWith('/nops/') && (pathname.includes('/SEN/') || pathname.includes('/DRAFT-') || pathname.includes('/DFT-')));

    if (!isAllowedExternalPath && pathname.startsWith('/nops')) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '540px',
            background: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#DC2626',
              fontSize: '28px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#991B1B', margin: '0 0 12px 0' }}>
              Access Denied
            </h2>
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              You do not have permission to view this page. Please return to the NOP List.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => router.push('/nops')}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Go to NOP List
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // 2. Removed Internal Staff restrictions since everything is unified

  return <>{children}</>;
}
