
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

  const renderDateTimePicker = (fieldName: "calibration_date" | "next_due_date") => (
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
                const field = form.getValues(fieldName);
                const currentVal = field || new Date();
                const newDate = date || currentVal;
                // Preserve time if it exists, otherwise use current time
                if (field) {
                    newDate.setHours(field.getHours(), field.getMinutes());
                }
                form.setValue(fieldName, newDate, { shouldValidate: true });
            }}
            disabled={(date) => fieldName === "next_due_date" ? date < new Date(new Date().setHours(0,0,0,0)) : date > new Date()}
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
            <FormField control={form.control} name="calibration_date" render={() => (
                <FormItem><FormLabel>When was it calibrated?</FormLabel>{renderDateTimePicker("calibration_date")}<FormMessage /></FormItem>
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
             <FormField control={form.control} name="next_due_date" render={() => (
                <FormItem><FormLabel>When is the next calibration due? (Optional)</FormLabel>{renderDateTimePicker("next_due_date")}<FormMessage /></FormItem>
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
