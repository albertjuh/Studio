
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Bike, Calendar, FileText, HandCoins, Hourglass, Wrench, CheckCircle2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { DAILY_PROFIT_TARGET } from "../lib/constants";
import { MetricCard } from "./metric-card";
import { cn } from "@/lib/utils";

// Mock data for a single rider
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
        { id: 'R-PAY-001', amount: 10000, date: new Date().toISOString() },
        { id: 'R-PAY-002', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
        { id: 'R-PAY-003', amount: 8000, date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
        { id: 'R-PAY-004', amount: 10000, date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
    ],
    debt: 12000,
};

export function RiderDashboard() {
    const { toast } = useToast();
    const [paymentAmount, setPaymentAmount] = useState<number | string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [riderData, setRiderData] = useState(initialRiderData);

    const { contract, bikeStatus, recentPayments, debt } = riderData;
    const contractProgress = (contract.paidAmount / contract.totalValue) * 100;

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(paymentAmount);
        if (!amount || amount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid payment amount.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            const currentDebt = riderData.debt;
            const difference = amount - DAILY_PROFIT_TARGET;
            let newDebt = currentDebt;
            let toastDescription = '';

            if (difference < 0) {
                newDebt += Math.abs(difference);
                toastDescription = `Shortfall of TZS ${Math.abs(difference).toLocaleString()} added to your debt. New debt: TZS ${newDebt.toLocaleString()}.`;
            } else if (difference > 0 && currentDebt > 0) {
                const debtPaid = Math.min(currentDebt, difference);
                newDebt -= debtPaid;
                if (newDebt === 0) {
                    toast({
                        title: "Debt Cleared!",
                        description: `Your surplus payment of TZS ${debtPaid.toLocaleString()} has cleared your outstanding debt.`,
                    });
                } else {
                     toastDescription = `Surplus of TZS ${difference.toLocaleString()} paid off TZS ${debtPaid.toLocaleString()}. Remaining debt: TZS ${newDebt.toLocaleString()}.`;
                }
            } else {
                toastDescription = `Your payment of TZS ${amount.toLocaleString()} has been submitted. No outstanding debt.`;
            }

            const newPaidAmount = contract.paidAmount + amount;
            const newPayment = {
                id: `R-PAY-${Date.now()}`,
                amount: amount,
                date: new Date().toISOString(),
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
                    title: "Payment Logged",
                    description: toastDescription,
                });
            }

            setPaymentAmount("");
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Dashboard</h1>
                    <p className="text-muted-foreground">Your personal contract and payment overview.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <FileText className="h-5 w-5 text-primary" /> My Contract Progress
                        </CardTitle>
                        <CardDescription>
                            You have paid off {contractProgress.toFixed(1)}% of your rent-to-own agreement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Progress value={contractProgress} />
                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                            <span>TZS {contract.paidAmount.toLocaleString()} Paid</span>
                            <span>TZS {contract.totalValue.toLocaleString()} Total</span>
                        </div>
                    </CardContent>
                </Card>

                 <MetricCard
                    title="Outstanding Debt"
                    value={`TZS ${debt.toLocaleString()}`}
                    icon={TrendingDown}
                    description="Amount owed from payment shortfalls."
                    className={cn(debt > 0 ? "border-destructive bg-destructive/10" : "")}
                />


                <div className="grid gap-6 md:grid-cols-2 lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5" />
                                Contract Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Assigned Bike:</span>
                                <span className="font-medium font-mono">{contract.bikeId}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Start Date:</span>
                                <span className="font-medium">{format(new Date(contract.startDate), "PPP")}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Est. End Date:</span>
                                <span className="font-medium">{format(new Date(contract.endDate), "PPP")}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bike className="h-5 w-5" />
                                My Bike Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                           <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Current Status:</span>
                                <span className={`font-medium flex items-center gap-1.5 ${bikeStatus.status === 'Active' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {bikeStatus.status === 'Active' ? <CheckCircle2 className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                                    {bikeStatus.status}
                                </span>
                            </div>
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">Downtime (24h):</span>
                                <span className="font-medium">{bikeStatus.downtimeHours} hours</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Maintenance:</span>
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
                                Log My Daily Payment
                            </CardTitle>
                             <CardDescription>Submit your daily profit here. Target: TZS {DAILY_PROFIT_TARGET.toLocaleString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment-amount">Amount (TZS)</Label>
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
                                    {isLoading ? "Submitting..." : "Submit Payment"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-lg">
                                <Hourglass className="h-5 w-5" />
                                My Recent Payments
                            </CardTitle>
                        </CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentPayments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium font-mono">TZS {payment.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(payment.date), { addSuffix: true })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    );
}
