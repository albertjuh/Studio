"use client";

import { useQuery } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import { CalendarIcon, FileText } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { NyangaReportData } from '@/types';
import { NyangaReportSummary } from '@/components/reports/nyanga-report-summary';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';


export default function ViewNyangaReportsPage() {
  // Default to the last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });
  
  const { data: nyangaReports, isLoading: isLoadingNyanga } = useQuery<NyangaReportData[]>({
    queryKey: ['nyangaReportsSummaryView', { startDate: dateRange?.from, endDate: dateRange?.to }],
    queryFn: () => getNyangaReportsAction({ startDate: dateRange?.from!, endDate: dateRange?.to! }),
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 0, 
    refetchOnWindowFocus: true,
  });
  
  const displayDateRange = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
      : format(dateRange.from, 'LLL dd, y')
    : 'Select a date range';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Nyanga Production Reports</h1>
                 <p className="text-muted-foreground">
                    Displaying data for: {displayDateRange}
                 </p>
            </div>
        </div>
        <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayDateRange}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
        </div>
      </div>

      <NyangaReportSummary data={nyangaReports} isLoading={isLoadingNyanga} />
    </div>
  );
}
