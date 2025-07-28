
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Wrench } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { CalibrationFormValues } from "@/types";
import { saveCalibrationLogAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { CALIBRATION_PARAMETERS, CALIBRATION_RESULTS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const calibrationFormSchema = z.object({
  calibration_log_id: z.string().min(1, "Calibration Log ID is required."),
  equipment_id: z.string().min(1, "Equipment ID is required."),
  calibration_date: z.date({ required_error: "Calibration date is required." }),
  parameter_checked: z.string().min(1, "Parameter checked is required."),
  result: z.enum(CALIBRATION_RESULTS, { required_error: "Result is required." }),
  next_due_date: z.date().optional(),
  calibrated_by_id: z.string().min(1, "Calibrated By is a required field."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const defaultValues: Partial<CalibrationFormValues> = {
  calibration_log_id: '',
  equipment_id: '',
  calibration_date: new Date(),
  parameter_checked: '',
  result: undefined,
  next_due_date: undefined,
  calibrated_by_id: '',
  supervisor_id: '',
  notes: '',
};

export function EquipmentCalibrationForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<CalibrationFormValues>({
    resolver: zodResolver(calibrationFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveCalibrationLogAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Log ID ${form.getValues('calibration_log_id')} for equipment ${form.getValues('equipment_id')} saved.`;
        toast({ title: "Calibration Log Saved", description: desc });
        addNotification({ message: 'New calibration log recorded.' });
        form.reset(defaultValues);
        form.setValue('calibration_date', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({
          title: "Error Saving Calibration Log",
          description: result.error || "Could not save calibration data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Calibration Log",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: CalibrationFormValues) {
    console.log("Submitting Calibration Log Data:", data);
    mutation.mutate(data);
  }

  const renderDatePicker = (field: any, label: string, required: boolean = true, disablePast?: boolean) => (
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            disabled={(date) => (disablePast && date < new Date(new Date().setHours(0,0,0,0))) || (!disablePast && date > new Date())}
            initialFocus
          />
        </PopoverContent>
      </Popover>
  );

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Calibration Log"
        submitIcon={<Wrench />}
      >
        <FormStep>
          <FormField control={form.control} name="calibration_log_id" render={({ field }) => (
            <FormItem><FormLabel>What is the Calibration Log ID?</FormLabel><FormControl><Input placeholder="e.g., CAL-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        
        <FormStep>
          <FormField control={form.control} name="equipment_id" render={({ field }) => (
            <FormItem><FormLabel>Which Equipment ID was calibrated?</FormLabel><FormControl><Input placeholder="Enter Equipment ID" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="calibration_date" render={({ field }) => (
                <FormItem><FormLabel>When was it calibrated?</FormLabel>{renderDatePicker(field, "Calibration Date", true, false)}<FormMessage /></FormItem>
            )}/>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="parameter_checked" render={({ field }) => (
                <FormItem><FormLabel>What parameter was checked?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select parameter" /></SelectTrigger></FormControl>
                    <SelectContent>{CALIBRATION_PARAMETERS.map(param => (<SelectItem key={param} value={param}>{param}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="result" render={({ field }) => (
                <FormItem><FormLabel>What was the result?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger></FormControl>
                    <SelectContent>{CALIBRATION_RESULTS.map(res => (<SelectItem key={res} value={res}>{res}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
        </FormStep>

        <FormStep isOptional>
             <FormField control={form.control} name="next_due_date" render={({ field }) => (
                <FormItem><FormLabel>When is the next calibration due? (Optional)</FormLabel>{renderDatePicker(field, "Next Due Date", false, true)}<FormMessage /></FormItem>
            )}/>
        </FormStep>

        <FormStep>
             <FormField control={form.control} name="calibrated_by_id" render={({ field }) => (
                <FormItem><FormLabel>Who performed the calibration?</FormLabel><FormControl><Input placeholder="Enter technician's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
                <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
        </FormStep>

        <FormStep isOptional>
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Adjusted scale by +0.5g, Replaced sensor..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </FormStep>
        
      </FormStepper>
    </Form>
  );
}
