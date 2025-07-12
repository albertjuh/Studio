
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Hand, Loader2, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PeelingProcessFormValues } from "@/types";
import { savePeelingProcessAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SUPERVISOR_IDS_EXAMPLE, PEELING_METHODS, PEELING_MACHINE_IDS, SHIFT_OPTIONS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";

const peelingProcessFormSchema = z.object({
  peel_batch_id: z.string().min(1, "Peel Batch ID is required."),
  linked_drying_batch_id: z.string().min(1, "Linked Drying Batch ID is required."),
  peel_start_time: z.date({ required_error: "Peeling start date and time are required." }),
  peel_end_time: z.date({ required_error: "Peeling end date and time are required." }),
  dried_kernel_input_kg: z.coerce.number().positive("Dried kernel input must be positive."),
  peeled_kernels_kg: z.coerce.number().positive("Peeled kernels weight must be positive.").optional(),
  peel_waste_kg: z.coerce.number().nonnegative("Peel waste (Testa) cannot be negative.").optional(),
  defective_kernels_kg: z.coerce.number().nonnegative("Defective kernels weight cannot be negative.").optional(),
  peeling_method: z.enum(PEELING_METHODS).optional(),
  workers_assigned_count: z.coerce.number().int().min(0, "Number of workers must be non-negative.").optional(),
  machine_id: z.string().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.peel_start_time && data.peel_end_time) {
    return data.peel_end_time > data.peel_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["peel_end_time"],
}).refine(data => {
  if (data.peeling_method === "Manual" && (data.workers_assigned_count === undefined || data.workers_assigned_count <=0)) {
    return false; // Workers count required for Manual
  }
  return true;
}, {
  message: "Number of workers is required for Manual peeling.",
  path: ["workers_assigned_count"],
}).refine(data => {
  if ((data.peeling_method === "Auto" || data.peeling_method === "Semi-Auto") && !data.machine_id) {
    return false; // Machine ID required for Auto/Semi-Auto
  }
  return true;
}, {
  message: "Machine ID is required for Auto/Semi-Auto peeling.",
  path: ["machine_id"],
});


const defaultValues: Partial<PeelingProcessFormValues> = {
  peel_batch_id: '',
  linked_drying_batch_id: '',
  peel_start_time: undefined,
  peel_end_time: undefined,
  dried_kernel_input_kg: undefined,
  peeled_kernels_kg: undefined,
  peel_waste_kg: 0,
  defective_kernels_kg: 0,
  peeling_method: undefined,
  workers_assigned_count: undefined,
  machine_id: '',
  shift: undefined,
  supervisor_id: '',
  notes: '',
};

export function PeelingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);

  const form = useForm<PeelingProcessFormValues>({
    resolver: zodResolver(peelingProcessFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const now = new Date();
    let startChanged = false;
    if (form.getValues('peel_start_time') === undefined) {
      form.setValue('peel_start_time', now, { shouldValidate: true, shouldDirty: true });
      startChanged = true;
    }
    if (form.getValues('peel_end_time') === undefined) {
      const startTimeForEndTime = startChanged ? now : (form.getValues('peel_start_time') || now);
      const endTime = new Date(startTimeForEndTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours
      form.setValue('peel_end_time', endTime, { shouldValidate: true, shouldDirty: true });
    }
  }, [form]);

  const mutation = useMutation({
    mutationFn: savePeelingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Batch ${form.getValues('peel_batch_id')} saved with ID: ${result.id}.`;
        toast({ title: "Peeling Process Recorded", description: desc });
        addNotification({ message: 'New peeling process log recorded.' });
        form.reset(defaultValues);
        const now = new Date();
        form.setValue('peel_start_time', now, { shouldValidate: false, shouldDirty: false });
        form.setValue('peel_end_time', new Date(now.getTime() + 4 * 60 * 60 * 1000), { shouldValidate: false, shouldDirty: false });
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Peeling Process",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Peeling Process",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const driedInput = form.watch("dried_kernel_input_kg");
  const peeledOutput = form.watch("peeled_kernels_kg");
  const defectiveOutput = form.watch("defective_kernels_kg");

  useEffect(() => {
    const newAlertsList: string[] = [];
    if (driedInput && peeledOutput) {
      const efficiency = (peeledOutput / driedInput) * 100;
      if (efficiency < 85) {
        newAlertsList.push(`Low Peeling Efficiency: ${efficiency.toFixed(1)}%. Expected >= 85%.`);
      }
    }
    if (driedInput && defectiveOutput) {
      const defectRate = (defectiveOutput / driedInput) * 100;
      if (defectRate > 5) {
        newAlertsList.push(`High Defect Rate: ${defectRate.toFixed(1)}%. Expected <= 5%.`);
      }
    }

    setFormAlerts(currentAlerts => {
      if (currentAlerts.length === newAlertsList.length && currentAlerts.every((val, index) => val === newAlertsList[index])) {
        return currentAlerts;
      }
      return newAlertsList;
    });
  }, [driedInput, peeledOutput, defectiveOutput]);

  const renderDateTimePicker = (fieldName: "peel_start_time" | "peel_end_time", label: string) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "PPP HH:mm") : <span>Pick date & time</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus />
              <div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  function onSubmit(data: PeelingProcessFormValues) {
    console.log("Submitting Peeling Process Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="peel_batch_id" render={({ field }) => (<FormItem><FormLabel>Peel Batch ID</FormLabel><FormControl><Input placeholder="e.g., PEEL-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="linked_drying_batch_id" render={({ field }) => (<FormItem><FormLabel>Linked Drying Batch ID</FormLabel><FormControl><Input placeholder="Batch ID from Drying" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("peel_start_time", "Peeling Start Time")}
          {renderDateTimePicker("peel_end_time", "Peeling End Time")}
        </div>
         {form.getValues("peel_start_time") && form.getValues("peel_end_time") && form.getValues("peel_end_time") > form.getValues("peel_start_time") && (
            <p className="text-sm text-muted-foreground">Calculated Peeling Duration: {differenceInMinutes(form.getValues("peel_end_time"), form.getValues("peel_start_time"))} minutes.</p>
        )}

        <FormField control={form.control} name="dried_kernel_input_kg" render={({ field }) => (<FormItem><FormLabel>Dried Kernel Input (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 180" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="peeled_kernels_kg" render={({ field }) => (<FormItem><FormLabel>Peeled Kernels (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 160" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="peel_waste_kg" render={({ field }) => (<FormItem><FormLabel>Peel Waste (Testa) (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 15" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="defective_kernels_kg" render={({ field }) => (<FormItem><FormLabel>Defective Kernels (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {formAlerts.length > 0 && (
          <Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Process Alert!</AlertTitle>
            <AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription>
          </Alert>
        )}

        <FormField control={form.control} name="peeling_method" render={({ field }) => (<FormItem><FormLabel>Peeling Method</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
            <SelectContent>{PEELING_METHODS.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

        {form.watch("peeling_method") === "Manual" && (
          <FormField control={form.control} name="workers_assigned_count" render={({ field }) => (<FormItem><FormLabel>Number of Workers</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 10" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
        )}
        {(form.watch("peeling_method") === "Auto" || form.watch("peeling_method") === "Semi-Auto") && (
          <FormField control={form.control} name="machine_id" render={({ field }) => (<FormItem><FormLabel>Machine ID</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl>
              <SelectContent>{PEELING_MACHINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        )}
        
        <FormField control={form.control} name="shift" render={({ field }) => (<FormItem><FormLabel>Shift (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
            <SelectContent>{SHIFT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Supervisor ID (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl>
            <SelectContent>{SUPERVISOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., High testa content in this batch..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hand className="mr-2 h-4 w-4" />}
           Record Peeling Process
        </Button>
      </form>
    </Form>
  );
}
