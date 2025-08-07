
import { useEffect, useState } from 'react';
import type { ReportDataPayload, PackagingFormValues } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProductionLogAction } from '@/lib/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PackagingForm } from '../data-entry/packaging-form';


interface ReportDataDisplayProps {
  data: ReportDataPayload | null;
}

function renderLogDetails(log: any) { // Using any because of the diverse log structures
    // This function can be expanded to provide more detailed breakdowns for each log type
    switch (log.stage_name) {
        case 'RCN Intake':
            return `From: ${log.supplier_id}, Net Wt: ${log.net_weight_kg} kg`;
        case 'Other Materials Intake':
            return `Item: ${log.item_name}, Qty: ${log.quantity} ${log.unit}`;
        case 'Goods Dispatched':
            return `To: ${log.destination}, Qty: ${log.quantity} ${log.unit}`;
        case 'RCN Output to Factory':
            return `Qty: ${log.quantity_kg} kg, To: ${log.destination_stage}`;
        case 'Steaming Process':
            return `Temp: ${log.steam_temperature_celsius ?? 'N/A'}°C, Duration: ${log.steam_duration_minutes ?? 'N/A'} min`;
        case 'Shelling Process':
            return `Output: ${log.shelled_kernels_weight_kg ?? 'N/A'} kg kernels, ${log.shell_waste_weight_kg ?? 'N/A'} kg CNS`;
        case 'Drying Process':
            return `Method: ${log.drying_method ?? 'N/A'}, Final Moisture: ${log.final_moisture_percent ?? 'N/A'}%`;
        case 'Peeling Process':
            return `Method: ${log.peeling_method ?? 'N/A'}, Efficiency: ${log.peeling_efficiency_percent?.toFixed(1) ?? 'N/A'}%`;
        case 'Machine Grading':
            return `Total Graded: ${log.total_graded_output_kg ?? 'N/A'} kg, Machine: ${log.equipment_id ?? 'N/A'}`;
        case 'Manual Peeling Refinement':
            return `Input: ${log.input_kg} kg, Workers: ${log.number_of_workers}`;
        case 'Packaging':
            const totalPacks = log.packed_items?.reduce((sum: number, item: any) => sum + (item.number_of_packs || 0), 0) || 0;
            return `Packed ${totalPacks} units. Box Type: ${log.box_type || 'N/A'}`;
        case 'Quality Control (Final)':
            return `Officer: ${log.qc_officer_id}, Certified: ${log.export_certified}`;
        case 'RCN Quality Assessment':
            return `Officer: ${log.qc_officer_id}, Moisture: ${log.moisture_content_percent}%`;
        case 'Equipment Calibration':
            return `Eqpt: ${log.equipment_id}, Result: ${log.result}`;
        default:
            return log.notes || '-';
    }
}

// A specific component for the Edit Packaging Dialog
function EditPackagingDialog({ log }: { log: PackagingFormValues }) {
  const [open, setOpen] = useState(false);

  // The form submission will call this to close the dialog
  const handleFormSubmit = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Packaging Log</DialogTitle>
          <DialogDescription>
            Modify the details for packaging log ID: <span className="font-mono">{log.id}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
            <PackagingForm initialData={log} onFormSubmit={handleFormSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


export function ReportDataDisplay({ data }: ReportDataDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setIsAdmin(role === 'admin');
  }, []);

  const deleteMutation = useMutation({
    mutationFn: deleteProductionLogAction,
    onSuccess: (result, logId) => {
        if (result.success) {
            toast({
                title: "Log Deleted",
                description: `The log entry (ID: ${logId}) and its inventory transactions have been successfully reversed.`,
            });
            // Invalidate queries to refetch data for the report, dashboard, and inventory pages
            queryClient.invalidateQueries({ queryKey: ['reportData'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
            queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
            queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
            queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        } else {
             toast({
                title: "Error Deleting Log",
                description: result.error || "An unknown error occurred.",
                variant: "destructive",
            });
        }
    },
    onError: (error: any, logId) => {
        toast({
            title: "Action Failed",
            description: `Could not delete log ${logId}. Error: ${error.message}`,
            variant: "destructive",
        });
    }
  });

  const handleGenericEditClick = (logId: string) => {
    toast({
        title: "Edit Not Available For This Stage",
        description: `Editing log ID: ${logId} is not yet implemented for this log type.`,
    });
  };

  const handleDeleteClick = (logId: string) => {
    deleteMutation.mutate(logId);
  }

  if (!data) {
    return <p className="text-muted-foreground text-center py-8">No data to display. Apply filters to generate a report.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(data.totals).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</TableCell>
                  <TableCell className="text-right">{typeof value === 'number' ? value.toLocaleString() : value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item-wise Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Dispatched</TableHead>
                <TableHead className="text-right">Produced</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.itemWiseSummary.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.item}</TableCell>
                  <TableCell className="text-right">{item.received.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.dispatched.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.produced.toLocaleString()}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableCaption>{data.itemWiseSummary.length === 0 ? "No item summary for this period." : "Summary of item movements and production."}</TableCaption>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production & Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stage / Activity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Notes</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productionLogs.map((log: any, index: number) => {
                const logDate = log.arrival_datetime || log.dispatch_datetime || log.steam_start_time || log.shell_start_time || log.dry_start_time || log.peel_start_time || log.cs_start_time || log.start_time || log.pack_start_time || log.qc_datetime || log.assessment_datetime || log.calibration_date || log.output_datetime || new Date();
                return (
                    <TableRow key={log.id || index}>
                    <TableCell>{format(new Date(logDate), "PP HH:mm")}</TableCell>
                    <TableCell>{log.stage_name}</TableCell>
                    <TableCell className="text-xs">{renderLogDetails(log)}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.notes || '-'}</TableCell>
                     {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                           {log.stage_name === 'Packaging' ? (
                               <EditPackagingDialog log={{ ...log, id: log.id }} />
                           ) : (
                               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleGenericEditClick(log.id)}>
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                               </Button>
                           )}
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                                      {deleteMutation.isPending && deleteMutation.variables === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                      <span className="sr-only">Delete</span>
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      This will permanently delete the log for <strong className="text-foreground">{log.stage_name} (ID: {log.id})</strong> and reverse its impact on your inventory. This action cannot be undone.
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteClick(log.id)} className="bg-destructive hover:bg-destructive/90">
                                      Yes, delete this log
                                  </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                           </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                    </TableRow>
                )
              })}
            </TableBody>
            <TableCaption>{data.productionLogs.length === 0 ? "No activity logs for this period." : "Detailed production and operational entries."}</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
