
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
import { CalendarIcon, Plus, Trash2, Loader2, ClipboardList, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HEALTH_FACILITIES, RECRUITMENT_REASONS } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      providers: 1,
      total_anc: 0,
      eligible: 0,
      interviewed: 0,
      reasons: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "reasons",
  });

  const { watch } = form;
  const eligible = watch('eligible');
  const interviewed = watch('interviewed');
  const missed = Math.max(0, eligible - interviewed);
  
  const reasonsTotal = watch('reasons')?.reduce((sum, r) => sum + (r.num_women || 0), 0) || 0;
  const showMissedWarning = reasonsTotal !== missed && missed > 0;

  const mutation = useMutation({
    mutationFn: async (values: RecruitmentFormValues) => {
      if (!firestore || !firebaseUser) throw new Error("Connection lost. Please refresh.");
      
      const sessionInfo = {
        ra_name: userName,
        ra_uid: firebaseUser.uid,
        date: Timestamp.fromDate(values.date),
        date_string: format(values.date, 'yyyy-MM-dd'),
        facility: values.facility,
        providers: values.providers,
        total_anc: values.total_anc,
        eligible: values.eligible,
        interviewed: values.interviewed,
        missed: values.eligible - values.interviewed,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by_uid: firebaseUser.uid,
      };

      const entriesCollection = collection(firestore, 'recruitment_entries');

      if (values.reasons.length === 0) {
        // No reasons logged - create one workload doc with first_row_flag: 1
        await addDoc(entriesCollection, {
          ...sessionInfo,
          num_women: 0,
          reason: 'None Logged',
          notes: '',
          first_row_flag: 1,
        });
      } else {
        // Create multiple docs, but mark the first as the primary workload row for KPIs
        for (let i = 0; i < values.reasons.length; i++) {
          const reason = values.reasons[i];
          await addDoc(entriesCollection, {
            ...sessionInfo,
            num_women: reason.num_women,
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
        total_anc: 0,
        eligible: 0,
        interviewed: 0,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (values: RecruitmentFormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            ANC Recruitment Tracking
          </CardTitle>
          <CardDescription>
            Log daily recruitment activity. Ensure all session totals are accurate for reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Session Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                      <FormLabel>Health Facility *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>ANC Providers</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Total ANC Attend.</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Eligible (1st Visit)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Interviewed</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between">
                <div className="text-sm font-medium">
                  Total Missed: <span className="text-destructive text-lg ml-2">{missed}</span>
                </div>
                {showMissedWarning && (
                  <div className="text-xs text-amber-600 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Reasons count ({reasonsTotal}) doesn't match missed ({missed})
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Reasons for Missing</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ reason: '', num_women: 1, notes: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Reason
                  </Button>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-dashed">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`reasons.${index}.reason`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Reason *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
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
                                  <FormLabel>Number of Women *</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name={`reasons.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Specific details..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto min-w-[200px]">
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Daily Log
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
