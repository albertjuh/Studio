
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
import { PackagingForm } from '@/components/data-entry/packaging-form';

interface GradeSummary {
    grade: string;
    totalPacks: number;
    totalKg: number;
}

function generateGradeSummary(packagingLogs: PackagingFormValues[]): GradeSummary[] {
    const summaryMap = new Map<string, { totalPacks: number }>();

    packagingLogs.forEach(log => {
        if (log.packed_items && Array.isArray(log.packed_items)) {
            log.packed_items.forEach(item => {
                 if (item.kernel_grade && item.number_of_packs) {
                    const existing = summaryMap.get(item.kernel_grade);
                    if (existing) {
                        existing.totalPacks += item.number_of_packs;
                    } else {
                        summaryMap.set(item.kernel_grade, {
                            totalPacks: item.number_of_packs,
                        });
                    }
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
                reportType: 'packaging' 
            });
        },
        onSuccess: (data) => {
            if (data?.productionLogs) {
                setGradeSummary(generateGradeSummary(data.productionLogs as PackagingFormValues[]));
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
        <div className="container mx-auto py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="h-5 w-5 text-primary" />
                           Log New Packed Goods
                        </CardTitle>
                        <CardDescription>
                            Use this form to record a new packaging run. This will add to your finished goods inventory.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <PackagingForm onFormDirtyChange={() => {}} />
                    </CardContent>
                </Card>
            </div>
            
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Packaging Summary (Last 30 Days)</CardTitle>
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
                                               {reportData.productionLogs.length === 0 
                                                    ? "No production logs found for the last 30 days."
                                                    : "No packaging data found in the logs."}
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
        </div>
    );
}
