"use client";

import { BodaDashboardHeader } from "@/app/boda/components/dashboard-header";
import { MetricCard } from "@/app/boda/components/metric-card";
import { RecentPayments } from "@/app/boda/components/recent-payments";
import { ActiveIncidents } from "@/app/boda/components/active-incidents";
import { FleetStatusChart } from "@/app/boda/components/fleet-status-chart";
import { Bike, DollarSign, AlertTriangle, Users } from "lucide-react";

// Mock data for the dashboard
const dashboardData = {
    metrics: {
        activeBikes: 25,
        totalBikes: 30,
        paymentsToday: 215000,
        incidents: 3,
        riders: 30,
    },
    fleetStatus: [
        { name: 'Active', value: 25, fill: 'hsl(var(--primary))' },
        { name: 'Maintenance', value: 3, fill: 'hsl(var(--destructive))' },
        { name: 'Inactive', value: 2, fill: 'hsl(var(--muted))' },
    ],
    recentPayments: [
        { id: 'PAY-001', riderName: 'John Doe', amount: 10000, date: new Date().toISOString(), status: 'Verified' },
        { id: 'PAY-002', riderName: 'Jane Smith', amount: 8500, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Pending' },
        { id: 'PAY-003', riderName: 'Peter Jones', amount: 10000, date: new Date().toISOString(), status: 'Verified' },
        { id: 'PAY-004', riderName: 'Mary Williams', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Verified' },
        { id: 'PAY-005', riderName: 'David Brown', amount: 9000, date: new Date().toISOString(), status: 'Pending' },
    ],
    activeIncidents: [
        { id: 'INC-001', bikeId: 'BODA-012', description: 'Flat tire on route 5', severity: 'Minor', status: 'Reported' },
        { id: 'INC-002', bikeId: 'BODA-028', description: 'Engine making strange noise', severity: 'Major', status: 'In-Progress' },
        { id: 'INC-003', bikeId: 'BODA-007', description: 'Minor scratch from accident', severity: 'Minor', status: 'Reported' },
    ]
};


export default function BodaDashboardPage() {
    const { metrics, fleetStatus, recentPayments, activeIncidents } = dashboardData;

    return (
        <div className="space-y-6">
            <BodaDashboardHeader />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                    title="Active Incidents" 
                    value={metrics.incidents}
                    icon={AlertTriangle}
                    description="Accidents or maintenance issues"
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
                    <RecentPayments payments={recentPayments} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <ActiveIncidents incidents={activeIncidents} />
                    <FleetStatusChart data={fleetStatus} />
                </div>
            </div>
        </div>
    );
}
