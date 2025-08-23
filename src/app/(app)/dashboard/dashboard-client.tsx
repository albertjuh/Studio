
"use client";

import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCircle, Package, Warehouse, Wrench } from 'lucide-react';

export function DashboardClient({ params, searchParams }: { params: {}; searchParams: {} }) {
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Current RCN Stock"
                  value="--"
                  unit="Tonnes"
                  icon={Package}
                  description="Real-time stock level will be shown here."
                />
                <MetricCard
                  title="Packaging Stock"
                  value="--"
                  unit="items"
                  icon={Warehouse}
                  description="Packaging material levels will be shown here."
                />
                <MetricCard
                  title="Finished Goods"
                  value="--"
                  unit="kg"
                  icon={Wrench}
                  description="Packed goods ready for dispatch will be shown here."
                />
                <MetricCard
                    title="Operational Alerts"
                    value="0"
                    unit="Alerts"
                    icon={AlertCircle}
                    description="No immediate issues."
                />
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">AI Daily Summary will be displayed here.</p>
                </div>
                 <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm min-h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">Finished Goods Stock details will be displayed here.</p>
                </div>
            </div>
        </div>
    );
}
