
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckSquare, Loader2, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { RcnQualityAssessmentFormValues } from "@/types";
import { saveRcnQualityAssessmentAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RCN_VISUAL_QUALITY_GRADES } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";

const rcnQualityAssessmentFormSchema = z.object({
  qa_rcn_batch_id: z.string().min(1, "QA Batch ID is required."),
  linked_intake_batch_id: z.string().min(1, "Linked Intake Batch ID is required."),
  assessment_datetime: z.date({ required_error: "Assessment date and time are required." }),
  sample_weight_kg: z.coerce.number().positive("Sample weight must be positive."),
  moisture_content_percent: z.coerce.number().min(0).max(100, "Moisture content must be between 0-100%."),
  foreign_matter_percent: z.coerce.number().min(0).max(100, "Foreign matter must be between 0-100%."),
  defective_nuts_percent: z.coerce.number().min(0).max(100, "Defective nuts must be between 0-100%."),
  nut_count_per_kg: z.coerce.number().positive("Nut count must be positive.").optional(),
  visual_grade_assigned: z.enum(RCN_VISUAL_QUALITY_GRADES).optional(),
  qc_officer_id: z.string().min(1, "QC Officer ID is required."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const defaultValues: Partial<RcnQualityAssessmentFormValues> = {
  qa_rcn_batch_id: '',
  linked_intake_batch_id: '',
  assessment_datetime: new Date(),
  sample_weight_kg: undefined,
  moisture_content_percent: undefined,
  foreign_matter_percent: undefined,
  defective_nuts_percent: undefined,
  nut_count_per_kg: undefined,
  visual_grade_assigned: undefined,
  qc_officer_id: '',
  notes: '',
};

export function RcnQualityAssessmentForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<RcnQualityAssessmentFormValues>({
    resolver: zodResolver(rcnQualityAssessmentFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveRcnQualityAssessmentAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `QA for batch ${form.getValues('linked_intake_batch_id')} saved with ID: ${result.id}.`;
        toast({ title: "RCN Quality Assessment Saved", description: desc });
        addNotification({ message: 'New RCN quality assessment recorded.' });
        form.reset(defaultValues);
        form.setValue('assessment_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({
          title: "Error Saving QA",
          description: result.error || "Could not save quality assessment data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving QA",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: RcnQualityAssessmentFormValues) {
    console.log("Submitting RCN Quality Assessment Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="qa_rcn_batch_id" render={({ field }) => (
            <FormItem><FormLabel>QA Batch ID</FormLabel><FormControl><Input placeholder="e.g., QA-RCN-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="linked_intake_batch_id" render={({ field }) => (
            <FormItem><FormLabel>Linked Intake Batch ID</FormLabel><FormControl><Input placeholder="Batch ID from RCN Intake" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField
          control={form.control}
          name="assessment_datetime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Assessment Date & Time</FormLabel>
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
        
        <FormField control={form.control} name="sample_weight_kg" render={({ field }) => (
          <FormItem><FormLabel>Sample Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1.0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="moisture_content_percent" render={({ field }) => (
            <FormItem><FormLabel>Moisture (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 7.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="foreign_matter_percent" render={({ field }) => (
            <FormItem><FormLabel>Foreign Matter (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 1.2" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="defective_nuts_percent" render={({ field }) => (
            <FormItem><FormLabel>Defective Nuts (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 5.0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="nut_count_per_kg" render={({ field }) => (
          <FormItem><FormLabel>Nut Count per kg (KOR/Outturn)</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 185" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormDescription>Number of nuts per kilogram. Also known as KOR or Outturn.</FormDescription><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="visual_grade_assigned" render={({ field }) => (
          <FormItem><FormLabel>Visual Grade Assigned</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl><SelectContent>{RCN_VISUAL_QUALITY_GRADES.map(grade => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="qc_officer_id" render={({ field }) => (
            <FormItem><FormLabel>QC Officer Name</FormLabel><FormControl><Input placeholder="Enter QC officer's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Observations on quality, defects, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
          Save Quality Assessment
        </Button>
      </form>
    </Form>
  );
}
