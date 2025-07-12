
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RotateCcw, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { OtherMaterialsIntakeFormValues } from "@/types";
import { saveOtherMaterialsIntakeAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { ITEM_UNITS, SUPPLIER_IDS_EXAMPLE, WAREHOUSE_STAFF_IDS, SUPERVISOR_IDS_EXAMPLE, OTHER_MATERIALS_ITEMS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";

const otherMaterialsIntakeFormSchema = z.object({
  intake_batch_id: z.string().optional(),
  item_name: z.string().min(2, "Item name must be at least 2 characters."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  unit: z.string().min(1, "Unit is required."),
  supplier_id: z.string().min(1, "Supplier ID/Name is required."),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  receiver_id: z.string().min(1, "Receiver ID/Name is required."),
  supervisor_id: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const defaultValues: Partial<OtherMaterialsIntakeFormValues> = {
  intake_batch_id: '',
  item_name: '',
  quantity: undefined,
  unit: 'units',
  supplier_id: '',
  arrival_datetime: new Date(),
  receiver_id: '',
  supervisor_id: '',
  notes: '',
};

export function OtherMaterialsIntakeForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<OtherMaterialsIntakeFormValues>({
    resolver: zodResolver(otherMaterialsIntakeFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveOtherMaterialsIntakeAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Intake for ${form.getValues('item_name')} (Batch: ${form.getValues('intake_batch_id') || 'N/A'}) saved.`;
        toast({ title: "Material Intake Saved", description: desc });
        addNotification({ message: 'New material intake recorded.' });
        form.reset(defaultValues);
        form.setValue('arrival_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({
          title: "Error Saving Intake",
          description: result.error || "Could not save intake data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Intake",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: OtherMaterialsIntakeFormValues) {
    console.log("Submitting Other Materials Intake Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField control={form.control} name="item_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Item Name</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                <SelectContent>
                {OTHER_MATERIALS_ITEMS.map(item => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 500" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value ?? 'units'}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField
          control={form.control}
          name="arrival_datetime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Arrival Date & Time</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP HH:mm") : <span>Pick a date and time</span>}
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
        
        <FormField control={form.control} name="supplier_id" render={({ field }) => (
          <FormItem><FormLabel>Supplier</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl><SelectContent>{SUPPLIER_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="receiver_id" render={({ field }) => (
          <FormItem><FormLabel>Receiver</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select receiver" /></SelectTrigger></FormControl><SelectContent>{WAREHOUSE_STAFF_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (
          <FormItem><FormLabel>Supervisor (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl><SelectContent>{SUPERVISOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="intake_batch_id" render={({ field }) => (
          <FormItem><FormLabel>Intake Batch ID (Optional)</FormLabel><FormControl><Input placeholder="e.g., MAT-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>A unique ID for this intake delivery, if applicable.</FormDescription><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Record Material Intake
        </Button>
      </form>
    </Form>
  );
}
