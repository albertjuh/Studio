
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
import type { RcnSizingCalibrationFormValues } from "@/types";
import { saveRcnSizingAction } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";
import { RCN_SIZE_GRADES, RCN_SIZING_MACHINE_IDS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";

const gradeOutputSchema = z.object({
  grade: z.enum(RCN_SIZE_GRADES, { required_error: "Grade is required." }),
  weight_kg: z.coerce.number().positive("Weight must be positive."),
});

const rcnSizingFormSchema = z.object({
  sizing_batch_id: z.string().min(1, "Sizing Batch ID is required."),
  linked_rcn_batch_id: z.string().min(1, "Linked RCN Batch ID is required."),
  sizing_datetime: z.date({ required_error: "Sizing date and time are required." }),
  input_weight_kg: z.coerce.number().positive("Input weight must be positive."),
  total_output_weight_kg: z.coerce.number().positive("Total output weight must be positive."),
  grade_outputs: z.array(gradeOutputSchema).min(1, "At least one grade output is required."),
  machine_id: z.string().min(1, "Sizing Machine ID is required."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(500).optional(),
});

export function RcnSizingCalibrationForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [supervisorName, setSupervisorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const defaultValues: Partial<RcnSizingCalibrationFormValues> = {
      sizing_batch_id: '',
      linked_rcn_batch_id: '',
      sizing_datetime: undefined,
      input_weight_kg: undefined,
      total_output_weight_kg: undefined,
      grade_outputs: [],
      machine_id: '',
      supervisor_id: supervisorName,
  };

  const form = useForm<RcnSizingCalibrationFormValues>({
    resolver: zodResolver(rcnSizingFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!form.getValues('sizing_datetime')) {
      form.setValue('sizing_datetime', new Date());
    }
  }, [form]);

  useEffect(() => {
    if (supervisorName) {
      form.setValue('supervisor_id', supervisorName);
    }
  }, [supervisorName, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "grade_outputs",
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ grade: typeof RCN_SIZE_GRADES[number] | ''; weight_kg: number | undefined }>({
    grade: '',
    weight_kg: undefined,
  });

  const addItem = () => {
    if (newItem.grade && newItem.weight_kg && newItem.weight_kg > 0) {
      append(newItem as { grade: typeof RCN_SIZE_GRADES[number]; weight_kg: number });
      setNewItem({ grade: '', weight_kg: undefined });
      setShowAddForm(false);
    }
  };


  const mutation = useMutation({
    mutationFn: saveRcnSizingAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        toast({ title: "RCN Sizing Saved", description: `Sizing Batch ${form.getValues('sizing_batch_id')} saved.` });
        addNotification({ message: 'New RCN sizing log recorded.' });
        form.reset(defaultValues);
        form.setValue('sizing_datetime', new Date());
      } else {
        toast({ title: "Error Saving Sizing Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: RcnSizingCalibrationFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "sizing_datetime") => (
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
        submitText="Record RCN Sizing Log"
        submitIcon={<Scaling />}
      >
        <FormStep>
          <FormField control={form.control} name="sizing_batch_id" render={({ field }) => ( <FormItem><FormLabel>What is the Sizing Batch ID?</FormLabel><FormControl><Input placeholder="e.g., SIZE-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
        <FormStep>
          <FormField control={form.control} name="linked_rcn_batch_id" render={({ field }) => ( <FormItem><FormLabel>What is the Linked RCN Batch ID?</FormLabel><FormControl><Input placeholder="Batch ID from Warehouse" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="sizing_datetime" render={() => ( <FormItem className="flex flex-col"><FormLabel>When did sizing take place?</FormLabel>{renderDateTimePicker("sizing_datetime")}<FormMessage /></FormItem> )}/>
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="input_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the input weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="Total RCN input" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="total_output_weight_kg" render={({ field }) => (<FormItem><FormLabel>What was the total output weight (kg)?</FormLabel><FormControl><Input type="number" step="any" placeholder="Total weight of all grades" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep>
            <div className="space-y-2 h-full flex flex-col">
              <Label>What were the grade outputs?</Label>
              <p className="text-sm text-muted-foreground">Log the weight for each RCN size grade produced.</p>
              <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Grade</Label>
                                <p className="font-medium">{field.grade}</p>
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
                {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No grade outputs added yet.</p>}
              </div>

              {showAddForm && (
                <Card className="mt-2 border-primary/50">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="font-medium">Add New Grade Output</h4>
                    <div>
                      <Label>Grade</Label>
                      <Select value={newItem.grade} onValueChange={(value) => setNewItem({...newItem, grade: value as typeof RCN_SIZE_GRADES[number]})}>
                          <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                          <SelectContent>{[...RCN_SIZE_GRADES].map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input type="number" step="any" placeholder="kg" value={newItem.weight_kg ?? ''} onChange={e => setNewItem({...newItem, weight_kg: parseFloat(e.target.value) || undefined})} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addItem} size="sm">Add Grade</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
               <FormMessage>{form.formState.errors.grade_outputs?.message || form.formState.errors.grade_outputs?.root?.message}</FormMessage>
            </div>

            {!showAddForm && (
                <div className="absolute bottom-20 right-6">
                    <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button>
                </div>
            )}
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="machine_id" render={({ field }) => ( <FormItem> <FormLabel>Which Machine ID was used?</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ''}> <FormControl><SelectTrigger><SelectValue placeholder="Select Machine" /></SelectTrigger></FormControl> <SelectContent>{[...RCN_SIZING_MACHINE_IDS, 'Both'].map(id => (<SelectItem key={id} value={id}>{id}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )}/>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Observations on sizing performance, issues, etc." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
        </FormStep>
      </FormStepper>
    </Form>
  );
}
