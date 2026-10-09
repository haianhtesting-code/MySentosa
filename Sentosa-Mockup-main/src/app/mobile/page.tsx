'use client';

import React, { useEffect } from 'react';

export default function MobileMockupPage() {
  useEffect(() => {
    document.body.classList.add('mobile-standalone');
    document.body.classList.add('nav-hidden');
    return () => {
      document.body.classList.remove('mobile-standalone');
      document.body.classList.remove('nav-hidden');
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', background: '#0F172A' }}>
      <iframe
        src="/mobile.html"
        title="Sentosa CMS Field Mobile Simulator"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}
