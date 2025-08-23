
"use client";

import { useQuery } from '@tanstack/react-query';
import { getInventoryLogsAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from 'lucide-react';
import { RecentDispatchesTable } from './inventory-tables';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

export function RecentDispatch() {
  const { data: logs, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryLogs'],
    queryFn: getInventoryLogsAction
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Logs</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      );
    }
    
    const dispatchLogs = logs?.filter(log => log.action === 'remove' || (log.action === 'update' && log.quantity < 0)) || [];

    return <RecentDispatchesTable data={dispatchLogs} />;
  };

  return (
    <Card className="lg:col-span-1">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send /> Recent Dispatch & Transfers</CardTitle>
            <CardDescription>Latest logs of items leaving the warehouse or being transferred internally.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
    </Card>
  );
}
