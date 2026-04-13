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
    
    const { isFull, enrolled, remaining, loading: facilityLoading } = useFacilityStatus(healthFacilityName || null);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "phoneNumber",
    });

    // Auto-prefix logic
    useEffect(() => {
        if (!healthFacilityName || editMode) return;
        
        const facility = HEALTH_FACILITIES.find(f => f.name === healthFacilityName);
        if (facility) {
            const prefix = `${facility.id}_`;
            const currentVal = form.getValues('participantId');
            
            // Only update if it doesn't already have a valid study prefix
            const hasExistingPrefix = HEALTH_FACILITIES.some(f => currentVal.startsWith(`${f.id}_`));
            
            if (!hasExistingPrefix || !currentVal.startsWith(prefix)) {
                setValue('participantId', prefix);
            }
        }
    }, [healthFacilityName, editMode, setValue]);

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
                submissionData.survey1_completed = true;
                submissionData.enrollment_date = serverTimestamp();
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
            toast({ title: 'Target Reached', description: "This site has already met its recruitment target.", variant: 'destructive' });
            return;
        }
        if (idExists) return;
        mutation.mutate(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-12">
                {/* 1. Facility & Identification Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Study Logistics</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-muted/30 border-2 border-dashed border-primary/10">
                        <FormField
                            control={form.control}
                            name="healthFacility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest flex items-center justify-between">
                                        Health Facility *
                                        {!editMode && healthFacilityName && remaining !== null && (
                                            <Badge variant="outline" className={cn(
                                                "ml-2 text-[9px] font-black border-none",
                                                remaining > 5 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700 animate-pulse"
                                            )}>
                                                {remaining} spots remaining
                                            </Badge>
                                        )}
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 rounded-xl border-2 bg-background font-medium">
                                                <SelectValue placeholder="Select facility..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {HEALTH_FACILITIES.map(f => (<SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>))}
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
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest">Participant ID *</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            placeholder="e.g. BZ-001" 
                                            className={cn(
                                                "h-12 rounded-xl border-2 bg-background font-mono font-bold", 
                                                idExists && "border-rose-500 bg-rose-50"
                                            )} 
                                        />
                                    </FormControl>
                                    {idExists && <p className="text-[10px] font-black text-rose-600 uppercase mt-1 animate-shake">This ID already exists in the study registry</p>}
                                    <FormDescription className="text-[10px] font-medium italic">Format: site_code_number (e.g. buza_hc_001)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* 2. Demographic Information */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Participant Demographics</h3>
                    </div>
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest">Full Name *</FormLabel>
                                    <FormControl><Input {...field} placeholder="Enter participant full name..." className="h-12 rounded-xl border-2" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="age"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest">Age *</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} className="h-12 rounded-xl border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maritalStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest">Marital Status *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                            <SelectContent>{MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Contact Intelligence */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <Phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Contact Intelligence</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest">Primary Phone Number(s) *</Label>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`phoneNumber.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <Input {...field} placeholder="+255..." className="h-12 rounded-xl border-2 font-mono" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {fields.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => remove(index)}>
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="rounded-xl font-bold gap-2 h-10 border-2" onClick={() => append({ value: '' })}>
                                <PlusCircle className="h-4 w-4" /> Add Secondary Phone
                            </Button>
                        </div>

                        <Separator className="bg-border/50" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="nextOfKinName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest">Next of Kin Name *</FormLabel>
                                        <FormControl><Input {...field} placeholder="Full name..." className="h-12 rounded-xl border-2" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="alternativeContact"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase tracking-widest">Next of Kin Contact *</FormLabel>
                                        <FormControl><Input {...field} placeholder="Phone number..." className="h-12 rounded-xl border-2 font-mono" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Clinical Baseline */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Clinical Baseline</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="gestationalAge"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest">Gestational Age (Wks) *</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value))} className="h-12 rounded-xl border-2" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="firstAncDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-xs font-bold uppercase tracking-widest">First ANC Visit Date *</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="h-12 rounded-xl border-2 text-left font-bold bg-background">
                                                    {field.value ? format(field.value, "PPP") : <span className="text-muted-foreground">Pick date...</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-primary" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 pt-8 border-t">
                    <div className="bg-primary/5 p-5 rounded-[1.5rem] flex items-start gap-4 border-2 border-dashed border-primary/10">
                        <AlertTriangle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                            By registering this participant, you confirm that she resides within the Temeke municipal area and has provided informed consent for follow-up data collection. This entry will be attributed to <span className="text-primary font-black">{user?.name || 'Project Staff'}</span>.
                        </p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="lg" disabled={mutation.isPending || idExists} className="h-16 px-12 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90">
                            {mutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                            {editMode ? "Commit Clinical Update" : "Enroll Participant"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
