
"use client";

import { redirect } from 'next/navigation';

// This page is obsolete and has been replaced by the unified data entry dialog system.
export default function ObsoleteLocalPackingPage() {
    redirect('/coastal-insights/data-entry');
}
