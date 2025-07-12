
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PackagingFormValues } from "@/types";
import { savePackagingAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { SUPERVISOR_IDS_EXAMPLE, PACKAGE_TYPES, PACKAGING_LINE_IDS, SEALING_MACHINE_IDS, SHIFT_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
import { calculateExpiryDate } from "@/lib/utils";
import { useNotifications } from "@/contexts/notification-context";

const packagingFormSchema = z.object({
  pack_batch_id: z.string().min(1, "Pack Batch ID is required."),
  linked_qc_batch_id: z.string().min(1, "Linked Final QC Batch ID is required."),
  pack_start_time: z.date({ required_error: "Start time is required." }),
  pack_end_time: z.date({ required_error: "End time is required." }),
  approved_weight_kg: z.coerce.number().positive("Approved weight must be positive."),
  package_type: z.enum(PACKAGE_TYPES, { required_error: "Package type is required." }),
  package_size_kg: z.coerce.number().positive("Package size must be positive."),
  packages_produced: z.coerce.number().int().positive("Number of packages must be a positive integer."),
  net_weight_per_package_kg: z.coerce.number().positive("Net weight per package must be positive."),
  label_batch_code: z.string().optional(),
  production_date: z.date({ required_error: "Production date is required." }),
  label_verification_status: z.enum(YES_NO_OPTIONS).optional(),
  packaging_line_id: z.string().optional(),
  sealing_machine_id: z.string().optional(),
  workers_count: z.coerce.number().int().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().optional(),
  notes: z.string().max(300).optional(),
});

const defaultValues: Partial<PackagingFormValues> = {
  pack_batch_id: '',
  linked_qc_batch_id: '',
  pack_start_time: new Date(),
  pack_end_time: new Date(),
  approved_weight_kg: undefined,
  package_size_kg: undefined,
  packages_produced: undefined,
  net_weight_per_package_kg: undefined,
  label_batch_code: '',
  production_date: new Date(),
  packaging_line_id: '',
  sealing_machine_id: '',
  workers_count: undefined,
  notes: '',
};

export function PackagingForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(packagingFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: savePackagingAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Batch ${form.getValues('pack_batch_id')} saved.`;
        toast({ title: "Packaging Log Saved", description: desc });
        addNotification({ message: 'New packaging log recorded.' });
        form.reset(defaultValues);
        form.setValue('pack_start_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('pack_end_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('production_date', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({ title: "Error Saving Packaging Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const prodDate = form.watch("production_date");
  const expiryDate = prodDate ? calculateExpiryDate(prodDate) : null;

  function onSubmit(data: PackagingFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "pack_start_time" | "pack_end_time", label: string) => (
    <FormField control={form.control} name={fieldName} render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP HH:mm") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
              <div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )} />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="pack_batch_id" render={({ field }) => (<FormItem><FormLabel>Packaging Batch ID</FormLabel><FormControl><Input placeholder="e.g., PKG-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="linked_qc_batch_id" render={({ field }) => (<FormItem><FormLabel>Linked Final QC Batch ID</FormLabel><FormControl><Input placeholder="Batch ID from Final QC" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("pack_start_time", "Packaging Start Time")}
          {renderDateTimePicker("pack_end_time", "Packaging End Time")}
        </div>
        
        <FormField control={form.control} name="approved_weight_kg" render={({ field }) => (<FormItem><FormLabel>Approved Kernels Input (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="Weight from Final QC" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="package_type" render={({ field }) => (<FormItem><FormLabel>Package Type</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{PACKAGE_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="package_size_kg" render={({ field }) => (<FormItem><FormLabel>Package Size (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 22.68" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="packages_produced" render={({ field }) => (<FormItem><FormLabel>Packages Produced</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 100" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <FormField control={form.control} name="net_weight_per_package_kg" render={({ field }) => (<FormItem><FormLabel>Actual Net Weight per Package (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="For verification" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="production_date" render={({ field }) => (
                <FormItem><FormLabel>Production Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )} />
            <FormItem><FormLabel>Calculated Expiry Date</FormLabel><Input readOnly value={expiryDate ? format(expiryDate, "PPP") : "Select production date"} className="bg-muted" /></FormItem>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="packaging_line_id" render={({ field }) => (<FormItem><FormLabel>Packaging Line ID</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger></FormControl><SelectContent>{PACKAGING_LINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="sealing_machine_id" render={({ field }) => (<FormItem><FormLabel>Sealing Machine ID</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl><SelectContent>{SEALING_MACHINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (
          <FormItem><FormLabel>Supervisor (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl><SelectContent>{SUPERVISOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Packaging issues, observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
          Record Packaging Log
        </Button>
      </form>
    </Form>
  );
}
