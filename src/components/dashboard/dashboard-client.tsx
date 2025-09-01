
"use client";

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getDashboardMetricsAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertsMetricCard } from '@/components/dashboard/alerts-metric-card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCircle, Package, Warehouse, Wrench, Loader2, Box } from 'lucide-react';
import { FinishedGoodsStock } from '@/components/dashboard/finished-goods-stock';
import { DailySummarySection } from '@/components/dashboard/daily-summary-section';
import { Skeleton } from '../ui/skeleton';
import { PackagingStockCard } from './PackagingStockCard';
import { RcnStockCard } from './rcn-stock-card';


export function DashboardClient() {
    const { data: metrics, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: getDashboardMetricsAction,
        refetchInterval: 5000, // Refetch every 5 seconds
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
                <RcnStockCard metrics={metrics} />
                <PackagingStockCard />
                <Link href="/inventory">
                    <MetricCard
                    title="Other Materials Stock"
                    value={metrics.otherMaterialsCount}
                    unit="distinct items"
                    icon={Wrench}
                    description="Includes spare parts, fuel, etc. Click to view details."
                    className="h-full"
                    />
                </Link>
                <AlertsMetricCard alerts={metrics.alerts} />
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <DailySummarySection className="lg:col-span-1" />
              <FinishedGoodsStock className="lg:col-span-1" />
            </div>
        </div>
    );
}
