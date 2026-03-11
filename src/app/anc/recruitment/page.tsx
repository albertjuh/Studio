
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Trash2, Loader2, ClipboardList, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEALTH_FACILITIES, RECRUITMENT_REASONS } from '@/types';
import { Separator } from '@/components/ui/separator';

const recruitmentSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  facility: z.string().min(1, "Facility is required."),
  providers: z.coerce.number().min(1, "At least 1 provider required."),
  total_anc: z.coerce.number().min(0),
  eligible: z.coerce.number().min(0),
  interviewed: z.coerce.number().min(0),
  reasons: z.array(z.object({
    reason: z.string().min(1, "Reason is required."),
    num_women: z.coerce.number().min(1, "Must be at least 1."),
    notes: z.string().optional(),
  })).min(0),
});

type RecruitmentFormValues = z.infer<typeof recruitmentSchema>;

export default function RecruitmentPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: firebaseUser } = useUser();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserName(user.name);
    }
  }, []);

  const form = useForm<RecruitmentFormValues>({
    resolver: zodResolver(recruitmentSchema),
    defaultValues: {
      date: new Date(),
      facility: '',
      providers: undefined,
      total_anc: undefined,
      eligible: undefined,
      interviewed: undefined,
      reasons: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "reasons",
  });

  const watchAllFields = form.watch();
  
  const eligible = Number(watchAllFields.eligible || 0);
  const interviewed = Number(watchAllFields.interviewed || 0);
  
  const rawMissed = eligible - interviewed;
  const missed = Math.max(0, rawMissed);
  const isOverEnrolled = interviewed > eligible;
  
  const currentReasons = watchAllFields.reasons || [];
  const reasonsTotal = currentReasons.reduce((sum, r) => {
    const val = parseInt(String(r.num_women), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const isFormIncomplete = !watchAllFields.facility || 
                           watchAllFields.providers === undefined || 
                           watchAllFields.total_anc === undefined || 
                           watchAllFields.eligible === undefined || 
                           watchAllFields.interviewed === undefined;

  const hasDiscrepancy = reasonsTotal !== missed || isOverEnrolled;
  const isSubmissionBlocked = hasDiscrepancy || isFormIncomplete;

  const mutation = useMutation({
    mutationFn: async (values: RecruitmentFormValues) => {
      if (!firestore || !firebaseUser) throw new Error("Connection lost. Please refresh.");
      
      const sessionInfo = {
        ra_name: userName || 'Unknown RA',
        ra_uid: firebaseUser.uid,
        date: Timestamp.fromDate(values.date),
        date_string: format(values.date, 'yyyy-MM-dd'),
        facility: values.facility,
        providers: Number(values.providers) || 0,
        total_anc: Number(values.total_anc) || 0,
        eligible: Number(values.eligible) || 0,
        interviewed: Number(values.interviewed) || 0,
        missed: Math.max(0, (Number(values.eligible) || 0) - (Number(values.interviewed) || 0)),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by_uid: firebaseUser.uid,
      };

      const entriesCollection = collection(firestore, 'recruitment_entries');

      if (values.reasons.length === 0) {
        await addDoc(entriesCollection, {
          ...sessionInfo,
          num_women: 0,
          reason: 'None Logged',
          notes: '',
          first_row_flag: 1,
        });
      } else {
        for (let i = 0; i < values.reasons.length; i++) {
          const reason = values.reasons[i];
          await addDoc(entriesCollection, {
            ...sessionInfo,
            num_women: Number(reason.num_women) || 0,
            reason: reason.reason,
            notes: reason.notes || '',
            first_row_flag: i === 0 ? 1 : 0,
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Data Saved", description: "All session details have been logged and synced.", variant: "success" });
      form.reset({
        ...form.getValues(),
        reasons: [],
        providers: undefined,
        total_anc: undefined,
        eligible: undefined,
        interviewed: undefined,
      });
    },
    onError: (error: any) => {
      if (error?.code === "unavailable" || error?.message?.includes("offline") || error?.message?.includes("backend")) {
        toast({ title: "Saved Offline", description: "Data saved locally and will sync when back online.", variant: "default" });
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (values: RecruitmentFormValues) => {
    if (isSubmissionBlocked) {
      const message = isOverEnrolled 
        ? "Interviewed count cannot exceed Eligible count." 
        : isFormIncomplete
        ? "Please fill in all required clinical fields."
        : `Reason breakdown (${reasonsTotal}) must match total missed (${missed}).`;
      
      toast({ 
        title: "Integrity Error", 
        description: message, 
        variant: "destructive" 
      });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-none shadow-xl ring-1 ring-border">
        <CardHeader className="bg-primary/5 rounded-t-xl">
          <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tighter">
            <ClipboardList className="h-6 w-6 text-primary" />
            ANC Recruitment Tracking
          </CardTitle>
          <CardDescription className="font-medium text-muted-foreground">
            Log daily recruitment activity. Ensure all session totals are accurate for reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest">Session Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full h-11 rounded-xl pl-3 text-left font-medium", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest">Health Facility *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl font-medium">
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HEALTH_FACILITIES.map((f) => (
                            <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="providers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest">ANC Providers</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Count" 
                            className="h-11 rounded-xl" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_anc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest">Total ANC Attend.</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Total Women" 
                            className="h-11 rounded-xl" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eligible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest">Eligible (1st Visit)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Eligible Women" 
                            className="h-11 rounded-xl" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interviewed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest">Interviewed</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="Enrolled Women" 
                            className="h-11 rounded-xl" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={cn(
                "p-6 rounded-2xl flex items-center justify-between border border-dashed transition-colors duration-300",
                isSubmissionBlocked ? "bg-rose-50 border-rose-300" : "bg-muted/30 border-slate-300"
              )}>
                <div className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  Total Missed: <span className={cn("text-3xl font-black ml-4", missed > 0 ? "text-rose-600" : "text-slate-500")}>{missed}</span>
                </div>
                {isSubmissionBlocked && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 bg-white/80 px-3 py-2 rounded-lg border border-rose-200 animate-pulse shadow-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {isFormIncomplete ? (
                      <span>Fill all required fields</span>
                    ) : isOverEnrolled ? (
                      <span>Clinical Error: Interviewed exceeds Eligible</span>
                    ) : reasonsTotal < missed ? (
                      <span>Account for remaining {missed - reasonsTotal} women</span>
                    ) : (
                      <span>Excess count: remove {reasonsTotal - missed} women</span>
                    )}
                  </div>
                )}
                {!isSubmissionBlocked && missed > 0 && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    <Info className="h-4 w-4" />
                    Reasons Fully Accounted
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Reasons for Missing</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detail the attrition categories</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-10 rounded-xl font-bold border-2" 
                    onClick={() => append({ reason: '', num_women: undefined as any, notes: '' })}
                    disabled={reasonsTotal >= missed || missed <= 0}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Reason
                  </Button>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-dashed bg-slate-50/50 shadow-none ring-1 ring-slate-200">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`reasons.${index}.reason`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">Reason *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="Select reason" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {RECRUITMENT_REASONS.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`reasons.${index}.num_women`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">Women Count *</FormLabel>
                                  <FormControl>
                                    <Input 
                                        type="number" 
                                        placeholder="Enter Count" 
                                        className="h-10 rounded-xl" 
                                        {...field} 
                                        value={field.value ?? ""} 
                                        onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="mt-7 hover:bg-rose-100 hover:text-rose-600 rounded-xl" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name={`reasons.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Specific Details (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. Woman from outside municipal area..." className="h-10 rounded-xl italic" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  {fields.length === 0 && (
                    <div className="py-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                        <p className="text-sm font-bold text-muted-foreground italic">No missing reasons logged yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-8 border-t">
                {isSubmissionBlocked && (
                  <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    {isFormIncomplete ? (
                      <span>Required Fields Missing: Please ensure Facility, Providers, and all counts are filled.</span>
                    ) : isOverEnrolled ? (
                      <span>Clinical Error: Interviewed count ({interviewed}) cannot be higher than Eligible count ({eligible}).</span>
                    ) : (
                      <span>Integrity Mismatch: You have {missed} missed participants, but have accounted for {reasonsTotal} in the reason logs.</span>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || isSubmissionBlocked} 
                    className={cn(
                      "w-full sm:w-auto h-12 min-w-[240px] rounded-xl font-black uppercase tracking-widest shadow-xl transition-all duration-300",
                      isSubmissionBlocked ? "opacity-50 cursor-not-allowed bg-slate-400" : "shadow-primary/20"
                    )}
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSubmissionBlocked ? "Fill Required Fields to Commit" : "Commit Daily Log"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
