'use client';

import React, { useEffect, useState } from 'react';
import { 
  fetchNopData, fetchBlackouts, fetchRoutingRules, 
  fetchApproverTitles, fetchApproverGroups, fetchUrgentDocs 
} from '@/lib/nopData';

export function DBGuard({ children }: { children: React.ReactNode }) {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if user previously opted to run in local mock mode
    const bypassMode = typeof window !== 'undefined' && localStorage.getItem('sentosa_bypass_db_guard') === 'true';

    fetch('/api/health')
      .then(res => {
        if (!res.ok) throw new Error('DB is down');
        return res.json();
      })
      .then(data => {
        if (data.ok) {
          if (data.isFallback || data.db === 'local-fallback') {
            setIsFallback(true);
          }
          return Promise.all([
            fetchNopData(),
            fetchBlackouts(),
            fetchRoutingRules(),
            fetchApproverTitles(),
            fetchApproverGroups(),
            fetchUrgentDocs()
          ])
            .then(() => setDbOk(true))
            .catch(() => {
              // Gracefully fall back to local mock data
              setDbOk(true);
              setIsFallback(true);
            });
        } else if (bypassMode) {
          setDbOk(true);
          setIsFallback(true);
        } else {
          setDbOk(false);
        }
      })
      .catch(() => {
        if (bypassMode) {
          setDbOk(true);
          setIsFallback(true);
        } else {
          setDbOk(false);
        }
      });
  }, []);

  if (dbOk === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>Initializing Sentosa CMS...</p>
      </div>
    );
  }

  if (dbOk === false) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: '#fee2e2', color: '#991b1b', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center'
      }}>
        <svg style={{ width: '64px', height: '64px', marginBottom: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem' }}>Database Connection Failed!</h1>
        <p style={{ fontSize: '1.15rem', maxWidth: '620px', lineHeight: 1.5 }}>
          The system could not connect to MongoDB. Please check the <code>MONGODB_URI</code> environment variable in your <code>.env.local</code> file.
        </p>
        <p style={{ marginTop: '0.75rem', opacity: 0.85, fontSize: '0.95rem' }}>
          <em>You can configure MongoDB or continue in Mock / Offline Mode using local mock datasets.</em>
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            Retry Connection
          </button>
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('sentosa_bypass_db_guard', 'true');
              }
              setDbOk(true);
              setIsFallback(true);
            }}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            Continue in Mock / Offline Mode &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isFallback && !bannerDismissed && (
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #fde68a',
          zIndex: 9999,
          position: 'relative'
        }}>
          <span>
            ⚡ <strong>Offline Mock Mode:</strong> MongoDB Atlas is disconnected. Running with local mock dataset &amp; LocalStorage.
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('sentosa_bypass_db_guard');
                }
                window.location.reload();
              }}
              style={{
                background: 'none',
                border: '1px solid #d97706',
                color: '#92400e',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Retry DB
            </button>
            <button 
              onClick={() => setBannerDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#92400e',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1
              }}
              title="Dismiss banner"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
