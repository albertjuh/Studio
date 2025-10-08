
"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVacuumBagTraceabilityReportAction, deleteVacuumBagShipmentAction } from '@/lib/actions';
import type { VacuumBagBatch } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Loader2, PackageSearch, Package, Calendar, ShoppingCart, AlertTriangle, ChevronsRight, Recycle, PackageCheck, Unplug, Trash2, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { VacuumBagWastageForm } from '../data-entry/vacuum-bag-wastage-form';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

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
                <Label className="text-xs text-muted-foreground">Shipment Depletion Overview</Label>
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
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vacuumBagTraceability'],
    queryFn: getVacuumBagTraceabilityReportAction,
  });

  const [openWastageDialog, setOpenWastageDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>(undefined);
  const [selectedBatchForUsage, setSelectedBatchForUsage] = useState<VacuumBagBatch | null>(null);

  const handleWastageFormSubmit = () => {
    setOpenWastageDialog(false);
  };
  
  const deleteMutation = useMutation({
    mutationFn: deleteVacuumBagShipmentAction,
    onSuccess: (result, shipmentId) => {
      if (result.success) {
        toast({
          title: "Shipment Deleted",
          description: `Shipment ${shipmentId} and its cartons have been deleted.`,
        });
        queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    },
    onError: (error, shipmentId) => {
       toast({
          title: "Error",
          description: `Could not delete shipment ${shipmentId}. ${(error as Error).message}`,
          variant: "destructive",
        });
    }
  });
  
  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Prevent accordion from toggling
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `ID "${text}" copied to clipboard.` });
    });
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
    <>
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
                    <div className="flex items-center p-4">
                        <AccordionTrigger className="flex-1 text-left p-0 hover:no-underline text-lg font-semibold">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-left">
                                <span className="font-mono text-sm md:text-base">{batch.batchId}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium">{batch.supplier}</span>
                                    <span>|</span>
                                    <span>{batch.intakeDate ? format(new Date(batch.intakeDate), 'PP') : 'N/A'}</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={(e) => handleCopy(e, batch.batchId)}
                            >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <AccordionContent className="border-t">
                      <BatchDetails batch={batch} />
                      <div className="p-4 border-t flex items-center justify-between">
                         <Button variant="secondary" size="sm" onClick={() => setSelectedBatchForUsage(batch)}>
                            View Usage Details
                         </Button>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedBatchId(batch.batchId)}>
                                <Unplug className="mr-2 h-4 w-4"/>
                                Report Wastage
                            </Button>
                        </DialogTrigger>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="sm" disabled={deleteMutation.isPending && deleteMutation.variables === batch.batchId}>
                                {deleteMutation.isPending && deleteMutation.variables === batch.batchId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                                Delete Shipment
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the entire shipment <strong className="font-mono">{batch.batchId}</strong>, including all of its cartons and inventory records. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(batch.batchId)} className="bg-destructive hover:bg-destructive/90">
                                Yes, delete this shipment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
    
    <Dialog open={!!selectedBatchForUsage} onOpenChange={(isOpen) => !isOpen && setSelectedBatchForUsage(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Usage Details for Shipment {selectedBatchForUsage?.batchId}</DialogTitle>
                <DialogDescription>List of packaging events that used bags from this shipment.</DialogDescription>
            </DialogHeader>
             <ScrollArea className="max-h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Lot Number</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead className="text-right">Bags Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedBatchForUsage?.usage && selectedBatchForUsage.usage.length > 0 ? (
                            selectedBatchForUsage.usage.map((use, index) => (
                                <TableRow key={index}>
                                    <TableCell>{format(new Date(use.date), 'PP')}</TableCell>
                                    <TableCell>{use.lotNumber}</TableCell>
                                    <TableCell>{use.grade}</TableCell>
                                    <TableCell className="text-right">{use.quantity}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No usage has been logged for this shipment yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
    </Dialog>
    </>
  );
}

    