
"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveNyangaReportAction, getNyangaWorkersAction } from '@/lib/nyanga-actions';
import type { NyangaReportFormValues, NyangaReportEntry, NyangaWorker } from '@/types';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarIcon, PlusCircle, Save, Trash2, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SHIFT_OPTIONS } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { FormStepper, FormStep } from '../ui/form-stepper';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';


const reportEntrySchema = z.object({
    workerId: z.string().min(1, "Worker is required."),
    workerName: z.string().min(1, "Worker name is required."),
    firstPassKg: z.coerce.number().nonnegative("Kilograms must be a non-negative number.").default(0),
    secondPassKg: z.coerce.number().nonnegative("Kilograms must be a non-negative number.").default(0),
    kg: z.coerce.number(), // This will be calculated
});

const formSchema = z.object({
    reportDate: z.date({ required_error: "Report date is required." }),
    supervisorId: z.string().min(1, "Supervisor ID is required."),
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
    
    const { data: workers, isLoading: isLoadingWorkers, isError: isErrorWorkers, error: workersError } = useQuery<NyangaWorker[]>({
        queryKey: ['nyangaWorkers'],
        queryFn: getNyangaWorkersAction,
    });

    const form = useForm<NyangaReportFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            reportDate: new Date(),
            supervisorId: typeof window !== 'undefined' ? localStorage.getItem('supervisorName') || '' : '',
            shift: undefined,
            entries: [],
        },
    });

    useEffect(() => {
        const name = localStorage.getItem('supervisorName') || '';
        setSupervisorName(name);
        if (name) {
          form.setValue('supervisorId', name, { shouldValidate: true });
        }
    }, [form]);

    const { isDirty } = form.formState;
    useEffect(() => {
        onFormDirtyChange(isDirty);
    }, [isDirty, onFormDirtyChange]);


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
        // Calculate the total kg for each entry before submitting
        const processedData = {
            ...data,
            entries: data.entries.map(entry => ({
                ...entry,
                kg: (entry.firstPassKg || 0) + (entry.secondPassKg || 0),
            })),
        };
        mutation.mutate(processedData);
    };

    const handleAddEntry = () => {
        append({ workerId: '', workerName: '', firstPassKg: 0, secondPassKg: 0, kg: 0 });
    };

    const handleWorkerChange = (value: string, index: number) => {
        const selectedWorker = workers?.find(w => w.id === value);
        if (selectedWorker) {
            form.setValue(`entries.${index}.workerId`, selectedWorker.id, { shouldValidate: true });
            form.setValue(`entries.${index}.workerName`, selectedWorker.name, { shouldValidate: true });
        }
    };
    
    const currentEntries = form.watch("entries");
    const selectedWorkerIds = currentEntries.map(entry => entry.workerId);

    if (isLoadingWorkers) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Loading worker list...</p>
            </div>
        )
    }

    if (isErrorWorkers) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Workers</AlertTitle>
                <AlertDescription>{(workersError as Error)?.message || "Could not load the list of workers."}</AlertDescription>
            </Alert>
        )
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
                    <div className="space-y-4">
                        <Label>Worker Entries</Label>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                             {fields.map((field, index) => (
                                <Card key={field.id} className="p-4 bg-muted/50">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        <div className="flex-1 space-y-2">
                                            <FormField
                                                control={form.control}
                                                name={`entries.${index}.workerId`}
                                                render={({ field: selectField }) => (
                                                    <FormItem>
                                                        <FormLabel>Worker</FormLabel>
                                                        <Select onValueChange={(value) => handleWorkerChange(value, index)} value={selectField.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select Worker" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {workers?.map(w => (
                                                                    <SelectItem 
                                                                        key={w.id} 
                                                                        value={w.id}
                                                                        disabled={selectedWorkerIds.includes(w.id) && selectField.value !== w.id}
                                                                    >
                                                                        {w.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <div className="grid grid-cols-2 gap-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`entries.${index}.firstPassKg`}
                                                    render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel>1st Pass (kg)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" step="any" placeholder="kg" {...inputField} value={inputField.value === 0 ? '' : inputField.value} onChange={e => inputField.onChange(parseFloat(e.target.value) || 0)} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`entries.${index}.secondPassKg`}
                                                    render={({ field: inputField }) => (
                                                        <FormItem>
                                                            <FormLabel>2nd Pass (kg)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" step="any" placeholder="kg" {...inputField} value={inputField.value === 0 ? '' : inputField.value} onChange={e => inputField.onChange(parseFloat(e.target.value) || 0)} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="w-full sm:w-auto mt-6 sm:mt-6">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                            {fields.length === 0 && <p className="text-center text-muted-foreground py-4">No worker entries yet.</p>}
                        </div>
                        <FormMessage>{form.formState.errors.entries?.message || (form.formState.errors.entries as any)?.root?.message}</FormMessage>
                        <Button type="button" variant="outline" onClick={handleAddEntry}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Worker Entry
                        </Button>
                    </div>
                </FormStep>
                 <FormStep isOptional>
                    <FormField
                        control={form.control}
                        name="supervisorId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supervisor</FormLabel>
                                <FormControl>
                                    <Input readOnly {...field} value={field.value ?? ''} className="bg-muted" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormStep>
            </FormStepper>
        </Form>
    );
}
