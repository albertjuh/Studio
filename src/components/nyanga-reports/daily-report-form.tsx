
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveNyangaReportAction } from '@/lib/nyanga-actions';
import type { NyangaWorker, NyangaReportFormValues } from '@/types';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, PlusCircle, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SHIFT_OPTIONS } from '@/lib/constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const reportEntrySchema = z.object({
    workerId: z.string().min(1, "Worker is required."),
    workerName: z.string().min(1, "Worker name is required."),
    kg: z.coerce.number().positive("Kilograms must be a positive number."),
});

const formSchema = z.object({
    reportDate: z.date({ required_error: "Report date is required." }),
    supervisorId: z.string().min(1),
    shift: z.enum(SHIFT_OPTIONS, { required_error: "Shift is required." }),
    entries: z.array(reportEntrySchema).min(1, "At least one worker entry is required."),
});

interface DailyReportFormProps {
    workers: NyangaWorker[];
    supervisorId: string;
}

export function DailyReportForm({ workers, supervisorId }: DailyReportFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const form = useForm<NyangaReportFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            reportDate: new Date(),
            supervisorId: supervisorId,
            shift: undefined,
            entries: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "entries",
    });
    
    const mutation = useMutation({
        mutationFn: saveNyangaReportAction,
        onSuccess: (result) => {
            if (result.success) {
                toast({ title: "Report Saved", description: `Daily report for ${format(form.getValues('reportDate'), 'PPP')} has been saved.` });
                form.reset();
                form.setValue('reportDate', new Date());
                form.setValue('supervisorId', supervisorId);
                queryClient.invalidateQueries({ queryKey: ['nyangaReports'] });
            } else {
                 toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        },
        onError: (error) => {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    });

    const onSubmit = (data: NyangaReportFormValues) => {
        mutation.mutate(data);
    };

    const handleAddEntry = () => {
        append({ workerId: '', workerName: '', kg: 0 });
    };

    const handleWorkerChange = (value: string, index: number) => {
        const selectedWorker = workers.find(w => w.id === value);
        if (selectedWorker) {
            form.setValue(`entries.${index}.workerId`, selectedWorker.id);
            form.setValue(`entries.${index}.workerName`, selectedWorker.name);
        }
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="reportDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Report Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} /></PopoverContent>
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                                    <SelectContent>{SHIFT_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div>
                    <FormLabel>Worker Entries</FormLabel>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50%]">Worker</TableHead>
                                    <TableHead className="w-[30%]">Kilograms</TableHead>
                                    <TableHead className="w-[20%] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`entries.${index}.workerId`}
                                                render={({ field: selectField }) => (
                                                     <Select onValueChange={(value) => handleWorkerChange(value, index)} value={selectField.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Worker" /></SelectTrigger></FormControl>
                                                        <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`entries.${index}.kg`}
                                                render={({ field: inputField }) => (
                                                    <Input type="number" step="any" placeholder="e.g., 15.5" {...inputField} />
                                                )}
                                            />
                                        </TableCell>
                                         <TableCell className="text-right">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <FormMessage>{form.formState.errors.entries?.message}</FormMessage>
                </div>

                <div className="flex justify-between items-center">
                    <Button type="button" variant="outline" onClick={handleAddEntry}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Worker Entry
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        <Save className="mr-2 h-4 w-4" /> {mutation.isPending ? "Saving..." : "Save Report"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

