
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNyangaWorkerAction } from '@/lib/nyanga-actions';
import type { AddNyangaWorkerFormValues } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FormStepper, FormStep } from '../ui/form-stepper';
import { UserPlus } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, "Worker name must be at least 3 characters long."),
});

interface AddNyangaWorkerFormProps {
    onFormSubmit?: () => void;
    onFormDirtyChange: (isDirty: boolean) => void;
}

export function AddNyangaWorkerForm({ onFormSubmit, onFormDirtyChange }: AddNyangaWorkerFormProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<AddNyangaWorkerFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
        },
    });

    const mutation = useMutation({
        mutationFn: (name: string) => addNyangaWorkerAction(name),
        onSuccess: (result) => {
            if (result.success) {
                toast({ title: "Worker Added", description: `"${form.getValues('name')}" has been added to the Nyanga team.` });
                form.reset();
                queryClient.invalidateQueries({ queryKey: ['nyangaWorkers'] });
                if (onFormSubmit) onFormSubmit();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        },
        onError: (error) => {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    });

    const onSubmit = (data: AddNyangaWorkerFormValues) => {
        mutation.mutate(data.name);
    };

    return (
        <Form {...form}>
            <FormStepper
                form={form}
                onSubmit={onSubmit}
                isLoading={mutation.isPending}
                submitText="Add Worker"
                submitIcon={<UserPlus />}
            >
                <FormStep>
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Worker's Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter the new worker's full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </FormStep>
            </FormStepper>
        </Form>
    )
}
