
"use client";

import { useQuery } from "@tanstack/react-query";
import { getActiveRcnIntakeBatchesAction } from "@/lib/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { AlertCircle, Package, Warehouse } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

function StockTable({ batches }: { batches: { id: string; available_kg: number }[] }) {
    if (!batches || batches.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No active RCN batches found in the warehouse.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableCaption>Current stock of all active RCN batches in the warehouse.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>RCN Intake Batch ID</TableHead>
                    <TableHead className="text-right">Available Quantity (kg)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {batches.map(batch => (
                    <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.id}</TableCell>
                        <TableCell className="text-right font-mono">{batch.available_kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function RcnStockCard({ metrics, className }: { metrics: any; className?: string }) {
    const { data: batches, isLoading, isError, error } = useQuery({
        queryKey: ['activeRcnIntakeBatches'],
        queryFn: getActiveRcnIntakeBatchesAction
    });

    const renderCardContent = () => {
        return (
            <MetricCard
              title="Current RCN Stock"
              value={metrics.rcnStockTonnes.toFixed(2)}
              unit="Tonnes"
              icon={Package}
              description={`${metrics.rcnStockKg.toLocaleString()} kg | ${metrics.rcnStockSufficiency}`}
              className="h-full cursor-pointer"
            />
        );
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className={cn(className)}>
                    {renderCardContent()}
                </div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><Warehouse /> RCN Stock Details</DialogTitle>
                     <DialogDescription>A complete list of all Raw Cashew Nut batches currently in the warehouse.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    {isLoading ? (
                        <div className="space-y-2 p-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-2/3" />
                        </div>
                    ) : isError ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <UiAlertTitle>Error Loading RCN Batches</UiAlertTitle>
                            <AlertDescription>{(error as Error).message}</AlertDescription>
                        </Alert>
                    ) : (
                        <StockTable batches={batches || []} />
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
