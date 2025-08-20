
"use client";

import { useQuery } from '@tanstack/react-query';
import { getVacuumBagTraceabilityReportAction } from '@/lib/actions';
import type { VacuumBagBatch } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Package, Cuboid, PackageCheck, Unplug } from 'lucide-react';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function VacuumBagTraceabilityDashboard() {
  const { data: batches, isLoading, isError, error } = useQuery<VacuumBagBatch[]>({
    queryKey: ['vacuumBagTraceability'],
    queryFn: getVacuumBagTraceabilityReportAction,
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
        </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Report</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertTitle>No Vacuum Bag Batches Found</AlertTitle>
        <AlertDescription>
          Start by logging a new batch of vacuum bags using the "Vacuum Bag Intake" form in Data Entry.
        </AlertDescription>
      </Alert>
    );
  }
  
  const sortedBatches = [...batches].sort((a, b) => new Date(b.intakeDate).getTime() - new Date(a.intakeDate).getTime());

  return (
    <Accordion type="multiple" defaultValue={sortedBatches.slice(0, 1).map(b => b.batchId)} className="w-full space-y-3">
        {sortedBatches.map(batch => {
            const usagePercentage = batch.initialQuantity > 0 ? (batch.usedCount / batch.initialQuantity) * 100 : 0;
            return (
                 <AccordionItem value={batch.batchId} key={batch.batchId} className="border rounded-lg bg-card overflow-hidden">
                    <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-3">
                                <Cuboid className="h-6 w-6 text-primary" />
                                <div>
                                    <p>{batch.batchId}</p>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        Received: {format(new Date(batch.intakeDate), 'PPP')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-normal pr-4">
                            <div className="text-center">
                                <p className="font-bold text-xl">{batch.currentStock}</p>
                                <p className="text-xs text-muted-foreground">In Stock</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-xl">{batch.usedCount}</p>
                                <p className="text-xs text-muted-foreground">Used</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-xl">{batch.wastedCount}</p>
                                <p className="text-xs text-muted-foreground">Wasted</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t p-4 space-y-4">
                        <div className="flex items-center gap-2">
                           <Progress value={usagePercentage} className="h-3" />
                           <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{usagePercentage.toFixed(1)}% Used</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base"><PackageCheck /> Usage by Grade</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {batch.usage.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Grade</TableHead>
                                                    <TableHead className="text-right">Bags Used</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(
                                                    batch.usage.reduce((acc, use) => {
                                                        acc[use.grade] = (acc[use.grade] || 0) + use.quantity;
                                                        return acc;
                                                    }, {} as Record<string, number>)
                                                ).map(([grade, quantity]) => (
                                                    <TableRow key={grade}>
                                                        <TableCell className="font-medium">{grade}</TableCell>
                                                        <TableCell className="text-right">{quantity}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : <p className="text-sm text-muted-foreground text-center py-4">No bags from this batch have been used yet.</p>}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base"><Unplug /> Wastage Log</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {batch.wastage.length > 0 ? (
                                         <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead className="text-right">Bags Wasted</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batch.wastage.map((waste, index) => (
                                                     <TableRow key={index}>
                                                        <TableCell>{format(new Date(waste.date), 'PP')}</TableCell>
                                                        <TableCell>{waste.reason}</TableCell>
                                                        <TableCell className="text-right">{waste.quantity}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ): <p className="text-sm text-muted-foreground text-center py-4">No wastage reported for this batch.</p>}
                                </CardContent>
                            </Card>
                        </div>
                    </AccordionContent>
                 </AccordionItem>
            )
        })}
    </Accordion>
  );
}
