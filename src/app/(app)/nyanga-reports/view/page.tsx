
"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Loader2, Eye, FileText, Download, AlertCircle } from 'lucide-react';
import { format, subDays, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { NyangaReportData } from '@/types';
import { PAY_RATE_PER_KG } from '@/lib/constants';

interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalKg: number;
  totalPay: number;
  dailyBreakdown: { [date: string]: number };
}

function generateWorkerSummary(reports: NyangaReportData[]): WorkerSummary[] {
    const summaryMap = new Map<string, { workerName: string, totalKg: number, dailyBreakdown: { [date: string]: number } }>();

    reports.forEach(report => {
        report.entries.forEach(entry => {
            if (!summaryMap.has(entry.workerId)) {
                summaryMap.set(entry.workerId, {
                    workerName: entry.workerName,
                    totalKg: 0,
                    dailyBreakdown: {}
                });
            }
            const workerRecord = summaryMap.get(entry.workerId)!;
            workerRecord.totalKg += entry.kg;

            const reportDateStr = format(parseISO(report.reportDate), 'yyyy-MM-dd');
            workerRecord.dailyBreakdown[reportDateStr] = (workerRecord.dailyBreakdown[reportDateStr] || 0) + entry.kg;
        });
    });

    return Array.from(summaryMap.entries()).map(([workerId, data]) => ({
        workerId,
        workerName: data.workerName,
        totalKg: data.totalKg,
        totalPay: data.totalKg * PAY_RATE_PER_KG,
        dailyBreakdown: data.dailyBreakdown,
    })).sort((a, b) => b.totalKg - a.totalKg);
}

function convertToSummarizedCSV(summary: WorkerSummary[], reports: NyangaReportData[]): string {
    if (summary.length === 0 || reports.length === 0) return "No data to export.";

    const allDates = reports.map(r => parseISO(r.reportDate));
    const startDate = allDates.reduce((a, b) => a < b ? a : b);
    const endDate = allDates.reduce((a, b) => a > b ? a : b);
    
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const dateHeaders = dateInterval.map(d => format(d, 'MMM dd'));
    
    const headers = ['Worker Name', ...dateHeaders, 'Total Kgs', 'Total Pay (TZS)'];
    
    const rows = summary.map(worker => {
        const row = [
            `"${worker.workerName}"`,
            ...dateInterval.map(d => {
                const dateStr = format(d, 'yyyy-MM-dd');
                return worker.dailyBreakdown[dateStr]?.toFixed(2) || '0.00';
            }),
            worker.totalKg.toFixed(2),
            worker.totalPay.toFixed(2)
        ];
        return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

export default function ViewNyangaReportsPage() {
  const { toast } = useToast();
  const [workerSummary, setWorkerSummary] = useState<WorkerSummary[]>([]);
  
  const { data: reports, isLoading, isError, error, refetch } = useQuery<NyangaReportData[]>({
    queryKey: ['nyangaReportsView'],
    queryFn: () => {
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      return getNyangaReportsAction({ startDate, endDate });
    },
    onSuccess: (data) => {
        if (data && data.length > 0) {
            setWorkerSummary(generateWorkerSummary(data));
        } else {
            setWorkerSummary([]);
        }
    },
  });

  const handleExport = () => {
    if (!workerSummary || !reports) {
      toast({ title: 'No data available to export.', variant: 'destructive' });
      return;
    }
    const csvData = convertToSummarizedCSV(workerSummary, reports);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyanga_payroll_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const workerCount = workerSummary.length;
  const description = `Summary for ${workerCount} worker(s) from the last 30 days.`;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">View Nyanga Reports</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Worker Payroll Summary</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button onClick={handleExport} disabled={!workerSummary || workerSummary.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Summary CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <p>Loading reports...</p>
            </div>
          )}
          {!isLoading && isError && (
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Reports</AlertTitle>
                  <AlertDescription>
                      <p>{(error as Error).message}</p>
                      <Button variant="link" onClick={() => refetch()} className="p-0 h-auto mt-2">Try refreshing the data</Button>
                  </AlertDescription>
              </Alert>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Total Kilograms</TableHead>
                  <TableHead className="text-right">Total Pay (TZS)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                      No reports found for the selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  workerSummary.map((worker) => (
                    <TableRow key={worker.workerId}>
                      <TableCell className="font-medium">{worker.workerName}</TableCell>
                      <TableCell className="text-right font-mono">{worker.totalKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{worker.totalPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableCaption>A summary of total production per worker for the selected period.</TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
