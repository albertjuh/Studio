
"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVacuumBagTraceabilityReportAction } from '@/lib/actions';
import type { VacuumBagBatch } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Loader2, PackageSearch, Package, Calendar, User, ShoppingCart, AlertTriangle, ChevronsRight, Recycle, PackageCheck, Unplug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { VacuumBagWastageForm } from '../data-entry/vacuum-bag-wastage-form';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

function BatchDetails({ batch }: { batch: VacuumBagBatch }) {
    const usagePercentage = batch.initialQuantity > 0 ? (batch.usedCount / batch.initialQuantity) * 100 : 0;
    const wastagePercentage = batch.initialQuantity > 0 ? (batch.wastedCount / batch.initialQuantity) * 100 : 0;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4">
            <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold text-muted-foreground">Initial Qty</p>
                    <p className="text-lg font-bold">{batch.initialQuantity.toLocaleString()} bags</p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <PackageCheck className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold text-muted-foreground">Used</p>
                    <p className="text-lg font-bold">{batch.usedCount.toLocaleString()} bags</p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <Recycle className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold text-muted-foreground">Wasted</p>
                    <p className="text-lg font-bold">{batch.wastedCount.toLocaleString()} bags</p>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="font-semibold text-muted-foreground">Current Stock</p>
                    <p className="text-lg font-bold">{batch.currentStock.toLocaleString()} bags</p>
                </div>
            </div>
             <div className="col-span-full">
                <Label className="text-xs text-muted-foreground">Usage Overview</Label>
                <Progress value={usagePercentage + wastagePercentage} className="h-2 mt-1" />
                <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600">Used: {usagePercentage.toFixed(1)}%</span>
                    <span className="text-red-600">Wasted: {wastagePercentage.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}

export function VacuumBagTraceability() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vacuumBagTraceability'],
    queryFn: getVacuumBagTraceabilityReportAction,
  });

  const [openWastageDialog, setOpenWastageDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined);

  const handleWastageFormSubmit = () => {
    setOpenWastageDialog(false); // Close dialog on submit
    queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading traceability report...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Report</AlertTitle>
        <AlertDescription>{(error as Error)?.message || 'Could not load traceability data.'}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch className="h-6 w-6 text-primary" />
            Vacuum Bag Traceability
          </CardTitle>
          <CardDescription>Track vacuum bag shipments from intake to usage and wastage.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <p>No vacuum bag shipments have been logged yet.</p>
          <p className="text-sm">Start by using the "Vacuum Bag Intake" form in Data Entry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={openWastageDialog} onOpenChange={setOpenWastageDialog}>
       <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-primary" />
              Vacuum Bag Traceability Report
            </CardTitle>
            <CardDescription>Track vacuum bag shipments from intake to usage and wastage. Expand a batch to see details.</CardDescription>
          </CardHeader>
          <CardContent>
             <Accordion type="single" collapsible className="w-full space-y-2">
                {data.map(batch => (
                  <AccordionItem value={batch.batchId} key={batch.batchId} className="border rounded-lg bg-card overflow-hidden">
                    <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-left">
                        <span className="font-mono text-sm md:text-base">{batch.batchId}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{batch.supplier}</span>
                            <span>|</span>
                            <span>{batch.intakeDate ? format(new Date(batch.intakeDate), 'PP') : 'N/A'}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t">
                      <BatchDetails batch={batch} />
                      <div className="p-4 border-t">
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setSelectedBatchId(batch.batchId)}>
                                <Unplug className="mr-2 h-4 w-4"/>
                                Report Wastage
                            </Button>
                        </DialogTrigger>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
             </Accordion>
          </CardContent>
        </Card>
        
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Report Wasted Bags</DialogTitle>
                <DialogDescription>
                    Log any damaged or unusable bags from shipment <span className="font-mono text-primary">{selectedBatchId}</span>. This will update the inventory.
                </DialogDescription>
            </DialogHeader>
            <VacuumBagWastageForm preselectedBatchId={selectedBatchId} onFormSubmit={handleWastageFormSubmit} />
        </DialogContent>
    </Dialog>
  );
}

