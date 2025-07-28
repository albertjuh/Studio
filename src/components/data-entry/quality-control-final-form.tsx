
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

const defaultValues: Partial<QualityControlFinalFormValues> = {
  linked_lot_number: '',
  qc_datetime: new Date(),
  sample_size_kg: undefined,
};

export function QualityControlFinalForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<QualityControlFinalFormValues>({
    resolver: zodResolver(qualityControlFinalFormSchema),
    defaultValues,
  });

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
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>Lot Number</FormLabel><FormControl><Input placeholder="Enter the Lot Number being checked" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />
        
        <FormField control={form.control} name="qc_datetime" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>QC Date & Time</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP HH:mm") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /><div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div></PopoverContent></Popover><FormMessage /></FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="qc_officer_id" render={({ field }) => (<FormItem><FormLabel>QC Officer</FormLabel><FormControl><Input placeholder="Enter officer's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="sample_size_kg" render={({ field }) => (<FormItem><FormLabel>Sample Size (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 0.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="moisture_content_final_percent" render={({ field }) => (<FormItem><FormLabel>Moisture (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 4.2" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="foreign_matter_final_percent" render={({ field }) => (<FormItem><FormLabel>Foreign Matter (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 0.01" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="aflatoxin_level_ppb" render={({ field }) => (<FormItem><FormLabel>Aflatoxin (ppb)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 2.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="export_certified" render={({ field }) => (<FormItem><FormLabel>Export Certified?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{YES_NO_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="domestic_approved" render={({ field }) => (<FormItem><FormLabel>Domestic Approved?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{YES_NO_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </div>

        <FormField control={form.control} name="rejection_reason" render={({ field }) => (<FormItem><FormLabel>Rejection Reason (if any)</FormLabel><FormControl><Textarea placeholder="Reason if not approved/certified..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Supervisor</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes, lab references..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
          Record Final QC Log
        </Button>
      </form>
    </Form>
  );
}
