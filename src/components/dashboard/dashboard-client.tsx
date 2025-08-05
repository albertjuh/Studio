
"use client";

import { useQuery } from '@tanstack/react-query';
import { getDashboardMetricsAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertsMetricCard } from '@/components/dashboard/alerts-metric-card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCircle, Package, Warehouse, Loader2 } from 'lucide-react';
import { FinishedGoodsStock } from '@/components/dashboard/finished-goods-stock';
import { DailySummarySection } from '@/components/dashboard/daily-summary-section';
import { Skeleton } from '../ui/skeleton';


export function DashboardClient() {
    const { data: metrics, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: getDashboardMetricsAction,
        refetchInterval: 300000, // Refetch every 5 minutes
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                </div>
                 <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Dashboard</AlertTitle>
                <AlertDescription>
                    Could not load dashboard data at this time. Error: {(error as Error).message}
                </AlertDescription>
            </Alert>
        );
    }
    
    if (!metrics) {
         return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Data Available</AlertTitle>
                <AlertDescription>
                    There is no data to display on the dashboard yet. Start by logging some data.
                </AlertDescription>
            </Alert>
        );
    }


    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Current RCN Stock"
                  value={metrics.rcnStockTonnes.toFixed(2)}
                  unit="Tonnes"
                  icon={Package}
                  description={`${metrics.rcnStockKg.toLocaleString()} kg | ${metrics.rcnStockSufficiency}`}
                />
                <MetricCard
                  title="Vacuum Bags in Stock"
                  value={metrics.vacuumBagsStock.toLocaleString()}
                  unit="bags"
                  icon={Warehouse}
                  description="Available for packaging"
                />
                <MetricCard
                  title="Plain & Logo Boxes"
                  value={(metrics.whitePlainBoxesStock + metrics.paintedLogoBoxesStock).toLocaleString()}
                  unit="boxes"
                  icon={Warehouse}
                  description={`Plain: ${metrics.whitePlainBoxesStock} | Logo: ${metrics.paintedLogoBoxesStock}`}
                />
                <AlertsMetricCard alerts={metrics.alerts} />
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <DailySummarySection className="lg:col-span-1" />
              <FinishedGoodsStock className="lg:col-span-1" />
            </div>
        </div>
    );
}
