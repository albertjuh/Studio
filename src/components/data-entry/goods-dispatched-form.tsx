
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DISPATCH_TYPES, FINISHED_KERNEL_GRADES } from "@/lib/constants"; 
import type { GoodsDispatchedFormValues } from "@/types";
import { saveGoodsDispatchedAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const dispatchedItemSchema = z.object({
  item_name: z.string().min(2, "Item name is required."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  unit: z.string().min(1, "Unit is required.").default("kg"),
});

const goodsDispatchedFormSchema = z.object({
  dispatch_batch_id: z.string().optional(),
  dispatch_datetime: z.date({ required_error: "Date and time of dispatch are required." }),
  dispatched_items: z.array(dispatchedItemSchema).min(1, "At least one item must be added to the dispatch."),
  destination: z.string().min(2, "Destination is required."),
  dispatch_type: z.enum(DISPATCH_TYPES).optional(),
  dispatcher_id: z.string().min(1, "Dispatcher ID/Name is required."),
  document_reference: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const defaultValues: Partial<GoodsDispatchedFormValues> = {
  dispatch_batch_id: '',
  dispatch_datetime: undefined, 
  dispatched_items: [],
  destination: '',
  dispatcher_id: '',
  document_reference: '',
  notes: '',
};

export function GoodsDispatchedForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<GoodsDispatchedFormValues>({
    resolver: zodResolver(goodsDispatchedFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dispatched_items",
  });

  useEffect(() => {
    if (form.getValues('dispatch_datetime') === undefined) {
      form.setValue('dispatch_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
    }
  }, [form]); 

  const mutation = useMutation({
    mutationFn: saveGoodsDispatchedAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Goods Dispatched Successfully", description: `Dispatch ID: ${form.getValues('dispatch_batch_id') || 'N/A'} recorded.` });
        addNotification({ message: 'New goods dispatched log recorded.', link: '/inventory' });
        form.reset(defaultValues);
        form.setValue('dispatch_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({ title: "Error Dispatching Goods", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
       toast({ title: "Error Dispatching Goods", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: GoodsDispatchedFormValues) {
    console.log("Submitting Goods Dispatched Data:", data);
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
                !form.getValues('dispatch_datetime') && "text-muted-foreground"
              )}
            >
              {form.getValues('dispatch_datetime') ? (
                format(form.getValues('dispatch_datetime'), "PPP")
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
            selected={form.getValues('dispatch_datetime')}
            onSelect={(date) => {
              const currentVal = form.getValues('dispatch_datetime') || new Date();
              const newDate = date || currentVal;
              newDate.setHours(currentVal.getHours());
              newDate.setMinutes(currentVal.getMinutes());
              form.setValue('dispatch_datetime', newDate, { shouldValidate: true });
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
            form.getValues('dispatch_datetime')
              ? format(form.getValues('dispatch_datetime'), "HH:mm")
              : ""
          }
          onChange={(e) => {
            const currentTime = form.getValues('dispatch_datetime') || new Date();
            const [hours, minutes] = e.target.value.split(":");
            const newTime = new Date(currentTime);
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            form.setValue('dispatch_datetime', newTime, { shouldValidate: true });
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
        submitText="Record Dispatch"
        submitIcon={<Send />}
      >
        <FormStep>
            <FormField
            control={form.control}
            name="dispatch_datetime"
            render={() => (
                <FormItem className="flex flex-col">
                <FormLabel>When was the dispatch?</FormLabel>
                {renderDateTimePicker()}
                <FormMessage />
                </FormItem>
            )}
            />
        </FormStep>

        <FormStep>
            <div className="flex flex-col h-full">
                <FormLabel>What items were dispatched?</FormLabel>
                <FormDescription>Add one or more kernel grades to this dispatch.</FormDescription>
                <div className="flex-grow space-y-2 mt-2 max-h-48 overflow-y-auto pr-2">
                {fields.map((item, index) => (
                    <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md">
                        <FormField control={form.control} name={`dispatched_items.${index}.item_name`} render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel className="text-xs">Kernel Grade</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger></FormControl><SelectContent>{FINISHED_KERNEL_GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent></Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`dispatched_items.${index}.quantity`} render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel className="text-xs">Quantity (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                </div>
                <div className="flex-shrink-0 mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: '', quantity: undefined!, unit: 'kg' })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" />Add Item</Button>
                    <FormMessage>{form.formState.errors.dispatched_items?.message || form.formState.errors.dispatched_items?.root?.message}</FormMessage>
                </div>
            </div>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>What is the destination?</FormLabel><FormControl><Input placeholder="e.g., Customer XYZ, Port Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Name of the customer or location receiving the goods.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="dispatch_type" render={({ field }) => (<FormItem><FormLabel>What is the dispatch type? (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select dispatch type" /></SelectTrigger></FormControl><SelectContent>{DISPATCH_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormDescription>Categorize the purpose of this dispatch.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="dispatcher_id" render={({ field }) => (<FormItem><FormLabel>Who is the dispatcher?</FormLabel><FormControl><Input placeholder="Enter dispatcher's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="dispatch_batch_id" render={({ field }) => (<FormItem><FormLabel>What is the dispatch reference ID? (Optional)</FormLabel><FormControl><Input placeholder="e.g., DIS-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Unique identifier for this shipment, if applicable.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="document_reference" render={({ field }) => (<FormItem><FormLabel>What is the document reference? (Optional)</FormLabel><FormControl><Input placeholder="e.g., Sales Order #SO456, Delivery Note #DN002" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Sales order, delivery note, or other reference.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., 'Part of Export Order EX002', 'Urgent delivery'" className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
