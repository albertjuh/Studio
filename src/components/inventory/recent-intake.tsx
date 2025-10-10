
"use client";

import { useQuery } from '@tanstack/react-query';
import { getInventoryLogsAction } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackagePlus } from 'lucide-react';
import { RecentRcnIntakeTable, RecentOtherMaterialsIntakeTable } from './inventory-tables';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

export function RecentIntake() {
  const { data: logs, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryLogs'],
    queryFn: getInventoryLogsAction,
    refetchOnWindowFocus: false,
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

    const rcnIntakeLogs = logs?.filter(log => log.itemName?.includes('Raw Cashew Nuts') && log.action === 'add') || [];
    const otherMaterialsLogs = logs?.filter(log => !log.itemName?.includes('Raw Cashew Nuts') && log.action === 'add') || [];
    
    return (
        <Tabs defaultValue="rcn">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rcn">RCN Intake</TabsTrigger>
                <TabsTrigger value="other">Other Materials</TabsTrigger>
            </TabsList>
            <TabsContent value="rcn">
                <RecentRcnIntakeTable data={rcnIntakeLogs} />
            </TabsContent>
            <TabsContent value="other">
                <RecentOtherMaterialsIntakeTable data={otherMaterialsLogs} />
            </TabsContent>
        </Tabs>
    );
  };


  return (
    <Card className="lg:col-span-1">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><PackagePlus /> Recent Intake Activity</CardTitle>
            <CardDescription>Latest logs of materials and goods coming into the factory.</CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
    </Card>
  );
}
