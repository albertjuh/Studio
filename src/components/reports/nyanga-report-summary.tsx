
"use client";

import { useState, useEffect } from 'react';
import type { NyangaReportData, NyangaReportEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from '@/components/ui/table';
import { Loader2, UserX, Wallet, Download } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { PAY_RATE_PER_KG } from '@/lib/constants';
import { Button } from '../ui/button';


interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalKg: number;
  totalFirstPassKg: number;
  totalSecondPassKg: number;
  totalPay: number;
  dailyBreakdown: { 
      date: string; 
      kg: number; 
      firstPassKg: number;
      secondPassKg: number;
      pay: number;
    }[];
}

function generateWorkerSummary(reports: NyangaReportData[]): WorkerSummary[] {
    const summaryMap = new Map<string, { workerName: string; totalKg: number; totalFirstPassKg: number; totalSecondPassKg: number; dailyBreakdown: Map<string, NyangaReportEntry> }>();

    reports.forEach(report => {
        const reportDateStr = format(parseISO(report.reportDate), 'yyyy-MM-dd');
        report.entries.forEach(entry => {
            let workerRecord = summaryMap.get(entry.workerId);

            if (!workerRecord) {
                workerRecord = {
                    workerName: entry.workerName,
                    totalKg: 0,
                    totalFirstPassKg: 0,
                    totalSecondPassKg: 0,
                    dailyBreakdown: new Map<string, NyangaReportEntry>(),
                };
            }

            const totalKgForEntry = (entry.firstPassKg || 0) + (entry.secondPassKg || 0);

            workerRecord.totalKg += totalKgForEntry;
            workerRecord.totalFirstPassKg += entry.firstPassKg || 0;
            workerRecord.totalSecondPassKg += entry.secondPassKg || 0;
            
            const existingDailyEntry = workerRecord.dailyBreakdown.get(reportDateStr) || { kg: 0, firstPassKg: 0, secondPassKg: 0, workerId: entry.workerId, workerName: entry.workerName };
            existingDailyEntry.kg += totalKgForEntry;
            existingDailyEntry.firstPassKg += entry.firstPassKg || 0;
            existingDailyEntry.secondPassKg += entry.secondPassKg || 0;
            workerRecord.dailyBreakdown.set(reportDateStr, existingDailyEntry);

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
        dailyBreakdown: Array.from(data.dailyBreakdown.entries())
            .map(([date, dailyData]) => ({ 
                date, 
                kg: dailyData.kg,
                firstPassKg: dailyData.firstPassKg,
                secondPassKg: dailyData.secondPassKg,
                pay: dailyData.kg * PAY_RATE_PER_KG,
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    })).sort((a, b) => b.totalKg - a.totalKg);
}

interface NyangaReportSummaryProps {
    data: NyangaReportData[] | undefined;
    isLoading: boolean;
}

export function NyangaReportSummary({ data, isLoading }: NyangaReportSummaryProps) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setIsAdmin(role === 'admin');
    }, []);

    const workerSummary = data ? generateWorkerSummary(data) : [];
    const totalKilograms = workerSummary.reduce((sum, worker) => sum + worker.totalKg, 0);
    const totalPay = workerSummary.reduce((sum, worker) => sum + worker.totalPay, 0);
    
    const handleExportCSV = () => {
        const headers = ["Date", "Worker Name", "1st Pass (kg)", "2nd Pass (kg)", "Total Kilograms", "Pay (TZS)"];
        const allDailyRows: string[] = [];

        // Create a flat array of all daily entries from all workers
        workerSummary.forEach(worker => {
            worker.dailyBreakdown.forEach(day => {
                allDailyRows.push([
                    format(parseISO(day.date), 'yyyy-MM-dd'),
                    `"${worker.workerName.replace(/"/g, '""')}"`,
                    day.firstPassKg.toFixed(2),
                    day.secondPassKg.toFixed(2),
                    day.kg.toFixed(2),
                    day.pay.toFixed(2)
                ].join(','));
            });
        });
        
        // Sort all rows by date (newest first) then by worker name
        allDailyRows.sort((a, b) => {
            const aDate = a.split(',')[0];
            const bDate = b.split(',')[0];
            const aName = a.split(',')[1];
            const bName = b.split(',')[1];

            if (aDate < bDate) return 1;
            if (aDate > bDate) return -1;
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return 0;
        });

        const csvContent = [headers.join(','), ...allDailyRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const reportDate = data?.[0]?.reportDate ? format(parseISO(data[0].reportDate), 'MMMM_yyyy') : 'report';
        link.setAttribute("href", url);
        link.setAttribute("download", `Nyanga_Daily_Detail_Report_${reportDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-muted-foreground" />
                        Nyanga Worker Production
                    </CardTitle>
                    <CardDescription>Calculating worker totals...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
             </Card>
        )
    }
    
    if (!data || data.length === 0) {
        return (
             <Card>
                <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-muted-foreground" />
                        Nyanga Worker Production
                    </CardTitle>
                    <CardDescription>Summary of worker production for the selected period.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-muted-foreground">
                    <UserX className="mx-auto h-12 w-12" />
                    <p className="mt-4">No Nyanga production data found for the selected period.</p>
                </CardContent>
             </Card>
        );
    }
    
    const handleRowClick = (worker: WorkerSummary) => {
        if (isAdmin) {
            setSelectedWorker(worker);
        }
    };

    return (
        <Dialog open={!!selectedWorker} onOpenChange={(isOpen) => !isOpen && setSelectedWorker(null)}>
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-6 w-6 text-primary" />
                            Nyanga Worker Production
                        </CardTitle>
                        <CardDescription>
                            A summary of total kilograms produced by each Nyanga team worker.
                            {isAdmin && ' Click a row for details.'}
                        </CardDescription>
                    </div>
                     <Button variant="outline" onClick={handleExportCSV} disabled={workerSummary.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Daily Detail CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Worker</TableHead>
                            <TableHead className="text-right">Total Kilograms</TableHead>
                             {isAdmin && <TableHead className="text-right text-primary">Total Pay (TZS)</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workerSummary.length > 0 ? (
                                workerSummary.map((worker) => (
                                    <TableRow
                                        key={worker.workerId}
                                        onClick={() => handleRowClick(worker)}
                                        className={cn(isAdmin && 'cursor-pointer hover:bg-muted/50')}
                                    >
                                        <TableCell className="font-medium">{worker.workerName}</TableCell>
                                        <TableCell className="text-right font-mono">{worker.totalKg.toFixed(2)} kg</TableCell>
                                        {isAdmin && <TableCell className="text-right font-mono text-primary font-semibold">{worker.totalPay.toLocaleString('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}</TableCell>}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 3 : 2} className="text-center h-24">
                                        No Nyanga production data found for the selected period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell className="font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold font-mono">{totalKilograms.toFixed(2)} kg</TableCell>
                                {isAdmin && (
                                    <TableCell className="text-right font-bold font-mono text-primary">
                                        {totalPay.toLocaleString('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Daily Production for {selectedWorker?.workerName}</DialogTitle>
                    <DialogDescription>
                        A day-by-day breakdown of production for the selected worker.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">1st Pass (kg)</TableHead>
                                <TableHead className="text-right">2nd Pass (kg)</TableHead>
                                <TableHead className="text-right">Total (kg)</TableHead>
                                <TableHead className="text-right text-primary">Pay (TZS)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedWorker?.dailyBreakdown.map(({ date, kg, firstPassKg, secondPassKg, pay }) => (
                                <TableRow key={date}>
                                    <TableCell>{format(parseISO(date), 'PPP')}</TableCell>
                                    <TableCell className="text-right font-mono">{firstPassKg.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono">{secondPassKg.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{kg.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-mono text-primary">{pay.toLocaleString('en-US', { minimumFractionDigits: 0 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow>
                                <TableCell className="font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold font-mono">{selectedWorker?.totalFirstPassKg.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold font-mono">{selectedWorker?.totalSecondPassKg.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold font-mono">{selectedWorker?.totalKg.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold font-mono text-primary">{selectedWorker?.totalPay.toLocaleString('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

    