
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Scaling, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { MachineGradingFormValues } from "@/types";
import { saveMachineGradingAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { GRADING_MACHINE_IDS, SIZE_CATEGORIES } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const sizeDistributionSchema = z.object({
    size_category: z.string().min(1, "Category is required."),
    weight_kg: z.coerce.number().positive("Weight must be positive."),
});

const machineGradingFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  cs_start_time: z.date({ required_error: "Start time is required." }),
  cs_end_time: z.date({ required_error: "End time is required." }),
  peeled_input_kg: z.coerce.number().positive("Input weight must be positive."),
  whole_kernels_kg: z.coerce.number().positive("Whole kernels weight is required.").optional(),
  broken_pieces_kg: z.coerce.number().positive("Broken pieces weight is required.").optional(),
  dust_powder_kg: z.coerce.number().nonnegative("Dust weight cannot be negative.").optional(),
  detailed_size_distribution: z.array(sizeDistributionSchema).optional(),
  vibration_level: z.coerce.number().optional(),
  screen_size: z.string().optional(),
  feed_rate_kg_hr: z.coerce.number().optional(),
  machine_id: z.string().min(1, "Machine ID is required."),
  settings_profile: z.string().optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(500).optional(),
});

const defaultValues: Partial<MachineGradingFormValues> = {
    linked_lot_number: '',
    cs_start_time: new Date(),
    cs_end_time: new Date(),
    peeled_input_kg: undefined,
    detailed_size_distribution: [],
    machine_id: '',
    supervisor_id: '',
};

export function MachineGradingForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<MachineGradingFormValues>({
    resolver: zodResolver(machineGradingFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detailed_size_distribution",
  });

  const mutation = useMutation({
    mutationFn: saveMachineGradingAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Grading for Lot ${form.getValues('linked_lot_number')} saved.`;
        toast({ title: "Machine Grading Saved", description: desc });
        addNotification({ message: 'New machine grading log recorded.' });
        form.reset(defaultValues);
        form.setValue('cs_start_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('cs_end_time', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({ title: "Error Saving Grading", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: MachineGradingFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "cs_start_time" | "cs_end_time") => (
    <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !form.getValues(fieldName) && "text-muted-foreground")}>
              {form.getValues(fieldName) ? format(form.getValues(fieldName), "PPP HH:mm") : <span>Pick date & time</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={form.getValues(fieldName)} onSelect={(date) => form.setValue(fieldName, date as Date, { shouldValidate: true})} disabled={(date) => date > new Date()} initialFocus />
          <div className="p-2 border-t"><Input type="time" className="w-full" value={form.getValues(fieldName) ? format(form.getValues(fieldName), 'HH:mm') : ''} onChange={(e) => { const currentTime = form.getValues(fieldName) || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); form.setValue(fieldName, newTime, { shouldValidate: true}); }} /></div>
        </PopoverContent>
      </Popover>
  );


  return (
    <Form {...form}>
       <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Machine Grading"
        submitIcon={<Scaling />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (
                <FormItem><FormLabel>What is the Lot Number?</FormLabel><FormControl><Input placeholder="Enter the Lot Number being graded" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="cs_start_time" render={() => (
                <FormItem><FormLabel>When did grading start?</FormLabel>{renderDateTimePicker("cs_start_time")}<FormMessage /></FormItem>
            )}/>
        </FormStep>
         <FormStep>
            <FormField control={form.control} name="cs_end_time" render={() => (
                <FormItem><FormLabel>When did grading end?</FormLabel>{renderDateTimePicker("cs_end_time")}<FormMessage /></FormItem>
            )}/>
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="peeled_input_kg" render={({ field }) => (
            <FormItem><FormLabel>What is the input weight of peeled kernels (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 150" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep>
            <FormLabel>What is the detailed size distribution?</FormLabel>
            <FormDescription>Log the weight for each size category produced.</FormDescription>
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
            {fields.map((item, index) => (
                <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
                    <FormField control={form.control} name={`detailed_size_distribution.${index}.size_category`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Size Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl><SelectContent>{SIZE_CATEGORIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name={`detailed_size_distribution.${index}.weight_kg`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            </div>
             <Button type="button" variant="outline" size="sm" onClick={() => append({ size_category: '', weight_kg: undefined! })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Size Category</Button>
        </FormStep>
        
         <FormStep>
             <FormField control={form.control} name="machine_id" render={({ field }) => (
                <FormItem><FormLabel>Which Machine ID was used?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl><SelectContent>{GRADING_MACHINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="settings_profile" render={({ field }) => (
                <FormItem><FormLabel>What was the settings profile? (Optional)</FormLabel><FormControl><Input placeholder="e.g., Profile A, High-Speed" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="vibration_level" render={({ field }) => (
                <FormItem><FormLabel>What was the vibration level? (Optional)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="feed_rate_kg_hr" render={({ field }) => (
                <FormItem><FormLabel>What was the feed rate (kg/hr, Optional)?</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
            <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Observations on grading performance, issues, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
