
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
import type { RcnSizingCalibrationFormValues } from "@/types";
import { saveRcnSizingAction } from "@/lib/actions"; // This action needs to be created
import { useMutation } from "@tanstack/react-query";
import { RCN_SIZE_GRADES, RCN_SIZING_MACHINE_IDS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const gradeOutputSchema = z.object({
  grade: z.enum(RCN_SIZE_GRADES, { required_error: "Grade is required." }),
  weight_kg: z.coerce.number().positive("Weight must be positive."),
});

const rcnSizingFormSchema = z.object({
  sizing_batch_id: z.string().min(1, "Sizing Batch ID is required."),
  linked_rcn_batch_id: z.string().min(1, "Linked RCN Batch ID is required."),
  sizing_datetime: z.date({ required_error: "Sizing date and time are required." }),
  input_weight_kg: z.coerce.number().positive("Input weight must be positive."),
  total_output_weight_kg: z.coerce.number().positive("Total output weight must be positive."),
  grade_outputs: z.array(gradeOutputSchema).min(1, "At least one grade output is required."),
  machine_id: z.string().min(1, "Sizing Machine ID is required."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(500).optional(),
});

const defaultValues: Partial<RcnSizingCalibrationFormValues> = {
    sizing_batch_id: '',
    linked_rcn_batch_id: '',
    sizing_datetime: new Date(),
    input_weight_kg: undefined,
    total_output_weight_kg: undefined,
    grade_outputs: [],
    machine_id: '',
};

export function RcnSizingCalibrationForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<RcnSizingCalibrationFormValues>({
    resolver: zodResolver(rcnSizingFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "grade_outputs",
  });

  const mutation = useMutation({
    mutationFn: saveRcnSizingAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        toast({ title: "RCN Sizing Saved", description: `Sizing Batch ${form.getValues('sizing_batch_id')} saved.` });
        addNotification({ message: 'New RCN sizing log recorded.' });
        form.reset(defaultValues);
        form.setValue('sizing_datetime', new Date());
      } else {
        toast({ title: "Error Saving Sizing Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: RcnSizingCalibrationFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "sizing_datetime") => (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] pl-3 text-left font-normal",
                !form.getValues(fieldName) && "text-muted-foreground"
              )}
            >
              {form.getValues(fieldName) ? (
                format(form.getValues(fieldName)!, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={form.getValues(fieldName)}
            onSelect={(date) => {
              const currentVal = form.getValues(fieldName) || new Date();
              const newDate = date || currentVal;
              newDate.setHours(currentVal.getHours());
              newDate.setMinutes(currentVal.getMinutes());
              form.setValue(fieldName, newDate, { shouldValidate: true });
            }}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormControl>
        <Input
          type="time"
          className="w-[120px]"
          value={
            form.getValues(fieldName)
              ? format(form.getValues(fieldName)!, "HH:mm")
              : ""
          }
          onChange={(e) => {
            const currentTime = form.getValues(fieldName) || new Date();
            const [hours, minutes] = e.target.value.split(":");
            const newTime = new Date(currentTime);
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            form.setValue(fieldName, newTime, { shouldValidate: true });
          }}
        />
      </FormControl>
    </div>
  );

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record RCN Sizing Log"
        submitIcon={<Scaling />}
      >
        <FormStep>
          <FormField control={form.control} name="sizing_batch_id" render={({ field }) => (
            <FormItem><FormLabel>What is the Sizing Batch ID?</FormLabel><FormControl><Input placeholder="e.g., SIZE-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        <FormStep>
          <FormField control={form.control} name="linked_rcn_batch_id" render={({ field }) => (
            <FormItem><FormLabel>What is the Linked RCN Batch ID?</FormLabel><FormControl><Input placeholder="Batch ID from Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="sizing_datetime" render={() => (
                <FormItem className="flex flex-col"><FormLabel>When did sizing take place?</FormLabel>{renderDateTimePicker("sizing_datetime")}<FormMessage /></FormItem>
            )}/>
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="input_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the input weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="Total RCN input" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="total_output_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the total output weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="Total weight of all grades" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep>
          <FormLabel>What were the grade outputs?</FormLabel>
          <FormDescription>Log the weight for each RCN size grade produced.</FormDescription>
          <div className="space-y-4 mt-2">
            {fields.map((item, index) => (
              <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
                <FormField control={form.control} name={`grade_outputs.${index}.grade`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">What was the Grade?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger></FormControl><SelectContent>{[...RCN_SIZE_GRADES].map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent></Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`grade_outputs.${index}.weight_kg`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel className="text-xs">What was the weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ grade: '' as any, weight_kg: undefined! })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Grade Output</Button>
          <FormMessage className="mt-2">{form.formState.errors.grade_outputs?.message || form.formState.errors.grade_outputs?.root?.message}</FormMessage>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="machine_id" render={({ field }) => (
                <FormItem>
                    <FormLabel>Which Machine ID was used?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Machine" /></SelectTrigger></FormControl>
                        <SelectContent>{[...RCN_SIZING_MACHINE_IDS].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Observations on sizing performance, issues, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
