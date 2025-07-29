
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
import type { OtherMaterialsIntakeFormValues } from "@/types";
import { saveOtherMaterialsIntakeAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { ITEM_UNITS, OTHER_MATERIALS_ITEMS, PACKAGING_BOXES_NAME, VACUUM_BAGS_NAME } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const otherMaterialsIntakeFormSchema = z.object({
  intake_batch_id: z.string().optional(),
  item_name: z.string().min(2, "Item name must be at least 2 characters."),
  transaction_type: z.enum(['intake', 'correction']).default('intake'),
  quantity: z.coerce.number(), // Allow both positive and negative for corrections
  unit: z.string().min(1, "Unit is required."),
  supplier_id: z.string().optional(),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  receiver_id: z.string().min(1, "Receiver is a required field."),
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
    if(data.transaction_type === 'intake') {
        return data.quantity > 0;
    }
    return true;
}, {
    message: "Quantity must be positive for intake.",
    path: ['quantity']
});


const defaultValues: Partial<OtherMaterialsIntakeFormValues> = {
  intake_batch_id: '',
  item_name: '',
  transaction_type: 'intake',
  quantity: undefined,
  unit: 'units',
  supplier_id: '',
  arrival_datetime: new Date(),
  receiver_id: '',
  supervisor_id: '',
  notes: '',
};

export function OtherMaterialsIntakeForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const form = useForm<OtherMaterialsIntakeFormValues>({
    resolver: zodResolver(otherMaterialsIntakeFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: saveOtherMaterialsIntakeAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Transaction for ${form.getValues('item_name')} saved.`;
        toast({ title: "Material Transaction Saved", description: desc });
        addNotification({ message: 'New material transaction recorded.', link: '/inventory' });
        form.reset(defaultValues);
        form.setValue('arrival_datetime', new Date(), { shouldValidate: false, shouldDirty: false });
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
  const isSpecialItem = itemName === PACKAGING_BOXES_NAME || itemName === VACUUM_BAGS_NAME;

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
        submitText="Record Material Transaction"
        submitIcon={<RotateCcw />}
      >
        <FormStep>
          <FormField control={form.control} name="item_name" render={({ field }) => (
            <FormItem>
              <FormLabel>What is the item name?</FormLabel>
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

        {isSpecialItem && (
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
                              <div className={cn("flex items-center p-4 border rounded-md transition-colors", field.value === 'intake' && "bg-primary/5 border-primary")}>
                                  <RadioGroupItem value="intake" id="intake"/>
                                  <label htmlFor="intake" className="font-medium ml-3 cursor-pointer">Intake from Supplier</label>
                              </div>
                          </FormControl>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                              <div className={cn("flex items-center p-4 border rounded-md transition-colors", field.value === 'correction' && "bg-primary/5 border-primary")}>
                                  <RadioGroupItem value="correction" id="correction"/>
                                  <label htmlFor="correction" className="font-medium ml-3 cursor-pointer">Correction Entry</label>
                              </div>
                          </FormControl>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>Select 'Intake' for new stock, 'Correction' to adjust inventory levels.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormStep>
        )}

        <FormStep>
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
                <FormLabel>What is the quantity?</FormLabel>
                <FormControl><Input type="number" step="any" placeholder={transactionType === 'correction' ? "e.g., -10 or 10" : "e.g., 500"} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                {transactionType === 'correction' && <FormDescription>Enter a negative number to reduce stock, positive to increase.</FormDescription>}
                <FormMessage />
            </FormItem>
          )} />
        </FormStep>
        <FormStep>
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem><FormLabel>What is the unit of measurement?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? 'units'}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </FormStep>
        
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

        <FormStep><FormField control={form.control} name="receiver_id" render={({ field }) => (<FormItem><FormLabel>Who is performing this transaction?</FormLabel><FormControl><Input placeholder="Enter your name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        <FormStep><FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who is the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /></FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="intake_batch_id" render={({ field }) => (
            <FormItem><FormLabel>What is the reference/batch ID? (Optional)</FormLabel><FormControl><Input placeholder="e.g., PO-123, COR-456" {...field} value={field.value ?? ''} /></FormControl><FormDescription>A unique ID for this delivery or correction, if applicable.</FormDescription><FormMessage /></FormItem>
            )} />
        </FormStep>

        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Reason for correction, delivery details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
