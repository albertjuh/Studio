
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { CalendarIcon, PackagePlus, Loader2, AlertTriangle, Factory } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { RcnIntakeEntry, RcnOutputToFactoryEntry } from "@/types"; 
import { saveRcnWarehouseTransactionAction } from "@/lib/actions"; 
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RCN_VISUAL_QUALITY_GRADES, RCN_OUTPUT_DESTINATIONS } from "@/lib/constants";
import { useNotifications } from "@/contexts/notification-context";

// Intake from Supplier Schema
const intakeSchema = z.object({
  transaction_type: z.literal("intake"),
  intake_batch_id: z.string().min(1, "Intake Batch ID is required."),
  item_name: z.string().default("Raw Cashew Nuts"), 
  gross_weight_kg: z.coerce.number().positive("Gross weight must be positive."),
  tare_weight_kg: z.coerce.number().nonnegative("Tare weight cannot be negative.").optional().default(0),
  supplier_id: z.string().min(1, "Supplier is a required field."),
  arrival_datetime: z.date({ required_error: "Arrival date and time are required." }),
  moisture_content_percent: z.coerce.number().min(0).max(100, "Moisture content must be between 0-100%.").optional(),
  foreign_matter_percent: z.coerce.number().min(0).max(100, "Foreign matter must be between 0-100%.").optional(),
  visual_defects_percent: z.coerce.number().min(0).max(100, "Visual defects must be between 0-100%.").optional(),
  visual_quality_grade: z.enum(RCN_VISUAL_QUALITY_GRADES).optional(),
  truck_license_plate: z.string().optional(),
  receiver_id: z.string().min(1, "Receiver is a required field."),
  supervisor_id: z.string().min(1, "Supervisor is a required field."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

// Output to Factory Schema
const outputSchema = z.object({
  transaction_type: z.literal("output"),
  output_batch_id: z.string().min(1, "Output Batch ID is required."),
  linked_rcn_intake_batch_id: z.string().min(1, "The warehouse batch ID is required."),
  output_datetime: z.date({ required_error: "Output date and time are required." }),
  quantity_kg: z.coerce.number().positive("Quantity must be a positive number."),
  destination_stage: z.enum(RCN_OUTPUT_DESTINATIONS, { required_error: "Destination stage is required." }),
  authorized_by_id: z.string().min(1, "Authorization is required."),
  notes: z.string().max(300, "Notes must be 300 characters or less.").optional(),
});

const formSchema = z.discriminatedUnion("transaction_type", [intakeSchema, outputSchema]);

type FormSchemaType = z.infer<typeof formSchema>;

export function GoodsReceivedForm() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [formAlerts, setFormAlerts] = useState<string[]>([]);
  
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_type: "intake",
      arrival_datetime: new Date(),
      item_name: "Raw Cashew Nuts",
      tare_weight_kg: 0
    },
    mode: "onChange",
  });
  
  const transactionType = form.watch("transaction_type");
  
  const mutation = useMutation({
    mutationFn: saveRcnWarehouseTransactionAction,
    onSuccess: (result) => {
      if (result.success && result.id) {
        const savedData = form.getValues();
        const desc = savedData.transaction_type === 'intake'
            ? `Intake Batch ${savedData.intake_batch_id} (${savedData.gross_weight_kg} kg) recorded.`
            : `Output Batch ${savedData.output_batch_id} (${savedData.quantity_kg} kg) recorded.`;
        toast({ title: "RCN Transaction Saved", description: desc });
        addNotification({ message: 'New RCN transaction recorded.' });
        form.reset({ transaction_type: transactionType, arrival_datetime: new Date(), output_datetime: new Date(), item_name: "Raw Cashew Nuts", tare_weight_kg: 0 }); 
        setFormAlerts([]);
      } else {
        toast({
          title: "Error Saving Transaction",
          description: result.error || "Could not save RCN transaction data.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Transaction",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const moisture = form.watch("moisture_content_percent");
  const foreignMatter = form.watch("foreign_matter_percent");
  const defects = form.watch("visual_defects_percent");

  useEffect(() => {
    if (transactionType !== 'intake') {
        setFormAlerts([]);
        return;
    };
    const newAlertsList: string[] = [];
    if (moisture !== undefined && moisture > 8) newAlertsList.push(`High Moisture: ${moisture}%.`);
    if (foreignMatter !== undefined && foreignMatter > 3) newAlertsList.push(`High Foreign Matter: ${foreignMatter}%.`);
    if (defects !== undefined && defects > 15) newAlertsList.push(`High Visual Defects: ${defects}%.`);
    
    setFormAlerts(currentAlerts => JSON.stringify(currentAlerts) !== JSON.stringify(newAlertsList) ? newAlertsList : currentAlerts);
  }, [moisture, foreignMatter, defects, transactionType]);

  function onSubmit(data: FormSchemaType) {
    console.log("Submitting RCN Transaction Data:", data);
    mutation.mutate(data);
  }
  
  const renderDateTimePicker = (fieldName: "arrival_datetime" | "output_datetime", label: string) => (
    <FormField control={form.control} name={fieldName} render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "PPP HH:mm") : <span>Pick date and time</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={field.value as Date | undefined} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus/>
              <div className="p-2 border-t">
                <Input type="time" className="w-full" value={field.value ? format(field.value as Date, 'HH:mm') : ''} onChange={(e) => { const currentTime = field.value as Date || new Date(); const [hours, minutes] = e.target.value.split(':'); const newTime = new Date(currentTime); newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10)); field.onChange(newTime); }}/>
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField control={form.control} name="transaction_type" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transaction Type</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={(value) => {
                    form.reset({ transaction_type: value as 'intake' | 'output', arrival_datetime: new Date(), output_datetime: new Date() });
                    field.onChange(value);
                }} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                        <div className={cn("flex items-center p-4 border rounded-md transition-colors", field.value === 'intake' && "bg-primary/5 border-primary")}>
                            <RadioGroupItem value="intake" id="intake"/>
                            <label htmlFor="intake" className="font-medium ml-3 cursor-pointer">Intake from Supplier</label>
                        </div>
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                         <div className={cn("flex items-center p-4 border rounded-md transition-colors", field.value === 'output' && "bg-primary/5 border-primary")}>
                            <RadioGroupItem value="output" id="output"/>
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
      
        {transactionType === 'intake' && (
          <div className="space-y-6 animate-in fade-in-50">
            {renderDateTimePicker("arrival_datetime", "Arrival Date & Time")}
            <FormField control={form.control} name="intake_batch_id" render={({ field }) => (<FormItem><FormLabel>Intake Batch ID</FormLabel><FormControl><Input placeholder="e.g., RCN-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Unique identifier for this intake batch.</FormDescription><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="gross_weight_kg" render={({ field }) => (<FormItem><FormLabel>Gross Weight (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1050.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="tare_weight_kg" render={({ field }) => (<FormItem><FormLabel>Tare Weight (kg, optional)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 50.0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormDescription>Weight of packaging/truck if applicable.</FormDescription><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name="supplier_id" render={({ field }) => (<FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input placeholder="Enter supplier name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="truck_license_plate" render={({ field }) => (<FormItem><FormLabel>Truck License Plate (Optional)</FormLabel><FormControl><Input placeholder="e.g., T123 ABC" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="moisture_content_percent" render={({ field }) => (<FormItem><FormLabel>Moisture (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 7.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="foreign_matter_percent" render={({ field }) => (<FormItem><FormLabel>Foreign Matter (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 1.2" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="visual_defects_percent" render={({ field }) => (<FormItem><FormLabel>Visual Defects (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 5.0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
            </div>
            {formAlerts.length > 0 && (<Alert variant="destructive" className="bg-accent/10 border-accent text-accent-foreground"><AlertTriangle className="h-5 w-5 text-accent" /><AlertTitle>Quality Alert!</AlertTitle><AlertDescription><ul className="list-disc list-inside">{formAlerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul></AlertDescription></Alert>)}
            <FormField control={form.control} name="visual_quality_grade" render={({ field }) => (<FormItem><FormLabel>Visual Quality Grade (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl><SelectContent>{RCN_VISUAL_QUALITY_GRADES.map(grade => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="receiver_id" render={({ field }) => (<FormItem><FormLabel>Receiver Name</FormLabel><FormControl><Input placeholder="Enter receiver's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="supervisor_id" render={({ field }) => (<FormItem><FormLabel>Supervisor Name</FormLabel><FormControl><Input placeholder="Enter supervisor's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
          </div>
        )}

        {transactionType === 'output' && (
          <div className="space-y-6 animate-in fade-in-50">
            {renderDateTimePicker("output_datetime", "Output Date & Time")}
            <FormField control={form.control} name="output_batch_id" render={({ field }) => (<FormItem><FormLabel>Output Batch ID</FormLabel><FormControl><Input placeholder="e.g., RCN-OUT-YYYYMMDD-001" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Unique identifier for this output transaction.</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="linked_rcn_intake_batch_id" render={({ field }) => (<FormItem><FormLabel>Linked Warehouse Intake Batch ID</FormLabel><FormControl><Input placeholder="The batch ID of RCN in the warehouse" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Which batch from the warehouse is being used?</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="quantity_kg" render={({ field }) => (<FormItem><FormLabel>Quantity (kg)</FormLabel><FormControl><Input type="number" step="any" placeholder="e.g., 1000" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} onChange={e => field.onChange(parseFloat(e.target.value))}/></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="destination_stage" render={({ field }) => (<FormItem><FormLabel>Destination Production Stage</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl><SelectContent>{RCN_OUTPUT_DESTINATIONS.map(stage => (<SelectItem key={stage} value={stage}>{stage}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="authorized_by_id" render={({ field }) => (<FormItem><FormLabel>Authorized By</FormLabel><FormControl><Input placeholder="Enter authorizer's name" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
          </div>
        )}

        <Button type="submit" className="w-full md:w-auto" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : transactionType === 'intake' ? <PackagePlus className="mr-2 h-4 w-4" /> : <Factory className="mr-2 h-4 w-4" /> }
           {transactionType === 'intake' ? 'Record RCN Intake' : 'Record Output to Factory'}
        </Button>
      </form>
    </Form>
  );
}
