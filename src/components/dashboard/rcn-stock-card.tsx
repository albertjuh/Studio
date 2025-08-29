
"use client";

import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

export function RcnStockCard({ metrics, className }: { metrics: any; className?: string }) {
    return (
        <div className={cn(className)}>
            <MetricCard
              title="Current RCN Stock"
              value={metrics.rcnStockTonnes.toFixed(2)}
              unit="Tonnes"
              icon={Package}
              description={`${metrics.rcnStockKg.toLocaleString()} kg | ${metrics.rcnStockSufficiency}`}
              className="h-full"
            />
        </div>
    );
}
