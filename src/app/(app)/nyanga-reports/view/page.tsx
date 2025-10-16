
"use client";

import { useQuery } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import { CalendarIcon, FileText, Share2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { NyangaReportData, WorkerSummary } from '@/types';
import { NyangaReportSummary } from '@/components/reports/nyanga-report-summary';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAY_RATE_PER_KG } from '@/lib/constants';


export default function ViewNyangaReportsPage() {
  // Default to the last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });
  
  const { data: nyangaReports, isLoading: isLoadingNyanga } = useQuery<NyangaReportData[]>({
    queryKey: ['nyangaReportsSummaryView', { startDate: dateRange?.from, endDate: dateRange?.to }],
    fn: () => getNyangaReportsAction({ startDate: dateRange?.from!, endDate: dateRange?.to! }),
    enabled: !!dateRange?.from && !!dateRange?.to,
    staleTime: 0, 
    refetchOnWindowFocus: true,
  });
  
  const displayDateRange = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
      : format(dateRange.from, 'LLL dd, y')
    : 'Select a date range';

  const generateReportText = (workerSummary: WorkerSummary[]) => {
      const totalKilograms = workerSummary.reduce((sum, worker) => sum + worker.totalKg, 0);
      const totalPay = workerSummary.reduce((sum, worker) => sum + worker.totalPay, 0);
      
      let report = `*Nyanga Production Report*\n`;
      report += `*Period:* ${displayDateRange}\n\n`;
      
      workerSummary.forEach(worker => {
          report += `*${worker.workerName}:*\n`;
          report += `- Total KG: ${worker.totalKg.toFixed(2)}\n`;
          report += `- Total Pay: ${worker.totalPay.toLocaleString('en-US', { style: 'currency', currency: 'TZS' })}\n\n`;
      });
      
      report += `*Grand Totals:*\n`;
      report += `- Total KG: ${totalKilograms.toFixed(2)}\n`;
      report += `- Total Pay: ${totalPay.toLocaleString('en-US', { style: 'currency', currency: 'TZS' })}\n`;
      
      return report;
  };

  const handleShare = (method: 'whatsapp' | 'email') => {
      if (!nyangaReports) return;
      
      const workerSummary = generateWorkerSummary(nyangaReports);
      const reportText = generateReportText(workerSummary);

      if (method === 'whatsapp') {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
          window.open(whatsappUrl, '_blank');
      } else if (method === 'email') {
          const subject = `Nyanga Production Report: ${displayDateRange}`;
          const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
          window.location.href = mailtoUrl;
      }
  };

  const generateWorkerSummary = (reports: NyangaReportData[]): WorkerSummary[] => {
    const summaryMap = new Map<string, { workerName: string; totalKg: number; totalFirstPassKg: number; totalSecondPassKg: number; dailyBreakdown: Map<string, any> }>();

    reports.forEach(report => {
        const reportDateStr = format(new Date(report.reportDate), 'yyyy-MM-dd');
        report.entries.forEach(entry => {
            let workerRecord = summaryMap.get(entry.workerId);

            if (!workerRecord) {
                workerRecord = {
                    workerName: entry.workerName,
                    totalKg: 0,
                    totalFirstPassKg: 0,
                    totalSecondPassKg: 0,
                    dailyBreakdown: new Map<string, any>(),
                };
            }

            const totalKgForEntry = (entry.firstPassKg || 0) + (entry.secondPassKg || 0);
            workerRecord.totalKg += totalKgForEntry;
            workerRecord.totalFirstPassKg += entry.firstPassKg || 0;
            workerRecord.totalSecondPassKg += entry.secondPassKg || 0;
            summaryMap.set(entry.workerId, workerRecord);
        });
    });

    return Array.from(summaryMap.entries()).map(([workerId, data]) => ({
        workerId,
        workerName: data.workerName,
        totalKg: data.totalKg,
        totalFirstPassKg: data.totalFirstPassKg,
        totalSecondPassKg: data.totalSecondPassKg,
        totalPay: data.totalKg * PAY_RATE_PER_KG,
        dailyBreakdown: [], // Not needed for this summary text
    })).sort((a, b) => b.totalKg - a.totalKg);
};

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
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!nyangaReports || nyangaReports.length === 0}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>Share to WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('email')}>Share via Email</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <NyangaReportSummary data={nyangaReports} isLoading={isLoadingNyanga} />
    </div>
  );
}
