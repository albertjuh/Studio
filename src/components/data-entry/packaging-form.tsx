
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
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const packedItemSchema = z.object({
    kernel_grade: z.string().min(1, "Kernel grade is required."),
    packed_weight_kg: z.coerce.number().positive("Packed weight must be positive."),
});

const packagingFormSchema = z.object({
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
        const desc = `Packaging for Lot ${form.getValues('linked_lot_number')} saved.`;
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

  const renderDateTimePicker = (fieldName: "pack_start_time" | "pack_end_time") => (
    <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !form.getValues(fieldName) && "text-muted-foreground")}>{form.getValues(fieldName) ? format(form.getValues(fieldName), "PPP HH:mm") : <span>Pick date & time</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={form.getValues(fieldName)} onSelect={(date) => form.setValue(fieldName, date as Date, {shouldValidate: true})} disabled={(date) => date > new Date()} initialFocus />
            <div className="p-2 border-t"><Input type="time" className="w-full" value={form.getValues(fieldName) ? format(form.getValues(fieldName), 'HH:mm') : ''} onChange={(e) => { const currentTime = form.getValues(fieldName) || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); form.setValue(fieldName, newTime, {shouldValidate: true}); }} /></div>
        </PopoverContent>
    </Popover>
  );

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Packaging Log"
        submitIcon={<Package />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>What is the Lot Number being packaged?</FormLabel><FormControl><Input placeholder="Enter the Lot Number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="pack_start_time" render={() => (<FormItem><FormLabel>When did packaging start?</FormLabel>{renderDateTimePicker("pack_start_time")}<FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="pack_end_time" render={() => (<FormItem><FormLabel>When did packaging end?</FormLabel>{renderDateTimePicker("pack_end_time")}<FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
          <FormLabel>Which kernel grades were packed?</FormLabel>
          <FormDescription>Add each kernel grade and the total weight packed for it.</FormDescription>
          <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
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
        </FormStep>
        
        <FormStep>
            <FormLabel>Packaging Summary</FormLabel>
            <div className="p-4 border rounded-md space-y-4 bg-muted/50 mt-2">
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
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="production_date" render={({ field }) => (
                <FormItem><FormLabel>What is the production date?</FormLabel>
                <Popover>
                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )} />
        </FormStep>
        <FormStep>
            <FormItem><FormLabel>Calculated Expiry Date</FormLabel><Input readOnly value={expiryDate ? format(expiryDate, "PPP") : "Select production date"} className="bg-muted" /></FormItem>
        </FormStep>
        
        <FormStep isOptional>
             <FormField control={form.control} name="packaging_line_id" render={({ field }) => (<FormItem><FormLabel>Which Packaging Line ID was used?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger></FormControl><SelectContent>{PACKAGING_LINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
             <FormField control={form.control} name="sealing_machine_id" render={({ field }) => (<FormItem><FormLabel>Which Sealing Machine ID was used?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl><SelectContent>{[...SEALING_MACHINE_IDS].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
            <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Packaging issues, observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
