
"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { HEALTH_FACILITIES, type AuditEntry } from '@/types';
import { useFacilityStatus } from '@/hooks/use-facility-status';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  CalendarIcon, 
  UserPlus, 
  Loader2, 
  PlusCircle, 
  Trash2, 
  ShieldCheck, 
  Phone, 
  Users, 
  AlertTriangle,
  ChevronRight,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { safeParseDate } from '@/lib/timeline/formulas';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];

const formSchema = z.object({
  healthFacility: z.string().min(1, "Required."),
  participantId: z.string().min(3, "Min 3 chars."),
  name: z.string().min(3, "Required."),
  age: z.coerce.number().int().min(15).max(50),
  maritalStatus: z.string().min(1, "Required."),
  phoneNumber: z.array(z.object({ value: z.string().min(10, "Invalid.") })).min(1, "Required."),
  nextOfKinName: z.string().optional(),
  nextOfKinRelation: z.string().optional(),
  alternativeContact: z.string().optional(),
  gestationalAge: z.coerce.number().int().min(4).max(42),
  firstAncDate: z.date({ required_error: "Required."}),
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

    useEffect(() => {
        const userStr = localStorage.getItem('ancUser');
        if (userStr) setUser(JSON.parse(userStr));
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
            nextOfKinRelation: initialData?.nextOfKinRelation || '',
            alternativeContact: initialData?.alternativeContact || '',
            gestationalAge: initialData?.gestationalAge || undefined,
            firstAncDate: safeParseDate(initialData?.firstAncDate) || undefined,
        },
    });
    
    const { watch, setValue, control } = form;
    const healthFacilityName = watch('healthFacility');
    const watchedParticipantId = watch('participantId');
    
    const { isFull, remaining } = useFacilityStatus(healthFacilityName || null);

    const { fields, append, remove } = useFieldArray({ control, name: "phoneNumber" });

    useEffect(() => {
        if (watchedParticipantId) {
            const scrubbed = watchedParticipantId.toLowerCase().replace(/\s+/g, '');
            if (watchedParticipantId !== scrubbed) setValue('participantId', scrubbed);
        }
    }, [watchedParticipantId, setValue]);

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormSchema) => {
            if (!firestore) throw new Error("Offline.");
            const currentStaff = user?.name || 'Staff';
            const cleanId = data.participantId.trim().toLowerCase().replace(/\s+/g, '');
            const submissionData: any = {
                ...data,
                participantId: cleanId,
                phoneNumber: data.phoneNumber.map(p => p.value),
                firstAncDate: Timestamp.fromDate(data.firstAncDate),
                updatedAt: serverTimestamp(),
                registeredBy: editMode ? (initialData?.registeredBy || currentStaff) : currentStaff,
                createdAt: editMode ? (initialData?.createdAt || serverTimestamp()) : serverTimestamp(),
                survey1_completed: true,
                enrollment_date: editMode ? (initialData?.enrollment_date || serverTimestamp()) : serverTimestamp()
            };
            return setDoc(doc(firestore, 'anc_registrations', cleanId), submissionData, { merge: true });
        },
        onSuccess: () => {
            toast({ title: "Success", variant: "success" });
            if (onOpenChange) onOpenChange(false);
            else router.push('/anc/dashboard');
        }
    });

    const onSubmit = (data: RegistrationFormSchema) => {
        if (!editMode && isFull) {
            toast({ title: 'Full', variant: 'destructive' });
            return;
        }
        mutation.mutate(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-primary/10">
                        <FormField
                            control={form.control}
                            name="healthFacility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase">Facility *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                        <SelectContent>{HEALTH_FACILITIES.map(f => (<SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="participantId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase">ID *</FormLabel>
                                    <FormControl><Input {...field} className="h-9 rounded-lg text-xs font-mono font-bold" /></FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] font-black uppercase">Full Name *</FormLabel>
                                    <FormControl><Input {...field} className="h-9 rounded-lg text-xs" /></FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="age"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase">Age *</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-9 rounded-lg text-xs" /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gestationalAge"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[9px] font-black uppercase">GA (Wks) *</FormLabel>
                                        <FormControl><Input type="number" {...field} className="h-9 rounded-lg text-xs" /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t space-y-4">
                        <Label className="text-[9px] font-black uppercase">Phone *</Label>
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name={`phoneNumber.${index}.value`}
                                    render={({ field }) => (
                                        <FormControl><Input {...field} className="h-9 rounded-lg text-xs font-mono flex-1" /></FormControl>
                                    )}
                                />
                                {fields.length > 1 && <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-500" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={mutation.isPending} className="h-12 px-10 rounded-xl font-black uppercase text-[10px] w-full md:w-auto bg-primary">
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        {editMode ? "Sync Update" : "Enroll Now"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
