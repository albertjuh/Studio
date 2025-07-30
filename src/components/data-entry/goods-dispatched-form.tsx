
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
import { CalendarIcon, Send, PlusCircle, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DISPATCH_TYPES, FINISHED_KERNEL_GRADES } from "@/lib/constants"; 
import type { GoodsDispatchedFormValues } from "@/types";
import { saveGoodsDispatchedAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";

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

export function GoodsDispatchedForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<GoodsDispatchedFormValues> = {
    dispatch_batch_id: '',
    dispatch_datetime: new Date(), 
    dispatched_items: [],
    destination: '',
    dispatcher_id: supervisorName,
    document_reference: '',
    notes: '',
  };

  const form = useForm<GoodsDispatchedFormValues>({
    resolver: zodResolver(goodsDispatchedFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (supervisorName) {
      form.setValue('dispatcher_id', supervisorName);
    }
  }, [supervisorName, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dispatched_items",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ item_name: string; quantity: number | undefined, unit: string }>({ 
    item_name: '', 
    quantity: undefined, 
    unit: 'kg'
  });

  const addItem = () => {
    if (newItem.item_name && newItem.quantity && newItem.quantity > 0) {
      append(newItem as { item_name: string; quantity: number, unit: string });
      setNewItem({ item_name: '', quantity: undefined, unit: 'kg' });
      setShowAddForm(false);
    }
  };


  const mutation = useMutation({
    mutationFn: saveGoodsDispatchedAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Goods Dispatched Successfully", description: `Dispatch ID: ${form.getValues('dispatch_batch_id') || 'N/A'} recorded.` });
        addNotification({ message: 'New goods dispatched log recorded.', link: '/inventory' });
        form.reset(defaultValues);
        form.setValue('dispatch_datetime', new Date());
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

  const renderDateTimePicker = (fieldName: "dispatch_datetime") => (
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
            <FormField control={form.control} name="dispatch_datetime" render={() => ( <FormItem className="flex flex-col"> <FormLabel>When was the dispatch?</FormLabel> {renderDateTimePicker("dispatch_datetime")} <FormMessage /> </FormItem> )}/>
        </FormStep>

        <FormStep>
            <div className="space-y-2 h-full flex flex-col">
              <Label>What items were dispatched?</Label>
              <p className="text-sm text-muted-foreground">Add one or more kernel grades to this dispatch.</p>
              <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Grade</Label>
                            <p className="font-medium">{field.item_name}</p>
                          </div>
                          <div>
                             <Label className="text-xs text-muted-foreground">Quantity</Label>
                             <p className="font-medium">{field.quantity} {field.unit}</p>
                          </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"> <X className="h-4 w-4" /> </Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No items added yet.</p>}
              </div>
              
              {showAddForm && (
                 <Card className="mt-2 border-primary/50">
                    <CardContent className="p-4 space-y-4">
                       <h4 className="font-medium">Add New Item</h4>
                        <div>
                          <Label>Kernel Grade</Label>
                          <Select value={newItem.item_name} onValueChange={(value) => setNewItem({...newItem, item_name: value})}>
                              <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                              <SelectContent>{FINISHED_KERNEL_GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                         <div>
                          <Label>Quantity (kg)</Label>
                          <Input type="number" step="any" placeholder="kg" value={newItem.quantity ?? ''} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || undefined})} />
                        </div>
                       <div className="flex gap-2">
                          <Button onClick={addItem} size="sm">Add Item</Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                       </div>
                    </CardContent>
                 </Card>
              )}
               <FormMessage>{form.formState.errors.dispatched_items?.message || form.formState.errors.dispatched_items?.root?.message}</FormMessage>
            </div>
            
             {!showAddForm && (
                <div className="absolute bottom-20 right-6">
                    <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button>
                </div>
            )}

        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>What is the destination?</FormLabel><FormControl><Input placeholder="e.g., Customer XYZ, Port Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Name of the customer or location receiving the goods.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="dispatch_type" render={({ field }) => (<FormItem><FormLabel>What is the dispatch type? (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select dispatch type" /></SelectTrigger></FormControl><SelectContent>{DISPATCH_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormDescription>Categorize the purpose of this dispatch.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="dispatcher_id" render={({ field }) => (<FormItem><FormLabel>Who is the dispatcher?</FormLabel><FormControl><Input readOnly placeholder="Enter dispatcher's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
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

    
