
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Package, PlusCircle, X, Weight, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PackagingFormValues, InventoryItem } from "@/types";
import { savePackagingAction, getActiveVacuumBagBatchesAction } from "@/lib/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SHIFT_OPTIONS, FINISHED_KERNEL_GRADES, PACKAGE_WEIGHT_KG, PEELED_KERNELS_FOR_PACKAGING_NAME } from "@/lib/constants";
import { calculateExpiryDate } from "@/lib/utils";
import { useNotifications } from "@/contexts/notification-context";
import { useEffect, useState, useMemo } from "react";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";

const packedItemSchema = z.object({
    kernel_grade: z.string().min(1, "Kernel grade is required."),
    number_of_packs: z.coerce.number().int().positive("Number of packs must be a positive whole number."),
});

// Simplified Schema
const packagingFormSchema = z.object({
  id: z.string().optional(), // For editing
  linked_lot_number: z.string().default(PEELED_KERNELS_FOR_PACKAGING_NAME),
  pack_start_time: z.date({ required_error: "Start time is required." }),
  pack_end_time: z.date({ required_error: "End time is required." }),
  
  packed_items: z.array(packedItemSchema).min(1, "At least one packed item must be added."),
  
  vacuum_bag_carton_id: z.string().min(1, "You must select the vacuum bag carton being used."),
  production_date: z.date({ required_error: "Production date is required." }),
  
  packaging_line_id: z.string().optional(),
  sealing_machine_id: z.string().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300).optional(),
});

interface PackagingFormProps {
  initialData?: Partial<PackagingFormValues>;
  onFormSubmit?: () => void;
  onFormDirtyChange: (isDirty: boolean) => void;
}

export function PackagingForm({ initialData, onFormSubmit, onFormDirtyChange = () => {} }: PackagingFormProps) {
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

  const getInitialFormValues = useMemo(() => {
    return (initialData?: Partial<PackagingFormValues>) => ({
      id: undefined,
      linked_lot_number: PEELED_KERNELS_FOR_PACKAGING_NAME,
      pack_start_time: new Date(),
      pack_end_time: new Date(),
      packed_items: [],
      vacuum_bag_carton_id: '',
      production_date: new Date(),
      packaging_line_id: 'Line 1 & Line 2',
      sealing_machine_id: 'Sealing Machine 1',
      supervisor_id: supervisorName,
      notes: '',
      ...initialData,
    });
  }, [supervisorName]);

  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(packagingFormSchema),
    defaultValues: getInitialFormValues(initialData),
  });
  
  const { isDirty } = form.formState;
  useEffect(() => {
    onFormDirtyChange(isDirty);
  }, [isDirty, onFormDirtyChange]);

  useEffect(() => {
     if (initialData) {
        const resetData: any = { ...getInitialFormValues(), ...initialData };
        if (initialData.pack_start_time) resetData.pack_start_time = new Date(initialData.pack_start_time);
        if (initialData.pack_end_time) resetData.pack_end_time = new Date(initialData.pack_end_time);
        if (initialData.production_date) resetData.production_date = new Date(initialData.production_date);
        form.reset(resetData);
    } else {
        form.reset(getInitialFormValues());
    }
  }, [initialData, supervisorName, form, getInitialFormValues]);


   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packed_items",
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<{ kernel_grade: string; number_of_packs: number | undefined }>({ 
    kernel_grade: '', 
    number_of_packs: undefined, 
  });

  const addItem = () => {
    if (newItem.kernel_grade && newItem.number_of_packs && newItem.number_of_packs > 0) {
      append({ kernel_grade: newItem.kernel_grade, number_of_packs: newItem.number_of_packs });
      setNewItem({ kernel_grade: '', number_of_packs: undefined });
      setShowAddForm(false);
    }
  };
  
  const packedItemsValues = form.watch("packed_items");
  const totalPacksProduced = packedItemsValues.reduce((sum, item) => sum + (item.number_of_packs || 0), 0);
  const totalKgProduced = totalPacksProduced * PACKAGE_WEIGHT_KG;

  const mutation = useMutation({
    mutationFn: (data: PackagingFormValues) => savePackagingAction(data),
    onSuccess: (result) => {
      if (result.success && result.id) {
        const actionText = isEditMode ? "Updated" : "Saved";
        toast({ title: `Packaging Log ${actionText}`, description: `Log for lot ${form.getValues('linked_lot_number')} has been recorded.` });
        if (!isEditMode) {
            addNotification({ message: 'New packaging log recorded.' });
        }
        form.reset(getInitialFormValues());
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
        queryClient.invalidateQueries({ queryKey: ['localPackingReport'] });
        queryClient.invalidateQueries({ queryKey: ['activeVacuumBagBatches'] });
        queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
        if (onFormSubmit) onFormSubmit();
      } else {
        toast({ title: "Error Saving Packaging Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const prodDate = form.watch("production_date");
  const expiryDate = prodDate ? calculateExpiryDate(prodDate) : null;

  function onSubmit(data: PackagingFormValues) {
    mutation.mutate(data);
  }

  const renderDateTimePicker = (fieldName: "pack_start_time" | "pack_end_time") => (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={"outline"}
              className={cn(
                "w-full pl-3 text-left font-normal",
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
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="packed_items"
              render={() => (
                 <FormItem>
                    <FormLabel>Packed Grades</FormLabel>
                    <FormDescription>Add each kernel grade and the number of packs (boxes) for it.</FormDescription>
                     <div className="space-y-2">
                        {fields.map((field, index) => (
                        <Card key={field.id} className="p-3 bg-muted/50">
                            <div className="flex justify-between items-center">
                            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-medium">{field.kernel_grade}</p>
                                </div>
                                <div>
                                    <p className="font-medium">{field.number_of_packs} packs</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                            </div>
                        </Card>
                        ))}
                    </div>
                     <FormMessage />
                </FormItem>
              )}
             />

              {showAddForm ? (
                 <Card className="mt-2 border-primary/50">
                    <CardContent className="p-4 space-y-4">
                       <h4 className="font-medium">Add New Packed Grade</h4>
                        <div>
                          <Label>Kernel Grade</Label>
                           <Select value={newItem.kernel_grade} onValueChange={(value) => setNewItem({...newItem, kernel_grade: value})}>
                              <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                              <SelectContent>{[...FINISHED_KERNEL_GRADES].map(grade => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                         <div>
                          <Label>Number of Packs (Boxes)</Label>
                           <Input type="number" step="1" placeholder="e.g., 50" value={newItem.number_of_packs ?? ''} onChange={e => setNewItem({...newItem, number_of_packs: parseInt(e.target.value, 10) || undefined})} />
                        </div>
                       <div className="flex gap-2">
                          <Button type="button" onClick={addItem} size="sm">Add Grade</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                       </div>
                    </CardContent>
                 </Card>
              ) : (
                 <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Packed Grade
                </Button>
              )}

           <FormField
              control={form.control}
              name="vacuum_bag_carton_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vacuum Bag Carton</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoadingBags}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder={isLoadingBags ? "Loading cartons..." : "Select a carton"} />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {activeVacuumBagCartons?.map((carton) => (
                              <SelectItem key={carton.id} value={carton.name}>
                                  {carton.name.replace("Vacuum Bags - Carton ", "")} (Available: {carton.quantity})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <FormDescription>Select the specific carton of vacuum bags being used.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="production_date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Production Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )} />

             <FormField control={form.control} name="supervisor_id" render={({ field }) => (
                <FormItem><FormLabel>Supervisor</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>
                )} />

            <Button type="submit" disabled={mutation.isPending || fields.length === 0} className="w-full">
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                {isEditMode ? "Update Log" : "Record Packaging Log"}
            </Button>
      </form>
    </Form>
  );
}
