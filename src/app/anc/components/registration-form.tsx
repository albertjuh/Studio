
"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, deleteDoc, Timestamp, serverTimestamp, updateDoc } from 'firebase/firestore';
import { HEALTH_FACILITIES, type AuditEntry } from '@/types';
import { useFacilityStatus } from '@/hooks/use-facility-status';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UserPlus, Loader2, PlusCircle, Trash2, Save, History, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { safeParseDate } from '@/lib/timeline/formulas';
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
  nextOfKinName: z.string().min(1, "Next of kin name is required."),
  alternativeContact: z.string().min(10, "Please enter a valid alternative contact number."),
  gestationalAge: z.coerce.number({ required_error: "Gestational age is required." }).int().min(4, "Gestational age must be at least 4 weeks.").max(42),
  firstAncDate: z.date({ required_error: "First ANC visit date is required."}),
  registeredBy: z.string().optional(),
});

type RegistrationFormSchema = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  initialData?: any;
}

export function AncRegistrationForm({ 
  onOpenChange, 
  editMode = false, 
  initialData 
}: RegistrationFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const firestore = useFirestore();
    const [user, setUser] = useState<any>(null);
    const [idExists, setIdExists] = useState(false);
    const [isCheckingId, setIsCheckingId] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

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
            firstAncDate: safeParseDate(initialData?.firstAncDate) || undefined,
        },
    });
    
    const { watch, setValue, control } = form;
    const healthFacilityName = watch('healthFacility');
    const watchedParticipantId = watch('participantId');
    
    const { isFull, enrolled, target, remaining, loading: facilityLoading } = useFacilityStatus(editMode ? null : healthFacilityName || null);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "phoneNumber",
    });

    useEffect(() => {
        const checkIdAvailability = async () => {
            if (!firestore || !watchedParticipantId || watchedParticipantId.length < 5) {
                setIdExists(false);
                return;
            }
            if (editMode && watchedParticipantId === initialData?.participantId) {
                setIdExists(false);
                return;
            }
            setIsCheckingId(true);
            try {
                const snap = await getDoc(doc(firestore, 'anc_registrations', watchedParticipantId));
                setIdExists(snap.exists());
            } catch (e) {
                setIdExists(false);
            } finally {
                setIsCheckingId(false);
            }
        };
        const timer = setTimeout(checkIdAvailability, 500);
        return () => clearTimeout(timer);
    }, [watchedParticipantId, firestore, editMode, initialData?.participantId]);

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormSchema) => {
            if (!firestore) throw new Error("Connection lost.");
            
            // CRITICAL: Ensure staff attribution from active session
            const currentStaff = user?.name || 'Project Staff';
            
            const submissionData: any = {
                ...data,
                phoneNumber: data.phoneNumber.map(p => p.value),
                firstAncDate: Timestamp.fromDate(data.firstAncDate),
                updatedAt: serverTimestamp(),
                registeredBy: editMode ? (initialData?.registeredBy || currentStaff) : currentStaff
            };

            if (editMode && initialData) {
                const changes: any = {};
                ['name', 'age', 'gestationalAge', 'maritalStatus', 'healthFacility', 'nextOfKinName', 'alternativeContact'].forEach(f => {
                    if (initialData[f] !== (submissionData as any)[f]) {
                        changes[f] = { before: initialData[f], after: (submissionData as any)[f] };
                    }
                });
                if (Object.keys(changes).length > 0) {
                    const historyEntry: AuditEntry = { edited_at: Timestamp.now(), edited_by: currentStaff, changes };
                    submissionData.is_edited = true;
                    submissionData.edit_history = [historyEntry, ...(initialData.edit_history || [])];
                }
            }

            if (!editMode) {
                submissionData.createdAt = serverTimestamp();
            } else if (initialData?.createdAt) {
                submissionData.createdAt = initialData.createdAt;
            }

            return setDoc(doc(firestore, 'anc_registrations', data.participantId), submissionData, { merge: true });
        },
        onSuccess: () => {
            toast({ title: editMode ? "Record Updated" : "Registered Successfully", variant: "success" });
            if (onOpenChange) onOpenChange(false);
            else { form.reset(); router.push('/anc/dashboard'); }
        },
        onError: (error: any) => {
            toast({ title: "Failed", description: error.message, variant: "destructive" });
        }
    });

    const onSubmit = (data: RegistrationFormSchema) => {
        if (!editMode && isFull) {
            toast({ title: 'Target Reached', variant: 'destructive' });
            return;
        }
        if (idExists) return;
        mutation.mutate(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="healthFacility"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Health Facility *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                <SelectContent>{HEALTH_FACILITIES.map(f => (<SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>))}</SelectContent>
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
                            <FormControl><Input {...field} className={cn(idExists && "border-rose-500")} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                                <FormLabel>Age *</FormLabel>
                                <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
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
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="gestationalAge"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gestational Age (Wks) *</FormLabel>
                            <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="firstAncDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>First ANC Visit *</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className="text-left font-normal">{field.value ? format(field.value, "PPP") : <span>Pick date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={mutation.isPending || idExists}>
                        {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        {editMode ? "Commit Update" : "Register Participant"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
