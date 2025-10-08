
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PackageCheck, PlusCircle, X, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PackagingFormValues, InventoryItem, PackedItem } from "@/types";
import { savePackagingAction, getActiveVacuumBagBatchesAction } from "@/lib/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PACKING_GRADES, PACKAGE_WEIGHT_KG, SHIFT_OPTIONS, VACUUM_BAGS_BASE_NAME } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const packedItemSchema = z.object({
  kernel_grade: z.string().min(1, "Kernel grade is required."),
  number_of_packs: z.coerce.number().int().positive("Number of packs must be a positive integer."),
});

const formSchema = z.object({
  id: z.string().optional(),
  packed_items: z.array(packedItemSchema).min(1, "At least one packed item is required."),
  production_date: z.date({ required_error: "Production date is required." }),
  shift: z.enum(SHIFT_OPTIONS, { required_error: "Shift is required." }),
  supervisor_id: z.string().min(1, "Supervisor ID is required."),
  vacuum_bag_carton_id: z.string().min(1, "A vacuum bag carton ID must be entered."),
  notes: z.string().max(300).optional(),
});


interface PackagingFormProps {
  initialData?: Partial<PackagingFormValues>;
  onFormSubmit?: () => void;
  onFormDirtyChange: (isDirty: boolean) => void;
}

export function PackagingForm({ initialData, onFormSubmit, onFormDirtyChange }: PackagingFormProps) {
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

  const defaultValues: Partial<PackagingFormValues> = {
    production_date: new Date(),
    shift: undefined,
    supervisor_id: supervisorName,
    packed_items: [],
    vacuum_bag_carton_id: '',
    ...initialData,
  };

  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { isDirty } = form.formState;
  useEffect(() => {
    onFormDirtyChange(isDirty);
  }, [isDirty, onFormDirtyChange]);

  useEffect(() => {
    if (supervisorName && !isEditMode) {
      form.setValue('supervisor_id', supervisorName);
    }
  }, [supervisorName, form, isEditMode]);


  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "packed_items",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Omit<PackedItem, 'number_of_packs'> & { number_of_packs: number | undefined }>({
    kernel_grade: '',
    number_of_packs: undefined,
  });

  const addItem = () => {
    if (newItem.kernel_grade && newItem.number_of_packs && newItem.number_of_packs > 0) {
      append(newItem as PackedItem);
      setNewItem({ kernel_grade: '', number_of_packs: undefined });
      setShowAddForm(false);
    }
  };

  const mutation = useMutation({
    mutationFn: savePackagingAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Packaging Log Saved", description: `Log ID: ${result.id} recorded.` });
        addNotification({ message: 'New packaging log recorded.', link: '/inventory' });
        form.reset({
            ...defaultValues,
            production_date: new Date(),
            supervisor_id: supervisorName
        });
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
        queryClient.invalidateQueries({ queryKey: ['activeVacuumBagBatches'] });
        queryClient.invalidateQueries({ queryKey: ['vacuumBagTraceability'] });
        if (onFormSubmit) onFormSubmit();
      } else {
        toast({ title: "Error Saving Log", description: result.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error Saving Log", description: error.message, variant: "destructive" });
    }
  });

  function onSubmit(data: PackagingFormValues) {
    mutation.mutate(data);
  }

  const packedItems = form.watch("packed_items");
  const totalPacks = packedItems.reduce((sum, item) => sum + (item.number_of_packs || 0), 0);

  return (
    <Form {...form}>
      <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText={isEditMode ? "Update Log" : "Save Packaging Log"}
        submitIcon={<PackageCheck />}
      >
        <FormStep>
            <FormField
                control={form.control}
                name="production_date"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Production Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                )}
            />
        </FormStep>
        
        <FormStep>
            <div className="space-y-2 h-full flex flex-col">
              <Label>Packed Items</Label>
              <p className="text-sm text-muted-foreground">Add one or more kernel grades packed in this run.</p>
              <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Grade</Label>
                            <p className="font-medium">{field.kernel_grade}</p>
                          </div>
                          <div>
                             <Label className="text-xs text-muted-foreground">No. of Packs</Label>
                             <p className="font-medium">{field.number_of_packs}</p>
                          </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"> <X className="h-4 w-4" /> </Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No items added yet.</p>}
              </div>
              
              {showAddForm && (
                 <Card className="mt-2 border-primary/50">
                    <CardContent className="p-4 space-y-4">
                       <h4 className="font-medium">Add New Packed Item</h4>
                        <div>
                          <Label>Kernel Grade</Label>
                          <Select value={newItem.kernel_grade} onValueChange={(value) => setNewItem({...newItem, kernel_grade: `Cashew Kernels - ${value}`})}>
                              <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                              <SelectContent>
                                  {PACKING_GRADES.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                              </SelectContent>
                          </Select>
                        </div>
                         <div>
                          <Label>Number of Packs (Cartons)</Label>
                          <Input type="number" step="1" placeholder="e.g., 50" value={newItem.number_of_packs === undefined ? '' : newItem.number_of_packs} onChange={e => setNewItem({...newItem, number_of_packs: parseInt(e.target.value) || undefined})} />
                        </div>
                       <div className="flex gap-2">
                          <Button onClick={addItem} size="sm">Add Item</Button>
                          <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                       </div>
                    </CardContent>
                 </Card>
              )}
               <FormMessage>{form.formState.errors.packed_items?.message || form.formState.errors.packed_items?.root?.message}</FormMessage>
            </div>
            
             {!showAddForm && (
                <div className="absolute bottom-20 right-6">
                    <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button>
                </div>
            )}
           </FormStep>

           <FormStep>
            <FormField
              control={form.control}
              name="vacuum_bag_carton_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Which Vacuum Bag Carton was used?</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., VBInt-BATCH20240801-01" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the full ID of the carton used. Total bags required for this run: {totalPacks}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
           </FormStep>

           <FormStep>
            <FormField control={form.control} name="shift" render={({ field }) => (<FormItem><FormLabel>Which shift performed the packaging?</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl><SelectContent>{SHIFT_OPTIONS.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
           </FormStep>

           <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
           </FormStep>

           <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes?</FormLabel><FormControl><Textarea placeholder="e.g., 'Repackaging of returned goods', 'New operator training'" className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
           </FormStep>
      </FormStepper>
    </Form>
  );
}
