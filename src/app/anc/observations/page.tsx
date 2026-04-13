
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Eye, 
  CalendarIcon, 
  Clock, 
  Users, 
  CloudRain, 
  MessageSquare, 
  Save, 
  Loader2,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CONTEXT_OPTIONS = [
  "Waiting area interaction",
  "Consultation room observation",
  "Group health education session",
  "Individual counselling",
  "Laboratory/screening area",
  "Exit interview area"
];

const CLIMATE_OPTIONS = [
  "Heat / extreme temperatures mentioned",
  "Flooding / transport barriers",
  "Food insecurity discussed",
  "Air quality concerns",
  "Water access issues",
  "None observed"
];

const BARRIER_OPTIONS = [
  "Long waiting times",
  "Transport / distance",
  "Financial constraints",
  "Partner/family disapproval",
  "Fear of healthcare workers",
  "Language barriers",
  "No barriers observed"
];

const observationSchema = z.object({
  observer_name: z.string().min(1, "Observer name is required."),
  observation_date: z.date({ required_error: "Date is required." }),
  facility: z.string().min(1, "Facility is required."),
  session_start: z.string().min(1, "Start time is required."),
  session_end: z.string().min(1, "End time is required."),
  women_observed: z.coerce.number().min(0, "Cannot be negative."),
  anc_context: z.array(z.string()).min(1, "Select at least one context."),
  climate_themes_observed: z.array(z.string()),
  interaction_quality: z.string().min(1, "Select interaction quality."),
  women_identified_for_idi: z.coerce.number().min(0),
  idi_participant_ids: z.string().optional(),
  field_notes: z.string().min(10, "Provide detailed field notes."),
  barriers_noted: z.array(z.string()),
  reflexivity_notes: z.string().optional(),
  follow_up_required: z.boolean().default(false),
  follow_up_notes: z.string().optional(),
});

type ObservationFormValues = z.infer<typeof observationSchema>;

export default function ObservationsPage() {
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

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      observer_name: '',
      observation_date: new Date(),
      facility: '',
      session_start: '',
      session_end: '',
      women_observed: 0,
      anc_context: [],
      climate_themes_observed: [],
      interaction_quality: '',
      women_identified_for_idi: 0,
      idi_participant_ids: '',
      field_notes: '',
      barriers_noted: [],
      reflexivity_notes: '',
      follow_up_required: false,
      follow_up_notes: '',
    },
  });

  useEffect(() => {
    if (userName) {
      form.setValue('observer_name', userName);
    }
  }, [userName, form]);

  const followUpRequired = form.watch('follow_up_required');

  const mutation = useMutation({
    mutationFn: async (values: ObservationFormValues) => {
      if (!firestore) throw new Error("Connection lost.");
      return addDoc(collection(firestore, 'idi_observations'), {
        ...values,
        observation_date: Timestamp.fromDate(values.observation_date),
        created_at: serverTimestamp(),
        created_by_uid: firebaseUser?.uid || 'anonymous'
      });
    },
    onSuccess: () => {
      toast({ title: "Observation Logged", description: "Field notes have been securely saved.", variant: "success" });
      form.reset({
        ...form.getValues(),
        women_observed: 0,
        women_identified_for_idi: 0,
        idi_participant_ids: '',
        field_notes: '',
        reflexivity_notes: '',
        follow_up_required: false,
        follow_up_notes: '',
        anc_context: [],
        climate_themes_observed: [],
        barriers_noted: []
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (values: ObservationFormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 pt-4">
      <div className="flex items-center gap-4 px-4 md:px-0">
        <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
            <h1 className="text-3xl font-black tracking-tighter">IDI Field Observation Log</h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">Qualitative Study Evidence Capture</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 px-4 md:px-0">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
              {/* Core Logistics */}
              <Card className="border-none shadow-xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 border-b p-8">
                  <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> Session Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="observer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">Observer Name *</FormLabel>
                          <FormControl><Input {...field} className="h-12 rounded-xl border-2" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="observation_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">Observation Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("h-12 rounded-xl border-2 text-left font-medium", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="facility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">Health Facility *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl border-2">
                                <SelectValue placeholder="Select facility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Buza Health Center">Buza Health Center</SelectItem>
                              <SelectItem value="Temeke Regional Referral Hospital">Temeke Regional Referral Hospital</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="session_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">Start Time *</FormLabel>
                          <FormControl><Input type="time" {...field} className="h-12 rounded-xl border-2" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="session_end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">End Time *</FormLabel>
                          <FormControl><Input type="time" {...field} className="h-12 rounded-xl border-2" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Qualitative Observations */}
              <Card className="border-none shadow-xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 border-b p-8">
                  <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Field Observations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest">ANC Context Observed *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CONTEXT_OPTIONS.map((option) => (
                        <FormField
                          key={option}
                          control={form.control}
                          name="anc_context"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-xl bg-muted/30 border-2 border-transparent transition-all hover:bg-muted/50 cursor-pointer">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option])
                                      : field.onChange(field.value?.filter((value) => value !== option))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-bold leading-none cursor-pointer">{option}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                      <CloudRain className="h-3 w-3" /> Climate-Related Themes Observed
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CLIMATE_OPTIONS.map((option) => (
                        <FormField
                          key={option}
                          control={form.control}
                          name="climate_themes_observed"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-xl bg-blue-50/30 border-2 border-transparent transition-all hover:bg-blue-50/50 cursor-pointer">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option])
                                      : field.onChange(field.value?.filter((value) => value !== option))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-bold leading-none cursor-pointer">{option}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="field_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Detailed Field Notes *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe interactions, mood, environment..." 
                            className="min-h-[150px] rounded-[1.5rem] border-2 italic" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-[10px] font-medium">Capture qualitative essence of the session.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Researcher Reflexivity */}
              <Card className="border-none shadow-xl ring-1 ring-border rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 border-b p-8">
                  <CardTitle className="text-xl font-black tracking-tight">Researcher reflexivity</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <FormField
                    control={form.control}
                    name="reflexivity_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Reflexivity Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="How did your presence affect the environment? Any biases?" 
                            className="min-h-[100px] rounded-[1.5rem] border-2" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-8">
              {/* Quantitative Metrics */}
              <Card className="border-none shadow-xl ring-1 ring-border rounded-[2.5rem] bg-muted/20">
                <CardHeader className="p-8 border-b border-white/10">
                  <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Session Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <FormField
                    control={form.control}
                    name="women_observed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Women Observed *</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 rounded-xl border-2 bg-background" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interaction_quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Interaction Quality *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-2 bg-background">
                              <SelectValue placeholder="Select quality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["Excellent", "Good", "Fair", "Poor"].map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 border-t border-dashed">
                    <FormField
                      control={form.control}
                      name="women_identified_for_idi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Identified for IDI Recruitment *</FormLabel>
                          <FormControl><Input type="number" {...field} className="h-12 rounded-xl border-2 border-primary/20 bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action & Submission */}
              <Card className="border-none shadow-xl ring-1 ring-border rounded-[2.5rem] bg-primary text-white">
                <CardContent className="p-8 space-y-6">
                  <FormField
                    control={form.control}
                    name="follow_up_required"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-white/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white">Follow-up Required?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {followUpRequired && (
                    <FormField
                      control={form.control}
                      name="follow_up_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe required actions..." 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-16 rounded-[1.5rem] bg-white text-primary hover:bg-white/90 font-black uppercase tracking-widest text-xs gap-3 shadow-2xl"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Commit Field Log
                  </Button>
                </CardContent>
              </Card>

              <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-dashed border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tighter">
                    Observation Protocol: Notes must be objective and respect healthcare worker privacy. Ensure no PII is recorded in qualitative notes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
