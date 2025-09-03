
"use client";

import { redirect } from 'next/navigation';

// This page is now obsolete for data entry and redirects to the view page.
// Data entry has been moved to a modal in /data-entry.
export default function ObsoleteNyangaPage() {
  redirect('/nyanga-reports/view');
}
