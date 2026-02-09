
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Bike, Calendar, FileText, HandCoins, Hourglass, Wrench, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import React, { useState, useEffect } from "react";
import { format, formatDistanceToNow, differenceInCalendarDays, startOfDay } from "date-fns";
import { DAILY_PROFIT_TARGET } from "../lib/constants";
import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "../lib/i18n";

// Mock data for a single rider named "Rider"
const initialRiderData = {
    contract: {
        bikeId: "BODA-012",
        startDate: "2023-11-01",
        endDate: "2024-11-01",
        totalValue: 3650000,
        paidAmount: 2850000,
    },
    bikeStatus: {
        status: 'Active',
        downtimeHours: 0,
        lastMaintenance: "2024-05-15",
    },
    recentPayments: [
        { id: 'PAY-RIDER-01', amount: 9000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Pending' as const },
        { id: 'R-PAY-002', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), status: 'Verified' as const },
        { id: 'R-PAY-003', amount: 8000, date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), status: 'Verified' as const },
        { id: 'R-PAY-004', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(), status: 'Verified' as const },
        { id: 'R-PAY-005', amount: 9000, date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), status: 'Verified' as const },
    ],
    debt: 3000, 
};

export function RiderDashboard() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [paymentAmount, setPaymentAmount] = useState<number | string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [riderData, setRiderData] = useState(initialRiderData);
    const debtCalculationHasRun = React.useRef(false);

    useEffect(() => {
        // This effect syncs the payment status from localStorage, which is updated by the supervisor.
        const allPaymentsStr = localStorage.getItem('boda_payments_data');
        if (allPaymentsStr) {
            const allPayments = JSON.parse(allPaymentsStr);
            const riderName = 'Rider'; // The logged-in rider's name is 'Rider'
            
            // Find all payments for this rider from the shared data
            const paymentsForThisRider = allPayments.filter((p: any) => p.riderName === riderName);
            
            // Check if there are any payments found for this rider in localStorage
            if (paymentsForThisRider.length > 0) {
                 setRiderData(prevData => ({
                    ...prevData,
                    recentPayments: paymentsForThisRider.map((p: any) => ({
                        id: p.id,
                        amount: p.amount,
                        date: p.date,
                        status: p.status,
                    }))
                }));
            }
        }
    }, []); // Runs once on component mount to sync initial state

    useEffect(() => {
        // This effect runs once on mount to calculate debt from missed payment days.
        if (debtCalculationHasRun.current) {
            return;
        }

        const today = startOfDay(new Date());
        // Find the most recent payment date, or fall back to the contract start date.
        const lastPaymentDate = riderData.recentPayments.length > 0
            ? startOfDay(new Date(riderData.recentPayments[0].date))
            : startOfDay(new Date(riderData.contract.startDate));
        
        // Calculate the number of full days that have passed without a payment.
        const daysSinceLastPayment = differenceInCalendarDays(today, lastPaymentDate);

        if (daysSinceLastPayment > 1) { // More than 1 day means at least one full day was missed
            const missedDays = daysSinceLastPayment - 1;
            const newDebtFromMissedDays = missedDays * DAILY_PROFIT_TARGET;
            
            setRiderData(prevData => ({
                ...prevData,
                debt: prevData.debt + newDebtFromMissedDays,
            }));

            toast({
                title: "Debt Accrued from Missed Payments",
                description: `TZS ${newDebtFromMissedDays.toLocaleString()} has been added to your debt for ${missedDays} missed payment day(s).`,
                variant: "destructive"
            });
        }
        debtCalculationHasRun.current = true;
    }, [riderData.recentPayments, riderData.contract.startDate, toast]);


    const { contract, bikeStatus, recentPayments, debt } = riderData;
    const contractProgress = (contract.paidAmount / contract.totalValue) * 100;

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(paymentAmount);
        if (!amount || amount <= 0) {
            toast({
                title: t('invalidAmount'),
                description: t('invalidAmountDescription'),
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            const currentDebt = riderData.debt;
            const currentPaidAmount = riderData.contract.paidAmount;
            
            const difference = amount - DAILY_PROFIT_TARGET;
            const newDebt = currentDebt - difference;

            let toastDescription = '';
            if (difference < 0) {
                toastDescription = t('shortfallAddedToDebt', { amount: Math.abs(difference).toLocaleString(), newDebt: newDebt.toLocaleString() });
            } else if (difference > 0) {
                if (currentDebt > 0 && newDebt <= 0) {
                     toast({
                        title: t('debtCleared'),
                        description: t('debtClearedDescription'),
                    });
                } else {
                     toastDescription = t('surplusAppliedToBalance', { amount: difference.toLocaleString(), newBalance: newDebt.toLocaleString() });
                }
            } else {
                toastDescription = t('noChangeInBalance', { amount: amount.toLocaleString() });
            }

            const newPaidAmount = currentPaidAmount + amount;

            const newPayment = {
                id: `R-PAY-${Date.now()}`,
                amount: amount,
                date: new Date().toISOString(),
                status: 'Pending' as const,
            };

            setRiderData(prevData => ({
                ...prevData,
                contract: {
                    ...prevData.contract,
                    paidAmount: newPaidAmount,
                },
                recentPayments: [newPayment, ...prevData.recentPayments],
                debt: newDebt,
            }));

            if(toastDescription) {
                toast({
                    title: t('paymentLogged'),
                    description: toastDescription,
                });
            }

            setPaymentAmount("");
            setIsLoading(false);
        }, 1000);
    };

    const debtStatus = React.useMemo(() => {
        if (debt > 0) {
            return {
                icon: TrendingDown,
                valueClassName: "text-destructive",
                description: t('debtDescription')
            };
        }
        if (debt < 0) {
            return {
                icon: TrendingUp,
                valueClassName: "text-green-600",
                description: t('creditDescription', { amount: Math.abs(debt).toLocaleString() })
            };
        }
        return {
            icon: CheckCircle2,
            valueClassName: "",
            description: t('noDebt')
        };
    }, [debt, t]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('myDashboard')}</h1>
                    <p className="text-muted-foreground">{t('myDashboardOverview')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 bg-transparent border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <FileText className="h-5 w-5 text-primary" /> {t('myContractProgress')}
                        </CardTitle>
                        <CardDescription>
                            {t('contractProgressDescription', { progress: contractProgress.toFixed(1) })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Progress value={contractProgress} className="h-2" />
                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                            <span>TZS {contract.paidAmount.toLocaleString()} {t('paid')}</span>
                            <span>TZS {contract.totalValue.toLocaleString()} {t('total')}</span>
                        </div>
                    </CardContent>
                </Card>

                 <MetricCard
                    title="outstandingDebt"
                    value={`TZS ${debt.toLocaleString()}`}
                    icon={debtStatus.icon}
                    description={debtStatus.description}
                    className="bg-transparent border-none shadow-none"
                    valueClassName={debtStatus.valueClassName}
                />


                <div className="grid gap-6 md:grid-cols-2 lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5" />
                                {t('contractDetails')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('assignedBike')}</span>
                                <span className="font-medium font-mono">{contract.bikeId}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('startDate')}</span>
                                <span className="font-medium">{format(new Date(contract.startDate), "PPP")}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('estEndDate')}</span>
                                <span className="font-medium">{format(new Date(contract.endDate), "PPP")}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bike className="h-5 w-5" />
                                {t('myBikeStatus')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                           <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{t('currentStatus')}</span>
                                <span className={`font-medium flex items-center gap-1.5 ${bikeStatus.status === 'Active' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {bikeStatus.status === 'Active' ? <CheckCircle2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                                    {t(bikeStatus.status.toLowerCase())}
                                </span>
                            </div>
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('downtime24h')}</span>
                                <span className="font-medium">{bikeStatus.downtimeHours} {t('hours')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('lastMaintenance')}</span>
                                <span className="font-medium">{format(new Date(bikeStatus.lastMaintenance), "PPP")}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-3 grid md:grid-cols-2 gap-6">
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HandCoins className="h-5 w-5 text-primary" />
                                {t('logMyDailyPayment')}
                            </CardTitle>
                             <CardDescription>{t('logMyDailyPaymentDescription', { target: DAILY_PROFIT_TARGET.toLocaleString() })}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment-amount">{t('amountTZS')}</Label>
                                    <Input 
                                        id="payment-amount"
                                        type="number"
                                        placeholder="e.g., 10000"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? t('submitting') : t('submitPayment')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-lg">
                                <Hourglass className="h-5 w-5" />
                                {t('myRecentPayments')}
                            </CardTitle>
                        </CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('amount')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        <TableHead className="text-right">{t('date')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentPayments.slice(0, 2).map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-mono font-medium">TZS {payment.amount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={payment.status === 'Verified' ? 'default' : 'secondary'}>
                                                    {t(payment.status.toLowerCase())}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {format(new Date(payment.date), 'PP p')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentPayments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                {t('noPaymentsLogged')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {recentPayments.length > 2 && (
                            <CardFooter>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">{t('viewAllPayments')}</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('fullPaymentHistory')}</DialogTitle>
                                            <DialogDescription>{t('fullPaymentHistoryDescription')}</DialogDescription>
                                        </DialogHeader>
                                        <div className="max-h-[60vh] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('amount')}</TableHead>
                                                        <TableHead>{t('status')}</TableHead>
                                                        <TableHead className="text-right">{t('date')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {recentPayments.map((payment) => (
                                                        <TableRow key={payment.id}>
                                                            <TableCell className="font-mono font-medium">TZS {payment.amount.toLocaleString()}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={payment.status === 'Verified' ? 'default' : 'secondary'}>
                                                                    {t(payment.status.toLowerCase())}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                                {format(new Date(payment.date), 'PP p')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        )}
                    </Card>
                 </div>
            </div>
        </div>
    );

    
}
