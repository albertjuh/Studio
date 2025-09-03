
"use client";

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import type { NyangaReportData, ReportFilterState } from '@/types';
import { ReportFilters } from '@/components/reports/report-filters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Download, Loader2, FileText, AlertCircle, Eye } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function convertToCSV(data: NyangaReportData[]) {
    if (!data || data.length === 0) return '';
    
    const headers = ['Report ID', 'Report Date', 'Shift', 'Supervisor', 'Worker Name', 'Kilograms'];
    const csvRows = [headers.join(',')];

    for (const report of data) {
        const reportDate = format(new Date(report.reportDate), 'yyyy-MM-dd');
        for (const entry of report.entries) {
            const row = [
                report.id,
                reportDate,
                report.shift,
                report.supervisorId,
                `"${entry.workerName.replace(/"/g, '""')}"`,
                entry.kg
            ];
            csvRows.push(row.join(','));
        }
    }
    return csvRows.join('\n');
}

export default function ViewNyangaReportsPage() {
    const { toast } = useToast();
    const [reportData, setReportData] = useState<NyangaReportData[] | null>(null);

    const reportMutation = useMutation({
        mutationFn: getNyangaReportsAction,
        onSuccess: (data) => {
            setReportData(data);
        },
        onError: (error) => {
            toast({
                title: "Error Fetching Reports",
                description: (error as Error).message || "Could not retrieve Nyanga reports.",
                variant: "destructive",
            });
        }
    });

    // Auto-fetch reports on initial load for the last 30 days
    useEffect(() => {
        const thirtyDaysAgo = subDays(new Date(), 30);
        const today = new Date();
        const initialFilters: ReportFilterState = {
            startDate: thirtyDaysAgo,
            endDate: today,
            reportType: 'all'
        };
        reportMutation.mutate(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount


    const handleFilterChange = (filters: ReportFilterState) => {
        reportMutation.mutate(filters);
    };

    const handleExport = () => {
        if (!reportData) {
            toast({ title: "No Data to Export", description: "Please generate a report first.", variant: "destructive" });
            return;
        }
        const csv = convertToCSV(reportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nyanga_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Export Successful", description: "The Nyanga report has been downloaded." });
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-3 mb-6">
                <Eye className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight text-foreground">View Nyanga Reports</h2>
            </div>
            
            <ReportFilters onFilterChange={handleFilterChange} />

            <Card className="mt-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Generated Report</CardTitle>
                            <CardDescription>
                                {reportData ? `Showing ${reportData.length} report(s) with a total of ${reportData.reduce((sum, r) => sum + r.entries.length, 0)} entries.` : "Apply filters to view reports."}
                            </CardDescription>
                        </div>
                        <Button onClick={handleExport} disabled={!reportData || reportData.length === 0 || reportMutation.isPending}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reportMutation.isPending && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="ml-3 text-lg text-muted-foreground">Fetching reports...</p>
                        </div>
                    )}
                    {reportMutation.isError && (
                         <Alert variant="destructive" className="my-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Failed to Fetch Reports</AlertTitle>
                            <AlertDescription>
                                There was an error fetching data. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}
                    {reportData && !reportMutation.isPending && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Shift</TableHead>
                                    <TableHead>Worker</TableHead>
                                    <TableHead>Supervisor</TableHead>
                                    <TableHead className="text-right">Kilograms</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            No reports found for the selected date range.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.flatMap(report => 
                                        report.entries.map((entry, index) => (
                                            <TableRow key={`${report.id}-${entry.workerId}-${index}`}>
                                                <TableCell>{format(new Date(report.reportDate), 'PPP')}</TableCell>
                                                <TableCell>{report.shift}</TableCell>
                                                <TableCell className="font-medium">{entry.workerName}</TableCell>
                                                <TableCell>{report.supervisorId}</TableCell>
                                                <TableCell className="text-right font-mono">{entry.kg.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    )
                                )}
                            </TableBody>
                            <TableCaption>A detailed list of all production entries for the selected period.</TableCaption>
                        </Table>
                    )}
                    {!reportData && !reportMutation.isPending && !reportMutation.isError && (
                        <div className="text-center py-10 border rounded-lg bg-card mt-6">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-medium text-foreground">No Report Generated</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Apply filters above to generate and view a report.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
