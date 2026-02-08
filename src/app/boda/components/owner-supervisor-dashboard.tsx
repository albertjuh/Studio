
"use client";

import { useState } from 'react';
import { BodaDashboardHeader } from "@/app/boda/components/dashboard-header";
import { MetricCard } from "@/app/boda/components/metric-card";
import { RecentPayments } from "@/app/boda/components/recent-payments";
import { FleetStatusChart } from "@/app/boda/components/fleet-status-chart";
import { Bike, DollarSign, Users } from "lucide-react";
import { DAILY_PROFIT_TARGET } from "../lib/constants";
import { useToast } from "@/hooks/use-toast";

// Mock data for the dashboard
const initialDashboardData = {
    metrics: {
        activeBikes: 25,
        totalBikes: 30,
        paymentsToday: 215000,
        riders: 30,
    },
    fleetStatus: [
        { name: 'Active', value: 25, fill: 'hsl(var(--primary))' },
        { name: 'Maintenance', value: 3, fill: 'hsl(var(--destructive))' },
        { name: 'Inactive', value: 2, fill: 'hsl(var(--muted))' },
    ],
    recentPayments: [
        { id: 'PAY-001', riderName: 'John Doe', amount: 10000, date: new Date().toISOString(), status: 'Verified', note: `Daily target of TZS ${DAILY_PROFIT_TARGET.toLocaleString()} met.` },
        { id: 'PAY-002', riderName: 'Jane Smith', amount: 8500, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Pending', note: `Shortfall of TZS ${(DAILY_PROFIT_TARGET - 8500).toLocaleString()}.` },
        { id: 'PAY-003', riderName: 'Peter Jones', amount: 12000, date: new Date().toISOString(), status: 'Verified', note: `Surplus of TZS ${(12000 - DAILY_PROFIT_TARGET).toLocaleString()} applied to debt.`},
        { id: 'PAY-004', riderName: 'Mary Williams', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Verified', note: `Daily target of TZS ${DAILY_PROFIT_TARGET.toLocaleString()} met.` },
        { id: 'PAY-005', riderName: 'David Brown', amount: 9000, date: new Date().toISOString(), status: 'Pending', note: `Shortfall of TZS ${(DAILY_PROFIT_TARGET - 9000).toLocaleString()}.` },
    ],
};


export function OwnerSupervisorDashboard() {
    const { toast } = useToast();
    const [metrics, setMetrics] = useState(initialDashboardData.metrics);
    const [fleetStatus, setFleetStatus] = useState(initialDashboardData.fleetStatus);
    const [recentPayments, setRecentPayments] = useState(initialDashboardData.recentPayments);

    const handleVerifyPayment = (paymentId: string) => {
        setRecentPayments(currentPayments => 
            currentPayments.map(p => 
                p.id === paymentId ? { ...p, status: 'Verified' } : p
            )
        );
        toast({
            title: "Payment Verified",
            description: "The payment has been successfully marked as verified.",
        });
    };

    return (
        <div className="space-y-6">
            <BodaDashboardHeader />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard 
                    title="Active Bikes" 
                    value={`${metrics.activeBikes} / ${metrics.totalBikes}`}
                    icon={Bike}
                    description="Bikes currently on the road"
                />
                <MetricCard 
                    title="Collections Today" 
                    value={`TZS ${metrics.paymentsToday.toLocaleString()}`}
                    icon={DollarSign}
                    description="Total daily profit collected"
                />
                <MetricCard 
                    title="Total Riders" 
                    value={metrics.riders}
                    icon={Users}
                    description="Riders in the rent-to-own program"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentPayments 
                        payments={recentPayments} 
                        userRole="owner" // Hardcoded for this dashboard
                        onVerify={handleVerifyPayment}
                    />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <FleetStatusChart data={fleetStatus} />
                </div>
            </div>
        </div>
    );
}
