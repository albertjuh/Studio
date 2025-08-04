
"use client";

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNyangaWorkersAction } from '@/lib/nyanga-actions';
import { AddWorkerForm } from '@/components/nyanga-reports/add-worker-form';
import { DailyReportForm } from '@/components/nyanga-reports/daily-report-form';
import type { NyangaWorker } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, UserPlus } from 'lucide-react';

export function NyangaReportManager() {
  const [supervisorName, setSupervisorName] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    // Reading from localStorage must be done in useEffect to avoid server/client mismatch
    const name = localStorage.getItem('supervisorName') || 'Unknown Supervisor';
    setSupervisorName(name);
  }, []);

  const { data: workers, isLoading, isError, refetch } = useQuery<NyangaWorker[]>({
    queryKey: ['nyangaWorkers'],
    queryFn: getNyangaWorkersAction,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nyanga Production Log</CardTitle>
        <CardDescription>
          Record daily production for manual peeling/refinement workers and manage the worker list.
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
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] })}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
