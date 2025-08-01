
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Scaling, PlusCircle, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { MachineGradingFormValues } from "@/types";
import { saveMachineGradingAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { GRADING_MACHINE_IDS, SIZE_CATEGORIES } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";

const sizeDistributionSchema = z.object({
    size_category: z.string().min(1, "Category is required."),
    weight_kg: z.coerce.number().positive("Weight must be positive."),
});

const machineGradingFormSchema = z.object({
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  cs_start_time: z.date({ required_error: "Start time is required." }),
  cs_end_time: z.date({ required_error: "End time is required." }),
  peeled_input_kg: z.coerce.number().positive("Input weight must be positive."),
  whole_kernels_kg: z.coerce.number().positive("Whole kernels weight is required.").optional(),
  broken_pieces_kg: z.coerce.number().positive("Broken pieces weight is required.").optional(),
  dust_powder_kg: z.coerce.number().nonnegative("Dust weight cannot be negative.").optional(),
  detailed_size_distribution: z.array(sizeDistributionSchema).optional(),
  vibration_level: z.coerce.number().optional(),
  screen_size: z.string().optional(),
  feed_rate_kg_hr: z.coerce.number().optional(),
  machine_id: z.string().min(1, "Machine ID is required."),
  settings_profile: z.string().optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(500).optional(),
});

export function MachineGradingForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);
  
  const defaultValues: Partial<MachineGradingFormValues> = {
      linked_lot_number: '',
      cs_start_time: undefined,
      cs_end_time: undefined,
      peeled_input_kg: undefined,
      detailed_size_distribution: [],
      machine_id: '',
      supervisor_id: supervisorName,
  };

  const form = useForm<MachineGradingFormValues>({
    resolver: zodResolver(machineGradingFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (form.getValues('cs_start_time') === undefined) {
      form.setValue('cs_start_time', new Date());
    }
    if (form.getValues('cs_end_time') === undefined) {
      form.setValue('cs_end_time', new Date());
    }
  }, [form]);
  
  useEffect(() => {
    if (supervisorName) {
      form.setValue('supervisor_id', supervisorName);
    }
  }, [supervisorName, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "detailed_size_distribution",
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ size_category: string; weight_kg: number | undefined }>({
    size_category: '',
    weight_kg: undefined,
  });

  const addItem = () => {
    if (newItem.size_category && newItem.weight_kg && newItem.weight_kg > 0) {
      append(newItem as { size_category: string; weight_kg: number });
      setNewItem({ size_category: '', weight_kg: undefined });
      setShowAddForm(false);
    }
  };

  const mutation = useMutation({
    mutationFn: saveMachineGradingAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        toast({ title: "Machine Grading Saved", description: `Grading for Lot ${form.getValues('linked_lot_number')} saved.` });
        addNotification({ message: 'New machine grading log recorded.' });
        form.reset(defaultValues);
        form.setValue('cs_start_time', new Date());
        form.setValue('cs_end_time', new Date());
      } else {
        toast({ title: "Error Saving Grading", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: MachineGradingFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "cs_start_time" | "cs_end_time") => (
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
        submitText="Record Machine Grading"
        submitIcon={<Scaling />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => ( <FormItem><FormLabel>What is the Lot Number?</FormLabel><FormControl><Input placeholder="Enter the Lot Number being graded" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem> )}/>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="cs_start_time" render={() => ( <FormItem className="flex flex-col"><FormLabel>When did grading start?</FormLabel>{renderDateTimePicker("cs_start_time")}<FormMessage /></FormItem> )}/>
        </FormStep>
         <FormStep>
            <FormField control={form.control} name="cs_end_time" render={() => ( <FormItem className="flex flex-col"><FormLabel>When did grading end?</FormLabel>{renderDateTimePicker("cs_end_time")}<FormMessage /></FormItem> )}/>
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="peeled_input_kg" render={({ field }) => ( <FormItem><FormLabel>What is the input weight of peeled kernels (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 150" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
        
        <FormStep>
            <div className="space-y-2 h-full flex flex-col">
              <Label>What is the detailed size distribution?</Label>
              <p className="text-sm text-muted-foreground">Log the weight for each size category produced.</p>
              <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Size Category</Label>
                          <p className="font-medium">{field.size_category}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Weight</Label>
                          <p className="font-medium">{field.weight_kg} kg</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No size categories added yet.</p>}
              </div>

              {showAddForm && (
                <Card className="mt-2 border-primary/50">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium">Add New Size Category</h4>
                    <div>
                      <Label>Size Category</Label>
                      <Select value={newItem.size_category} onValueChange={(value) => setNewItem({...newItem, size_category: value})}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>{SIZE_CATEGORIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input type="number" step="any" placeholder="kg" value={newItem.weight_kg ?? ''} onChange={e => setNewItem({...newItem, weight_kg: parseFloat(e.target.value) || undefined})} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addItem} size="sm">Add Category</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
               <FormMessage>{form.formState.errors.detailed_size_distribution?.message || form.formState.errors.detailed_size_distribution?.root?.message}</FormMessage>
            </div>

            {!showAddForm && (
                <div className="absolute bottom-20 right-6">
                    <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button>
                </div>
            )}
        </FormStep>
        
         <FormStep>
             <FormField control={form.control} name="machine_id" render={({ field }) => ( <FormItem><FormLabel>Which Machine ID was used?</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger></FormControl><SelectContent>{[...GRADING_MACHINE_IDS, 'Both'].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="settings_profile" render={({ field }) => ( <FormItem><FormLabel>What was the settings profile? (Optional)</FormLabel><FormControl><Input placeholder="e.g., Profile A, High-Speed" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="vibration_level" render={({ field }) => ( <FormItem><FormLabel>What was the vibration level? (Optional)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
         <FormStep isOptional>
             <FormField control={form.control} name="feed_rate_kg_hr" render={({ field }) => ( <FormItem><FormLabel>What was the feed rate (kg/hr, Optional)?</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => ( <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Observations on grading performance, issues, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
      </FormStepper>
    </Form>
  );
}
