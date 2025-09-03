
"use client";

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getNyangaReportsAction } from '@/lib/nyanga-actions';
import type { NyangaReportData, NyangaReportEntry } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Download, Loader2, FileText, AlertCircle, Eye, User, UserPlus, RefreshCw, Code, TrendingUp, Calendar } from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfDay, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface WorkerSummary {
  workerId: string;
  workerName: string;
  dailyProduction: { [date: string]: number };
  totalKg: number;
  averageDailyKg: number;
  daysWorked: number;
}

interface DateSummary {
  date: string;
  formattedDate: string;
  totalKg: number;
  workerCount: number;
  averagePerWorker: number;
}

interface ProcessedReportData {
  workerSummaries: WorkerSummary[];
  dateSummaries: DateSummary[];
  overallTotal: number;
  periodDays: number;
  averageDailyTotal: number;
}

function processNyangaData(rawData: NyangaReportData[]): ProcessedReportData {
  const workerMap = new Map<string, WorkerSummary>();
  const dateMap = new Map<string, { totalKg: number; workerCount: number }>();
  
  // Process each report entry
  rawData.forEach(report => {
    const reportDate = format(parseISO(report.reportDate), 'yyyy-MM-dd');
    
    if (!dateMap.has(reportDate)) {
      dateMap.set(reportDate, { totalKg: 0, workerCount: 0 });
    }
    
    const dateData = dateMap.get(reportDate)!;
    
    // Process each worker entry in the report
    report.entries.forEach((entry: any) => {
      // Update worker summary
      if (!workerMap.has(entry.workerId)) {
        workerMap.set(entry.workerId, {
          workerId: entry.workerId,
          workerName: entry.workerName,
          dailyProduction: {},
          totalKg: 0,
          averageDailyKg: 0,
          daysWorked: 0
        });
      }
      
      const worker = workerMap.get(entry.workerId)!;
      
      // Add to worker's daily production
      if (!worker.dailyProduction[reportDate]) {
        worker.dailyProduction[reportDate] = 0;
      }
      worker.dailyProduction[reportDate] += entry.kg;
      
      // Update worker totals
      worker.totalKg += entry.kg;
      
      // Update date totals
      dateData.totalKg += entry.kg;
      dateData.workerCount = Math.max(dateData.workerCount, report.entries.length);
    });
  });
  
  // Calculate worker averages and days worked
  workerMap.forEach(worker => {
    const daysWithProduction = Object.keys(worker.dailyProduction).length;
    worker.daysWorked = daysWithProduction;
    worker.averageDailyKg = daysWithProduction > 0 ? worker.totalKg / daysWithProduction : 0;
  });
  
  // Convert date map to sorted array
  const dateSummaries = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      formattedDate: format(parseISO(date), 'MMM dd, yyyy'),
      totalKg: data.totalKg,
      workerCount: data.workerCount,
      averagePerWorker: data.workerCount > 0 ? data.totalKg / data.workerCount : 0
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate overall totals
  const overallTotal = Array.from(workerMap.values()).reduce((sum, worker) => sum + worker.totalKg, 0);
  const periodDays = dateSummaries.length;
  const averageDailyTotal = periodDays > 0 ? overallTotal / periodDays : 0;
  
  // Convert worker map to sorted array
  const workerSummaries = Array.from(workerMap.values())
    .sort((a, b) => b.totalKg - a.totalKg);
  
  return {
    workerSummaries,
    dateSummaries,
    overallTotal,
    periodDays,
    averageDailyTotal
  };
}

export default function ViewNyangaReportsPage() {
    const { toast } = useToast();
    const [isAdmin, setIsAdmin] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedReportData | null>(null);

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setIsAdmin(role === 'admin');
    }, []);

    const { data: rawData, isLoading, error } = useQuery({
        queryKey: ['nyangaReportsView'], // Use a consistent key
        queryFn: () => {
            const thirtyDaysAgo = subDays(new Date(), 30);
            const today = new Date();
            return getNyangaReportsAction({
                startDate: thirtyDaysAgo,
                endDate: today,
                reportType: 'all'
            });
        },
        onSuccess: (data) => {
            if (data && data.length > 0) {
                setProcessedData(processNyangaData(data));
            } else {
                setProcessedData(null);
            }
        },
        onError: (error) => {
            toast({
                title: "Error Fetching Reports",
                description: (error as Error).message || "Could not retrieve Nyanga reports.",
                variant: "destructive",
            });
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-lg text-muted-foreground">Loading reports...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to load reports: {(error as Error).message}</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Nyanga Production Reports</h1>
                </div>
                 {isAdmin && (
                    <Link href="/nyanga-reports/manage-workers">
                        <Button variant="outline">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Manage Workers
                        </Button>
                    </Link>
                )}
            </div>

            {!processedData ? (
                <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
                    <p className="text-muted-foreground">
                        No Nyanga production reports found for the selected period (last 30 days).
                    </p>
                    </div>
                </CardContent>
                </Card>
            ) : (
                <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><TrendingUp/>Total Production</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processedData.overallTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</div>
                        <p className="text-xs text-muted-foreground">
                        over {processedData.periodDays} days
                        </p>
                    </CardContent>
                    </Card>
                    
                    <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Calendar/>Daily Average</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processedData.averageDailyTotal.toFixed(1)} kg</div>
                        <p className="text-xs text-muted-foreground">
                        per day
                        </p>
                    </CardContent>
                    </Card>
                    
                    <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Users/>Workers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processedData.workerSummaries.length}</div>
                        <p className="text-xs text-muted-foreground">
                        active workers
                        </p>
                    </CardContent>
                    </Card>
                    
                    <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><FileText/>Reporting Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{processedData.periodDays}</div>
                        <p className="text-xs text-muted-foreground">
                        with production data
                        </p>
                    </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="workers">
                    <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="workers">Worker Performance</TabsTrigger>
                    <TabsTrigger value="dates">Daily Summary</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="workers">
                    <Card>
                        <CardHeader>
                        <CardTitle>Worker Performance Summary</CardTitle>
                        <CardDescription>
                            Individual production totals and averages for all workers in the last 30 days.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Worker Name</TableHead>
                                <TableHead className="text-right">Total Production (kg)</TableHead>
                                <TableHead className="text-right">Days Worked</TableHead>
                                <TableHead className="text-right">Daily Average (kg)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {processedData.workerSummaries.map((worker) => (
                                <TableRow key={worker.workerId}>
                                <TableCell className="font-medium">{worker.workerName}</TableCell>
                                <TableCell className="text-right font-mono">{worker.totalKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                                <TableCell className="text-right">{worker.daysWorked}</TableCell>
                                <TableCell className="text-right font-mono">{worker.averageDailyKg.toFixed(1)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                    </TabsContent>
                    
                    <TabsContent value="dates">
                    <Card>
                        <CardHeader>
                        <CardTitle>Daily Production Summary</CardTitle>
                        <CardDescription>
                            Production totals by date with worker counts for the last 30 days.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Total Production (kg)</TableHead>
                                <TableHead className="text-right">Workers</TableHead>
                                <TableHead className="text-right">Average per Worker (kg)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {processedData.dateSummaries.map((day) => (
                                <TableRow key={day.date}>
                                <TableCell className="font-medium">{day.formattedDate}</TableCell>
                                <TableCell className="text-right font-mono">{day.totalKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                                <TableCell className="text-right">{day.workerCount}</TableCell>
                                <TableCell className="text-right font-mono">{day.averagePerWorker.toFixed(1)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                    </TabsContent>
                    
                    <TabsContent value="raw">
                    <Card>
                        <CardHeader>
                        <CardTitle>Raw Report Data</CardTitle>
                        <CardDescription>
                            Original report data as stored in the database for the last 30 days. Useful for debugging.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <pre className="bg-muted p-4 rounded-md overflow-auto text-sm max-h-96">
                            {JSON.stringify(rawData, null, 2)}
                        </pre>
                        </CardContent>
                    </Card>
                    </TabsContent>
                </Tabs>
                </>
            )}
            </div>
    );
}

