'use client';

import React from 'react';
import LandingOverlay from '@/components/LandingOverlay';

export default function HomePage() {
  return (
    <main className="app-container">
      <LandingOverlay
        exiting={false}
      />
    </main>
  );
}
