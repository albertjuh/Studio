
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { CalendarIcon, Send, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ITEM_UNITS, WAREHOUSE_STAFF_IDS, DISPATCH_TYPES, DISPATCHABLE_ITEMS } from "@/lib/constants"; 
import type { GoodsDispatchedFormValues } from "@/types";
import { saveGoodsDispatchedAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNotifications } from "@/contexts/notification-context";

const goodsDispatchedFormSchema = z.object({
  dispatch_batch_id: z.string().optional(),
  dispatch_datetime: z.date({ required_error: "Date and time of dispatch are required." }),
  item_name: z.string().min(2, "Item name/description must be at least 2 characters."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  unit: z.string().min(1, "Unit is required."),
  destination: z.string().min(2, "Destination is required."),
  dispatch_type: z.enum(DISPATCH_TYPES).optional(),
  dispatcher_id: z.string().min(1, "Dispatcher ID/Name is required."),
  document_reference: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const defaultValues: Partial<GoodsDispatchedFormValues> = {
  dispatch_batch_id: '',
  dispatch_datetime: undefined, 
  item_name: '',
  quantity: undefined,
  unit: "kg",
  destination: '',
  dispatch_type: undefined,
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

  useEffect(() => {
    if (form.getValues('dispatch_datetime') === undefined) {
      form.setValue('dispatch_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const mutation = useMutation({
    mutationFn: saveGoodsDispatchedAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const dispatchedData = form.getValues();
        const desc = `${dispatchedData.quantity} ${dispatchedData.unit} of ${dispatchedData.item_name} (Batch: ${dispatchedData.dispatch_batch_id || 'N/A'}) recorded as dispatched. ID: ${result.id}.`;
        toast({ title: "Goods Dispatched", description: desc });
        addNotification({ message: 'New goods dispatched log recorded.' });
        form.reset(defaultValues);
        if (form.getValues('dispatch_datetime') === undefined) { // Re-initialize after reset
          form.setValue('dispatch_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
        }
      } else {
        toast({
          title: "Error Dispatching Goods",
          description: result.error || "Could not save dispatched goods data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
       toast({
        title: "Error Dispatching Goods",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: GoodsDispatchedFormValues) {
    console.log("Submitting Goods Dispatched Data:", data);
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="dispatch_datetime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date & Time of Dispatch</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "PPP HH:mm") : <span>Pick date and time</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(day) => {
                      const currentVal = field.value || new Date();
                      const newDate = day ? new Date(day) : currentVal;
                      newDate.setHours(currentVal.getHours());
                      newDate.setMinutes(currentVal.getMinutes());
                      field.onChange(newDate);
                    }}
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                    initialFocus
                  />
                   <div className="p-2 border-t">
                    <Input 
                      type="time" 
                      className="w-full"
                      value={field.value ? format(field.value, 'HH:mm') : ''}
                      onChange={(e) => {
                        const currentTime = field.value || new Date();
                        const [hours, minutes] = e.target.value.split(':');
                        const newTime = new Date(currentTime);
                        newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        field.onChange(newTime);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="item_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name / Description</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select an item to dispatch" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {DISPATCHABLE_ITEMS.map(item => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                  </SelectContent>
                </Select>
              <FormDescription>Provide the exact item name, including grade or type.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl><Input type="number" step="any" placeholder="e.g., 100" {...field} 
                  value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')}
                  onChange={e => field.onChange(parseFloat(e.target.value))} 
                /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? 'kg'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                  <SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField control={form.control} name="destination" render={({ field }) => (
            <FormItem>
              <FormLabel>Destination</FormLabel>
              <FormControl><Input placeholder="e.g., Customer XYZ, Port Warehouse, Disposal Site" {...field} value={field.value ?? ''} /></FormControl>
              <FormDescription>Name of the customer, location, or entity receiving the goods.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="dispatch_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Dispatch Type (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select dispatch type" /></SelectTrigger></FormControl>
                <SelectContent>{DISPATCH_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
              </Select>
              <FormDescription>Categorize the purpose of this dispatch.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="dispatcher_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Dispatcher ID / Name</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select dispatcher" /></SelectTrigger></FormControl>
                <SelectContent>{WAREHOUSE_STAFF_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="dispatch_batch_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Dispatch Batch ID (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., DIS-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl>
              <FormDescription>Unique identifier for this dispatch batch, if applicable.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="document_reference" render={({ field }) => (
            <FormItem>
              <FormLabel>Document Reference (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., Sales Order #SO456, Delivery Note #DN002" {...field} value={field.value ?? ''} /></FormControl>
              <FormDescription>Sales order, delivery note, internal memo, or other reference.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl><Textarea placeholder="e.g., 'Part of Export Order EX002', 'Urgent delivery'" className="resize-none" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Record Dispatched Goods
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Use this form to record all items leaving the factory. This includes finished products, by-products, waste, etc. Ensure all details are accurately captured for traceability.
      </p>
    </Form>
  );
}
