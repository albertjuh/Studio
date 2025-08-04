
"use client";

import { Star } from 'lucide-react';
import { NyangaReportManager } from '@/components/nyanga-reports/nyanga-report-manager';

export default function NyangaReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <Star className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Nyanga Reports</h2>
      </div>

      <div className="max-w-4xl mx-auto">
        <NyangaReportManager />
      </div>
    </div>
  );
}
