
"use client";

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNyangaWorkersAction } from '@/lib/nyanga-actions';
import { AddWorkerForm } from '@/components/nyanga-reports/add-worker-form';
import { DailyReportForm } from '@/components/nyanga-reports/daily-report-form';
import type { NyangaWorker } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NyangaReportsPage() {
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || 'Unknown Supervisor';
    setSupervisorName(name);
  }, []);

  const { data: workers, isLoading, isError, refetch } = useQuery<NyangaWorker[]>({
    queryKey: ['nyangaWorkers'],
    queryFn: getNyangaWorkersAction,
  });

  return (
    <div className="container mx-auto py-6">
       <div className="flex items-center gap-3 mb-6">
        <ListChecks className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Nyanga Production Log</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily Logging</CardTitle>
          <CardDescription>
            Use the tabs below to either enter the daily production for workers or to manage the worker list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="entry" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entry">
                <ListChecks className="mr-2 h-4 w-4" />
                Daily Entry
              </TabsTrigger>
              <TabsTrigger value="manage">
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Workers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="entry" className="pt-4">
              <DailyReportForm 
                workers={workers} 
                supervisorId={supervisorName} 
                isLoading={isLoading}
                isError={isError}
              />
            </TabsContent>
            <TabsContent value="manage" className="pt-4">
              <AddWorkerForm
                workers={workers}
                isLoading={isLoading}
                isError={isError}
                onRefresh={refetch}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
