
"use client";

import { useState } from 'react';
import { BodaDashboardHeader } from "@/app/boda/components/dashboard-header";
import { MetricCard } from "@/app/boda/components/metric-card";
import { RecentPayments } from "@/app/boda/components/recent-payments";
import { FleetStatusChart } from "@/app/boda/components/fleet-status-chart";
import { Bike, DollarSign, Users } from "lucide-react";
import { DAILY_PROFIT_TARGET } from "../lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../lib/i18n';

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
        { id: 'PAY-RIDER-01', riderName: 'Rider', amount: 9000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Pending', note: 'Shortfall.' },
        { id: 'PAY-007', riderName: 'Patricia White', amount: 7000, date: new Date().toISOString(), status: 'Pending', note: 'Shortfall.' },
        { id: 'PAY-010', riderName: 'Barbara Lewis', amount: 9500, date: new Date().toISOString(), status: 'Pending', note: 'Shortfall.' },
        { id: 'PAY-002', riderName: 'Jane Smith', amount: 8500, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Pending', note: `Shortfall of TZS ${(DAILY_PROFIT_TARGET - 8500).toLocaleString()}.` },
        { id: 'PAY-005', riderName: 'David Brown', amount: 9000, date: new Date().toISOString(), status: 'Pending', note: `Shortfall of TZS ${(DAILY_PROFIT_TARGET - 9000).toLocaleString()}.` },
        { id: 'PAY-001', riderName: 'John Doe', amount: 10000, date: new Date().toISOString(), status: 'Verified', note: `Daily target of TZS ${DAILY_PROFIT_TARGET.toLocaleString()} met.` },
        { id: 'PAY-003', riderName: 'Peter Jones', amount: 12000, date: new Date().toISOString(), status: 'Verified', note: `Surplus of TZS ${(12000 - DAILY_PROFIT_TARGET).toLocaleString()} applied to debt.`},
        { id: 'PAY-004', riderName: 'Mary Williams', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Verified', note: `Daily target of TZS ${DAILY_PROFIT_TARGET.toLocaleString()} met.` },
        { id: 'PAY-006', riderName: 'Chris Green', amount: 10000, date: new Date().toISOString(), status: 'Verified', note: 'Met target.' },
        { id: 'PAY-008', riderName: 'Linda Harris', amount: 11000, date: new Date().toISOString(), status: 'Verified', note: 'Surplus.' },
        { id: 'PAY-009', riderName: 'Robert Clark', amount: 10000, date: new Date().toISOString(), status: 'Verified', note: 'Met target.' },
        { id: 'PAY-011', riderName: 'Michael Walker', amount: 10000, date: new Date().toISOString(), status: 'Verified', note: 'Met target.' },
        { id: 'PAY-012', riderName: 'Jennifer Hall', amount: 13000, date: new Date().toISOString(), status: 'Verified', note: 'Surplus.' },
    ],
};


export function OwnerSupervisorDashboard() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [metrics, setMetrics] = useState(initialDashboardData.metrics);
    const [fleetStatus, setFleetStatus] = useState(initialDashboardData.fleetStatus);
    const [recentPayments, setRecentPayments] = useState(initialDashboardData.recentPayments);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleVerifyPayment = (paymentId: string) => {
        const paymentToVerify = recentPayments.find(p => p.id === paymentId);

        setRecentPayments(currentPayments => {
            const updatedPayments = currentPayments.map(p => 
                p.id === paymentId ? { ...p, status: 'Verified' } : p
            );
            // Save the entire updated list to localStorage to sync with the rider's view
            localStorage.setItem('boda_payments_data', JSON.stringify(updatedPayments));
            return updatedPayments;
        });
        
        if (paymentToVerify) {
            toast({
                title: t('paymentVerified'),
                description: t('paymentVerifiedDescription', { amount: paymentToVerify.amount.toLocaleString(), riderName: paymentToVerify.riderName }),
            });
        }
    };

    // Pagination logic
    const sortedPayments = [...recentPayments].sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'Pending' ? -1 : 1;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
    const paginatedPayments = sortedPayments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const totalTarget = metrics.activeBikes * DAILY_PROFIT_TARGET;
    const percentageMet = totalTarget > 0 ? (metrics.paymentsToday / totalTarget) * 100 : 0;

    let collectionsColorClass = "";
    if (percentageMet >= 100) {
        collectionsColorClass = "text-green-600";
    } else if (percentageMet < 50) {
        collectionsColorClass = "text-destructive";
    } else {
        collectionsColorClass = "text-amber-500";
    }


    return (
        <div className="space-y-6">
            <BodaDashboardHeader />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard 
                    title="activeBikes" 
                    value={`${metrics.activeBikes} / ${metrics.totalBikes}`}
                    icon={Bike}
                    description={t('bikesOnRoad')}
                />
                <MetricCard 
                    title="collectionsToday" 
                    value={`TZS ${metrics.paymentsToday.toLocaleString()}`}
                    icon={DollarSign}
                    description={t('ofTarget', { target: `TZS ${totalTarget.toLocaleString()}`})}
                    valueClassName={collectionsColorClass}
                />
                <MetricCard 
                    title="totalRiders" 
                    value={metrics.riders}
                    icon={Users}
                    description={t('ridersInProgram')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <RecentPayments 
                            payments={paginatedPayments} 
                            userRole="owner" // Hardcoded for this dashboard
                            onVerify={handleVerifyPayment}
                        />
                        {totalPages > 1 && (
                            <CardFooter className="flex items-center justify-between border-t pt-4">
                                <span className="text-sm text-muted-foreground">
                                    {t('page')} {currentPage} {t('of')} {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>{t('previous')}</Button>
                                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>{t('next')}</Button>
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <FleetStatusChart data={fleetStatus.map(d => ({...d, name: t(d.name.toLowerCase())}))} />
                </div>
            </div>
        </div>
    );
}
