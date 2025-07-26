
"use client";

import { useQuery } from "@tanstack/react-query";
import { getFinishedGoodsStockAction } from "@/lib/inventory-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";
import { AlertCircle, PackageCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";

export function FinishedGoodsStock() {
    const { data: stock, isLoading, isError, error } = useQuery({
        queryKey: ['finishedGoodsStock'],
        queryFn: getFinishedGoodsStockAction
    });

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-primary"/>
                    Finished Goods Stock
                </CardTitle>
                <CardDescription>
                    Packed items ready for shipment.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-5/6" />
                        <Skeleton className="h-6 w-2/3" />
                    </div>
                )}
                {isError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <UiAlertTitle>Error Loading Stock</UiAlertTitle>
                        <AlertDescription>{(error as Error).message}</AlertDescription>
                    </Alert>
                )}
                {stock && stock.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Grade</TableHead>
                                <TableHead className="text-right">Quantity (kg)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name.replace('Cashew Kernels - ', '')}</TableCell>
                                    <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                 {stock && stock.length === 0 && !isLoading && (
                    <p className="text-center text-sm text-muted-foreground py-4">No finished goods have been packaged yet.</p>
                 )}
            </CardContent>
        </Card>
    );
}
