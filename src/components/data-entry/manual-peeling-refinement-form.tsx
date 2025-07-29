
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
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

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

  const renderDateTimePicker = (fieldName: "start_time" | "end_time") => (
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
        submitText="Record Manual Peeling"
        submitIcon={<Users />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (
                <FormItem><FormLabel>What is the Lot Number?</FormLabel><FormControl><Input placeholder="Enter the Lot Number being refined" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The Lot Number being refined.</FormDescription><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="start_time" render={() => (
                <FormItem><FormLabel>When did the work start?</FormLabel>{renderDateTimePicker("start_time")}<FormMessage /></FormItem>
            )}/>
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="end_time" render={() => (
                <FormItem><FormLabel>When did the work end?</FormLabel>{renderDateTimePicker("end_time")}<FormMessage /></FormItem>
            )}/>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="input_kg" render={({ field }) => (
            <FormItem><FormLabel>What was the input weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep isOptional>
          <FormField control={form.control} name="peeled_kg" render={({ field }) => (
            <FormItem><FormLabel>What was the peeled kernels weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 48.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        <FormStep isOptional>
          <FormField control={form.control} name="waste_kg" render={({ field }) => (
            <FormItem><FormLabel>What was the waste weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormDescription>Testa, broken pieces, etc.</FormDescription><FormMessage /></FormItem>
          )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="number_of_workers" render={({ field }) => (
            <FormItem><FormLabel>How many workers were involved?</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 15" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
            <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Worker performance, quality observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
