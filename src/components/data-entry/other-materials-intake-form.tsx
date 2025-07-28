
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
import { ITEM_UNITS, OTHER_MATERIALS_ITEMS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const otherMaterialsIntakeFormSchema = z.object({
  intake_batch_id: z.string().optional(),
  item_name: z.string().min(2, "Item name must be at least 2 characters."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  unit: z.string().min(1, "Unit is required."),
  supplier_id: z.string().min(1, "Supplier is a required field."),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  receiver_id: z.string().min(1, "Receiver is a required field."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
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
        addNotification({ message: 'New material intake recorded.', link: '/inventory' });
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

  const renderDateTimePicker = () => (
     <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !form.getValues('arrival_datetime') && "text-muted-foreground")}>
              {form.getValues('arrival_datetime') ? format(form.getValues('arrival_datetime'), "PPP HH:mm") : <span>Pick a date and time</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={form.getValues('arrival_datetime')} onSelect={(date) => form.setValue('arrival_datetime', date as Date, { shouldValidate: true })} disabled={(date) => date > new Date()} initialFocus />
          <div className="p-2 border-t"><Input type="time" className="w-full" value={form.getValues('arrival_datetime') ? format(form.getValues('arrival_datetime'), 'HH:mm') : ''} onChange={(e) => { const currentTime = form.getValues('arrival_datetime') || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); form.setValue('arrival_datetime', newTime, { shouldValidate: true }); }} /></div>
        </PopoverContent>
      </Popover>
  );

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Material Intake"
        submitIcon={<RotateCcw />}
      >
        <FormStep>
          <FormField control={form.control} name="item_name" render={({ field }) => (
            <FormItem>
              <FormLabel>What is the item name?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                  <SelectContent>
                  {OTHER_MATERIALS_ITEMS.map(item => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                  </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </FormStep>

        <FormStep>
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem><FormLabel>What is the quantity?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        <FormStep>
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem><FormLabel>What is the unit of measurement?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? 'units'}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="arrival_datetime" render={() => (
                <FormItem><FormLabel>When was the arrival date & time?</FormLabel>{renderDateTimePicker()}<FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep><FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem><FormLabel>Who is the supplier?</FormLabel><FormControl><Input placeholder="Enter supplier's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        <FormStep><FormField control={form.control} name="receiver_id" render={({ field }) => (<FormItem><FormLabel>Who is the receiver?</FormLabel><FormControl><Input placeholder="Enter receiver's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        <FormStep><FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who is the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="intake_batch_id" render={({ field }) => (
            <FormItem><FormLabel>What is the Intake Batch ID? (Optional)</FormLabel><FormControl><Input placeholder="e.g., MAT-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>A unique ID for this intake delivery, if applicable.</FormDescription><FormMessage /></FormItem>
            )} />
        </FormStep>

        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
