
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveNyangaReportAction } from '@/lib/nyanga-actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, CalendarIcon } from 'lucide-react';
import type { NyangaReportFormValues, NyangaWorker } from '@/types';
import { SHIFT_OPTIONS } from '@/lib/constants';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const entrySchema = z.object({
  workerId: z.string(),
  workerName: z.string(),
  kg: z.coerce.number().min(0, "Kg cannot be negative.").default(0),
});

const reportSchema = z.object({
  reportDate: z.date(),
  supervisorId: z.string(),
  shift: z.enum(SHIFT_OPTIONS),
  entries: z.array(entrySchema),
});

interface DailyReportFormProps {
  workers: NyangaWorker[];
  supervisorId: string;
}

export function DailyReportForm({ workers, supervisorId }: DailyReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeWorkers = workers.filter(w => w.status === 'active');

  const form = useForm<NyangaReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date(),
      supervisorId: supervisorId,
      shift: 'Day A',
      entries: activeWorkers.map(w => ({ workerId: w.id, workerName: w.name, kg: 0 })),
    },
  });
  
  const { fields } = useFieldArray({
    control: form.control,
    name: "entries",
  });
  
  const saveMutation = useMutation({
    mutationFn: saveNyangaReportAction,
    onSuccess: (result) => {
        if (result.success) {
            toast({ title: 'Report Saved', description: `Production for ${format(form.getValues('reportDate'), 'PPP')} has been recorded.` });
            form.reset({
                reportDate: new Date(),
                supervisorId: supervisorId,
                shift: 'Day A',
                entries: activeWorkers.map(w => ({ workerId: w.id, workerName: w.name, kg: 0 })),
            });
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
  
  if (activeWorkers.length === 0) {
    return <p className="text-center text-muted-foreground p-4">Please add workers to the list to start recording daily reports.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reportDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Report Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
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
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
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
                name="shift"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a shift" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {SHIFT_OPTIONS.map(shift => (
                            <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <FormField
              key={field.id}
              control={form.control}
              name={`entries.${index}.kg`}
              render={({ field: f }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>{(form.getValues(`entries.${index}.workerName`))}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                         <Input 
                            type="number"
                            step="any"
                            className="w-28 text-right"
                            placeholder="0.0"
                            {...f} 
                          />
                         <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
        
        <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Daily Report
            </Button>
        </div>
      </form>
    </Form>
  );
}
