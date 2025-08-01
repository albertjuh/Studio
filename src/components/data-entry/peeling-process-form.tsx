
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Hand, Loader2, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PeelingProcessFormValues } from "@/types";
import { savePeelingProcessAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PEELING_METHODS, PEELING_MACHINE_IDS, SHIFT_OPTIONS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const peelingProcessFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  peel_start_time: z.date({ required_error: "Peeling start date and time are required." }),
  peel_end_time: z.date({ required_error: "Peeling end date and time are required." }),
  dried_kernel_input_kg: z.coerce.number().positive("Dried kernel input must be positive."),
  peeled_kernels_kg: z.coerce.number().positive("Peeled kernels weight must be positive.").optional(),
  peel_waste_kg: z.coerce.number().nonnegative("Peel waste (Testa) cannot be negative.").optional(),
  defective_kernels_kg: z.coerce.number().nonnegative("Defective kernels weight cannot be negative.").optional(),
  peeling_method: z.enum(PEELING_METHODS).optional(),
  workers_assigned_count: z.coerce.number().int().min(0, "Number of workers must be non-negative.").optional(),
  machine_id: z.string().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.peel_start_time && data.peel_end_time) {
    return data.peel_end_time > data.peel_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["peel_end_time"],
}).refine(data => {
  if (data.peeling_method === "Manual" && (data.workers_assigned_count === undefined || data.workers_assigned_count <=0)) {
    return false; // Workers count required for Manual
  }
  return true;
}, {
  message: "Number of workers is required for Manual peeling.",
  path: ["workers_assigned_count"],
}).refine(data => {
  if ((data.peeling_method === "Auto" || data.peeling_method === "Semi-Auto") && !data.machine_id) {
    return false; // Machine ID required for Auto/Semi-Auto
  }
  return true;
}, {
  message: "Machine ID is required for Auto/Semi-Auto peeling.",
  path: ["machine_id"],
});


export function PeelingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<PeelingProcessFormValues> = {
    linked_lot_number: '',
    peel_start_time: undefined,
    peel_end_time: undefined,
    dried_kernel_input_kg: undefined,
    peeled_kernels_kg: undefined,
    peel_waste_kg: 0,
    defective_kernels_kg: 0,
    peeling_method: undefined,
    workers_assigned_count: undefined,
    machine_id: '',
    shift: undefined,
    supervisor_id: supervisorName,
    notes: '',
  };

  const form = useForm<PeelingProcessFormValues>({
    resolver: zodResolver(peelingProcessFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (supervisorName) {
      form.setValue('supervisor_id', supervisorName);
    }
  }, [supervisorName, form]);

  useEffect(() => {
    if (form.getValues('peel_start_time') === undefined) {
      form.setValue('peel_start_time', new Date());
    }
    if (form.getValues('peel_end_time') === undefined) {
      const startTimeForEndTime = form.getValues('peel_start_time') || new Date();
      const endTime = new Date(startTimeForEndTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours
      form.setValue('peel_end_time', endTime);
    }
  }, [form]);

  const mutation = useMutation({
    mutationFn: savePeelingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Peeling process for Lot ${form.getValues('linked_lot_number')} saved.`;
        toast({ title: "Peeling Process Recorded", description: desc });
        addNotification({ message: 'New peeling process log recorded.' });
        form.reset(defaultValues);
        form.setValue('peel_start_time', new Date());
        form.setValue('peel_end_time', new Date(new Date().getTime() + 4 * 60 * 60 * 1000));
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Peeling Process",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Peeling Process",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const driedInput = form.watch("dried_kernel_input_kg");
  const peeledOutput = form.watch("peeled_kernels_kg");
  const defectiveOutput = form.watch("defective_kernels_kg");

  useEffect(() => {
    const newAlertsList: string[] = [];
    if (driedInput && peeledOutput) {
      const efficiency = (peeledOutput / driedInput) * 100;
      if (efficiency < 85) {
        newAlertsList.push(`Low Peeling Efficiency: ${efficiency.toFixed(1)}%. Expected >= 85%.`);
      }
    }
    if (driedInput && defectiveOutput) {
      const defectRate = (defectiveOutput / driedInput) * 100;
      if (defectRate > 5) {
        newAlertsList.push(`High Defect Rate: ${defectRate.toFixed(1)}%. Expected <= 5%.`);
      }
    }

    setFormAlerts(currentAlerts => {
      if (currentAlerts.length === newAlertsList.length && currentAlerts.every((val, index) => val === newAlertsList[index])) {
        return currentAlerts;
      }
      return newAlertsList;
    });
  }, [driedInput, peeledOutput, defectiveOutput]);

  const renderDateTimePicker = (fieldName: "peel_start_time" | "peel_end_time") => (
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
            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
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

  function onSubmit(data: PeelingProcessFormValues) {
    console.log("Submitting Peeling Process Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
       <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Peeling Process"
        submitIcon={<Hand />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>What is the Lot Number?</FormLabel><FormControl><Input placeholder="Enter the Lot Number from Drying" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="peel_start_time" render={() => (<FormItem><FormLabel>When did peeling start?</FormLabel>{renderDateTimePicker("peel_start_time")}<FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="peel_end_time" render={() => (<FormItem><FormLabel>When did peeling end?</FormLabel>{renderDateTimePicker("peel_end_time")}<FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="dried_kernel_input_kg" render={({ field }) => (<FormItem><FormLabel>What was the dried kernel input (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 180" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="peeled_kernels_kg" render={({ field }) => (<FormItem><FormLabel>What was the peeled kernels weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 160" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="peel_waste_kg" render={({ field }) => (<FormItem><FormLabel>What was the peel waste (Testa) weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 15" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="defective_kernels_kg" render={({ field }) => (<FormItem><FormLabel>What was the defective kernels weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>

        {formAlerts.length > 0 && (
          <FormStep>
            <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Process Alert!</AlertTitle>
                <AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription>
            </Alert>
          </FormStep>
        )}

        <FormStep isOptional>
            <FormField control={form.control} name="peeling_method" render={({ field }) => (<FormItem><FormLabel>What was the peeling method?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                <SelectContent>{PEELING_METHODS.map(method => (<SelectItem key={method} value={method}>{method}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>

        {form.watch("peeling_method") === "Manual" && (
          <FormStep>
            <FormField control={form.control} name="workers_assigned_count" render={({ field }) => (<FormItem><FormLabel>How many workers were assigned?</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 10" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
          </FormStep>
        )}
        {(form.watch("peeling_method") === "Auto" || form.watch("peeling_method") === "Semi-Auto") && (
          <FormStep>
            <FormField control={form.control} name="machine_id" render={({ field }) => (<FormItem><FormLabel>Which Machine ID was used?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl>
                <SelectContent>{[...PEELING_MACHINE_IDS, 'Both'].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
          </FormStep>
        )}
        
        <FormStep isOptional>
            <FormField control={form.control} name="shift" render={({ field }) => (<FormItem><FormLabel>Which shift was it? (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                <SelectContent>{SHIFT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., High testa content in this batch..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
