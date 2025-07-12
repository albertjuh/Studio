
"use client";

// This file is kept for now if you need to refer to its complex structure.
// However, with the new design of having specific forms for each stage,
// this generic "ProductionStageForm" will likely be replaced or significantly refactored.
// The new approach uses individual components like `SteamingProcessForm.tsx`, etc.

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
import { CalendarIcon, Factory, PlusCircle, Trash2, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ITEM_UNITS, PRODUCTION_STAGES, CASHEW_GRADES } from "@/lib/constants";
import type { ProductionStageFormValuesOld as ProductionStageFormValues } from "@/types"; // Using old type for now
// import { saveProductionStageAction } from "@/lib/actions"; // This action will need to be adapted or replaced
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";

const OUTPUT_CASHEW_GRADES = CASHEW_GRADES.filter(grade => grade !== 'RCN');

const GradedOutputSchema = z.object({
  grade: z.string().min(1, "Grade selection is required."),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
  unit: z.string().min(1, "Unit is required."),
});

const productionStageFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  stageName: z.string().min(1, "Production stage is required."),
  
  inputQuantity: z.coerce.number().positive("Input quantity must be positive.").optional(),
  inputUnit: z.string().min(1, "Input unit is required.").optional().default("kg"),

  // Fields from the old complex form. These would be moved to specific stage forms.
  inputBatchNumber: z.string().optional(),
  // ... many other fields from the old generic form schema ...
  
  notes: z.string().max(500, "Notes must be 500 characters or less.").optional(),
});

const initialDefaultValues: Partial<ProductionStageFormValues> = {
  date: undefined, 
  stageName: PRODUCTION_STAGES[0], // This will be removed as stage is chosen via navigation
  inputUnit: "kg",
  inputBatchNumber: '',
  notes: '',
};

export function ProductionStageForm() {
  const { toast } = useToast();
  const form = useForm<ProductionStageFormValues>({
    resolver: zodResolver(productionStageFormSchema),
    defaultValues: initialDefaultValues,
    mode: "onChange", 
  });

  useEffect(() => {
    if (!form.getValues('date')) {
      form.setValue('date', new Date(), { shouldValidate: false, shouldDirty: false });
    }
  }, [form]);

  const mutation = useMutation({
    // mutationFn: saveProductionStageAction, // This action needs to be specific to the chosen stage
    mutationFn: async (data: ProductionStageFormValues) => { 
      console.log("Mock saving old production stage data:", data);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // This would call a specific action like saveSteamingProcessAction(data)
      return { success: true, id: 'mock-' + Date.now().toString() }; 
    },
    onSuccess: (result) => {
      if (result.success && result.id) {
        const stageData = form.getValues();
        toast({
          title: "Production Stage Recorded (Legacy Form)",
          description: `Entry for ${stageData.stageName} (Input Qty: ${stageData.inputQuantity || 'N/A'} ${stageData.inputUnit || ''}) saved with ID: ${result.id}.`,
        });
        form.reset(initialDefaultValues); 
        form.setValue('date', new Date(), { shouldValidate: false, shouldDirty: false });
      } else {
        toast({
          title: "Error Recording Production Stage",
          description: (result as any).error || "Could not save production stage data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Recording Production Stage",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const selectedStageName = form.watch("stageName");

  function onSubmit(data: ProductionStageFormValues) {
    console.log("Submitting Legacy Production Stage Data:", data);
    // Depending on selectedStageName, you'd transform data and call the correct new action
    // For now, it uses the mock mutationFn
    mutation.mutate(data);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-background">
          This is a placeholder for the old generic production stage form. 
          New, detailed forms for each specific stage (like Steaming, Shelling, etc.) should be used. 
          You can select a specific stage form from the Data Entry page navigation.
        </p>
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Production Activity</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "PPP HH:mm") : <span>Pick a date and time</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(day) => {
                      if (day) {
                        const newDateTime = new Date(day);
                        const timeSource = field.value || new Date();
                        newDateTime.setHours(timeSource.getHours(), timeSource.getMinutes(), timeSource.getSeconds(), timeSource.getMilliseconds());
                        field.onChange(newDateTime);
                      } else {
                        field.onChange(undefined);
                      }
                    }}
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stageName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Production Stage (Legacy)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value)} 
                value={field.value ?? ''}
              >
                <FormControl><SelectTrigger><SelectValue placeholder="Select production stage" /></SelectTrigger></FormControl>
                <SelectContent>
                  {PRODUCTION_STAGES.map(stage => (<SelectItem key={stage} value={stage}>{stage}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>Select the specific stage of cashew processing.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedStageName && (
            <div className="space-y-2 p-3 border rounded-md shadow-sm bg-card">
                <h3 className="text-md font-medium text-foreground">Input to this Stage (Legacy)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="inputQuantity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity Entering Stage</FormLabel>
                            <FormControl><Input type="number" step="any" placeholder="e.g., 1000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="inputUnit" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? 'kg'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                                <SelectContent>{ITEM_UNITS.map(unit => (<SelectItem key={unit} value={unit}>{unit}</SelectItem>))}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl><Textarea placeholder="General notes for this stage..." className="resize-none" {...field} value={field.value ?? ''} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={!selectedStageName || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Factory className="mr-2 h-4 w-4" />}
           Record Production Stage (Legacy)
        </Button>
      </form>
    </Form>
  );
}
