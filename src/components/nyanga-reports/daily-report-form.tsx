
"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { saveNyangaReportAction } from '@/lib/nyanga-actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, CalendarIcon, PlusCircle, X } from 'lucide-react';
import type { NyangaReportFormValues } from '@/types';
import { SHIFT_OPTIONS } from '@/lib/constants';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';

const entrySchema = z.object({
  workerName: z.string().min(2, "Worker name is required"),
  kg: z.coerce.number().min(0, "Kg cannot be negative.").positive("Kg must be greater than 0."),
});

const reportSchema = z.object({
  reportDate: z.date(),
  supervisorId: z.string(),
  shift: z.enum(SHIFT_OPTIONS),
  entries: z.array(entrySchema).min(1, "You must add at least one worker entry."),
});

interface DailyReportFormProps {
  supervisorId: string;
}

export function DailyReportForm({ supervisorId }: DailyReportFormProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ workerName: '', kg: '' });

  const form = useForm<NyangaReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date(),
      supervisorId: supervisorId,
      shift: 'Day A',
      entries: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  useEffect(() => {
    if (supervisorId) {
      form.setValue('supervisorId', supervisorId);
    }
  }, [supervisorId, form]);

  const saveMutation = useMutation({
    mutationFn: saveNyangaReportAction,
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Report Saved', description: `Production for ${format(form.getValues('reportDate'), 'PPP')} has been recorded.` });
        form.reset({
            ...form.getValues(),
            entries: [], // Clear the entries list
        });
        setShowAddForm(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  });

  const onSubmit = (data: NyangaReportFormValues) => {
    saveMutation.mutate(data);
  };
  
  const addItem = () => {
    if (newItem.workerName && newItem.kg) {
        const kgValue = parseFloat(newItem.kg);
        if (kgValue > 0) {
            append({ workerName: newItem.workerName, kg: kgValue });
            setNewItem({ workerName: '', kg: '' });
            setShowAddForm(false);
        } else {
             toast({ title: 'Invalid Quantity', description: 'Please enter a quantity greater than zero.', variant: 'destructive' });
        }
    } else {
        toast({ title: 'Missing Information', description: 'Please enter both worker name and quantity.', variant: 'destructive' });
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="reportDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Report Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                </Popover><FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem><FormLabel>Shift</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a shift" /></SelectTrigger></FormControl>
                    <SelectContent>{SHIFT_OPTIONS.map(shift => (<SelectItem key={shift} value={shift}>{shift}</SelectItem>))}</SelectContent>
                </Select><FormMessage />
                </FormItem>
            )}/>
        </div>
        
        <div>
            <Label>Daily Entries</Label>
            <div className="mt-2 space-y-3 max-h-96 overflow-y-auto pr-2 py-2 border rounded-md min-h-[10rem]">
                 {fields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/50">
                    <div className="flex justify-between items-center">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div><Label className="text-xs text-muted-foreground">Worker</Label><p className="font-medium">{field.workerName}</p></div>
                            <div><Label className="text-xs text-muted-foreground">Quantity</Label><p className="font-medium">{field.kg} kg</p></div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                    </div>
                  </Card>
                ))}
                {fields.length === 0 && !showAddForm && <p className="text-center text-muted-foreground pt-10">No entries added yet. Click the '+' button to start.</p>}
                 {showAddForm && (
                    <Card className="border-primary/50">
                        <CardContent className="p-4 space-y-4">
                            <h4 className="font-medium">Add New Entry</h4>
                            <div><Label>Worker Name</Label><Input placeholder="Enter worker's full name" value={newItem.workerName} onChange={e => setNewItem({...newItem, workerName: e.target.value})} /></div>
                            <div><Label>Quantity (kg)</Label><Input type="number" step="any" placeholder="e.g., 25.5" value={newItem.kg} onChange={e => setNewItem({...newItem, kg: e.target.value})} /></div>
                            <div className="flex gap-2">
                                <Button type="button" onClick={addItem} size="sm">Add Entry</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
             <FormMessage>{form.formState.errors.entries?.message || form.formState.errors.entries?.root?.message}</FormMessage>
        </div>
        
        {!showAddForm && (
            <div className="absolute bottom-20 right-6 md:bottom-10 md:right-10">
                <Button type="button" onClick={() => setShowAddForm(true)} className="rounded-full w-16 h-16 shadow-lg"><PlusCircle className="h-8 w-8" /></Button>
            </div>
        )}

        <div className="pt-4 border-t">
          <Button type="submit" disabled={saveMutation.isPending || fields.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Daily Report"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
