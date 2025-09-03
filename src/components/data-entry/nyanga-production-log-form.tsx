
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveNyangaReportAction, getNyangaWorkersAction } from '@/lib/nyanga-actions';
import type { NyangaWorker, NyangaReportFormValues } from '@/types';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, PlusCircle, Save, Trash2, ListChecks, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SHIFT_OPTIONS } from '@/lib/constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FormStepper, FormStep } from '../ui/form-stepper';
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

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

interface NyangaProductionLogFormProps {
    onFormSubmit?: () => void;
    onFormDirtyChange: (isDirty: boolean) => void;
}

export function NyangaProductionLogForm({ onFormSubmit, onFormDirtyChange }: NyangaProductionLogFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [supervisorName, setSupervisorName] = useState('');

    useEffect(() => {
        const name = localStorage.getItem('supervisorName') || '';
        setSupervisorName(name);
    }, []);

    const { data: workers, isLoading: isLoadingWorkers, isError, error } = useQuery<NyangaWorker[]>({
        queryKey: ['nyangaWorkers'],
        queryFn: getNyangaWorkersAction,
    });

    const form = useForm<NyangaReportFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            reportDate: new Date(),
            supervisorId: supervisorName,
            shift: undefined,
            entries: [],
        },
    });
    
    const { isDirty } = form.formState;
    useEffect(() => {
        onFormDirtyChange(isDirty);
    }, [isDirty, onFormDirtyChange]);

    useEffect(() => {
        if (supervisorName) {
            form.setValue('supervisorId', supervisorName);
        }
    }, [supervisorName, form]);

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
                form.setValue('supervisorId', supervisorName);
                queryClient.invalidateQueries({ queryKey: ['nyangaReportsView'] });
                if (onFormSubmit) onFormSubmit();
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
        const selectedWorker = workers?.find(w => w.id === value);
        if (selectedWorker) {
            form.setValue(`entries.${index}.workerId`, selectedWorker.id);
            form.setValue(`entries.${index}.workerName`, selectedWorker.name);
        }
    };
    
    if (isLoadingWorkers) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading worker data...</div>;
    }
    
    if (isError) {
        return <Alert variant="destructive" className="m-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{(error as Error).message}</AlertDescription></Alert>
    }

    return (
        <Form {...form}>
            <FormStepper
                form={form}
                onSubmit={onSubmit}
                isLoading={mutation.isPending}
                submitText="Save Report"
                submitIcon={<Save />}
            >
                <FormStep>
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
                </FormStep>
                <FormStep>
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
                                                        <SelectContent>{(workers || []).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
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
                    <Button type="button" variant="outline" onClick={handleAddEntry} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Worker Entry
                    </Button>
                     <FormMessage>{form.formState.errors.entries?.message || form.formState.errors.entries?.root?.message}</FormMessage>
                </FormStep>
            </FormStepper>
        </Form>
    );
}
