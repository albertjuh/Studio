

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, PackagePlus, Send } from "lucide-react";
import { RecentDispatchesTable, RecentOtherMaterialsIntakeTable, RecentRcnIntakeTable } from '@/components/inventory/inventory-tables';
import { getInventoryLogsAction } from '@/lib/actions';
import type { InventoryLog } from '@/types';

export default async function InventoryPage() {
  let logs: InventoryLog[] = [];
  let error: string | null = null;

  try {
    logs = await getInventoryLogsAction();
  } catch (e) {
    error = (e as Error).message;
    console.error("Failed to load inventory logs:", e);
  }

  if (error) {
    return (
        <div className="container mx-auto py-6">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Logs</AlertTitle>
                <AlertDescription>
                    Could not load inventory logs at this time. Please try refreshing the page. Error: {error}
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  const rcnIntakeLogs = logs.filter(log => log.itemName?.includes('Raw Cashew Nuts') && log.action === 'add');
  const otherMaterialsLogs = logs.filter(log => !log.itemName?.includes('Raw Cashew Nuts') && log.action === 'add');
  const dispatchLogs = logs.filter(log => log.action === 'remove' || (log.action === 'update' && log.quantity < 0));

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Inventory Logs</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PackagePlus /> Recent Intake Activity</CardTitle>
                <CardDescription>Latest logs of materials and goods coming into the factory.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>

        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send /> Recent Dispatch & Transfers</CardTitle>
                <CardDescription>Latest logs of items leaving the warehouse or being transferred internally.</CardDescription>
            </CardHeader>
            <CardContent>
                <RecentDispatchesTable data={dispatchLogs} />
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
