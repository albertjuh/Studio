

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Wrench, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { CalibrationFormValues } from "@/types";
import { saveCalibrationLogAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { EQUIPMENT_CALIBRATION_IDS_EXAMPLE, CALIBRATION_PARAMETERS, CALIBRATION_RESULTS, TECHNICIAN_IDS_EXAMPLE, SUPERVISOR_IDS_EXAMPLE } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";

const calibrationFormSchema = z.object({
  calibration_log_id: z.string().min(1, "Calibration Log ID is required."),
  equipment_id: z.string().min(1, "Equipment ID is required."),
  calibration_date: z.date({ required_error: "Calibration date is required." }),
  parameter_checked: z.string().min(1, "Parameter checked is required."),
  result: z.enum(CALIBRATION_RESULTS, { required_error: "Result is required." }),
  next_due_date: z.date().optional(),
  calibrated_by_id: z.string().min(1, "Calibrated By ID is required."),
  supervisor_id: z.string().optional(),
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

  useEffect(() => {
    if (form.getValues('calibration_date') === undefined) {
      form.setValue('calibration_date', new Date(), { shouldValidate: false, shouldDirty: false });
    }
  }, [form]);

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

  const renderDatePicker = (fieldName: "calibration_date" | "next_due_date", label: string, required: boolean = true, disablePast?: boolean) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}{required ? "" : " (Optional)"}</FormLabel>
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
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="calibration_log_id" render={({ field }) => (
              <FormItem><FormLabel>Calibration Log ID</FormLabel><FormControl><Input placeholder="e.g., CAL-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}
          />
          <FormField control={form.control} name="equipment_id" render={({ field }) => (
              <FormItem><FormLabel>Equipment ID</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger></FormControl>
                  <SelectContent>{EQUIPMENT_CALIBRATION_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDatePicker("calibration_date", "Calibration Date", true, false)}
            {renderDatePicker("next_due_date", "Next Due Date", false, true)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="parameter_checked" render={({ field }) => (
                <FormItem><FormLabel>Parameter Checked</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select parameter" /></SelectTrigger></FormControl>
                    <SelectContent>{CALIBRATION_PARAMETERS.map(param => (<SelectItem key={param} value={param}>{param}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
            <FormField control={form.control} name="result" render={({ field }) => (
                <FormItem><FormLabel>Result</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger></FormControl>
                    <SelectContent>{CALIBRATION_RESULTS.map(res => (<SelectItem key={res} value={res}>{res}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="calibrated_by_id" render={({ field }) => (
                <FormItem><FormLabel>Calibrated By (Technician ID)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger></FormControl>
                    <SelectContent>{TECHNICIAN_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
                <FormItem><FormLabel>Supervisor ID (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger></FormControl>
                    <SelectContent>{SUPERVISOR_IDS_EXAMPLE.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                    </Select><FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Adjusted scale by +0.5g, Replaced sensor..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
           Record Calibration Log
        </Button>
      </form>
    </Form>
  );
}
