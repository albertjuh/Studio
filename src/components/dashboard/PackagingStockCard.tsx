
"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardMetricsAction } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { AlertCircle, Package, Box } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";


function StockTable({ metrics }: { metrics: { whitePlainBoxesStock: number, paintedLogoBoxesStock: number, vacuumBagsStock: number } }) {
    const stockItems = [
        { name: "White Plain Boxes", quantity: metrics.whitePlainBoxesStock, unit: "boxes" },
        { name: "Painted Logo Boxes", quantity: metrics.paintedLogoBoxesStock, unit: "boxes" },
        { name: "Vacuum Bags", quantity: metrics.vacuumBagsStock, unit: "bags" },
    ];
    
    return (
        <Table>
            <TableCaption>Current stock of packaging materials.</TableCaption>
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
    );
}

export function PackagingStockCard({ className }: { className?: string }) {
    const { data: metrics, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardMetrics'], // Re-uses the same query as the main dashboard client
        queryFn: getDashboardMetricsAction
    });

    const totalBoxes = (metrics?.whitePlainBoxesStock || 0) + (metrics?.paintedLogoBoxesStock || 0);

    const renderContent = () => {
        if (isLoading) {
            return <Skeleton className="h-32 rounded-lg" />;
        }
        
        if (isError) {
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

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><Box /> Packaging Stock Details</DialogTitle>
                     <DialogDescription>A complete list of all packaging materials currently in stock.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto">
                    {metrics && !isError && <StockTable metrics={metrics} />}
                     {isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <UiAlertTitle>Error Loading Data</UiAlertTitle>
                            <AlertDescription>{(error as Error).message}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
