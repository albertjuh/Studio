
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Zap, Loader2, AlertTriangle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SteamingProcessFormValues } from "@/types"; 
import { saveSteamingProcessAction } from "@/lib/actions"; 
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { STEAM_EQUIPMENT_IDS } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";

const steamingProcessFormSchema = z.object({
  steam_batch_id: z.string().min(1, "Steam Batch ID is required."),
  linked_intake_batch_id: z.string().min(1, "Linked RCN Intake Batch ID is required."),
  steam_start_time: z.date({ required_error: "Steam start date and time are required." }),
  steam_end_time: z.date({ required_error: "Steam end date and time are required." }),
  steam_temperature_celsius: z.coerce.number().min(0, "Temperature must be positive.").optional(),
  steam_pressure_psi: z.coerce.number().min(0, "Pressure must be positive.").optional(),
  weight_before_steam_kg: z.coerce.number().positive("Weight before steam must be positive."),
  weight_after_steam_kg: z.coerce.number().positive("Weight after steam must be positive."),
  equipment_id: z.string().optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
}).refine(data => {
  if (data.steam_start_time && data.steam_end_time) {
    return data.steam_end_time > data.steam_start_time;
  }
  return true;
}, {
  message: "End time must be after start time.",
  path: ["steam_end_time"],
});

const defaultValues: Partial<SteamingProcessFormValues> = {
  steam_batch_id: '',
  linked_intake_batch_id: '',
  steam_start_time: undefined, 
  steam_end_time: undefined,   
  steam_temperature_celsius: undefined,
  steam_pressure_psi: undefined,
  weight_before_steam_kg: undefined,
  weight_after_steam_kg: undefined,
  equipment_id: '',
  supervisor_id: '',
  notes: '',
};

export function SteamingProcessForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);
  
  const form = useForm<SteamingProcessFormValues>({
    resolver: zodResolver(steamingProcessFormSchema),
    defaultValues,
    mode: "onChange", 
  });

  useEffect(() => {
    const now = new Date();
    let startChanged = false;
    if (form.getValues('steam_start_time') === undefined) {
      form.setValue('steam_start_time', now, { shouldValidate: false, shouldDirty: false });
      startChanged = true;
    }
    if (form.getValues('steam_end_time') === undefined) {
      const startTimeForEndTime = startChanged ? now : (form.getValues('steam_start_time') || now);
      const endTime = new Date(startTimeForEndTime.getTime() + 60 * 60 * 1000); 
      form.setValue('steam_end_time', endTime, { shouldValidate: false, shouldDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const mutation = useMutation({
    mutationFn: saveSteamingProcessAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const desc = `Batch ${form.getValues('steam_batch_id')} saved with ID: ${result.id}.`;
        toast({ title: "Steaming Process Recorded", description: desc });
        addNotification({ message: 'New steaming process log recorded.' });
        form.reset(defaultValues);
        const now = new Date(); // Re-initialize after reset
        if (form.getValues('steam_start_time') === undefined) {
           form.setValue('steam_start_time', now, { shouldValidate: false, shouldDirty: false });
        }
        if (form.getValues('steam_end_time') === undefined) {
           form.setValue('steam_end_time', new Date(now.getTime() + 60 * 60 * 1000), { shouldValidate: false, shouldDirty: false });
        }
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Steaming Process",
          description: result.error || "Could not save data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Steaming Process",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });
  
  const temp = form.watch("steam_temperature_celsius");
  const weightBefore = form.watch("weight_before_steam_kg");
  const weightAfter = form.watch("weight_after_steam_kg");

  useEffect(() => {
    const newAlertsList: string[] = [];
    if (temp !== undefined && temp < 180) {
      newAlertsList.push(`Low Temperature: ${temp}°C. Expected >= 180°C for effective steaming.`);
    }
    if (weightBefore !== undefined && weightAfter !== undefined && weightBefore > 0) {
      const lossPercent = ((weightBefore - weightAfter) / weightBefore) * 100;
      if (lossPercent > 12) {
        newAlertsList.push(`High Weight Loss: ${lossPercent.toFixed(1)}%. Expected <= 12%.`);
      }
       if (weightAfter > weightBefore) {
        newAlertsList.push(`Weight Gain Error: Weight after steam (${weightAfter}kg) is greater than before steam (${weightBefore}kg).`);
      }
    }
    
    setFormAlerts(currentAlerts => {
      if (currentAlerts.length === newAlertsList.length && 
          currentAlerts.every((val, index) => val === newAlertsList[index])) {
        return currentAlerts; 
      }
      return newAlertsList; 
    });
  }, [temp, weightBefore, weightAfter]);


  function onSubmit(data: SteamingProcessFormValues) {
    console.log("Submitting Steaming Process Data:", data);
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "steam_start_time" | "steam_end_time") => (
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
                format(form.getValues(fieldName), "PPP")
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
            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
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
              ? format(form.getValues(fieldName), "HH:mm")
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
        submitText="Record Steaming Process"
        submitIcon={<Zap />}
      >
          <FormStep>
            <FormField control={form.control} name="steam_batch_id" render={({ field }) => (
                <FormItem><FormLabel>What is the Steam Batch ID?</FormLabel><FormControl><Input placeholder="e.g., STM-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>
          <FormStep>
            <FormField control={form.control} name="linked_intake_batch_id" render={({ field }) => (
                <FormItem><FormLabel>What is the Linked RCN Batch ID?</FormLabel><FormControl><Input placeholder="Batch ID from RCN Output" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>

          <FormStep>
              <FormField control={form.control} name="steam_start_time" render={() => (
                <FormItem><FormLabel>When did steaming start?</FormLabel>{renderDateTimePicker("steam_start_time")}<FormMessage /></FormItem>
              )} />
          </FormStep>
          <FormStep>
              <FormField control={form.control} name="steam_end_time" render={() => (
                <FormItem><FormLabel>When did steaming end?</FormLabel>{renderDateTimePicker("steam_end_time")}<FormMessage /></FormItem>
              )} />
          </FormStep>
          
          <FormStep isOptional>
            <FormField control={form.control} name="steam_temperature_celsius" render={({ field }) => (
                <FormItem><FormLabel>What was the steam temperature (°C)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 185" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>
          <FormStep isOptional>
            <FormField control={form.control} name="steam_pressure_psi" render={({ field }) => (
                <FormItem><FormLabel>What was the steam pressure (PSI)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 15" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>

          <FormStep>
            <FormField control={form.control} name="weight_before_steam_kg" render={({ field }) => (
                <FormItem><FormLabel>What was the weight before steam (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>
          <FormStep>
            <FormField control={form.control} name="weight_after_steam_kg" render={({ field }) => (
                <FormItem><FormLabel>What was the weight after steam (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 950" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )}
            />
          </FormStep>
          
          {formAlerts.length > 0 && (
            <FormStep>
              <Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  <AlertTitle>Process Alert!</AlertTitle>
                  <AlertDescription>
                  <ul className="list-disc list-inside">
                      {formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}
                  </ul>
                  </AlertDescription>
              </Alert>
            </FormStep>
          )}

          <FormStep isOptional>
            <FormField control={form.control} name="equipment_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Which Equipment ID was used? (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger></FormControl>
                  <SelectContent>{[...STEAM_EQUIPMENT_IDS].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </FormStep>
          <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
                <FormItem>
                <FormLabel>Who was the supervisor?</FormLabel>
                <FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
                </FormItem>
            )} />
          </FormStep>
          <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Batch A1 quality, observed steam leaks..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </FormStep>
      </FormStepper>
    </Form>
  );
}
