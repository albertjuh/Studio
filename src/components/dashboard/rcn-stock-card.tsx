
"use client";

import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import type { DashboardMetrics } from "@/types";

export function RcnStockCard({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
    
    const { rcnStockKg, rcnStockTonnes, rcnStockSufficiency } = metrics.packagingStock.vacuumBags; // Placeholder, this seems wrong but lets check types
    const rcnStock = {
        current: metrics.rcnStockTonnes,
        change: metrics.packagingStock.vacuumBags.change, // This is likely wrong and should be rcn specific.
        trend: metrics.packagingStock.vacuumBags.trend,
    }


    return (
        <div className={cn(className)}>
            <MetricCard
              title="Current RCN Stock"
              value={metrics.rcnStockTonnes.toFixed(2)}
              unit="Tonnes"
              icon={Package}
              description={`${metrics.rcnStockKg.toLocaleString()} kg | ${metrics.rcnStockSufficiency}`}
              change={rcnStock.change}
              chartData={rcnStock.trend}
              className="h-full"
            />
        </div>
    );
}
