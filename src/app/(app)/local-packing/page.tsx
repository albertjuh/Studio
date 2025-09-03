
"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReportDataAction } from '@/lib/actions';
import { PACKAGE_WEIGHT_KG } from '@/lib/constants';
import type { ReportDataPayload, PackagingFormValues } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface GradeSummary {
    grade: string;
    totalPacks: number;
    totalKg: number;
}

function generateGradeSummary(packagingLogs: PackagingFormValues[]): GradeSummary[] {
    const summaryMap = new Map<string, { totalPacks: number }>();

    packagingLogs.forEach(log => {
        if (log.packed_items) {
            log.packed_items.forEach(item => {
                const existing = summaryMap.get(item.kernel_grade);
                if (existing) {
                    existing.totalPacks += item.number_of_packs;
                } else {
                    summaryMap.set(item.kernel_grade, {
                        totalPacks: item.number_of_packs,
                    });
                }
            });
        }
    });
    
    const summaryArray = Array.from(summaryMap.entries()).map(([grade, data]) => ({
        grade,
        totalPacks: data.totalPacks,
        totalKg: data.totalPacks * PACKAGE_WEIGHT_KG,
    }));

    return summaryArray.sort((a, b) => b.totalKg - a.totalKg);
}

export default function LocalPackingPage() {
    const { toast } = useToast();
    const [gradeSummary, setGradeSummary] = useState<GradeSummary[]>([]);

    const { data: reportData, ...reportQuery } = useQuery({
        queryKey: ['localPackingReport'],
        queryFn: () => {
            const thirtyDaysAgo = subDays(new Date(), 30);
            const today = new Date();
            return getReportDataAction({
                startDate: thirtyDaysAgo,
                endDate: today,
                reportType: 'all' // Fetch all to filter client-side
            });
        },
        onSuccess: (data) => {
            if (data?.productionLogs) {
                const packagingLogs = data.productionLogs.filter(log => log.stage_name === 'Packaging') as PackagingFormValues[];
                setGradeSummary(generateGradeSummary(packagingLogs));
            }
        },
        onError: (error) => {
            toast({
                title: "Error Fetching Report",
                description: (error as Error).message || "Could not retrieve packaging report.",
                variant: "destructive",
            });
        }
    });

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-3 mb-6">
                <Package className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Local Packing Report</h2>
            </div>
            
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Packaging Summary</CardTitle>
                    <CardDescription>
                        Summary of all packed grades from the last 30 days.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {reportQuery.isFetching && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="ml-3 text-lg text-muted-foreground">Fetching packaging logs...</p>
                        </div>
                    )}
                    {reportQuery.isError && (
                         <Alert variant="destructive" className="my-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Failed to Fetch Report</AlertTitle>
                            <AlertDescription>
                                There was an error fetching data. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}
                    {reportData && !reportQuery.isFetching && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Grade</TableHead>
                                    <TableHead className="text-right">Total Packs</TableHead>
                                    <TableHead className="text-right">Total Weight (kg)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gradeSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">
                                            No packaging logs found for the last 30 days.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    gradeSummary.map(summary => (
                                        <TableRow key={summary.grade}>
                                            <TableCell className="font-medium">
                                              {summary.grade}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{summary.totalPacks.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-mono">{summary.totalKg.toFixed(2)} kg</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            <TableCaption>A summary of total production per kernel grade.</TableCaption>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
