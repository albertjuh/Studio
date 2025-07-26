
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Hammer, Loader2, AlertTriangle, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ShellingProcessFormValues, ShellingMachineThroughput } from "@/types";
import { saveShellingProcessAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { OPERATOR_IDS_EXAMPLE, SUPERVISOR_IDS_EXAMPLE, SHELLING_MACHINE_IDS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";

const machineThroughputSchema = z.object({
  machine_id: z.string().min(1, "Machine ID is required."),
  processed_kg: z.coerce.number().positive("Processed kg must be positive."),
});

const shellingProcessFormSchema = z.object({
  shell_process_id: z.string().min(1, "Shelling Process ID is required."),
  lot_number: z.string().min(1, "Lot Number is required."),
  linked_steam_batch_id: z.string().min(1, "Linked Steam Batch ID is required."),
  shell_start_time: z.date({ required_error: "Shell start date and time are required." }),
  shell_end_time: z.date({ required_error: "Shell end date and time are required." }),
  steamed_weight_input_kg: z.coerce.number().positive("Steamed weight input must be positive."),
  shelled_kernels_weight_kg: z.coerce.number().positive("Shelled kernels weight must be positive.").optional(),
  shell_waste_weight_kg: z.coerce.number().positive("Shell waste (CNS) weight must be positive.").optional(),
  broken_kernels_weight_kg: z.coerce.number().nonnegative("Broken kernels weight cannot be negative.").optional(),
  machine_throughputs: z.array(machineThroughputSchema).optional(),
  operator_id: z.string().min(1, "Operator ID is required.").optional(),
  supervisor_id: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.shell_start_time && data.shell_end_time) {
    return data.shell_end_time > data.shell_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["shell_end_time"],
}).refine(data => {
  if (data.machine_throughputs && data.machine_throughputs.length > 0) {
    const totalMachineThroughput = data.machine_throughputs.reduce((sum, mt) => sum + (mt.processed_kg || 0), 0);
    // Allow a small tolerance, e.g., 1%
    return Math.abs(totalMachineThroughput - data.steamed_weight_input_kg) <= data.steamed_weight_input_kg * 0.01;
  }
  return true;
}, {
  message: "Total machine throughput should approximately match steamed weight input.",
  path: ["machine_throughputs"],
});


const defaultValues: Partial<ShellingProcessFormValues> = {
  shell_process_id: '',
  lot_number: '',
  linked_steam_batch_id: '',
  shell_start_time: undefined,
  shell_end_time: undefined,
  steamed_weight_input_kg: undefined,
  shelled_kernels_weight_kg: undefined,
  shell_waste_weight_kg: undefined,
  broken_kernels_weight_kg: 0,
  machine_throughputs: [],
  operator_id: '',
  supervisor_id: '',
  notes: '',
};

export function ShellingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);

  const form = useForm<ShellingProcessFormValues>({
    resolver: zodResolver(shellingProcessFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "machine_throughputs",
  });

  useEffect(() => {
    const now = new Date();
    let startChanged = false;
    if (form.getValues('shell_start_time') === undefined) {
      form.setValue('shell_start_time', now, { shouldValidate: true, shouldDirty: true });
      startChanged = true;
    }
    if (form.getValues('shell_end_time') === undefined) {
      const startTimeForEndTime = startChanged ? now : (form.getValues('shell_start_time') || now);
      const endTime = new Date(startTimeForEndTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
      form.setValue('shell_end_time', endTime, { shouldValidate: true, shouldDirty: true });
    }
  }, [form]);

  const mutation = useMutation({
    mutationFn: saveShellingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Lot ${form.getValues('lot_number')} (Process ID: ${result.id}) saved.`;
        toast({ title: "Shelling Process Recorded", description: desc });
        addNotification({ message: 'New shelling process log recorded.' });
        form.reset(defaultValues);
        // Re-initialize dates after reset
        const now = new Date();
        form.setValue('shell_start_time', now, { shouldValidate: false, shouldDirty: false });
        form.setValue('shell_end_time', new Date(now.getTime() + 2 * 60 * 60 * 1000), { shouldValidate: false, shouldDirty: false });
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Shelling Process",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Shelling Process",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const steamedInput = form.watch("steamed_weight_input_kg");
  const kernelsOutput = form.watch("shelled_kernels_weight_kg");
  const shellWaste = form.watch("shell_waste_weight_kg");
  const brokensOutput = form.watch("broken_kernels_weight_kg");

  useEffect(() => {
    const newAlertsList: string[] = [];
    if (steamedInput && kernelsOutput) {
      const shellingRate = (kernelsOutput / steamedInput) * 100;
      if (shellingRate < 75) {
        newAlertsList.push(`Low Shelling Rate: ${shellingRate.toFixed(1)}%. Expected >= 75%.`);
      }
      if (brokensOutput) {
        const breakageRate = (brokensOutput / kernelsOutput) * 100; // Or brokens / (kernels + brokens)
        if (breakageRate > 8) {
          newAlertsList.push(`High Breakage Rate: ${breakageRate.toFixed(1)}%. Expected <= 8%.`);
        }
      }
    }
    if (steamedInput && kernelsOutput && shellWaste && brokensOutput) {
        const totalOutput = (kernelsOutput || 0) + (shellWaste || 0) + (brokensOutput || 0);
        const balanceVariance = ((steamedInput - totalOutput) / steamedInput) * 100;
        if (Math.abs(balanceVariance) > 2) {
            newAlertsList.push(`Material Balance Alert: Variance is ${balanceVariance.toFixed(1)}%. Expected within ±2%. Check input/output weights.`);
        }
    }

    setFormAlerts(currentAlerts => {
      if (currentAlerts.length === newAlertsList.length && currentAlerts.every((val, index) => val === newAlertsList[index])) {
        return currentAlerts;
      }
      return newAlertsList;
    });
  }, [steamedInput, kernelsOutput, shellWaste, brokensOutput]);


  const renderDateTimePicker = (fieldName: "shell_start_time" | "shell_end_time", label: string) => (
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

  function onSubmit(data: ShellingProcessFormValues) {
    console.log("Submitting Shelling Process Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="linked_steam_batch_id" render={({ field }) => (<FormItem><FormLabel>Linked Steam Batch ID</FormLabel><FormControl><Input placeholder="Batch ID from Steaming" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The batch being shelled.</FormDescription><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="lot_number" render={({ field }) => (<FormItem><FormLabel>Lot Number</FormLabel><FormControl><Input placeholder="e.g., LOT-240726-A" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The new Lot Number for traceability.</FormDescription><FormMessage /></FormItem>)} />
        </div>
         <FormField control={form.control} name="shell_process_id" render={({ field }) => (<FormItem><FormLabel>Shelling Process ID</FormLabel><FormControl><Input placeholder="e.g., SHL-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Unique ID for this specific shelling activity.</FormDescription><FormMessage /></FormItem>)} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("shell_start_time", "Shelling Start Time")}
          {renderDateTimePicker("shell_end_time", "Shelling End Time")}
        </div>
        {form.getValues("shell_start_time") && form.getValues("shell_end_time") && form.getValues("shell_end_time") > form.getValues("shell_start_time") && (
            <p className="text-sm text-muted-foreground">Calculated Shelling Duration: {differenceInMinutes(form.getValues("shell_end_time"), form.getValues("shell_start_time"))} minutes.</p>
        )}

        <FormField control={form.control} name="steamed_weight_input_kg" render={({ field }) => (<FormItem><FormLabel>Steamed Weight Input (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 950" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="shelled_kernels_weight_kg" render={({ field }) => (<FormItem><FormLabel>Shelled Kernels (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 200" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="shell_waste_weight_kg" render={({ field }) => (<FormItem><FormLabel>Shell Waste (CNS) (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 700" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="broken_kernels_weight_kg" render={({ field }) => (<FormItem><FormLabel>Broken Kernels (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 20" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {formAlerts.length > 0 && (
          <Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Process Alert!</AlertTitle>
            <AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription>
          </Alert>
        )}

        <div>
          <FormLabel>Machine Throughputs (Optional)</FormLabel>
          {fields.map((item, index) => (
            <div key={item.id} className="flex items-end gap-2 mt-2 p-2 border rounded-md">
              <FormField control={form.control} name={`machine_throughputs.${index}.machine_id`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">Machine ID</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Machine" /></SelectTrigger></FormControl>
                      <SelectContent>{SHELLING_MACHINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>)} />
              <FormField control={form.control} name={`machine_throughputs.${index}.processed_kg`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">Processed (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ machine_id: '', processed_kg: undefined! })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Machine Throughput</Button>
          <FormMessage>{form.formState.errors.machine_throughputs?.message}</FormMessage>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="operator_id" render={({ field }) => (<FormItem><FormLabel>Operator ID</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger></FormControl>
                <SelectContent>{OPERATOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Supervisor ID (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl>
                <SelectContent>{SUPERVISOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Machine M1 performance issues, high breakage observed..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hammer className="mr-2 h-4 w-4" />}
           Record Shelling Process
        </Button>
      </form>
    </Form>
  );
}
