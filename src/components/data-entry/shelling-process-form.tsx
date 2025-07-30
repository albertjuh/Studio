
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Hammer, AlertTriangle, PlusCircle, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ShellingProcessFormValues } from "@/types";
import { saveShellingProcessAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SHELLING_MACHINE_IDS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";

const machineThroughputSchema = z.object({
  machine_id: z.string().min(1, "Machine ID is required."),
  processed_kg: z.coerce.number().positive("Processed kg must be positive."),
});

const shellingProcessFormSchema = z.object({
  lot_number: z.string().min(1, "Lot Number is required."),
  linked_steam_batch_id: z.string().min(1, "Linked Steam Batch ID is required."),
  shell_start_time: z.date({ required_error: "Shell start date and time are required." }),
  shell_end_time: z.date({ required_error: "Shell end date and time are required." }),
  steamed_weight_input_kg: z.coerce.number().positive("Steamed weight input must be positive."),
  shelled_kernels_weight_kg: z.coerce.number().positive("Shelled kernels weight must be positive."),
  shell_waste_weight_kg: z.coerce.number().positive("Shell waste (CNS) weight must be positive.").optional(),
  broken_kernels_weight_kg: z.coerce.number().nonnegative("Broken kernels weight cannot be negative.").optional(),
  machine_throughputs: z.array(machineThroughputSchema).optional(),
  operator_id: z.string().min(1, "Operator is a required field."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.shell_start_time && data.shell_end_time) {
    return data.shell_end_time > data.shell_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["shell_end_time"],
}).refine(data => {
  if (data.machine_throughputs && data.machine_throughputs.length > 0 && data.steamed_weight_input_kg) {
    const totalMachineThroughput = data.machine_throughputs.reduce((sum, mt) => sum + (mt.processed_kg || 0), 0);
    return Math.abs(totalMachineThroughput - data.steamed_weight_input_kg) <= data.steamed_weight_input_kg * 0.01;
  }
  return true;
}, {
  message: "Total machine throughput should approximately match steamed weight input.",
  path: ["machine_throughputs"],
});


const defaultValues: Partial<ShellingProcessFormValues> = {
  lot_number: '',
  linked_steam_batch_id: '',
  shell_start_time: new Date(),
  shell_end_time: new Date(),
  steamed_weight_input_kg: undefined,
  shelled_kernels_weight_kg: undefined,
  shell_waste_weight_kg: undefined,
  broken_kernels_weight_kg: 0,
  machine_throughputs: [],
  operator_id: '',
  supervisor_id: '',
  notes: '',
};

export function ShellingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);

  const form = useForm<ShellingProcessFormValues>({
    resolver: zodResolver(shellingProcessFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "machine_throughputs",
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ machine_id: string; processed_kg: number | undefined }>({
    machine_id: '',
    processed_kg: undefined,
  });

  const addItem = () => {
    if (newItem.machine_id && newItem.processed_kg && newItem.processed_kg > 0) {
      append(newItem as { machine_id: string; processed_kg: number });
      setNewItem({ machine_id: '', processed_kg: undefined });
      setShowAddForm(false);
    }
  };

  const mutation = useMutation({
    mutationFn: saveShellingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Lot ${form.getValues('lot_number')} (Process ID: ${result.id}) saved.`;
        toast({ title: "Shelling Process Recorded", description: desc });
        addNotification({ message: 'New shelling process log recorded.' });
        form.reset(defaultValues);
        form.setValue('shell_start_time', new Date());
        form.setValue('shell_end_time', new Date());
        setFormAlerts([]);
      } else {
        toast({ title: "Error Saving Shelling Process", description: result.error, variant: "destructive", });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error Saving Shelling Process", description: error.message, variant: "destructive", });
    }
  });

  const steamedInput = form.watch("steamed_weight_input_kg");
  const kernelsOutput = form.watch("shelled_kernels_weight_kg");
  const shellWaste = form.watch("shell_waste_weight_kg");
  const brokensOutput = form.watch("broken_kernels_weight_kg");

  const calculateAlerts = () => {
    const newAlertsList: string[] = [];
    if (steamedInput && kernelsOutput) {
      const shellingRate = (kernelsOutput / steamedInput) * 100;
      if (shellingRate < 20) { newAlertsList.push(`Low Shelling Rate: ${shellingRate.toFixed(1)}%. Expected > 20%.`); }
      if (brokensOutput) {
        const breakageRate = (brokensOutput / kernelsOutput) * 100;
        if (breakageRate > 8) { newAlertsList.push(`High Breakage Rate: ${breakageRate.toFixed(1)}%. Expected <= 8%.`); }
      }
    }
    if (steamedInput && (kernelsOutput || shellWaste || brokensOutput)) {
        const totalOutput = (kernelsOutput || 0) + (shellWaste || 0) + (brokensOutput || 0);
        const balanceVariance = ((steamedInput - totalOutput) / steamedInput) * 100;
        if (Math.abs(balanceVariance) > 2) { newAlertsList.push(`Material Balance Alert: Variance is ${balanceVariance.toFixed(1)}%.`); }
    }
    return newAlertsList;
  }
  
  useEffect(() => { setFormAlerts(calculateAlerts()); }, [steamedInput, kernelsOutput, shellWaste, brokensOutput]);

  const renderDateTimePicker = (fieldName: "shell_start_time" | "shell_end_time") => (
    <div className="flex items-center gap-2">
      <FormControl>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[240px] pl-3 text-left font-normal", !form.getValues(fieldName) && "text-muted-foreground")}
            >
              {form.getValues(fieldName) ? format(form.getValues(fieldName)!, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
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
              disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </FormControl>
      <FormControl>
        <Input
          type="time"
          className="w-[120px]"
          value={form.getValues(fieldName) ? format(form.getValues(fieldName)!, "HH:mm") : ""}
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

  function onSubmit(data: ShellingProcessFormValues) { mutation.mutate(data); }

  return (
    <Form {...form}>
      <FormStepper form={form} onSubmit={onSubmit} isLoading={mutation.isPending} submitText="Record Shelling Process" submitIcon={<Hammer />}>
        <FormStep> <FormField control={form.control} name="linked_steam_batch_id" render={({ field }) => (<FormItem><FormLabel>What is the Linked Steam Batch ID?</FormLabel><FormControl><Input placeholder="Batch ID from Steaming" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The batch being shelled.</FormDescription><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep> <FormField control={form.control} name="lot_number" render={({ field }) => (<FormItem><FormLabel>What is the new Lot Number?</FormLabel><FormControl><Input placeholder="e.g., LOT-240726-A" {...field} value={field.value ?? ''} /></FormControl><FormDescription>The new Lot Number for traceability.</FormDescription><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep> <FormField control={form.control} name="shell_start_time" render={() => ( <FormItem className="flex flex-col"><FormLabel>When did shelling start?</FormLabel>{renderDateTimePicker("shell_start_time")}<FormMessage /></FormItem> )}/> </FormStep>
        <FormStep> <FormField control={form.control} name="shell_end_time" render={() => ( <FormItem className="flex flex-col"><FormLabel>When did shelling end?</FormLabel>{renderDateTimePicker("shell_end_time")}<FormMessage /></FormItem> )}/> </FormStep>
        <FormStep> <FormField control={form.control} name="steamed_weight_input_kg" render={({ field }) => (<FormItem><FormLabel>What was the steamed weight input (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 950" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep> <FormField control={form.control} name="shelled_kernels_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the shelled kernels weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 200" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep isOptional> <FormField control={form.control} name="shell_waste_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the shell waste (CNS) weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 700" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep isOptional> <FormField control={form.control} name="broken_kernels_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the broken kernels weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 20" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        {formAlerts.length > 0 && ( <FormStep> <Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground"> <AlertTriangle className="h-5 w-5 text-accent" /> <AlertTitle>Process Alert!</AlertTitle> <AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription> </Alert> </FormStep> )}
        <FormStep isOptional>
            <div className="space-y-2 h-full flex flex-col">
              <Label>Machine Throughputs (Optional)</Label>
              <p className="text-sm text-muted-foreground">Log the throughput for each machine used. Total should match input weight.</p>
               <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                 {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Machine ID</Label>
                          <p className="font-medium">{field.machine_id}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Processed (kg)</Label>
                          <p className="font-medium">{field.processed_kg} kg</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No machine throughputs added yet.</p>}
              </div>

               {showAddForm && (
                <Card className="mt-2 border-primary/50">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium">Add New Machine Throughput</h4>
                    <div>
                      <Label>Machine ID</Label>
                      <Select value={newItem.machine_id} onValueChange={(value) => setNewItem({...newItem, machine_id: value})}>
                          <SelectTrigger><SelectValue placeholder="Select Machine" /></SelectTrigger>
                          <SelectContent>{SHELLING_MACHINE_IDS.map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Processed (kg)</Label>
                      <Input type="number" step="any" placeholder="kg" value={newItem.processed_kg ?? ''} onChange={e => setNewItem({...newItem, processed_kg: parseFloat(e.target.value) || undefined})} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addItem} size="sm">Add Throughput</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <FormMessage>{form.formState.errors.machine_throughputs?.message || form.formState.errors.machine_throughputs?.root?.message}</FormMessage>
            </div>
             {!showAddForm && (
                <div className="absolute bottom-20 right-6">
                    <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button>
                </div>
            )}
        </FormStep>
        <FormStep> <FormField control={form.control} name="operator_id" render={({ field }) => (<FormItem><FormLabel>Who was the operator?</FormLabel><FormControl><Input placeholder="Enter operator's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep> <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
        <FormStep isOptional> <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Machine M1 performance issues, high breakage observed..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} /> </FormStep>
      </FormStepper>
    </Form>
  );
}
