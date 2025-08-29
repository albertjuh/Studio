
"use client";

import { useQuery } from '@tanstack/react-query';
import { getNyangaWorkersAction } from '@/lib/nyanga-actions';
import type { NyangaWorker } from '@/types';
import { DailyReportForm } from './daily-report-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface NyangaReportManagerProps {
    supervisorId: string;
}

export function NyangaReportManager({ supervisorId }: NyangaReportManagerProps) {
    const { data: workers, isLoading, isError, error } = useQuery<NyangaWorker[]>({
        queryKey: ['nyangaWorkers'],
        queryFn: getNyangaWorkersAction,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-lg text-muted-foreground">Loading worker data...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Workers</AlertTitle>
                <AlertDescription>{(error as Error).message || "Could not load the list of workers."}</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Daily Report</CardTitle>
                <CardDescription>
                    Enter the production details for each worker for the selected date and shift.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <DailyReportForm workers={workers || []} supervisorId={supervisorId} />
            </CardContent>
        </Card>
    );
}
