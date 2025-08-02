

import { getDashboardMetricsAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertsMetricCard } from '@/components/dashboard/alerts-metric-card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCircle, Package, Warehouse } from 'lucide-react';
import { FinishedGoodsStock } from '@/components/dashboard/finished-goods-stock';
import { DailySummarySection } from '@/components/dashboard/daily-summary-section';


export default async function DashboardPage() {
    let metrics;
    let error = false;

    try {
        metrics = await getDashboardMetricsAction();
    } catch (err) {
        error = true;
        console.error("Failed to load dashboard metrics:", err);
    }

    if (error || !metrics) {
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Dashboard</AlertTitle>
                    <AlertDescription>
                        Could not load dashboard data at this time. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Factory Health Dashboard</h2>
        <div className="text-muted-foreground text-lg">
          Overall Status & Trends
        </div>
      </div>
      
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard
              title="Current RCN Stock"
              value={metrics.rcnStockTonnes.toFixed(2)}
              unit="Tonnes"
              icon={Package}
              description={`${metrics.rcnStockKg.toLocaleString()} kg | ${metrics.rcnStockSufficiency}`}
            />
            <MetricCard
              title="Total Vacuum Bags in Stock"
              value={metrics.vacuumBagsStock.toLocaleString()}
              unit="bags"
              icon={Warehouse}
              description="Available for packaging"
            />
            <MetricCard
              title="Total Boxes in Stock"
              value={metrics.packagingBoxesStock.toLocaleString()}
              unit="boxes"
              icon={Warehouse}
              description="Available packaging boxes"
            />
            <AlertsMetricCard alerts={metrics.alerts} />
        </div>
        
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
          <DailySummarySection className="lg:col-span-1" />
          <FinishedGoodsStock className="lg:col-span-1" />
        </div>
    </div>
  );
}
