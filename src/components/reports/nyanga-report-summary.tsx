
"use client";

import { useState, useEffect } from 'react';
import type { NyangaReportData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Loader2, UserX, Wallet } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { PAY_RATE_PER_KG } from '@/lib/constants';


interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalKg: number;
  totalPay: number;
  dailyBreakdown: { date: string; kg: number; pay: number }[];
}

function generateWorkerSummary(reports: NyangaReportData[]): WorkerSummary[] {
    const summaryMap = new Map<string, { workerName: string; totalKg: number; dailyBreakdown: Map<string, number> }>();

    reports.forEach(report => {
        const reportDateStr = format(parseISO(report.reportDate), 'yyyy-MM-dd');
        report.entries.forEach(entry => {
            let workerRecord = summaryMap.get(entry.workerId);

            if (!workerRecord) {
                // If worker is not in the map, initialize their record
                workerRecord = {
                    workerName: entry.workerName,
                    totalKg: 0,
                    dailyBreakdown: new Map<string, number>(),
                };
                summaryMap.set(entry.workerId, workerRecord);
            }

            // Add the current entry's kilograms to the worker's total
            workerRecord.totalKg += entry.kg;
            
            // Add the kilograms to the daily breakdown for that specific date
            const existingDailyKg = workerRecord.dailyBreakdown.get(reportDateStr) || 0;
            workerRecord.dailyBreakdown.set(reportDateStr, existingDailyKg + entry.kg);
        });
    });

    return Array.from(summaryMap.entries()).map(([workerId, data]) => ({
        workerId,
        workerName: data.workerName,
        totalKg: data.totalKg,
        totalPay: data.totalKg * PAY_RATE_PER_KG,
        dailyBreakdown: Array.from(data.dailyBreakdown.entries())
            .map(([date, kg]) => ({ 
                date, 
                kg,
                pay: kg * PAY_RATE_PER_KG,
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
    
    const workerSummary = generateWorkerSummary(data);

    const handleRowClick = (worker: WorkerSummary) => {
        if (isAdmin) {
            setSelectedWorker(worker);
        }
    };

    return (
        <Dialog open={!!selectedWorker} onOpenChange={(isOpen) => !isOpen && setSelectedWorker(null)}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-primary" />
                        Nyanga Worker Production
                    </CardTitle>
                    <CardDescription>
                        A summary of total kilograms produced by each Nyanga team worker.
                        {isAdmin && ' Click a row for details.'}
                    </CardDescription>
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
                    </Table>
                </CardContent>
            </Card>

            <DialogContent className="max-w-2xl">
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
                                <TableHead className="text-right">Kilograms</TableHead>
                                <TableHead className="text-right text-primary">Pay (TZS)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedWorker?.dailyBreakdown.map(({ date, kg, pay }) => (
                                <TableRow key={date}>
                                    <TableCell>{format(parseISO(date), 'PPP')}</TableCell>
                                    <TableCell className="text-right font-mono">{kg.toFixed(2)} kg</TableCell>
                                    <TableCell className="text-right font-mono text-primary">{pay.toLocaleString('en-US', { minimumFractionDigits: 0 })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
