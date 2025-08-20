
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { VacuumBagIntakeFormValues } from "@/types";
import { saveVacuumBagIntakeAction } from "@/lib/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useEffect, useState } from "react";
import { VACUUM_BAGS_CARTON_QTY } from "@/lib/constants";

const formSchema = z.object({
  shipmentId: z.string().min(1, "Shipment ID is required."),
  supplier: z.string().min(2, "Supplier name is required."),
  receiptDate: z.date({ required_error: "Receipt date is required." }),
  numberOfCartons: z.coerce.number().int().positive("Number of cartons must be a positive whole number."),
  expiryDate: z.date().optional(),
  receiverId: z.string().min(1, "Receiver name is required."),
  notes: z.string().max(300).optional(),
});

const generateDefaultShipmentId = () => `SHIPMENT-${Date.now().toString().slice(-6)}`;

export function VacuumBagIntakeForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<VacuumBagIntakeFormValues> = {
    shipmentId: generateDefaultShipmentId(),
    receiptDate: new Date(),
    receiverId: supervisorName,
  };

  const form = useForm<VacuumBagIntakeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (supervisorName) {
      form.setValue('receiverId', supervisorName);
    }
  }, [supervisorName, form]);

  const mutation = useMutation({
    mutationFn: saveVacuumBagIntakeAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Bag Shipment Saved", description: `Shipment ${form.getValues('shipmentId')} with ${form.getValues('numberOfCartons')} cartons has been recorded.` });
        addNotification({ message: 'New vacuum bag shipment recorded.' });
        form.reset({
            ...defaultValues,
            shipmentId: generateDefaultShipmentId(),
            receiverId: supervisorName,
            receiptDate: new Date(),
        });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
        queryClient.invalidateQueries({ queryKey: ['activeVacuumBagBatches'] });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  });
  
  const onSubmit = (data: VacuumBagIntakeFormValues) => {
    mutation.mutate(data);
  };
  
  const numberOfCartons = form.watch("numberOfCartons");
  const totalBags = (numberOfCartons || 0) * VACUUM_BAGS_CARTON_QTY;

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Bag Intake"
        submitIcon={<Package />}
      >
        <FormStep>
            <FormField control={form.control} name="shipmentId" render={({ field }) => (<FormItem><FormLabel>What is the Shipment ID?</FormLabel><FormControl><Input placeholder="e.g., PO-12345, SUPPLIER-XYZ" {...field} /></FormControl><FormDescription>A unique identifier for this shipment of bags from the supplier.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel>Who is the supplier?</FormLabel><FormControl><Input placeholder="Supplier Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="numberOfCartons" render={({ field }) => (<FormItem><FormLabel>How many cartons were received?</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 25" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormItem>
                <FormLabel>Total Bags (Calculated)</FormLabel>
                <Input readOnly value={`${totalBags.toLocaleString()} bags (${VACUUM_BAGS_CARTON_QTY} per carton)`} className="bg-muted" />
            </FormItem>
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="receiptDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>When were they received?</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover><FormMessage />
            </FormItem>)} />
        </FormStep>
         <FormStep isOptional>
            <FormField control={form.control} name="expiryDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>What is the expiry date (optional)?</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover><FormMessage />
            </FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="receiverId" render={({ field }) => (<FormItem><FormLabel>Who received the items?</FormLabel><FormControl><Input readOnly {...field} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes?</FormLabel><FormControl><Textarea placeholder="Delivery condition, PO number..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
