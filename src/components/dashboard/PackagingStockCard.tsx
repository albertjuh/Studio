
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
import type { DashboardMetrics } from "@/types";

function StockTable({ metrics }: { metrics: DashboardMetrics['packagingStock'] }) {
    const stockItems = [
        { name: "White Plain Boxes", quantity: metrics.boxes.whitePlain, change: metrics.boxes.change },
        { name: "Painted Logo Boxes", quantity: metrics.boxes.paintedLogo, change: metrics.boxes.change },
        { name: "Vacuum Bags", quantity: metrics.vacuumBags.current, change: metrics.vacuumBags.change },
    ];
    
    return (
        <Table>
            <TableCaption>Current stock of main packaging materials.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stockItems.map(item => (
                    <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function PackagingStockCard({ className, metrics }: { className?: string, metrics?: DashboardMetrics }) {
    
    const renderContent = () => {
        if (!metrics) {
            return <Skeleton className="h-36 rounded-lg" />;
        }

        const { packagingStock } = metrics;
        const totalBoxes = packagingStock.boxes.whitePlain + packagingStock.boxes.paintedLogo;

        return (
            <MetricCard
              title="Packaging Stock"
              value={totalBoxes.toLocaleString()}
              unit="boxes"
              icon={Box}
              description={`+ ${packagingStock.vacuumBags.current.toLocaleString()} vacuum bags`}
              change={packagingStock.boxes.change}
              chartData={packagingStock.boxes.trend}
              className="h-full cursor-pointer"
              chartColor='hsl(var(--chart-2))'
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
                {metrics ? (
                    <StockTable metrics={metrics.packagingStock} />
                ) : (
                    <div className="space-y-2 p-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-2/3" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
