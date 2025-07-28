
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Wind, Loader2, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { DryingProcessFormValues } from "@/types";
import { saveDryingProcessAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DRYING_METHODS, DRYING_EQUIPMENT_IDS, QUALITY_CHECK_STATUSES, MOISTURE_LIMIT_FINAL_PERCENT } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";

const dryingProcessFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  dry_start_time: z.date({ required_error: "Drying start date and time are required." }),
  dry_end_time: z.date({ required_error: "Drying end date and time are required." }),
  wet_kernel_weight_kg: z.coerce.number().positive("Wet kernel weight must be positive."),
  dry_kernel_weight_kg: z.coerce.number().positive("Dry kernel weight must be positive.").optional(),
  drying_temperature_celsius: z.coerce.number().min(0).max(100, "Temperature must be realistic (0-100°C).").optional(), // Max 70C for alerts
  final_moisture_percent: z.coerce.number().min(0).max(25, "Final moisture must be realistic (0-25%).").optional(), // Max 5% for alerts
  drying_method: z.enum(DRYING_METHODS).optional(),
  weather_conditions: z.string().max(100, "Weather conditions too long.").optional(),
  equipment_id: z.string().optional(),
  quality_check_status: z.enum(QUALITY_CHECK_STATUSES).optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.dry_start_time && data.dry_end_time) {
    return data.dry_end_time > data.dry_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["dry_end_time"],
}).refine(data => {
  if (data.drying_method === "Sun" || data.drying_method === "Hybrid") {
    return !!data.weather_conditions; // Weather conditions required for Sun/Hybrid
  }
  return true;
}, {
  message: "Weather conditions are required for Sun or Hybrid drying.",
  path: ["weather_conditions"],
}).refine(data => {
  if (data.drying_method === "Mechanical" || data.drying_method === "Hybrid") {
    return !!data.equipment_id; // Equipment ID required for Mechanical/Hybrid
  }
  return true;
}, {
  message: "Equipment ID is required for Mechanical or Hybrid drying.",
  path: ["equipment_id"],
});

const defaultValues: Partial<DryingProcessFormValues> = {
  linked_lot_number: '',
  dry_start_time: undefined,
  dry_end_time: undefined,
  wet_kernel_weight_kg: undefined,
  dry_kernel_weight_kg: undefined,
  drying_temperature_celsius: undefined,
  final_moisture_percent: undefined,
  drying_method: undefined,
  weather_conditions: '',
  equipment_id: '',
  quality_check_status: 'Pending',
  supervisor_id: '',
  notes: '',
};

export function DryingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);

  const form = useForm<DryingProcessFormValues>({
    resolver: zodResolver(dryingProcessFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const now = new Date();
    let startChanged = false;
    if (form.getValues('dry_start_time') === undefined) {
      form.setValue('dry_start_time', now, { shouldValidate: true, shouldDirty: true });
      startChanged = true;
    }
    if (form.getValues('dry_end_time') === undefined) {
      const startTimeForEndTime = startChanged ? now : (form.getValues('dry_start_time') || now);
      const endTime = new Date(startTimeForEndTime.getTime() + 24 * 60 * 60 * 1000); // Default 24 hours
      form.setValue('dry_end_time', endTime, { shouldValidate: true, shouldDirty: true });
    }
  }, [form]);

  const mutation = useMutation({
    mutationFn: saveDryingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Drying process for Lot ${form.getValues('linked_lot_number')} saved.`;
        toast({ title: "Drying Process Recorded", description: desc });
        addNotification({ message: 'New drying process log recorded.' });
        form.reset(defaultValues);
        const now = new Date();
        form.setValue('dry_start_time', now, { shouldValidate: false, shouldDirty: false });
        form.setValue('dry_end_time', new Date(now.getTime() + 24 * 60 * 60 * 1000), { shouldValidate: false, shouldDirty: false });
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Drying Process",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Drying Process",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const finalMoisture = form.watch("final_moisture_percent");
  const dryingTemp = form.watch("drying_temperature_celsius");
  const dryingMethod = form.watch("drying_method");

  useEffect(() => {
    const newAlertsList: string[] = [];
    if (finalMoisture && finalMoisture > MOISTURE_LIMIT_FINAL_PERCENT) {
      newAlertsList.push(`High Final Moisture: ${finalMoisture}%. Expected <= ${MOISTURE_LIMIT_FINAL_PERCENT}%.`);
    }
    if (dryingTemp && dryingMethod === "Mechanical" && dryingTemp > 70) {
      newAlertsList.push(`High Drying Temperature: ${dryingTemp}°C. Expected <= 70°C for mechanical drying.`);
    }

    setFormAlerts(currentAlerts => {
      if (currentAlerts.length === newAlertsList.length && currentAlerts.every((val, index) => val === newAlertsList[index])) {
        return currentAlerts;
      }
      return newAlertsList;
    });
  }, [finalMoisture, dryingTemp, dryingMethod]);

  const renderDateTimePicker = (fieldName: "dry_start_time" | "dry_end_time", label: string) => (
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

  function onSubmit(data: DryingProcessFormValues) {
    console.log("Submitting Drying Process Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>Lot Number</FormLabel><FormControl><Input placeholder="Enter the Lot Number from Shelling" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("dry_start_time", "Drying Start Time")}
          {renderDateTimePicker("dry_end_time", "Drying End Time")}
        </div>
        {form.getValues("dry_start_time") && form.getValues("dry_end_time") && form.getValues("dry_end_time") > form.getValues("dry_start_time") && (
            <p className="text-sm text-muted-foreground">Calculated Drying Duration: {differenceInHours(form.getValues("dry_end_time"), form.getValues("dry_start_time"))} hours.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="wet_kernel_weight_kg" render={({ field }) => (<FormItem><FormLabel>Wet Kernel Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 200" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dry_kernel_weight_kg" render={({ field }) => (<FormItem><FormLabel>Dry Kernel Weight (kg, Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 180" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="final_moisture_percent" render={({ field }) => (<FormItem><FormLabel>Final Moisture (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 4.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="drying_temperature_celsius" render={({ field }) => (<FormItem><FormLabel>Drying Temperature (°C, Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 65" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        {formAlerts.length > 0 && (
          <Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <AlertTitle>Process Alert!</AlertTitle>
            <AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription>
          </Alert>
        )}

        <FormField control={form.control} name="drying_method" render={({ field }) => (<FormItem><FormLabel>Drying Method</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
            <SelectContent>{DRYING_METHODS.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

        {(form.watch("drying_method") === "Sun" || form.watch("drying_method") === "Hybrid") && (
            <FormField control={form.control} name="weather_conditions" render={({ field }) => (<FormItem><FormLabel>Weather Conditions</FormLabel><FormControl><Input placeholder="e.g., Sunny, clear skies" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        )}
        {(form.watch("drying_method") === "Mechanical" || form.watch("drying_method") === "Hybrid") && (
            <FormField control={form.control} name="equipment_id" render={({ field }) => (<FormItem><FormLabel>Equipment ID</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger></FormControl>
                <SelectContent>{DRYING_EQUIPMENT_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        )}
        
        <FormField control={form.control} name="quality_check_status" render={({ field }) => (<FormItem><FormLabel>Quality Check Status (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
            <SelectContent>{QUALITY_CHECK_STATUSES.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (
            <FormItem><FormLabel>Supervisor Name</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Uneven drying observed in Tray 5..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
           Record Drying Process
        </Button>
      </form>
    </Form>
  );
}
