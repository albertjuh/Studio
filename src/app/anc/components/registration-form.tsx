
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { saveAncRegistrationAction } from '@/lib/anc-actions';
import type { AncRegistrationFormValues } from '@/types';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  participantId: z.string().min(3, "Participant ID must be at least 3 characters."),
  name: z.string().min(3, "Participant name is required."),
  age: z.coerce.number().int().min(15, "Participant must be at least 15 years old.").max(50),
  gestationalAge: z.coerce.number().int().min(4, "Gestational age must be at least 4 weeks.").max(42),
  firstAncDate: z.date({ required_error: "First ANC visit date is required."}),
});

export function AncRegistrationForm() {
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<AncRegistrationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            participantId: '',
            name: '',
            age: undefined,
            gestationalAge: undefined,
            firstAncDate: undefined,
        },
    });
    
    const mutation = useMutation({
        mutationFn: saveAncRegistrationAction,
        onSuccess: (result) => {
            if (result.success) {
                toast({ title: "Participant Registered", description: `Participant ${form.getValues('name')} has been enrolled.` });
                form.reset();
                router.push('/anc/dashboard');
            } else {
                 toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
            }
        },
        onError: (error) => {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    });

    const onSubmit = (data: AncRegistrationFormValues) => {
        mutation.mutate(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="participantId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Participant ID</FormLabel>
                            <FormControl>
                                <Input placeholder="Unique Study ID" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Participant's Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Full Name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Age</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Years" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="gestationalAge"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gestational Age</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Weeks" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="firstAncDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>First ANC Visit Date</FormLabel>
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
                 <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Register Participant
                    </Button>
                </div>
            </form>
        </Form>
    );
}
