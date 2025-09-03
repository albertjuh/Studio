
"use client";

import { useQuery } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import { FileText } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import type { NyangaReportData } from '@/types';
import { NyangaReportSummary } from '@/components/reports/nyanga-report-summary';
import { useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
        years.push(currentYear - i);
    }
    return years;
}

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
}));


export default function ViewNyangaReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const yearOptions = generateYearOptions();

  const handleYearChange = (year: string) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(year, 10));
    setSelectedDate(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(parseInt(month, 10));
    setSelectedDate(newDate);
  };
  
  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  const { data: nyangaReports, isLoading: isLoadingNyanga } = useQuery<NyangaReportData[]>({
    queryKey: ['nyangaReportsSummaryView', { startDate, endDate }],
    queryFn: () => getNyangaReportsAction({ startDate, endDate }),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Nyanga Production Reports</h1>
                 <p className="text-muted-foreground">
                    Displaying data for {format(selectedDate, 'MMMM yyyy')}
                 </p>
            </div>
        </div>
        <div className="flex gap-2">
            <Select
                value={String(selectedDate.getMonth())}
                onValueChange={handleMonthChange}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                    {monthOptions.map(month => (
                        <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <Select
                value={String(selectedDate.getFullYear())}
                onValueChange={handleYearChange}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                    {yearOptions.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <NyangaReportSummary data={nyangaReports} isLoading={isLoadingNyanga} />
    </div>
  );
}
