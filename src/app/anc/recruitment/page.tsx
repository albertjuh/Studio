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
import { CalendarIcon, Plus, Trash2, Loader2, ClipboardList, Info, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEALTH_FACILITIES, RECRUITMENT_REASONS } from '@/types';
import Link from 'next/link';

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
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-12 pb-12 pt-2">
      <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
              <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px]">
                  <ClipboardList className="h-4 w-4" /> Tracking Unit
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter">Workload Tracker</h1>
          </div>
          <Button variant="ghost" size="icon" asChild className="rounded-xl h-11 w-11 md:h-8 md:w-8 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-all">
              <Link href="/anc/activities"><X className="h-6 w-6 md:h-4 md:w-4" /></Link>
          </Button>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-2xl md:rounded-[2rem] overflow-hidden bg-white dark:bg-card">
        <CardHeader className="bg-primary/[0.03] border-b p-5 md:p-10">
          <div className="space-y-1 md:space-y-2">
            <CardTitle className="text-xl md:text-2xl font-black tracking-tight leading-none">Daily Clinical Session</CardTitle>
            <CardDescription className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-widest opacity-60">
              Log recruitment activity and detailed attrition drivers.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 md:space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Session Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full h-11 md:h-12 rounded-xl pl-4 text-left font-bold text-sm", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-5 w-5 opacity-40" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-4xl" align="start">
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
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Health Facility *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 md:h-12 rounded-xl font-bold text-sm">
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl shadow-4xl">
                          {HEALTH_FACILITIES.map((f) => (
                            <SelectItem key={f.id} value={f.name} className="text-sm font-bold">{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <FormField
                  control={form.control}
                  name="providers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">ANC Providers</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-11 md:h-12 rounded-xl text-center font-black text-base md:text-lg tabular-nums" 
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
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Attend.</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-11 md:h-12 rounded-xl text-center font-black text-base md:text-lg tabular-nums" 
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
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Eligible (1st)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-11 md:h-12 rounded-xl text-center font-black text-base md:text-lg tabular-nums ring-1 ring-primary/20" 
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
                      <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Enrolled</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-11 md:h-12 rounded-xl text-center font-black text-base md:text-lg tabular-nums ring-1 ring-primary/40 bg-primary/5" 
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
                "p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border-2 border-dashed transition-all duration-300",
                isSubmissionBlocked ? "bg-rose-50 border-rose-200" : "bg-emerald-50/30 border-emerald-200/50"
              )}>
                <div className="text-center md:text-left space-y-1">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Women Missed</p>
                  <div className={cn("text-4xl md:text-5xl font-black tabular-nums leading-none tracking-tighter", missed > 0 ? "text-rose-600" : "text-slate-400")}>{missed}</div>
                </div>
                <div className="mt-6 md:mt-0">
                    {isSubmissionBlocked ? (
                      <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-rose-700 flex items-center gap-3 bg-white px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-sm ring-1 ring-rose-200 animate-pulse">
                        <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                        {isFormIncomplete ? (
                          <span>Incomplete clinical data</span>
                        ) : isOverEnrolled ? (
                          <span>Error: Enrolled &gt; Eligible</span>
                        ) : (
                          <span>Unaccounted: {missed - reasonsTotal} women</span>
                        )}
                      </div>
                    ) : missed > 0 ? (
                      <div className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 flex items-center gap-3 bg-white px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-sm ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                        Reasons Fully Accounted
                      </div>
                    ) : null}
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 md:space-y-1">
                    <h3 className="text-lg md:text-2xl font-black tracking-tight">Attrition Drivers</h3>
                    <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Detail the reasons for missing eligible women</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-10 md:h-11 rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[9px] border-2 shadow-sm active:scale-95 transition-all" 
                    onClick={() => append({ reason: '', num_women: undefined as any, notes: '' })}
                    disabled={reasonsTotal >= missed || missed <= 0}
                  >
                    <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Add Reason
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-none ring-1 ring-border/50 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl md:rounded-3xl overflow-hidden group">
                      <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                        <div className="flex items-start gap-4 md:gap-6">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <FormField
                              control={form.control}
                              name={`reasons.${index}.reason`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Reason *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-10 md:h-11 rounded-xl font-bold text-sm bg-white dark:bg-card border-none ring-1 ring-border/60">
                                        <SelectValue placeholder="Select reason" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl shadow-4xl">
                                      {RECRUITMENT_REASONS.map((r) => (
                                        <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
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
                                  <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Cases *</FormLabel>
                                  <FormControl>
                                    <Input 
                                        type="number" 
                                        placeholder="0" 
                                        className="h-10 md:h-11 rounded-xl text-center font-black text-sm md:text-base bg-white dark:bg-card border-none ring-1 ring-border/60" 
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
                          <Button type="button" variant="ghost" size="icon" className="mt-5 md:mt-6 h-9 w-9 md:h-10 md:w-10 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name={`reasons.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-40">Specific Details (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. Woman from outside municipal area..." className="h-10 md:h-11 rounded-xl italic text-[11px] md:text-xs font-medium bg-white/50 dark:bg-black/10 border-none ring-1 ring-border/40" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  {fields.length === 0 && (
                    <div className="py-12 md:py-24 text-center border-2 border-dashed rounded-[2rem] md:rounded-[3rem] bg-slate-50/50 flex flex-col items-center gap-3 md:gap-4 grayscale opacity-30">
                        <Info className="h-8 w-8 md:h-12 md:w-12 text-slate-300" />
                        <p className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-400">No missing reasons logged</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 md:pt-16 border-t border-dashed flex flex-col gap-4 md:gap-6">
                {isSubmissionBlocked && (
                  <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-rose-50 border border-rose-100 rounded-2xl md:rounded-3xl text-rose-700 text-[11px] md:text-xs font-bold leading-relaxed shadow-inner">
                    <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-black uppercase tracking-widest text-[8px] md:text-[10px]">Data Integrity Warning</p>
                        <p className="opacity-80">
                            {isFormIncomplete ? "Please complete all clinical totals for ANC attendence, providers, and enrollment." : 
                             isOverEnrolled ? `Error: Enrolled count (${interviewed}) cannot exceed identified eligible count (${eligible}).` : 
                             `Reason mismatch: You have ${missed} missed women but have only accounted for ${reasonsTotal} in the driver logs.`}
                        </p>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || isSubmissionBlocked} 
                    className={cn(
                      "w-full md:w-auto h-14 md:h-16 min-w-0 md:min-w-[320px] rounded-xl md:rounded-2xl font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[11px] shadow-2xl transition-all duration-300",
                      isSubmissionBlocked ? "opacity-30 cursor-not-allowed grayscale bg-slate-500" : "shadow-primary/30 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 animate-spin" /> : null}
                    {isSubmissionBlocked ? "Resolve Issues to Commit" : "Commit Session Data"}
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
