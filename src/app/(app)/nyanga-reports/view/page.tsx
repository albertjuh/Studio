
"use client";

import { useQuery } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import { FileText } from 'lucide-react';
import { subDays } from 'date-fns';
import type { NyangaReportData } from '@/types';
import { NyangaReportSummary } from '@/components/reports/nyanga-report-summary';

export default function ViewNyangaReportsPage() {
  const { data: nyangaReports, isLoading: isLoadingNyanga } = useQuery<NyangaReportData[]>({
    queryKey: ['nyangaReportsSummaryView'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      return getNyangaReportsAction({ startDate, endDate });
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Nyanga Production Reports</h1>
        </div>
      </div>

      <NyangaReportSummary data={nyangaReports} isLoading={isLoadingNyanga} />
    </div>
  );
}
