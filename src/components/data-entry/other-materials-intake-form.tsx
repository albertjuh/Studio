

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RotateCcw, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { OtherMaterialsIntakeFormValues, InventoryItem } from "@/types";
import { saveOtherMaterialsIntakeAction, getActiveVacuumBagBatchesAction } from "@/lib/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ITEM_UNITS, OTHER_MATERIALS_ITEMS, VACUUM_BAGS_NAME } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useEffect, useState } from "react";

const OTHER_ITEM_VALUE = 'Other/Uncategorized';

const otherMaterialsIntakeFormSchema = z.object({
  id: z.string().optional(),
  intake_batch_id: z.string().optional(),
  item_name: z.string().min(2, "Item name must be at least 2 characters."),
  custom_item_name: z.string().optional(),
  transaction_type: z.enum(['intake', 'transfer']).default('intake'),
  quantity: z.coerce.number().optional(), 
  carton_id: z.string().optional(), // For vacuum bag carton transfers
  unit: z.string().min(1, "Unit is required."),
  supplier_id: z.string().optional(),
  destination_section: z.string().optional(),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  receiver_id: z.string().min(1, "Receiver is required."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
    if (data.transaction_type === 'intake') {
        return !!data.supplier_id && data.supplier_id.length > 0;
    }
    return true;
}, {
    message: "Supplier is required for intake transactions.",
    path: ['supplier_id']
}).refine(data => {
    if(data.transaction_type === 'transfer') {
        return !!data.destination_section && data.destination_section.length > 0;
    }
    return true;
}, {
    message: "Destination Section is required for internal transfers.",
    path: ['destination_section']
}).refine(data => {
    if(data.item_name === OTHER_ITEM_VALUE) {
        return !!data.custom_item_name && data.custom_item_name.length > 0;
    }
    return true;
}, {
    message: "Please specify the item name when 'Other' is selected.",
    path: ['custom_item_name']
}).refine(data => {
    // If it's a vacuum bag transfer, we use carton_id so quantity is not needed
    if (data.item_name === VACUUM_BAGS_NAME && data.transaction_type === 'transfer') {
        return !!data.carton_id;
    }
    // For all other cases, quantity must be positive.
    return !!data.quantity && data.quantity > 0;
}, {
    message: "A positive quantity is required, unless transferring a full carton of vacuum bags.",
    path: ['quantity']
});

interface OtherMaterialsIntakeFormProps {
  initialData?: Partial<OtherMaterialsIntakeFormValues>;
  onFormSubmit?: () => void;
  onFormDirtyChange: (isDirty: boolean) => void;
}

export function OtherMaterialsIntakeForm({ initialData, onFormSubmit, onFormDirtyChange }: OtherMaterialsIntakeFormProps) {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [supervisorName, setSupervisorName] = useState('');

  const isEditMode = !!initialData?.id;

  const { data: activeVacuumBagCartons, isLoading: isLoadingBags } = useQuery<InventoryItem[]>({
    queryKey: ['activeVacuumBagBatches'],
    queryFn: getActiveVacuumBagBatchesAction,
  });

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<OtherMaterialsIntakeFormValues> = {
    intake_batch_id: '',
    item_name: '',
    custom_item_name: '',
    transaction_type: 'intake',
    quantity: undefined,
    carton_id: '',
    unit: 'units',
    supplier_id: '',
    destination_section: '',
    arrival_datetime: undefined,
    receiver_id: supervisorName,
    supervisor_id: supervisorName,
    notes: '',
    ...initialData,
  };

  const form = useForm<OtherMaterialsIntakeFormValues>({
    resolver: zodResolver(otherMaterialsIntakeFormSchema),
    defaultValues,
    mode: "onChange"
  });

  const { isDirty } = form.formState;
  useEffect(() => {
    onFormDirtyChange(isDirty);
  }, [isDirty, onFormDirtyChange]);

  useEffect(() => {
    if (initialData) {
      const resetData: any = { ...initialData };
      if (initialData.arrival_datetime) resetData.arrival_datetime = new Date(initialData.arrival_datetime);
      form.reset(resetData);
    } else {
      if (!form.getValues('arrival_datetime')) {
        form.setValue('arrival_datetime', new Date());
      }
    }
  }, [initialData, form]);

  useEffect(() => {
    if (supervisorName && !isEditMode) {
      form.setValue('receiver_id', supervisorName);
      form.setValue('supervisor_id', supervisorName);
    }
  }, [supervisorName, form, isEditMode]);

  const mutation = useMutation({
    mutationFn: (data: OtherMaterialsIntakeFormValues) => isEditMode ? saveOtherMaterialsIntakeAction(data) : saveOtherMaterialsIntakeAction(data),
    onSuccess: (result) => {
      if (result.success && result.id) {
        const actionText = isEditMode ? "Updated" : "Saved";
        const finalItemName = result.itemName || form.getValues('item_name');
        const desc = `Transaction for ${finalItemName} ${actionText.toLowerCase()}.`;
        toast({ title: `Material Transaction ${actionText}`, description: desc });
        if (!isEditMode) addNotification({ message: 'New material transaction recorded.', link: '/inventory' });

        form.reset(defaultValues);
        form.setValue('arrival_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['activeVacuumBagBatches'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
        if (onFormSubmit) onFormSubmit();
      } else {
        toast({
          title: "Error Saving Transaction",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Transaction",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });
  
  const itemName = form.watch("item_name");
  const transactionType = form.watch("transaction_type");
  const isVacuumBagTransfer = itemName === VACUUM_BAGS_NAME && transactionType === 'transfer';
  
  useEffect(() => {
    // Reset conditional fields when transaction type or item name changes
    if (transactionType === 'intake') {
        form.setValue('destination_section', '');
        form.setValue('carton_id', '');
    } else if (transactionType === 'transfer') {
        form.setValue('supplier_id', '');
         if (itemName !== VACUUM_BAGS_NAME) {
            form.setValue('carton_id', '');
        }
    }
  }, [transactionType, itemName, form]);


  function onSubmit(data: OtherMaterialsIntakeFormValues) {
    console.log("Submitting Other Materials Intake Data:", data);
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
                !form.getValues('arrival_datetime') && "text-muted-foreground"
              )}
            >
              {form.getValues('arrival_datetime') ? (
                format(form.getValues('arrival_datetime')!, "PPP")
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
            selected={form.getValues('arrival_datetime')}
            onSelect={(date) => {
              const currentVal = form.getValues('arrival_datetime') || new Date();
              const newDate = date || currentVal;
              newDate.setHours(currentVal.getHours());
              newDate.setMinutes(currentVal.getMinutes());
              form.setValue('arrival_datetime', newDate, { shouldValidate: true });
            }}
            disabled={(date) => date > new Date() && date.toDateString() !== new Date().toDateString()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <FormControl>
        <Input
          type="time"
          className="w-[120px]"
          value={
            form.getValues('arrival_datetime')
              ? format(form.getValues('arrival_datetime')!, "HH:mm")
              : ""
          }
          onChange={(e) => {
            const currentTime = form.getValues('arrival_datetime') || new Date();
            const [hours, minutes] = e.target.value.split(":");
            const newTime = new Date(currentTime);
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            form.setValue('arrival_datetime', newTime, { shouldValidate: true });
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
        submitText={isEditMode ? "Update Transaction" : "Record Material Transaction"}
        submitIcon={<RotateCcw />}
      >
        <FormStep>
          <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>What is the transaction type?</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                              <div className={cn("flex items-center p-4 border rounded-md transition-colors cursor-pointer", field.value === 'intake' && "bg-primary/5 border-primary")}>
                                  <RadioGroupItem value="intake" id="intake"/>
                                  <label htmlFor="intake" className="font-medium ml-3 cursor-pointer">Intake from Supplier</label>
                              </div>
                          </FormControl>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                              <div className={cn("flex items-center p-4 border rounded-md transition-colors cursor-pointer", field.value === 'transfer' && "bg-primary/5 border-primary")}>
                                  <RadioGroupItem value="transfer" id="transfer"/>
                                  <label htmlFor="transfer" className="font-medium ml-3 cursor-pointer">Internal Transfer to Production</label>
                              </div>
                          </FormControl>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>Select 'Intake' for new stock, 'Transfer' to move stock for consumption (will deduct from inventory).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </FormStep>

        <FormStep>
          <FormField control={form.control} name="item_name" render={({ field }) => (
            <FormItem>
              <FormLabel>What is the item?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger></FormControl>
                  <SelectContent>
                  {OTHER_MATERIALS_ITEMS.map(item => (<SelectItem key={item} value={item}>{item}</SelectItem>))}
                  </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </FormStep>

        {itemName === OTHER_ITEM_VALUE && (
          <FormStep>
            <FormField control={form.control} name="custom_item_name" render={({ field }) => (
              <FormItem><FormLabel>Please specify the item name</FormLabel><FormControl><Input placeholder="e.g., Conveyor Belt" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </FormStep>
        )}

        <FormStep>
          {isVacuumBagTransfer ? (
             <FormField
              control={form.control}
              name="carton_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Which carton is being transferred?</FormLabel>
                   <FormControl>
                        <Input placeholder="e.g., VBInt-BATCHYYYYMMDD-01" {...field} value={field.value ?? ''}/>
                    </FormControl>
                  <FormDescription>The entire selected carton will be moved to production.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is the quantity?</FormLabel>
                  <FormControl><Input type="number" step="any" placeholder={transactionType === 'transfer' ? "e.g., 50 (will be deducted)" : "e.g., 500"} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                  {transactionType === 'transfer' && <FormDescription>Enter a positive number. This will be deducted from stock.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </FormStep>
        
        {!isVacuumBagTransfer && (
            <FormStep>
            <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>What is the unit of measurement?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? 'units'}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            </FormStep>
        )}
        
        <FormStep>
            <FormField control={form.control} name="arrival_datetime" render={() => (
                <FormItem><FormLabel>When was the transaction date & time?</FormLabel>{renderDateTimePicker()}<FormMessage /></FormItem>
            )} />
        </FormStep>
        
        {transactionType === 'intake' && (
            <FormStep>
                <FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem><FormLabel>Who is the supplier?</FormLabel><FormControl><Input placeholder="Enter supplier's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            </FormStep>
        )}

        {transactionType === 'transfer' && (
            <FormStep>
                <FormField control={form.control} name="destination_section" render={({ field }) => (<FormItem><FormLabel>What is the destination section?</FormLabel><FormControl><Input placeholder="e.g., Packaging Line, Maintenance" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The production section that will consume this item.</FormDescription><FormMessage /></FormItem>)} />
            </FormStep>
        )}

        <FormStep><FormField control={form.control} name="receiver_id" render={({ field }) => (<FormItem><FormLabel>Who is performing this transaction?</FormLabel><FormControl><Input readOnly placeholder="Enter your name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        <FormStep><FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who is the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="intake_batch_id" render={({ field }) => (
            <FormItem><FormLabel>What is the reference/batch ID? (Optional)</FormLabel><FormControl><Input placeholder="e.g., PO-123, TFR-456" {...field} value={field.value ?? ''} /></FormControl><FormDescription>A unique ID for this delivery or transfer, if applicable.</FormDescription><FormMessage /></FormItem>
            )} />
        </FormStep>

        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Reason for transfer, delivery details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
