
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
import { RCN_SIZE_GRADES } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";

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
        const desc = `Sizing Batch ${form.getValues('sizing_batch_id')} saved.`;
        toast({ title: "RCN Sizing Saved", description: desc });
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="sizing_batch_id" render={({ field }) => (
            <FormItem><FormLabel>Sizing Batch ID</FormLabel><FormControl><Input placeholder="e.g., SIZE-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="linked_rcn_batch_id" render={({ field }) => (
            <FormItem><FormLabel>Linked RCN Batch ID</FormLabel><FormControl><Input placeholder="Batch ID from Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="sizing_datetime" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Sizing Date & Time</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP HH:mm") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /><div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div></PopoverContent></Popover><FormMessage /></FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="input_weight_kg" render={({ field }) => (<FormItem><FormLabel>Input Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="Total RCN input" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="total_output_weight_kg" render={({ field }) => (<FormItem><FormLabel>Total Output Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="Total weight of all grades" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <div>
            <FormLabel>Grade Outputs</FormLabel>
            <FormDescription>Log the weight for each RCN size grade produced.</FormDescription>
            <div className="space-y-2 mt-2">
            {fields.map((item, index) => (
                <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
                    <FormField control={form.control} name={`grade_outputs.${index}.grade`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Grade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger></FormControl><SelectContent>{RCN_SIZE_GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent></Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name={`grade_outputs.${index}.weight_kg`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel className="text-xs">Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            </div>
             <Button type="button" variant="outline" size="sm" onClick={() => append({ grade: '' as any, weight_kg: undefined! })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Grade Output</Button>
        </div>
        
        <FormField control={form.control} name="machine_id" render={({ field }) => (<FormItem><FormLabel>Machine ID</FormLabel><FormControl><Input placeholder="Enter Machine ID" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Supervisor</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Observations on sizing performance, issues, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scaling className="mr-2 h-4 w-4" />}
          Record RCN Sizing Log
        </Button>
      </form>
    </Form>
  );
}
