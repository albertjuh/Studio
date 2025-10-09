
"use client";

import { redirect } from 'next/navigation';

// This page acts as a redirector for the Nyanga reports section.
// It redirects to the 'view' page by default.
export default function NyangaReportsPage() {
    redirect('/nyanga-reports/view');
}
