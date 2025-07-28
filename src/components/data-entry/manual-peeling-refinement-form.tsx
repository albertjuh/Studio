
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ManualPeelingRefinementFormValues } from "@/types";
import { saveManualPeelingRefinementAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useNotifications } from "@/contexts/notification-context";

const manualPeelingRefinementFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  start_time: z.date({ required_error: "Start time is required." }),
  end_time: z.date({ required_error: "End time is required." }),
  input_kg: z.coerce.number().positive("Input weight must be positive."),
  peeled_kg: z.coerce.number().positive("Peeled weight must be positive.").optional(),
  waste_kg: z.coerce.number().nonnegative("Waste weight cannot be negative.").optional(),
  number_of_workers: z.coerce.number().int().positive("Number of workers must be a positive integer."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300).optional(),
});

const defaultValues: Partial<ManualPeelingRefinementFormValues> = {
  linked_lot_number: '',
  start_time: new Date(),
  end_time: new Date(),
  input_kg: undefined,
  peeled_kg: undefined,
  waste_kg: 0,
  number_of_workers: undefined,
  supervisor_id: '',
  notes: '',
};

export function ManualPeelingRefinementForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<ManualPeelingRefinementFormValues>({
    resolver: zodResolver(manualPeelingRefinementFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveManualPeelingRefinementAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Manual peeling for Lot ${form.getValues('linked_lot_number')} saved.`;
        toast({ title: "Manual Peeling Saved", description: desc });
        addNotification({ message: 'New manual peeling log recorded.' });
        form.reset(defaultValues);
        form.setValue('start_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('end_time', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({ title: "Error Saving Peeling", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: ManualPeelingRefinementFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "start_time" | "end_time", label: string) => (
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
              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
              <div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField control={form.control} name="linked_lot_number" render={({ field }) => (
            <FormItem><FormLabel>Lot Number</FormLabel><FormControl><Input placeholder="Enter the Lot Number being refined" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The Lot Number being refined.</FormDescription><FormMessage /></FormItem>
        )} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("start_time", "Start Time")}
          {renderDateTimePicker("end_time", "End Time")}
        </div>
        
        <FormField control={form.control} name="input_kg" render={({ field }) => (
          <FormItem><FormLabel>Input Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="peeled_kg" render={({ field }) => (
            <FormItem><FormLabel>Peeled Kernels (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 48.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="waste_kg" render={({ field }) => (
            <FormItem><FormLabel>Waste (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormDescription>Testa, broken pieces, etc.</FormDescription><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="number_of_workers" render={({ field }) => (
          <FormItem><FormLabel>Number of Workers</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 15" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (
          <FormItem><FormLabel>Supervisor</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Worker performance, quality observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
          Record Manual Peeling
        </Button>
      </form>
    </Form>
  );
}
