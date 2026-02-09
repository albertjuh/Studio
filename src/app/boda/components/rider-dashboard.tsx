"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Bike, Calendar, FileText, HandCoins, Hourglass, Wrench, CheckCircle2, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
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


export function RiderDashboard() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [paymentAmount, setPaymentAmount] = useState<number | string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState<{ name: string; role: string } | null>(null);
    const [riderData, setRiderData] = useState<any | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('bodaUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            setLoggedInUser(user);

            // Load payments from shared storage
            const allPaymentsStr = localStorage.getItem('boda_payments_data');
            const allPayments = allPaymentsStr ? JSON.parse(allPaymentsStr) : [];
            const riderPayments = allPayments.filter((p: any) => p.riderName === user.name);

            // For this prototype, we'll generate the other data.
            const otherData = {
                 contract: {
                    bikeId: `BODA-${user.name.charCodeAt(0)}${user.name.length}`,
                    startDate: "2023-11-01",
                    endDate: "2024-11-01",
                    totalValue: 3650000,
                    paidAmount: riderPayments.reduce((sum: number, p: any) => sum + p.amount, 0),
                },
                bikeStatus: {
                    status: 'Active',
                    downtimeHours: 0,
                    lastMaintenance: "2024-05-15",
                },
                debt: riderPayments
                    .filter((p: any) => p.amount < DAILY_PROFIT_TARGET)
                    .reduce((sum: number, p: any) => sum + (DAILY_PROFIT_TARGET - p.amount), 0),
            };
            
            setRiderData({ ...otherData, recentPayments: riderPayments });
        }
    }, []);


    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loggedInUser) return;

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
            let note = '';

            if (difference < 0) {
                note = `Shortfall of TZS ${Math.abs(difference).toLocaleString()}.`;
            } else if (difference > 0) {
                note = `Surplus of TZS ${difference.toLocaleString()} applied to balance.`;
            } else {
                note = `Daily target of TZS ${DAILY_PROFIT_TARGET.toLocaleString()} met.`;
            }
            
            toast({ title: t('paymentLogged'), description: note });

            const newPayment = {
                id: `R-PAY-${Date.now()}`,
                riderName: loggedInUser.name,
                amount: amount,
                date: new Date().toISOString(),
                status: 'Pending' as const,
                note: note
            };

            const allPaymentsStr = localStorage.getItem('boda_payments_data');
            let allPayments = allPaymentsStr ? JSON.parse(allPaymentsStr) : [];
            allPayments.push(newPayment);
            localStorage.setItem('boda_payments_data', JSON.stringify(allPayments));

            setRiderData((prevData: any) => ({
                ...prevData,
                contract: {
                    ...prevData.contract,
                    paidAmount: currentPaidAmount + amount,
                },
                recentPayments: [newPayment, ...prevData.recentPayments],
                debt: currentDebt - difference,
            }));

            setPaymentAmount("");
            setIsLoading(false);
        }, 1000);
    };

    const debtStatus = useMemo(() => {
        const debt = riderData?.debt;

        if (debt === undefined || debt === null) {
            return {
                icon: Hourglass,
                valueClassName: "text-muted-foreground",
                description: ""
            };
        }

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
    }, [riderData?.debt, t]);

    if (!riderData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const { contract, bikeStatus, recentPayments, debt } = riderData;
    const contractProgress = (contract.paidAmount / contract.totalValue) * 100;

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
                                    {recentPayments.slice(0, 2).map((payment: any) => (
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
                                                    {recentPayments.map((payment: any) => (
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
