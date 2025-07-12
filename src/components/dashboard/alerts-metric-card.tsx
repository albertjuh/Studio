
"use client";

import { MetricCard } from '@/components/dashboard/metric-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";

interface AlertsMetricCardProps {
    alerts: string[];
}

export function AlertsMetricCard({ alerts }: AlertsMetricCardProps) {
    const hasAlerts = alerts.length > 0;

    const card = (
        <MetricCard
            title="Operational Alerts"
            value={alerts.length}
            unit={alerts.length === 1 ? 'Alert' : 'Alerts'}
            icon={hasAlerts ? AlertTriangle : Info}
            description={hasAlerts ? 'Click to view active alerts' : 'No immediate issues'}
            className={hasAlerts ? "bg-destructive/10 border-destructive/20 cursor-pointer" : "cursor-pointer"}
        />
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                {card}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                        {hasAlerts ? (
                             <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                             <Info className="h-5 w-5 text-primary" />
                        )}
                        {hasAlerts ? "Active Operational Alerts" : "All Systems Nominal"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                    {hasAlerts ? (
                        alerts.map((alert, index) => (
                            <Alert key={index} variant="destructive" className="bg-destructive/10">
                                <AlertTriangle className="h-4 w-4" />
                                <UiAlertTitle className="font-semibold">Alert {index + 1}</UiAlertTitle>
                                <AlertDescription>{alert}</AlertDescription>
                            </Alert>
                        ))
                    ) : (
                         <Alert>
                            <Info className="h-4 w-4" />
                            <UiAlertTitle>All Systems Nominal</UiAlertTitle>
                            <AlertDescription>
                                There are no active operational alerts at this time.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
