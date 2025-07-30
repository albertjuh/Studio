
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ClipboardCheck, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { QualityControlFinalFormValues } from "@/types";
import { saveQualityControlFinalAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { YES_NO_OPTIONS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useEffect, useState } from "react";

const qualityControlFinalFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  qc_datetime: z.date({ required_error: "QC date and time are required." }),
  qc_officer_id: z.string().min(1, "QC Officer is required."),
  sample_size_kg: z.coerce.number().positive("Sample size must be positive."),
  moisture_content_final_percent: z.coerce.number().optional(),
  foreign_matter_final_percent: z.coerce.number().optional(),
  aflatoxin_level_ppb: z.coerce.number().optional(),
  ecoli_result: z.string().optional(),
  salmonella_result: z.string().optional(),
  export_certified: z.enum(YES_NO_OPTIONS, { required_error: "Export certification status is required." }),
  domestic_approved: z.enum(YES_NO_OPTIONS, { required_error: "Domestic approval status is required." }),
  rejection_reason: z.string().optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(500).optional(),
});

export function QualityControlFinalForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<QualityControlFinalFormValues> = {
    linked_lot_number: '',
    qc_datetime: new Date(),
    sample_size_kg: undefined,
    qc_officer_id: supervisorName,
    supervisor_id: supervisorName,
  };

  const form = useForm<QualityControlFinalFormValues>({
    resolver: zodResolver(qualityControlFinalFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (supervisorName) {
      form.setValue('supervisor_id', supervisorName);
      form.setValue('qc_officer_id', supervisorName);
    }
  }, [supervisorName, form]);

  const mutation = useMutation({
    mutationFn: saveQualityControlFinalAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Final QC for Lot ${form.getValues('linked_lot_number')} saved.`;
        toast({ title: "Final QC Log Saved", description: desc });
        addNotification({ message: 'New final QC log recorded.' });
        form.reset(defaultValues);
        form.setValue('qc_datetime', new Date());
      } else {
        toast({ title: "Error Saving QC Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: QualityControlFinalFormValues) {
    mutation.mutate(data);
  }
  
  const renderDateTimePicker = () => (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={"outline"}
              className={cn(
                "w-[240px] pl-3 text-left font-normal",
                !form.getValues('qc_datetime') && "text-muted-foreground"
              )}
            >
              {form.getValues('qc_datetime') ? (
                format(form.getValues('qc_datetime')!, "PPP")
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
            selected={form.getValues('qc_datetime')}
            onSelect={(date) => {
              const currentVal = form.getValues('qc_datetime') || new Date();
              const newDate = date || currentVal;
              newDate.setHours(currentVal.getHours());
              newDate.setMinutes(currentVal.getMinutes());
              form.setValue('qc_datetime', newDate, { shouldValidate: true });
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
            form.getValues('qc_datetime')
              ? format(form.getValues('qc_datetime')!, "HH:mm")
              : ""
          }
          onChange={(e) => {
            const currentTime = form.getValues('qc_datetime') || new Date();
            const [hours, minutes] = e.target.value.split(":");
            const newTime = new Date(currentTime);
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            form.setValue('qc_datetime', newTime, { shouldValidate: true });
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
        submitText="Record Final QC Log"
        submitIcon={<ClipboardCheck />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>What is the Lot Number being checked?</FormLabel><FormControl><Input placeholder="Enter the Lot Number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="qc_datetime" render={() => (<FormItem className="flex flex-col"><FormLabel>When was the QC check?</FormLabel>{renderDateTimePicker()}<FormMessage /></FormItem> )} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="qc_officer_id" render={({ field }) => (<FormItem><FormLabel>Who is the QC Officer?</FormLabel><FormControl><Input readOnly placeholder="Enter officer's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="sample_size_kg" render={({ field }) => (<FormItem><FormLabel>What was the sample size (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 0.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="moisture_content_final_percent" render={({ field }) => (<FormItem><FormLabel>What was the Final Moisture (%)?</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 4.2" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="foreign_matter_final_percent" render={({ field }) => (<FormItem><FormLabel>What was the Final Foreign Matter (%)?</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="aflatoxin_level_ppb" render={({ field }) => (<FormItem><FormLabel>What was the Aflatoxin level (ppb)?</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 2.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="export_certified" render={({ field }) => (<FormItem><FormLabel>Is it export certified?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{YES_NO_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="domestic_approved" render={({ field }) => (<FormItem><FormLabel>Is it domestically approved?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{YES_NO_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep isOptional>
            <FormField control={form.control} name="rejection_reason" render={({ field }) => (<FormItem><FormLabel>What is the rejection reason? (if any)</FormLabel><FormControl><Textarea placeholder="Reason if not approved/certified..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes, lab references..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
