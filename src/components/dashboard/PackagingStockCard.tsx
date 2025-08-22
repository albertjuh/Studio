
"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardMetricsAction, getActiveVacuumBagBatchesAction } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { AlertCircle, Package, Box, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function StockTable({ metrics, cartonData }: { metrics: { whitePlainBoxesStock: number, paintedLogoBoxesStock: number }, cartonData?: InventoryItem[] }) {
    const stockItems = [
        { name: "White Plain Boxes", quantity: metrics.whitePlainBoxesStock, unit: "boxes" },
        { name: "Painted Logo Boxes", quantity: metrics.paintedLogoBoxesStock, unit: "boxes" },
    ];
    
    return (
        <div className="space-y-4">
            <Table>
                <TableCaption>Current stock of main packaging materials.</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stockItems.map(item => (
                        <TableRow key={item.name}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            {cartonData && cartonData.length > 0 && (
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border rounded-md px-4">
                        <AccordionTrigger className="font-semibold text-base py-3">
                           <div className="flex items-center gap-2">
                             Vacuum Bag Cartons
                             <span className="text-sm text-muted-foreground font-normal">
                                ({cartonData.reduce((sum, c) => sum + c.quantity, 0).toLocaleString()} bags total)
                             </span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Carton Batch</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead>Unit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cartonData.map(carton => (
                                        <TableRow key={carton.id}>
                                            <TableCell className="text-sm font-mono">{carton.name.replace('Vacuum Bags - Carton ', '')}</TableCell>
                                            <TableCell className="text-right font-mono">{carton.quantity.toLocaleString()}</TableCell>
                                            <TableCell>{carton.unit}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    );
}

export function PackagingStockCard({ className }: { className?: string }) {
    const { data: metrics, isLoading: isLoadingMetrics, isError: isErrorMetrics, error: errorMetrics } = useQuery({
        queryKey: ['dashboardMetrics'], // Re-uses the same query as the main dashboard client
        queryFn: getDashboardMetricsAction
    });

    const { data: cartonData, isLoading: isLoadingCartons, isError: isErrorCartons, error: errorCartons } = useQuery({
        queryKey: ['activeVacuumBagBatches'],
        queryFn: getActiveVacuumBagBatchesAction
    });


    const totalBoxes = (metrics?.whitePlainBoxesStock || 0) + (metrics?.paintedLogoBoxesStock || 0);

    const renderContent = () => {
        if (isLoadingMetrics) {
            return <Skeleton className="h-32 rounded-lg" />;
        }
        
        if (isErrorMetrics) {
             return (
                <MetricCard
                    title="Packaging Stock"
                    value="Error"
                    icon={AlertCircle}
                    description="Could not load data"
                    className="h-full border-destructive"
                />
            );
        }

        if (!metrics) {
             return (
                <MetricCard
                    title="Packaging Stock"
                    value="N/A"
                    icon={Package}
                    description="No data available"
                    className="h-full"
                />
            );
        }

        return (
            <MetricCard
              title="Packaging Stock"
              value={totalBoxes.toLocaleString()}
              unit="boxes"
              icon={Box}
              description={`+ ${metrics.vacuumBagsStock.toLocaleString()} vacuum bags`}
              className="h-full cursor-pointer"
            />
        );
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className={cn(className)}>
                    {renderContent()}
                </div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><Box /> Packaging Stock Details</DialogTitle>
                     <DialogDescription>A complete list of all packaging materials currently in stock.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    {isLoadingMetrics || isLoadingCartons ? (
                        <div className="space-y-2 p-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-2/3" />
                        </div>
                    ) : (
                        <>
                            {metrics && !isErrorMetrics && <StockTable metrics={metrics} cartonData={cartonData} />}
                            {isErrorMetrics && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <UiAlertTitle>Error Loading Box Metrics</UiAlertTitle>
                                    <AlertDescription>{(errorMetrics as Error).message}</AlertDescription>
                                </Alert>
                            )}
                            {isErrorCartons && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <UiAlertTitle>Error Loading Carton Details</UiAlertTitle>
                                    <AlertDescription>{(errorCartons as Error).message}</AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
