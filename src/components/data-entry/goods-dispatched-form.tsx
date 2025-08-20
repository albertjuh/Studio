

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
import { CalendarIcon, Send, PlusCircle, X, Loader2, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DISPATCH_TYPES, CNS_SHELL_WASTE_NAME, TESTA_PEEL_WASTE_NAME } from "@/lib/constants"; 
import type { GoodsDispatchedFormValues, DispatchedItem, InventoryItem } from "@/types";
import { saveGoodsDispatchedAction, getFinishedGoodsStockAction } from "@/lib/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Skeleton } from "../ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const dispatchedItemSchema = z.object({
  item_name: z.string().min(2, "Item name is required."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  unit: z.string().min(1, "Unit is required.").default("kg"),
});

const finishedGoodsSchema = z.object({
  dispatch_category: z.literal('Finished Goods'),
  dispatched_items: z.array(dispatchedItemSchema).min(1, "At least one finished good must be added."),
  // Add fields that should be undefined for the other schema part
  item_name: z.string().optional(),
  number_of_bags: z.number().optional(),
  gross_weight_kg: z.number().optional(),
  tare_weight_kg: z.number().optional(),
});

const byProductSchema = z.object({
  dispatch_category: z.literal('By-Products / Waste'),
  item_name: z.string().min(1, "By-product item name is required"),
  number_of_bags: z.coerce.number().int().positive().optional(),
  gross_weight_kg: z.coerce.number().positive("Gross weight must be positive."),
  tare_weight_kg: z.coerce.number().nonnegative("Tare weight cannot be negative.").optional(),
  // Add fields that should be undefined for the other schema part
  dispatched_items: z.array(dispatchedItemSchema).optional(),
});

const goodsDispatchedFormSchema = z.object({
  dispatch_batch_id: z.string().optional(),
  dispatch_datetime: z.date({ required_error: "Date and time of dispatch are required." }),
  destination: z.string().min(2, "Destination is required."),
  dispatch_type: z.enum(DISPATCH_TYPES).optional(),
  dispatcher_id: z.string().min(1, "Dispatcher ID/Name is required."),
  responsible_person: z.string().min(1, "Responsible Person is required."),
  document_reference: z.string().optional(),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).and(z.discriminatedUnion("dispatch_category", [finishedGoodsSchema, byProductSchema]));


export function GoodsDispatchedForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [supervisorName, setSupervisorName] = useState('');

  const { data: finishedGoodsStock, isLoading: isLoadingStock, isError: isErrorStock } = useQuery<InventoryItem[]>({
    queryKey: ['finishedGoodsStockForDispatch'],
    queryFn: getFinishedGoodsStockAction,
  });

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<GoodsDispatchedFormValues> = {
    dispatch_category: undefined,
    dispatch_batch_id: '',
    dispatch_datetime: new Date(),
    dispatched_items: [],
    item_name: '',
    number_of_bags: undefined,
    gross_weight_kg: undefined,
    tare_weight_kg: undefined,
    destination: '',
    dispatcher_id: supervisorName,
    responsible_person: supervisorName,
    document_reference: '',
    notes: '',
  };

  const form = useForm<GoodsDispatchedFormValues>({
    resolver: zodResolver(goodsDispatchedFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!form.getValues('dispatch_datetime')) {
      form.setValue('dispatch_datetime', new Date());
    }
  }, [form]);

  useEffect(() => {
    if (supervisorName) {
      form.setValue('dispatcher_id', supervisorName);
      form.setValue('responsible_person', supervisorName);
    }
  }, [supervisorName, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dispatched_items",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<DispatchedItem>({ 
    item_name: '', 
    quantity: 0, 
    unit: 'kg'
  });

  const addItem = () => {
    if (newItem.item_name && newItem.quantity && newItem.quantity > 0) {
      append(newItem);
      setNewItem({ item_name: '', quantity: 0, unit: 'kg' });
      setShowAddForm(false);
    }
  };

  const mutation = useMutation({
    mutationFn: saveGoodsDispatchedAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Goods Dispatched Successfully", description: `Dispatch ID: ${form.getValues('dispatch_batch_id') || 'N/A'} recorded.` });
        addNotification({ message: 'New goods dispatched log recorded.', link: '/inventory' });
        form.reset({
            ...defaultValues,
            dispatch_datetime: new Date(), 
            dispatcher_id: supervisorName, 
            responsible_person: supervisorName
        });
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
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
  
  const dispatchCategory = form.watch('dispatch_category');
  
  const handleCategoryChange = (value: 'Finished Goods' | 'By-Products / Waste') => {
    if (value === 'Finished Goods') {
      form.setValue('item_name', undefined);
      form.setValue('number_of_bags', undefined);
      form.setValue('gross_weight_kg', undefined);
      form.setValue('tare_weight_kg', undefined);
    } else { // 'By-Products / Waste'
      form.setValue('dispatched_items', []);
    }
    form.setValue('dispatch_category', value);
  };

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
           <FormField
              control={form.control}
              name="dispatch_category"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>What are you dispatching?</FormLabel>
                   <FormControl>
                    <RadioGroup 
                      onValueChange={handleCategoryChange}
                      value={field.value} 
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <FormItem>
                        <FormControl>
                          <div className={cn("p-4 border rounded-md cursor-pointer", field.value === 'Finished Goods' && "bg-primary/5 border-primary")}>
                            <RadioGroupItem value="Finished Goods" id="finished_goods" className="sr-only" />
                            <label htmlFor="finished_goods" className="font-medium flex flex-col gap-2 cursor-pointer">
                              Finished Goods
                              <span className="text-sm font-normal text-muted-foreground">Packaged cashew kernel grades ready for sale.</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                           <div className={cn("p-4 border rounded-md cursor-pointer", field.value === 'By-Products / Waste' && "bg-primary/5 border-primary")}>
                            <RadioGroupItem value="By-Products / Waste" id="by_products" className="sr-only" />
                            <label htmlFor="by_products" className="font-medium flex flex-col gap-2 cursor-pointer">
                              By-Products / Waste
                              <span className="text-sm font-normal text-muted-foreground">Items like Cashew Nut Shells (CNS), testa, etc.</span>
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="dispatch_datetime" render={() => ( <FormItem className="flex flex-col"> <FormLabel>When was the dispatch?</FormLabel> {renderDateTimePicker("dispatch_datetime")} <FormMessage /> </FormItem> )}/>
        </FormStep>
        
        {dispatchCategory === 'Finished Goods' && (
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
                          {isLoadingStock && <Skeleton className="h-10 w-full" />}
                          {isErrorStock && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Could not load stock list.</AlertDescription></Alert>}
                          {!isLoadingStock && !isErrorStock && (
                              <Select value={newItem.item_name} onValueChange={(value) => setNewItem({...newItem, item_name: value, unit: 'kg'})}>
                                  <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                  <SelectContent>
                                      {finishedGoodsStock && finishedGoodsStock.length > 0 ? (
                                        finishedGoodsStock.map(g => (<SelectItem key={g.id} value={g.name}>{g.name} ({g.quantity.toFixed(2)} kg)</SelectItem>))
                                      ) : (
                                        <SelectItem value="no-stock" disabled>No finished goods in stock</SelectItem>
                                      )}
                                  </SelectContent>
                              </Select>
                          )}
                        </div>
                         <div>
                          <Label>Quantity (kg)</Label>
                          <Input type="number" step="any" placeholder="kg" value={newItem.quantity === 0 ? '' : newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} />
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
        )}

        {dispatchCategory === 'By-Products / Waste' && (
          <FormStep>
            <div className="space-y-4">
               <FormField control={form.control} name="item_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Which item is being dispatched?</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={CNS_SHELL_WASTE_NAME}>Cashew Nut Shells (CNS)</SelectItem>
                      <SelectItem value={TESTA_PEEL_WASTE_NAME}>Testa (Peel Skin)</SelectItem>
                    </SelectContent>
                   </Select>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="number_of_bags" render={({ field }) => (<FormItem><FormLabel>Number of Bags (Optional)</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="gross_weight_kg" render={({ field }) => (<FormItem><FormLabel>Gross Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 2550.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
               <FormField control={form.control} name="tare_weight_kg" render={({ field }) => (<FormItem><FormLabel>Tare Weight (kg, Optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormDescription>Weight of bags/packaging, if applicable.</FormDescription><FormMessage /></FormItem>)} />
            </div>
          </FormStep>
        )}
        
        <FormStep>
            <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>What is the destination?</FormLabel><FormControl><Input placeholder="e.g., Customer XYZ, Port Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Name of the customer or location receiving the goods.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="dispatch_type" render={({ field }) => (<FormItem><FormLabel>What is the dispatch type? (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select dispatch type" /></SelectTrigger></FormControl><SelectContent>{DISPATCH_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormDescription>Categorize the purpose of this dispatch.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="dispatcher_id" render={({ field }) => (<FormItem><FormLabel>Who is the dispatcher?</FormLabel><FormControl><Input readOnly placeholder="Enter dispatcher's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="responsible_person" render={({ field }) => (<FormItem><FormLabel>Who is responsible?</FormLabel><FormControl><Input readOnly placeholder="Enter responsible person's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
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
