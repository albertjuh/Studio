

"use client";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, PackagePlus, Loader2, AlertTriangle, Factory, PlusCircle, X, Weight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { RcnIntakeEntry, RcnOutputToFactoryEntry, BatchIdWithWeight } from "@/types"; 
import { saveRcnWarehouseTransactionAction, updateRcnWarehouseTransactionAction, getActiveRcnIntakeBatchesAction } from "@/lib/actions"; 
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RCN_VISUAL_QUALITY_GRADES } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";
import { FormStepper, FormStep } from "@/components/ui/form-stepper";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";

type RcnWarehouseTransaction = (RcnIntakeEntry | RcnOutputToFactoryEntry) & { id?: string };

const batchIdWithWeightSchema = z.object({
  id: z.string().min(1, "Batch ID cannot be empty."),
  weight_kg: z.coerce.number().positive("Weight must be positive."),
});

// Intake from Supplier Schema
const intakeSchema = z.object({
  id: z.string().optional(),
  transaction_type: z.literal("intake"),
  intake_batch_ids: z.array(batchIdWithWeightSchema).min(1, "At least one Intake Batch ID with weight is required."),
  item_name: z.string().default("Raw Cashew Nuts"), 
  tare_weight_kg: z.coerce.number().nonnegative("Tare weight cannot be negative.").optional().default(0),
  supplier_id: z.string().min(1, "Supplier is a required field."),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  moisture_content_percent: z.coerce.number().min(0).max(100, "Moisture content must be between 0-100%.").optional(),
  nut_count_per_kg: z.coerce.number().positive("Nut count must be positive.").optional(),
  visual_quality_grade: z.enum(RCN_VISUAL_QUALITY_GRADES).optional(),
  truck_license_plate: z.string().optional(),
  receiver_id: z.string().min(1, "Receiver is a required field."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

// Output to Factory Schema
const outputSchema = z.object({
  id: z.string().optional(),
  transaction_type: z.literal("output"),
  output_batches: z.array(batchIdWithWeightSchema).min(1, "At least one Output Batch with weight is required."),
  linked_rcn_intake_batch_id: z.string().min(1, "The warehouse batch ID is required."),
  output_datetime: z.date({ required_error: "Output date and time are required." }),
  destination_stage: z.enum(['Sizing & Calibration']).optional(),
  authorized_by_id: z.string().min(1, "Authorization is required."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const formSchema = z.discriminatedUnion("transaction_type", [intakeSchema, outputSchema]);

type FormSchemaType = z.infer<typeof formSchema>;

interface GoodsReceivedFormProps {
  initialData?: Partial<RcnWarehouseTransaction>;
  onFormSubmit?: () => void;
}

export function GoodsReceivedForm({ initialData, onFormSubmit }: GoodsReceivedFormProps) {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);
  const [supervisorName, setSupervisorName] = useState('');

  const isEditMode = !!initialData?.id;

  const { data: activeIntakeBatches, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['activeRcnIntakeBatches'],
    queryFn: getActiveRcnIntakeBatchesAction,
    enabled: !isEditMode, // Only fetch when creating new transactions
  });

  useEffect(() => {
    const name = localStorage.getItem('supervisorName') || '';
    setSupervisorName(name);
  }, []);
  
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? (initialData as FormSchemaType) : {
      transaction_type: "intake",
      item_name: "Raw Cashew Nuts",
      tare_weight_kg: 0,
      arrival_datetime: new Date(), 
      output_datetime: new Date(),
      intake_batch_ids: [],
      output_batches: [],
    },
    mode: "onChange",
  });

  const { fields: intakeFields, append: intakeAppend, remove: intakeRemove } = useFieldArray({
    control: form.control,
    name: "intake_batch_ids" as 'intake_batch_ids',
  });

  const { fields: outputFields, append: outputAppend, remove: outputRemove } = useFieldArray({
    control: form.control,
    name: "output_batches" as 'output_batches',
  });

  const [showIntakeAddForm, setShowIntakeAddForm] = useState(false);
  const [newIntakeItem, setNewIntakeItem] = useState<Omit<BatchIdWithWeight, 'weight_kg'> & { weight_kg: number | undefined }>({ id: '', weight_kg: undefined });
  
  const [showOutputAddForm, setShowOutputAddForm] = useState(false);
  const [newOutputItem, setNewOutputItem] = useState<Omit<BatchIdWithWeight, 'weight_kg'> & { weight_kg: number | undefined }>({ id: '', weight_kg: undefined });


  const addIntakeItem = () => {
    if (newIntakeItem.id && newIntakeItem.weight_kg && newIntakeItem.weight_kg > 0) {
      intakeAppend(newIntakeItem as BatchIdWithWeight);
      setNewIntakeItem({ id: '', weight_kg: undefined });
      setShowIntakeAddForm(false);
    } else {
        toast({ title: "Incomplete Batch", description: "Please provide both a batch ID and a valid weight.", variant: "destructive" })
    }
  };
  
  const addOutputItem = () => {
    if (newOutputItem.id && newOutputItem.weight_kg && newOutputItem.weight_kg > 0) {
      outputAppend(newOutputItem as BatchIdWithWeight);
      setNewOutputItem({ id: '', weight_kg: undefined });
      setShowOutputAddForm(false);
    } else {
        toast({ title: "Incomplete Batch", description: "Please provide both an output batch ID and a valid weight.", variant: "destructive" })
    }
  };

  useEffect(() => {
    if (initialData) {
      const resetData: any = { ...initialData };
      if (initialData.arrival_datetime) resetData.arrival_datetime = new Date(initialData.arrival_datetime);
      if (initialData.output_datetime) resetData.output_datetime = new Date(initialData.output_datetime);
      form.reset(resetData);
    } else {
        if (!form.getValues('arrival_datetime')) form.setValue('arrival_datetime', new Date());
        if (!form.getValues('output_datetime')) form.setValue('output_datetime', new Date());
    }
  }, [initialData, form]);

  useEffect(() => {
    if (supervisorName && !isEditMode) {
      const currentTransactionType = form.getValues().transaction_type;
      if (currentTransactionType === 'intake') {
        form.setValue('receiver_id', supervisorName);
        form.setValue('supervisor_id', supervisorName);
      } else {
        form.setValue('authorized_by_id', supervisorName);
      }
    }
  }, [supervisorName, form, isEditMode, form.getValues().transaction_type]);
  
  const transactionType = form.watch("transaction_type");
  
  const mutation = useMutation({
    mutationFn: (data: RcnWarehouseTransaction) => isEditMode ? updateRcnWarehouseTransactionAction(data) : saveRcnWarehouseTransactionAction(data),
    onSuccess: (result) => {
      if (result.success && result.id) {
        const actionText = isEditMode ? "Updated" : "Saved";
        const savedData = form.getValues();
        let desc = "";

        if (savedData.transaction_type === 'intake') {
          const totalWeight = savedData.intake_batch_ids.reduce((sum, b) => sum + b.weight_kg, 0);
          desc = `Intake of ${savedData.intake_batch_ids.length} batches (${totalWeight} kg) ${actionText.toLowerCase()}.`;
          toast({ title: `RCN Intake ${actionText}`, description: desc });
        } else {
          const totalWeight = savedData.output_batches.reduce((sum, b) => sum + b.weight_kg, 0);
          desc = `Output of ${savedData.output_batches.length} batches (${totalWeight} kg) ${actionText.toLowerCase()}.`;
          toast({ title: `RCN Output ${actionText}`, description: desc });
        }

        if (!isEditMode) addNotification({ message: 'New RCN transaction recorded.', link: '/inventory' });
        
        form.reset({ transaction_type: transactionType, arrival_datetime: new Date(), output_datetime: new Date(), item_name: "Raw Cashew Nuts", tare_weight_kg: 0, intake_batch_ids: [], output_batches: [] }); 
        setFormAlerts([]);
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
        queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        queryClient.invalidateQueries({ queryKey: ['reportData'] });
        queryClient.invalidateQueries({ queryKey: ['activeRcnIntakeBatches'] });
        if (onFormSubmit) onFormSubmit();
      } else {
        toast({ title: "Error Saving Transaction", description: result.error || "Could not save RCN transaction data.", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error Saving Transaction", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  });

  const moisture = form.watch("moisture_content_percent");
  const intakeBatches = form.watch('intake_batch_ids');
  const grossWeight = useMemo(() => {
    if (transactionType !== 'intake' || !intakeBatches) return 0;
    return intakeBatches.reduce((sum, batch) => sum + (batch.weight_kg || 0), 0);
  }, [intakeBatches, transactionType]);


  useEffect(() => {
    if (transactionType !== 'intake') {
        setFormAlerts([]);
        return;
    };
    const newAlertsList: string[] = [];
    if (moisture !== undefined && moisture > 8) newAlertsList.push(`High Moisture: ${moisture}%.`);
    
    setFormAlerts(currentAlerts => JSON.stringify(currentAlerts) !== JSON.stringify(newAlertsList) ? newAlertsList : currentAlerts);
  }, [moisture, transactionType]);

  function onSubmit(data: FormSchemaType) {
    if (data.transaction_type === 'output') {
      data.destination_stage = 'Sizing & Calibration';
    }
    console.log("Submitting RCN Transaction Data:", data);
    mutation.mutate(data as RcnWarehouseTransaction);
  }
  
  const renderDateTimePicker = (fieldName: "arrival_datetime" | "output_datetime") => (
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
                format(form.getValues(fieldName) as Date, "PPP")
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
            selected={form.getValues(fieldName) as Date | undefined}
            onSelect={(date) => {
              const currentVal = (form.getValues(fieldName) as Date) || new Date();
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
              ? format(form.getValues(fieldName) as Date, "HH:mm")
              : ""
          }
          onChange={(e) => {
            const currentTime = (form.getValues(fieldName) as Date) || new Date();
            const [hours, minutes] = e.target.value.split(":");
            const newTime = new Date(currentTime);
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            form.setValue(fieldName, newTime, { shouldValidate: true });
          }}
        />
      </FormControl>
    </div>
  );

  const intakeSteps = useMemo(() => [
      <FormStep key="intake-date"><FormField control={form.control} name="arrival_datetime" render={() => (<FormItem><FormLabel>When was the arrival date & time?</FormLabel>{renderDateTimePicker("arrival_datetime")}<FormMessage /></FormItem>)} /></FormStep>,
      <FormStep key="intake-batch">
        <div className="space-y-2 h-full flex flex-col">
            <Label>What are the Intake Batches?</Label>
            <FormDescription>Add each supplier batch ID and its weight for this intake.</FormDescription>
            <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {intakeFields.map((field, index) => (
                    <Card key={field.id} className="p-4 bg-muted/50">
                        <div className="flex justify-between items-start">
                             <div className="flex-1 grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Batch ID</Label><p className="font-medium">{field.id}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Weight</Label><p className="font-medium">{field.weight_kg} kg</p></div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => intakeRemove(index)} className="text-destructive hover:bg-destructive/10 h-9 w-9"> <X className="h-4 w-4" /> </Button>
                        </div>
                    </Card>
                ))}
                {intakeFields.length === 0 && !showIntakeAddForm && <p className="text-center text-muted-foreground py-8">No batches added yet.</p>}

                 {showIntakeAddForm && (
                 <Card className="mt-2 border-primary/50">
                    <CardContent className="p-4 space-y-4">
                       <h4 className="font-medium">Add New Batch</h4>
                        <div><Label>Batch ID</Label><Input placeholder="Enter supplier batch ID" value={newIntakeItem.id} onChange={(e) => setNewIntakeItem({...newIntakeItem, id: e.target.value})} /></div>
                        <div><Label>Gross Weight (kg)</Label><Input type="number" step="any" placeholder="e.g., 550.5" value={newIntakeItem.weight_kg ?? ''} onChange={e => setNewIntakeItem({...newIntakeItem, weight_kg: parseFloat(e.target.value) || undefined})} /></div>
                       <div className="flex gap-2"><Button type="button" onClick={addIntakeItem} size="sm">Add Batch</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowIntakeAddForm(false)}>Cancel</Button></div>
                    </CardContent>
                 </Card>
              )}
            </div>
            <FormMessage>{(form.formState.errors as any).intake_batch_ids?.message}</FormMessage>

             {!showIntakeAddForm && (
                <div className="absolute bottom-20 right-6"><Button type="button" onClick={() => setShowIntakeAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button></div>
            )}
        </div>
      </FormStep>,
      <FormStep key="intake-summary"><Label>Intake Summary</Label><div className="p-4 border rounded-md space-y-4 bg-muted/50 mt-2">
            <FormItem><Label>Total Gross Weight (calculated)</Label><div className="flex items-center h-10 rounded-md border border-input bg-background px-3"><Weight className="mr-2 h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{grossWeight.toFixed(2)} kg</span></div></FormItem>
            <FormField control={form.control} name="tare_weight_kg" render={({ field }) => (<FormItem><FormLabel>What is the Tare Weight (kg, optional)?</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormDescription>Weight of packaging/truck if applicable.</FormDescription><FormMessage /></FormItem>)}/>
            <FormItem><Label>Total Net Weight (calculated)</Label><div className="flex items-center h-10 rounded-md border border-input bg-background px-3"><Weight className="mr-2 h-4 w-4 text-primary" /><span className="text-sm font-bold text-primary">{(grossWeight - (form.getValues('tare_weight_kg') || 0)).toFixed(2)} kg</span></div></FormItem>
        </div></FormStep>,
      <FormStep key="intake-supplier"><FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem><FormLabel>Who is the supplier?</FormLabel><FormControl><Input placeholder="Enter supplier name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
      <FormStep key="intake-truck" isOptional><FormField control={form.control} name="truck_license_plate" render={({ field }) => (<FormItem><FormLabel>What is the Truck License Plate (Optional)?</FormLabel><FormControl><Input placeholder="e.g., T123 ABC" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
      <FormStep key="intake-quality" isOptional><FormLabel>What are the Quality Metrics? (Optional)</FormLabel><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <FormField control={form.control} name="moisture_content_percent" render={({ field }) => (<FormItem><FormLabel>Moisture (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 7.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="nut_count_per_kg" render={({ field }) => (<FormItem><FormLabel>Average Quality (Nut Count / kg)</FormLabel><FormControl><Input type="number" step="1" placeholder="e.g., 185" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} /></FormControl><FormDescription>Also known as KOR or Outturn.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="visual_quality_grade" render={({ field }) => (<FormItem><FormLabel>Overall Quality Grade</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl><SelectContent>{RCN_VISUAL_QUALITY_GRADES.map(grade => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
          </div></FormStep>,
      ...(formAlerts.length > 0 ? [<FormStep key="intake-alerts"><Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Quality Alert!</AlertTitle><AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription></Alert></FormStep>] : []),
      <FormStep key="intake-receiver"><FormField control={form.control} name="receiver_id" render={({ field }) => (<FormItem><FormLabel>Who is the receiver?</FormLabel><FormControl><Input readOnly placeholder="Enter receiver's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
      <FormStep key="intake-supervisor"><FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Who is the supervisor?</FormLabel><FormControl><Input readOnly placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
      <FormStep key="intake-notes" isOptional><FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
  ], [form, formAlerts, supervisorName, intakeFields, intakeAppend, intakeRemove, showIntakeAddForm, newIntakeItem, grossWeight]);

  const outputSteps = useMemo(() => [
    <FormStep key="output-date"><FormField control={form.control} name="output_datetime" render={() => (<FormItem><FormLabel>When was the output date & time?</FormLabel>{renderDateTimePicker("output_datetime")}<FormMessage /></FormItem>)}/></FormStep>,
    <FormStep key="output-linked-batch">
        <FormField
            control={form.control}
            name="linked_rcn_intake_batch_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Which Warehouse Batch are you taking from?</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isLoadingBatches}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingBatches ? "Loading batches..." : "Select an available batch"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {isLoadingBatches && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                            {activeIntakeBatches?.map((batch) => (
                                <SelectItem key={batch.id} value={batch.id}>
                                    {batch.id} (Available: {batch.available_kg.toFixed(2)} kg)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>Only batches with available stock are shown.</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    </FormStep>,
    <FormStep key="output-batch">
        <div className="space-y-2 h-full flex flex-col">
            <Label>What are the Output Batches?</Label>
            <FormDescription>Add each new factory batch ID and its weight for this transfer.</FormDescription>
            <div className="flex-1 max-h-96 overflow-y-auto space-y-3 pr-2 py-2">
                {outputFields.map((field, index) => (
                    <Card key={field.id} className="p-4 bg-muted/50">
                        <div className="flex justify-between items-start">
                             <div className="flex-1 grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Batch ID</Label><p className="font-medium">{field.id}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Weight</Label><p className="font-medium">{field.weight_kg} kg</p></div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => outputRemove(index)} className="text-destructive hover:bg-destructive/10 h-9 w-9"> <X className="h-4 w-4" /> </Button>
                        </div>
                    </Card>
                ))}
                {outputFields.length === 0 && !showOutputAddForm && <p className="text-center text-muted-foreground py-8">No batches added yet.</p>}

                 {showOutputAddForm && (
                 <Card className="mt-2 border-primary/50">
                    <CardContent className="p-4 space-y-4">
                       <h4 className="font-medium">Add New Output Batch</h4>
                        <div><Label>Output Batch ID</Label><Input placeholder="e.g., RCN-OUT-YYYYMMDD-001" value={newOutputItem.id} onChange={(e) => setNewOutputItem({...newOutputItem, id: e.target.value})} /></div>
                        <div><Label>Weight (kg)</Label><Input type="number" step="any" placeholder="e.g., 550.5" value={newOutputItem.weight_kg ?? ''} onChange={e => setNewOutputItem({...newOutputItem, weight_kg: parseFloat(e.target.value) || undefined})} /></div>
                       <div className="flex gap-2"><Button type="button" onClick={addOutputItem} size="sm">Add Batch</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowOutputAddForm(false)}>Cancel</Button></div>
                    </CardContent>
                 </Card>
              )}
            </div>
            <FormMessage>{(form.formState.errors as any).output_batches?.message}</FormMessage>

             {!showOutputAddForm && (
                <div className="absolute bottom-20 right-6"><Button type="button" onClick={() => setShowOutputAddForm(true)} className="rounded-full w-14 h-14 shadow-lg"> <PlusCircle className="h-6 w-6" /> </Button></div>
            )}
        </div>
    </FormStep>,
    <FormStep key="output-destination"><FormItem><FormLabel>Destination: Sizing & Calibration</FormLabel><FormControl><Input readOnly value="RCN will be logged as input for the Sizing & Calibration stage." className="bg-muted" /></FormControl></FormItem></FormStep>,
    <FormStep key="output-auth"><FormField control={form.control} name="authorized_by_id" render={({ field }) => (<FormItem><FormLabel>Who authorized this transaction?</FormLabel><FormControl><Input readOnly placeholder="Enter authorizer's name" {...field} value={field.value ?? ''} className="bg-muted" /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
    <FormStep key="output-notes" isOptional><FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Any additional notes? (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/></FormStep>,
  ], [form, supervisorName, outputFields, outputAppend, outputRemove, showOutputAddForm, newOutputItem, activeIntakeBatches, isLoadingBatches]);

  const stepsToShow = useMemo(() => {
    const baseStep = (
      <FormStep key="transaction-type">
          <FormField control={form.control} name="transaction_type" render={({ field }) => (
          <FormItem className="space-y-3">
              <FormLabel>What is the transaction type?</FormLabel>
              <FormControl>
              <RadioGroup onValueChange={(value) => {
                  const name = localStorage.getItem('supervisorName') || '';
                  form.reset({ 
                      transaction_type: value as 'intake' | 'output', 
                      arrival_datetime: new Date(), 
                      output_datetime: new Date(),
                      item_name: "Raw Cashew Nuts",
                      tare_weight_kg: 0,
                      receiver_id: value === 'intake' ? name : undefined,
                      supervisor_id: value === 'intake' ? name : undefined,
                      authorized_by_id: value === 'output' ? name : undefined,
                      intake_batch_ids: [],
                      output_batches: [],
                  });
                  field.onChange(value);
              }} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                      <div className={cn("flex items-center p-4 border rounded-md transition-colors cursor-pointer", field.value === 'intake' && "bg-primary/5 border-primary")}>
                          <RadioGroupItem value="intake" id="intake" disabled={isEditMode}/>
                          <label htmlFor="intake" className="font-medium ml-3 cursor-pointer">Intake from Supplier</label>
                      </div>
                  </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                          <div className={cn("flex items-center p-4 border rounded-md transition-colors cursor-pointer", field.value === 'output' && "bg-primary/5 border-primary")}>
                          <RadioGroupItem value="output" id="output" disabled={isEditMode}/>
                          <label htmlFor="output" className="font-medium ml-3 cursor-pointer">Output to Factory</label>
                      </div>
                  </FormControl>
                  </FormItem>
              </RadioGroup>
              </FormControl>
              <FormMessage />
          </FormItem>
          )}
      />
      </FormStep>
    );
    return [baseStep, ...(transactionType === 'intake' ? intakeSteps : outputSteps)];
  }, [transactionType, intakeSteps, outputSteps, form, isEditMode]);


  return (
    <Form {...form}>
       <FormStepper
        form={form}
        onSubmit={onSubmit}
        isLoading={mutation.isPending}
        submitText={isEditMode ? "Update Transaction" : (transactionType === 'intake' ? 'Record RCN Intake' : 'Record Output to Factory')}
        submitIcon={transactionType === 'intake' ? <PackagePlus /> : <Factory />}
      >
        {stepsToShow}
      </FormStepper>
    </Form>
  );
}
