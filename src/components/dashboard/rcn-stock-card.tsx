

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

export function RcnStockCard({ className, metrics }: { className?: string, metrics?: DashboardMetrics }) {
    
    const renderContent = () => {
        if (!metrics) {
            return <Skeleton className="h-36 rounded-lg" />;
        }

        const { rcnStock } = metrics;

        return (
            <MetricCard
              title="Current RCN Stock"
              value={rcnStock.current.toFixed(2)}
              unit="Tonnes"
              icon={Package}
              description={rcnStock.sufficiencyMessage}
              className="h-full"
            />
        );
    };

    return (
        <div className={cn(className)}>
            {renderContent()}
        </div>
    );
}
