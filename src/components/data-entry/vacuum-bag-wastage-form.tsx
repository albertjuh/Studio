
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Unplug, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VacuumBagWastageFormValues, InventoryItem } from "@/types";
import { saveVacuumBagWastageAction, getActiveVacuumBagBatchesAction } from "@/lib/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

const formSchema = z.object({
  cartonId: z.string().min(1, "You must select a vacuum bag carton."),
  quantity: z.coerce.number().int().positive("Wastage quantity must be a positive whole number."),
  reason: z.string().min(5, "Please provide a brief reason for the wastage."),
  operatorId: z.string().min(1, "Operator name is required."),
  wastageDate: z.date(),
});

interface VacuumBagWastageFormProps {
  preselectedBatchId?: string; // The overall shipment/batch ID
  onFormSubmit?: () => void;
}

export function VacuumBagWastageForm({ preselectedBatchId, onFormSubmit }: VacuumBagWastageFormProps) {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [supervisorName, setSupervisorName] = useState('');

  const { data: allActiveCartons, isLoading: isLoadingBatches } = useQuery<InventoryItem[]>({
    queryKey: ['activeVacuumBagBatches'], // Uses existing query
    queryFn: getActiveVacuumBagBatchesAction,
  });

  // Filter cartons based on the preselected shipment/batch ID
  const relevantCartons = preselectedBatchId
    ? allActiveCartons?.filter(carton => carton.name.includes(preselectedBatchId))
    : allActiveCartons;

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<VacuumBagWastageFormValues> = {
    wastageDate: new Date(),
    operatorId: supervisorName,
    cartonId: '', // Start with no carton selected
  };

  const form = useForm<VacuumBagWastageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (supervisorName) {
      form.setValue('operatorId', supervisorName);
    }
  }, [supervisorName, form]);

  const mutation = useMutation({
    mutationFn: saveVacuumBagWastageAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Wastage Logged", description: `${form.getValues('quantity')} bags from carton ${form.getValues('cartonId')} logged as waste.` });
        addNotification({ message: 'Vacuum bag wastage recorded.' });
        form.reset({
            ...defaultValues,
            operatorId: supervisorName,
            wastageDate: new Date(),
        });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['activeVacuumBagBatches'] });
        queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
        if (onFormSubmit) {
            onFormSubmit();
        }
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  });

  const onSubmit = (data: VacuumBagWastageFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText="Record Wastage"
        submitIcon={<Unplug />}
      >
        <FormStep>
          <FormField
            control={form.control}
            name="cartonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which carton had wastage?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoadingBatches}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBatches ? "Loading cartons..." : "Select a carton"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {relevantCartons?.map((carton) => (
                      <SelectItem key={carton.id} value={carton.name}>
                        {carton.name.replace("Vacuum Bags - ","")} (Available: {carton.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Select the specific carton of vacuum bags that were damaged or wasted.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>How many bags were wasted?</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 10" value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>What was the reason for wastage?</FormLabel><FormControl><Textarea placeholder="e.g., Water damage during storage, manufacturing defect..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="operatorId" render={({ field }) => (<FormItem><FormLabel>Who is reporting this?</FormLabel><FormControl><Input readOnly {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
