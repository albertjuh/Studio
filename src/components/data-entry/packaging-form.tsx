
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, Loader2, PlusCircle, Trash2, Box } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PackagingFormValues, PackedItem } from "@/types";
import { savePackagingAction } from "@/lib/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PACKAGING_LINE_IDS, SEALING_MACHINE_IDS, SHIFT_OPTIONS, FINISHED_KERNEL_GRADES, PACKAGE_WEIGHT_KG } from "@/lib/constants";
import { calculateExpiryDate } from "@/lib/utils";
import { useNotifications } from "@/contexts/notification-context";
import { useEffect } from "react";

const packedItemSchema = z.object({
    kernel_grade: z.string().min(1, "Kernel grade is required."),
    packed_weight_kg: z.coerce.number().positive("Packed weight must be positive."),
});

const packagingFormSchema = z.object({
  pack_batch_id: z.string().min(1, "Pack Batch ID is required."),
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  pack_start_time: z.date({ required_error: "Start time is required." }),
  pack_end_time: z.date({ required_error: "End time is required." }),
  
  packed_items: z.array(packedItemSchema).min(1, "At least one packed item must be added."),
  
  production_date: z.date({ required_error: "Production date is required." }),
  packaging_line_id: z.string().optional(),
  sealing_machine_id: z.string().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300).optional(),
});

const defaultValues: Partial<PackagingFormValues> = {
  pack_batch_id: '',
  linked_lot_number: '',
  pack_start_time: new Date(),
  pack_end_time: new Date(),
  packed_items: [],
  production_date: new Date(),
  packaging_line_id: '',
  sealing_machine_id: '',
  supervisor_id: '',
  notes: '',
};

export function PackagingForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(packagingFormSchema),
    defaultValues,
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packed_items",
  });
  
  const packedItemsValues = form.watch("packed_items");
  const totalPackedWeight = packedItemsValues.reduce((sum, item) => sum + (item.packed_weight_kg || 0), 0);
  const calculatedBoxes = totalPackedWeight > 0 ? Math.ceil(totalPackedWeight / PACKAGE_WEIGHT_KG) : 0;
  
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (data: PackagingFormValues) => savePackagingAction({
      ...data,
      packages_produced: calculatedBoxes,
    }),
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Batch ${form.getValues('pack_batch_id')} saved.`;
        toast({ title: "Packaging Log Saved", description: desc });
        addNotification({ message: 'New packaging log recorded.' });
        form.reset(defaultValues);
        form.setValue('pack_start_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('pack_end_time', new Date(), { shouldValidate: false, shouldDirty: false });
        form.setValue('production_date', new Date(), { shouldValidate: false, shouldDirty: false });
        queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      } else {
        toast({ title: "Error Saving Packaging Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const prodDate = form.watch("production_date");
  const expiryDate = prodDate ? calculateExpiryDate(prodDate) : null;

  function onSubmit(data: PackagingFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "pack_start_time" | "pack_end_time", label: string) => (
    <FormField control={form.control} name={fieldName} render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP HH:mm") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
              <div className="p-2 border-t"><Input type="time" className="w-full" value={field.value ? format(field.value, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }} /></div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )} />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="pack_batch_id" render={({ field }) => (<FormItem><FormLabel>Packaging Batch ID</FormLabel><FormControl><Input placeholder="e.g., PKG-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>Linked Lot Number</FormLabel><FormControl><Input placeholder="Lot Number from Final QC" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderDateTimePicker("pack_start_time", "Packaging Start Time")}
          {renderDateTimePicker("pack_end_time", "Packaging End Time")}
        </div>
        
        <div>
          <FormLabel>Packed Kernel Grades</FormLabel>
          <FormDescription>Add each kernel grade and the total weight packed for it.</FormDescription>
          <div className="space-y-2 mt-2">
            {fields.map((item, index) => (
              <div key={item.id} className="flex items-end gap-2 p-3 border rounded-md relative">
                 <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 h-6 w-6"><Trash2 className="h-4 w-4" /></Button>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <FormField control={form.control} name={`packed_items.${index}.kernel_grade`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Kernel Grade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger></FormControl><SelectContent>{[...FINISHED_KERNEL_GRADES].map(grade => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}</SelectContent></Select>
                          <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name={`packed_items.${index}.packed_weight_kg`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Total Packed Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ kernel_grade: '', packed_weight_kg: undefined! })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Packed Grade</Button>
          <FormMessage>{form.formState.errors.packed_items?.message || form.formState.errors.packed_items?.root?.message}</FormMessage>
        </div>
        
        <div className="p-4 border rounded-md space-y-4 bg-muted/50">
            <h4 className="text-md font-medium">Packaging Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormItem>
                    <FormLabel>Standard Package</FormLabel>
                    <Input readOnly value={`Carton with Vacuum Bag (${PACKAGE_WEIGHT_KG} kg)`} className="bg-background" />
               </FormItem>
               <FormItem>
                    <FormLabel>Calculated Boxes Produced</FormLabel>
                    <div className="flex items-center h-10 rounded-md border border-input bg-background px-3">
                        <Box className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{calculatedBoxes} boxes</span>
                    </div>
               </FormItem>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="production_date" render={({ field }) => (
                <FormItem><FormLabel>Production Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )} />
            <FormItem><FormLabel>Calculated Expiry Date</FormLabel><Input readOnly value={expiryDate ? format(expiryDate, "PPP") : "Select production date"} className="bg-muted" /></FormItem>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="packaging_line_id" render={({ field }) => (<FormItem><FormLabel>Packaging Line ID</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger></FormControl><SelectContent>{PACKAGING_LINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="sealing_machine_id" render={({ field }) => (<FormItem><FormLabel>Sealing Machine ID</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl><SelectContent>{[...SEALING_MACHINE_IDS].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </div>
        <FormField control={form.control} name="supervisor_id" render={({ field }) => (
          <FormItem><FormLabel>Supervisor</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Packaging issues, observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
          Record Packaging Log
        </Button>
      </form>
    </Form>
  );
}
