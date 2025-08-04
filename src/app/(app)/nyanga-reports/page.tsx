
"use client";

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNyangaWorkersAction } from '@/lib/nyanga-actions';
import { Star, AlertCircle, Loader2 } from 'lucide-react';
import { AddWorkerForm } from '@/components/nyanga-reports/add-worker-form';
import { DailyReportForm } from '@/components/nyanga-reports/daily-report-form';
import type { NyangaWorker } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NyangaReportsPage() {
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const { data: workers, isLoading, isError, error } = useQuery<NyangaWorker[]>({
    queryKey: ['nyangaWorkers'],
    queryFn: getNyangaWorkersAction,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Workers</AlertTitle>
          <AlertDescription>
            Could not load the list of Nyanga workers. Error: {(error as Error).message}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!workers || !supervisorName) {
        return <Loader2 className="animate-spin" />;
    }

    return <DailyReportForm workers={workers} supervisorId={supervisorName} />;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 mb-6">
        <Star className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Nyanga Reports</h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Daily Production Entry</CardTitle>
                    <CardDescription>Enter the kilograms (kg) produced by each worker for the selected shift and date.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <AddWorkerForm />
        </div>
      </div>
    </div>
  );
}
