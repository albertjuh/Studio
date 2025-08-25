

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
import type { PackagingFormValues } from "@/types";
import { savePackagingAction, updatePackagingLogAction } from "@/lib/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SEALING_MACHINE_IDS, SHIFT_OPTIONS, FINISHED_KERNEL_GRADES, PACKAGE_WEIGHT_KG, WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME } from "@/lib/constants";
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

const packagingFormSchema = z.object({
  id: z.string().optional(), // For editing
  linked_lot_number: z.string().min(1, "Linked Lot Number is required."),
  pack_start_time: z.date({ required_error: "Start time is required." }),
  pack_end_time: z.date({ required_error: "End time is required." }),
  
  packed_items: z.array(packedItemSchema).min(1, "At least one packed item must be added."),
  
  vacuum_bag_carton_id: z.string().min(1, "A vacuum bag carton ID must be entered."),
  production_date: z.date({ required_error: "Production date is required." }),
  box_type: z.enum([WHITE_PLAIN_BOXES_NAME, PAINTED_LOGO_BOXES_NAME], { required_error: "Box type is required." }),
  packaging_line_id: z.string().optional(),
  sealing_machine_id: z.string().optional(),
  shift: z.enum(SHIFT_OPTIONS).optional(),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300).optional(),
});

interface PackagingFormProps {
  initialData?: Partial<PackagingFormValues>;
  onFormSubmit?: () => void; // Callback to close dialog on success
}

export function PackagingForm({ initialData, onFormSubmit }: PackagingFormProps) {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [supervisorName, setSupervisorName] = useState('');

  const isEditMode = !!initialData?.id;

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);

  const getInitialFormValues = useMemo(() => {
    return (initialData?: Partial<PackagingFormValues>) => ({
      id: undefined,
      linked_lot_number: '',
      pack_start_time: new Date(),
      pack_end_time: new Date(),
      packed_items: [],
      vacuum_bag_carton_id: '',
      production_date: new Date(),
      box_type: undefined,
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
    mutationFn: (data: PackagingFormValues) => isEditMode ? updatePackagingLogAction(data) : savePackagingAction(data),
    onSuccess: (result) => {
      if (result.success && result.id) {
        const actionText = isEditMode ? "Updated" : "Saved";
        toast({ title: `Packaging Log ${actionText}`, description: `Firestore ID: ${result.id}` });
        if (!isEditMode) {
            addNotification({ message: 'New packaging log recorded.' });
        }
        form.reset(getInitialFormValues());
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['finishedGoodsStock'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['allInventoryItems'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
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
        submitText={isEditMode ? "Update Log" : "Record Packaging Log"}
        submitIcon={<Package />}
      >
        <FormStep>
            <FormField control={form.control} name="linked_lot_number" render={({ field }) => (<FormItem><FormLabel>What is the Lot Number being packaged?</FormLabel><FormControl><Input placeholder="Enter the Lot Number" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This links the process for traceability.</FormDescription><FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="pack_start_time" render={() => (<FormItem className="flex flex-col"><FormLabel>When did packaging start?</FormLabel>{renderDateTimePicker("pack_start_time")}<FormMessage /></FormItem>)} />
        </FormStep>
        <FormStep>
            <FormField control={form.control} name="pack_end_time" render={() => (<FormItem className="flex flex-col"><FormLabel>When did packaging end?</FormLabel>{renderDateTimePicker("pack_end_time")}<FormMessage /></FormItem>)} />
        </FormStep>
        
        <FormStep>
            <div className="space-y-2 h-full flex flex-col">
              <Label>Which kernel grades were packed?</Label>
              <p className="text-sm text-muted-foreground">Add each kernel grade and the number of packs (boxes) for it.</p>
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
                            <Label className="text-xs text-muted-foreground">Packs</Label>
                            <p className="font-medium">{field.number_of_packs} packs</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && !showAddForm && <p className="text-center text-muted-foreground py-8">No packed grades added yet.</p>}
              </div>
              
              {showAddForm && (
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
                          <Button onClick={addItem} size="sm">Add Grade</Button>
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
            <Label>Packaging Materials</Label>
            <div className="p-4 border rounded-md space-y-4 bg-muted/50 mt-2">
              <FormField
                control={form.control}
                name="vacuum_bag_carton_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Which Vacuum Bag Carton ID was used?</FormLabel>
                     <FormControl>
                        <Input placeholder="Manually enter the carton ID, e.g., VBInt-BATCH...-01" {...field} />
                    </FormControl>
                    <FormDescription>Enter the full unique ID for the carton of bags used.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField control={form.control} name="box_type" render={({ field }) => (
                <FormItem><FormLabel>What type of box was used?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select box type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value={WHITE_PLAIN_BOXES_NAME}>White Plain Boxes</SelectItem>
                            <SelectItem value={PAINTED_LOGO_BOXES_NAME}>Painted Logo Boxes</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage />
                </FormItem>
              )}/>
               <FormItem>
                    <Label>Total Weight Produced (calculated)</Label>
                    <div className="flex items-center h-10 rounded-md border border-input bg-background px-3">
                        <Weight className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-bold text-primary">{totalKgProduced.toFixed(2)} kg</span>
                    </div>
               </FormItem>
            </div>
        </FormStep>
        
        <FormStep>
            <FormField control={form.control} name="production_date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>What is the production date?</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )} />
        </FormStep>
        <FormStep>
            <FormItem><FormLabel>What is the calculated Expiry Date?</FormLabel><Input readOnly value={expiryDate ? format(expiryDate, "PPP") : "Select production date"} className="bg-muted" /></FormItem>
        </FormStep>
        
        <FormStep isOptional>
             <FormField control={form.control} name="packaging_line_id" render={({ field }) => (
                <FormItem>
                    <FormLabel>Which Packaging Line ID was used?</FormLabel>
                    <FormControl>
                        <Input readOnly {...field} value={field.value ?? ''} className="bg-muted"/>
                    </FormControl>
                    <FormDescription>
                        Both lines are recorded as working simultaneously.
                    </FormDescription>
                    <FormMessage />
                </FormItem>
             )} />
        </FormStep>
        <FormStep isOptional>
             <FormField control={form.control} name="sealing_machine_id" render={({ field }) => (<FormItem><FormLabel>Which Sealing Machine ID was used?</FormLabel><FormControl><Input readOnly value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>

         <FormStep isOptional>
            <FormField control={form.control} name="shift" render={({ field }) => (<FormItem><FormLabel>Which shift was it? (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                <SelectContent>{SHIFT_OPTIONS.map(opt => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        </FormStep>

        <FormStep>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (
            <FormItem><FormLabel>Who was the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>
            )} />
        </FormStep>
        <FormStep isOptional>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Packaging issues, observations..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </FormStep>
      </FormStepper>
    </Form>
  );
}
