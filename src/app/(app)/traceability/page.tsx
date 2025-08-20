
"use client";

import { redirect } from 'next/navigation';

// This page is obsolete and now redirects to the new unified traceability page.
// The content has been merged into /ai-summary/page.tsx
export default function ObsoleteTraceabilityPage() {
    redirect('/ai-summary');
}
