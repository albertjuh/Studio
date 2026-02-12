
"use client";

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { CalendarIcon, UserPlus, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HEALTH_FACILITIES = [
    { id: 'changombe_disp', name: 'Changombe Dispensary (Zone A)' },
    { id: 'keko_mwanga_disp', name: 'Keko Mwanga Dispensary (Zone A)' },
    { id: 'sandali_disp', name: 'Sandali Dispensary (Zone A)' },
    { id: 'kilakala_hc', name: 'Kilakala Health Center (Zone A)' },
    { id: 'yombo_vituka_hc', name: 'Yombo Vituka Health Center (Zone A)' },
    { id: 'buza_hc', name: 'Buza Health Center (Zone A)' },
    { id: 'sigara_disp', name: 'Sigara Dispensary (Zone A)' },
    { id: 'makangarawe_disp', name: 'Makangarawe Dispensary (Zone A)' },
    { id: 'mikwambe_disp', name: 'Mikwambe Dispensary (Zone B)' },
    { id: 'toangoma_disp', name: 'Toangoma Dispensary (Zone B)' },
    { id: 'goroka_hc', name: 'Goroka Health Center (Zone B)' },
    { id: 'kichemchem_disp', name: 'Kichemchem Dispensary (Zone B)' },
    { id: 'mbagala_kuu_disp', name: 'Mbagala Kuu Dispensary (Zone B)' },
    { id: 'kurasini_disp', name: 'Kurasini Dispensary (Zone B)' },
    { id: 'mbagala_rangi_tatu_hosp', name: 'Mbagala Rangi Tatu Hospital (Zone B)' },
    { id: 'kijichi_hc', name: 'Kijichi Health Center (Zone B)' },
    { id: 'mbagala_roundtable_hc', name: 'Mbagala Roundtable Health Center (Zone C)' },
    { id: 'mbagala_kizuiani_disp', name: 'Mbagala Kizuiani Dispensary (Zone C)' },
    { id: 'mtoni_disp', name: 'Mtoni Dispensary (Zone C)' },
    { id: 'tambukareli_disp', name: 'Tambukareli Dispensary (Zone C)' },
    { id: 'mzinga_disp', name: 'Mzinga Dispensary (Zone C)' },
    { id: 'temeke_rrh', name: 'Temeke Regional Referral Hospital (Zone C)' },
    { id: 'miburani_disp', name: 'Miburani Dispensary (Zone C)' },
    { id: 'thandika_disp', name: 'Tandika Dispensary (Zone C)' },
    { id: 'mkodogwa_hc', name: 'Mkodogwa Health Center (Zone D)' },
    { id: 'maji_matitu_hc', name: 'Maji Matitu Health Center (Zone D)' },
    { id: 'mbande_hc', name: 'Mbande Health Center (Zone D)' },
    { id: 'charambe_disp', name: 'Charambe Dispensary (Zone D)' },
    { id: 'chamazi_disp', name: 'Chamazi Dispensary (Zone D)' },
    { id: 'kingugi_disp', name: 'Kingugi Dispensary (Zone D)' },
    { id: 'kilungule_disp', name: 'Kilungule Dispensary (Zone D)' },
];


const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

const formSchema = z.object({
  healthFacility: z.string().min(1, "Health facility is required."),
  participantId: z.string().min(3, "Participant ID must be at least 3 characters."),
  name: z.string().min(3, "Participant name is required."),
  age: z.coerce.number().int().min(15, "Participant must be at least 15 years old.").max(50),
  maritalStatus: z.string().min(1, "Marital status is required."),
  phoneNumber: z.array(z.string().min(10, "Please enter a valid phone number.")).min(1, "At least one phone number is required."),
  nextOfKinName: z.string().optional(),
  alternativeContact: z.string().optional(),
  gestationalAge: z.coerce.number().int().min(4, "Gestational age must be at least 4 weeks.").max(42),
  firstAncDate: z.date({ required_error: "First ANC visit date is required."}),
});

export function AncRegistrationForm() {
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<AncRegistrationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            healthFacility: '',
            participantId: '',
            name: '',
            age: undefined,
            maritalStatus: '',
            phoneNumber: [''],
            nextOfKinName: '',
            alternativeContact: '',
            gestationalAge: undefined,
            firstAncDate: undefined,
        },
    });
    
    const { watch, setValue, control } = form;
    const healthFacilityName = watch('healthFacility');

    const { fields, append, remove } = useFieldArray({
        control,
        name: "phoneNumber",
    });

    useEffect(() => {
        const selectedFacility = HEALTH_FACILITIES.find(f => f.name === healthFacilityName);
        if (selectedFacility) {
            setValue('participantId', `${selectedFacility.id}_`, { shouldValidate: true });
        }
    }, [healthFacilityName, setValue]);

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div>
                    <h3 className="text-lg font-medium">Participant Identification</h3>
                    <Separator className="my-2" />
                    <div className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="healthFacility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Health Facility *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select facility..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {HEALTH_FACILITIES.map(f => (
                                                <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="participantId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Participant ID *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Select a facility to auto-fill prefix" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                 <div>
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    <Separator className="my-2" />
                    <div className="space-y-4 pt-2">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Participant's full name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="age"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Age * (15-50)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Years" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="maritalStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marital Status *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <FormLabel>Phone Number *</FormLabel>
                            <div className="space-y-2 mt-2">
                                {fields.map((field, index) => (
                                    <FormField
                                        control={form.control}
                                        name={`phoneNumber.${index}`}
                                        key={field.id}
                                        render={({ field: itemField }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Input {...itemField} placeholder="e.g., 0712345678" />
                                                        {fields.length > 1 ? (
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                             <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => append('')}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Phone Number
                            </Button>
                            {form.formState.errors.phoneNumber?.root && <FormMessage className="mt-2">{form.formState.errors.phoneNumber.root.message}</FormMessage>}
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nextOfKinName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Next of Kin Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Full name of next of kin" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="alternativeContact"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alternative Contact Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Next of kin phone number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium">Clinical Information</h3>
                    <Separator className="my-2" />
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        </div>
                    </div>
                </div>

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

    