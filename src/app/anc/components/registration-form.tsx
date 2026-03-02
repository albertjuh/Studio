
"use client";

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { HEALTH_FACILITIES } from '@/types';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UserPlus, Loader2, PlusCircle, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

const formSchema = z.object({
  healthFacility: z.string().min(1, "Health facility is required."),
  participantId: z.string().min(3, "Participant ID must be at least 3 characters."),
  name: z.string().min(3, "Participant name is required."),
  age: z.coerce.number().int().min(15, "Participant must be at least 15 years old.").max(50),
  maritalStatus: z.string().min(1, "Marital status is required."),
  phoneNumber: z.array(z.object({ value: z.string().min(10, "Please enter a valid phone number.") })).min(1, "At least one phone number is required."),
  nextOfKinName: z.string().optional(),
  alternativeContact: z.string().optional(),
  gestationalAge: z.coerce.number({ required_error: "Gestational age is required." }).int().min(4, "Gestational age must be at least 4 weeks.").max(42),
  firstAncDate: z.date({ required_error: "First ANC visit date is required."}),
  registeredBy: z.string().optional(),
}).refine(data => {
    if (!data.healthFacility) return true;
    const selectedFacility = HEALTH_FACILITIES.find(f => f.name === data.healthFacility);
    if (selectedFacility) {
        const prefix = `${selectedFacility.id}_`;
        return data.participantId.length > prefix.length;
    }
    return true;
}, {
    message: "Please enter the unique ID suffix after the facility prefix.",
    path: ["participantId"],
});

type RegistrationFormSchema = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  initialData?: any;
}

/**
 * Safely converts various date-like inputs (Date, ISO string, Firestore Timestamp) to a Date object.
 */
const safeParseDate = (dateVal: any): Date | undefined => {
  if (!dateVal) return undefined;
  if (dateVal instanceof Date) return dateVal;
  // Handle Firestore Timestamp objects
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  const parsed = new Date(dateVal);
  return isValid(parsed) ? parsed : undefined;
};

export function AncRegistrationForm({ 
  onOpenChange, 
  editMode = false, 
  initialData 
}: RegistrationFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();

    const form = useForm<RegistrationFormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            healthFacility: initialData?.healthFacility || '',
            participantId: initialData?.participantId || '',
            name: initialData?.name || '',
            age: initialData?.age || undefined,
            maritalStatus: initialData?.maritalStatus || '',
            phoneNumber: Array.isArray(initialData?.phoneNumber) 
                ? initialData.phoneNumber.map((p: string) => ({ value: p })) 
                : [{ value: '' }],
            nextOfKinName: initialData?.nextOfKinName || '',
            alternativeContact: initialData?.alternativeContact || '',
            gestationalAge: initialData?.gestationalAge || undefined,
            firstAncDate: safeParseDate(initialData?.firstAncDate),
        },
    });
    
    const { watch, setValue, control } = form;
    const healthFacilityName = watch('healthFacility');

    const { fields, append, remove } = useFieldArray({
        control,
        name: "phoneNumber",
    });

    useEffect(() => {
        if (!editMode || (initialData?.healthFacility && healthFacilityName !== initialData.healthFacility)) {
            const selectedFacility = HEALTH_FACILITIES.find(f => f.name === healthFacilityName);
            if (selectedFacility) {
                const prefix = `${selectedFacility.id}_`;
                const currentId = form.getValues('participantId');
                if (!currentId.startsWith(prefix)) {
                    setValue('participantId', prefix, { shouldValidate: true });
                }
            }
        }
    }, [healthFacilityName, setValue, editMode, initialData?.healthFacility, form]);

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormSchema) => {
            if (!firestore) throw new Error("Firestore not available");
            
            if (editMode && initialData?.participantId && data.participantId !== initialData.participantId) {
                const oldDocRef = doc(firestore, 'anc_registrations', initialData.participantId);
                await deleteDoc(oldDocRef).catch(err => {
                    console.error("Failed to delete old record during ID rename:", err);
                    throw new Error("Could not update ID. You might not have permission to delete the old record.");
                });
            }

            const docRef = doc(firestore, 'anc_registrations', data.participantId);

            if (!editMode) {
                try {
                    const existingDoc = await getDoc(docRef);
                    if (existingDoc.exists()) {
                        throw new Error("Participant with ID " + data.participantId + " already exists.");
                    }
                } catch (e: any) {
                    if (e.message && e.message.includes("already exists")) throw e;
                }
            }
            
            const userStr = localStorage.getItem('ancUser');
            const user = userStr ? JSON.parse(userStr) : null;
            
            const submissionData = {
                ...data,
                phoneNumber: data.phoneNumber.map(p => p.value),
                firstAncDate: Timestamp.fromDate(data.firstAncDate),
                updatedAt: Timestamp.now(),
                registeredBy: editMode ? (initialData?.registeredBy || 'Unknown User') : (user?.name || 'Unknown User')
            };

            if (!editMode) {
                (submissionData as any).createdAt = Timestamp.now();
            } else if (initialData?.createdAt) {
                (submissionData as any).createdAt = initialData.createdAt;
            }

            return setDoc(docRef, submissionData, { merge: true })
                .catch(async (serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: editMode ? 'update' : 'create',
                        requestResourceData: submissionData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw serverError;
                });
        },
        onSuccess: () => {
            toast({ 
                title: editMode ? "Update Successful" : "Registration Queued", 
                description: editMode 
                    ? `Details for ${form.getValues('name')} updated.` 
                    : `Data for ${form.getValues('name')} saved.`, 
                variant: "success" 
            });
            
            if (onOpenChange) {
                onOpenChange(false);
            } else {
                form.reset();
                router.push('/anc/dashboard');
            }
        },
        onError: (error) => {
            if ((error as any)?.code === "unavailable" || (error as any)?.message?.includes("offline") || (error as any)?.message?.includes("backend")) {
                toast({ title: "Saved Offline", description: "Data saved locally and will sync when back online.", variant: "default" });
                return;
            }
            if (!(error instanceof FirestorePermissionError)) {
                toast({ title: "Operation Failed", description: (error as Error).message, variant: "destructive" });
            }
        }
    });

    const onSubmit = (data: RegistrationFormSchema) => {
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
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                    >
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
                                        <Input 
                                            placeholder="Select a facility to auto-fill prefix" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Please type the unique suffix after the facility prefix (e.g., temeke_rrh_<strong>123</strong>).
                                    </FormDescription>
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
                                        name={`phoneNumber.${index}.value`}
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
                                onClick={() => append({ value: '' })}
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
                                        <FormLabel>Gestational Age *</FormLabel>
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
                                        <FormLabel>First ANC Visit Date *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value && isValid(new Date(field.value)) ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
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
                        {mutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : editMode ? (
                            <Save className="mr-2 h-4 w-4" />
                        ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {editMode ? "Save Changes" : "Register Participant"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
