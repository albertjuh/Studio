
"use client";

import type { NyangaReportData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import { PAY_RATE_PER_KG } from '@/lib/constants';

interface WorkerSummary {
  workerId: string;
  workerName: string;
  totalKg: number;
}

function generateWorkerSummary(reports: NyangaReportData[]): WorkerSummary[] {
    const summaryMap = new Map<string, { workerName: string, totalKg: number }>();

    reports.forEach(report => {
        report.entries.forEach(entry => {
            if (!summaryMap.has(entry.workerId)) {
                summaryMap.set(entry.workerId, {
                    workerName: entry.workerName,
                    totalKg: 0,
                });
            }
            const workerRecord = summaryMap.get(entry.workerId)!;
            workerRecord.totalKg += entry.kg;
        });
    });

    return Array.from(summaryMap.values()).map(data => ({
        workerId: data.workerName, // Simple key for this context
        workerName: data.workerName,
        totalKg: data.totalKg,
    })).sort((a, b) => b.totalKg - a.totalKg);
}

interface NyangaReportSummaryProps {
    data: NyangaReportData[] | undefined;
    isLoading: boolean;
}

export function NyangaReportSummary({ data, isLoading }: NyangaReportSummaryProps) {

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Nyanga Worker Production (Last 30 Days)</CardTitle>
                    <CardDescription>Calculating worker totals...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
             </Card>
        )
    }
    
    if (!data || data.length === 0) {
        return null; // Don't show the card if there's no data
    }
    
    const workerSummary = generateWorkerSummary(data);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nyanga Worker Production (Last 30 Days)</CardTitle>
                <CardDescription>A summary of total kilograms produced by each Nyanga team worker.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead className="text-right">Total Kilograms Produced</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workerSummary.length > 0 ? (
                            workerSummary.map((worker) => (
                                <TableRow key={worker.workerId}>
                                <TableCell className="font-medium">{worker.workerName}</TableCell>
                                <TableCell className="text-right font-mono">{worker.totalKg.toFixed(2)} kg</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No Nyanga production data found for the last 30 days.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableCaption>This summary shows data from the last 30 days.</TableCaption>
                </Table>
            </CardContent>
        </Card>
    )
}
