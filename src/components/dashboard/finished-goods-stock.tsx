
"use client";

import { useQuery } from "@tanstack/react-query";
import { getFinishedGoodsStockAction } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { AlertCircle, PackageCheck, Box } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { PACKAGE_WEIGHT_KG } from "@/lib/constants";
import { Button } from "../ui/button";

function StockTable({ stock }: { stock: { id: string; name: string; quantity: number }[] }) {
    return (
        <Table>
            <TableCaption>Current stock of packaged kernels.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Quantity (kg)</TableHead>
                    <TableHead className="text-right">Boxes (Est.)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stock.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name.replace('Cashew Kernels - ', '')}</TableCell>
                        <TableCell className="text-right font-mono">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-mono">{Math.floor(item.quantity / PACKAGE_WEIGHT_KG).toLocaleString()}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function FinishedGoodsStock() {
    const { data: stock, isLoading, isError, error } = useQuery({
        queryKey: ['finishedGoodsStock'],
        queryFn: getFinishedGoodsStockAction
    });

    const totalKgs = stock ? stock.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const totalBoxes = stock ? Math.floor(totalKgs / PACKAGE_WEIGHT_KG) : 0;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <div className="flex justify-around text-center">
                        <div className="space-y-1">
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                         <div className="space-y-1">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    </div>
                </div>
            );
        }

        if (isError) {
            return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <UiAlertTitle>Error Loading Stock</UiAlertTitle>
                    <AlertDescription>{(error as Error).message || "There was a problem fetching the data."}</AlertDescription>
                </Alert>
            );
        }

        if (!stock || stock.length === 0) {
            return <p className="text-center text-sm text-muted-foreground py-4">No finished goods have been packaged yet.</p>;
        }

        return (
             <div className="w-full">
                <div className="flex justify-around text-center">
                    <div>
                        <p className="text-3xl font-bold">{totalKgs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground">Total Kg</p>
                    </div>
                        <div>
                        <p className="text-3xl font-bold">{totalBoxes.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Boxes</p>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <Dialog>
            <Card className="shadow-lg flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-primary"/>
                        Packed Grades Stock
                    </CardTitle>
                    <CardDescription>
                        Total stock ready for shipment. Click below for details.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    {renderContent()}
                </CardContent>
                <CardFooter className="border-t pt-4">
                   {stock && stock.length > 0 && (
                     <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">View All {stock.length} Grades</Button>
                    </DialogTrigger>
                   )}
                   {isLoading && (
                        <Skeleton className="h-10 w-full" />
                   )}
                </CardFooter>
            </Card>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><PackageCheck /> Full Stock Details</DialogTitle>
                     <DialogDescription>A complete list of all packaged grades currently in stock.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto">
                    {stock && <StockTable stock={stock} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
