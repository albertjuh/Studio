
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp, addDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Baby, 
  Phone, 
  ClipboardList, 
  ShieldCheck, 
  Clock, 
  Activity,
  User,
  CheckCircle2,
  CalendarIcon,
  AlertCircle,
  Target,
  ChevronRight,
  Loader2,
  Pencil
} from 'lucide-react';
import { format, isValid, formatDistanceToNow } from 'date-fns';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses, safeParseDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IdBadge } from '@/app/anc/components/id-badge';
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AncRegistrationForm } from "@/app/anc/components/registration-form";

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedSurveyToLog, setSelectedSurveyToLog] = useState<number>(2);
  const [surveyCompletionStatus, setSurveyCompletionStatus] = useState<'complete' | 'incomplete'>('incomplete');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [contactNotes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryOutcome, setDeliveryOutcome] = useState<'live_birth' | 'stillbirth' | 'other'>('live_birth');
  const [markS3CompleteOnDelivery, setMarkS3CompleteOnDelivery] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUserRole(JSON.parse(userStr).role);
    }
  }, []);

  const isViewer = userRole === 'viewer';
  const isAdmin = userRole === 'admin';
  
  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'anc_registrations', id);
  }, [firestore, id]);

  const { data: p, isLoading } = useDoc<AncRegistration>(docRef);

  // RECOVERY ENGINE: If direct ID lookup fails, perform an in-memory search across the registry.
  // This handles trailing spaces and case mismatches in legacy entries.
  const recoveryQuery = useMemoFirebase(() => {
    if (!firestore || !isLoading && p) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore, isLoading, p]);

  const { data: allRegs, isLoading: isRecoveryLoading } = useCollection<AncRegistration>(recoveryQuery);

  const activeP = useMemo(() => {
    if (p) return p;
    if (!allRegs || !id) return null;
    
    const normalizedId = id.trim().toLowerCase();
    // Try to find a match by normalized document ID or normalized participantId field
    return allRegs.find(reg => 
      reg.id.trim().toLowerCase() === normalizedId || 
      reg.participantId?.trim().toLowerCase() === normalizedId
    ) || null;
  }, [p, allRegs, id]);

  const isTrulyLoading = isLoading || (p === null && isRecoveryLoading);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !activeP?.id) return null;
    return query(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), orderBy('created_at', 'desc'));
  }, [firestore, activeP?.id]);

  const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);

  const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? { diagnostics: { missingGA: false, invalidDate: false }, overall_status: "unknown", delivery_status: "unknown" }) : null, [activeP]);

  const handleLogContactSubmit = async () => {
    if (!firestore || !activeP?.id || isViewer) return;
    setIsSubmitting(true);

    try {
        const updateData: any = {
            last_contact_date: serverTimestamp()
        };

        if (surveyCompletionStatus === 'complete') {
            updateData[`survey${selectedSurveyToLog}_completed`] = true;
            updateData[`survey${selectedSurveyToLog}_status`] = 'completed';
        }

        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);

        const eventData: any = {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            survey_number: selectedSurveyToLog,
            notes: contactNotes || (surveyCompletionStatus === 'complete' ? `Survey ${selectedSurveyToLog} successfully completed.` : `Follow-up contact for Survey ${selectedSurveyToLog} made.`),
            created_at: serverTimestamp(),
            status_outcome: surveyCompletionStatus
        };

        if (surveyCompletionStatus === 'incomplete' && reminderDate) {
            eventData.reminder_date = Timestamp.fromDate(reminderDate);
            eventData.event_type = 'reminder_set';
            eventData.notes = `${contactNotes ? contactNotes + ' ' : ''}Follow-up set for ${format(reminderDate, 'PPP')}.`;
        }

        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), eventData);
        toast({ title: "Contact Logged", variant: "success" });
        setIsContactDialogOpen(false);
        setSurveyCompletionStatus('incomplete');
        setReminderDate(undefined);
        setNotes('');
    } catch (e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRecordDelivery = async () => {
    if (!firestore || !activeP?.id || isViewer || !deliveryDate) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {
        delivery_date_confirmed: true,
        delivery_date: Timestamp.fromDate(deliveryDate),
        delivery_outcome: deliveryOutcome,
        last_updated: serverTimestamp(),
      };

      if (markS3CompleteOnDelivery) {
        updateData.survey3_completed = true;
        updateData.survey3_status = 'completed';
        updateData.survey4_status = 'pending';
        updateData.overall_status = 'on_track';
      }

      await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);

      await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), {
        event_type: 'delivery_recorded',
        event_date: Timestamp.fromDate(deliveryDate),
        notes: deliveryNotes || `Delivery recorded. Outcome: ${deliveryOutcome.replace('_', ' ')}. ${markS3CompleteOnDelivery ? 'Survey 3 marked complete.' : 'Survey 3 pending manual completion.'}`,
        created_at: serverTimestamp(),
        status_outcome: deliveryOutcome,
      });

      toast({ title: "Delivery Recorded", variant: "success" });
      setIsDeliveryDialogOpen(false);
      setDeliveryNotes('');
      setDeliveryDate(new Date());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTrulyLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Timeline Intelligence...</p>
    </div>
  );

  if (!activeP) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-12 w-12 text-rose-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Participant Not Found</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">The ID <span className="font-mono font-bold text-foreground">"{id}"</span> does not exist in the registry.</p>
            <p className="text-[10px] text-muted-foreground italic mt-2 uppercase font-black">Registry was checked for exact and normalized matches.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl font-bold border-2">
            <Link href="/anc/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Registry</Link>
        </Button>
    </div>
  );

  if (!resolvedP || !resolvedP.isValid) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="p-6 bg-amber-50 rounded-full">
            <AlertCircle className="h-12 w-12 text-amber-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Clinical Data Integrity Issue</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
                {resolvedP?.diagnostics?.missingGA ? "Missing or zero Gestational Age at enrollment." : 
                 resolvedP?.diagnostics?.invalidDate ? "The enrollment or creation date format is invalid." : 
                 "Essential metrics required for timeline projection are missing."}
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="rounded-xl font-bold border-2 h-12">
                <Link href="/anc/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Registry</Link>
            </Button>
            <Button 
                variant="secondary" 
                className="rounded-xl font-black uppercase tracking-widest text-[10px] px-8 h-12 gap-2"
                onClick={() => setIsEditingProfile(true)}
            >
                <Pencil className="h-3.5 w-3.5" /> Find & Correct Record
            </Button>
        </div>

        {isEditingProfile && (
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                    <DialogHeader className="p-8 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100">
                        <DialogTitle className="text-xl font-black text-amber-900">Correct Clinical Record</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase text-amber-700/60">Resolve integrity issues for ID: {activeP.participantId}</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 overflow-y-auto max-h-[80vh]">
                        <AncRegistrationForm editMode={true} initialData={activeP} onOpenChange={(open) => !open && setIsEditingProfile(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        )}
    </div>
  );

  const rawEnrollDate = safeParseDate(activeP.enrollment_date || activeP.createdAt || activeP.firstAncDate);
  const enrollDate = rawEnrollDate || new Date();
  const ga = resolvedP.current_ga;
  const edd = resolvedP.edd;
  const trimester = resolvedP.current_trimester;
  const progress = Math.min(100, (ga.weeks / 40) * 100);

  const safeFormatDate = (dateVal: any) => {
    const d = safeParseDate(dateVal);
    if (!d || !isValid(d)) return 'Pending';
    return format(d, 'PPP');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 md:px-0 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">{activeP.name}</h1>
                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <IdBadge id={activeP.participantId} hideLabel />
                    {activeP.id.trim() !== activeP.participantId.trim() && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-black uppercase px-2 py-0.5 animate-pulse">Recovered</Badge>
                    )}
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span>{activeP.healthFacility}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {isAdmin && (
                <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold border-2 gap-2" onClick={() => setIsEditingProfile(true)}>
                    <Pencil className="h-4 w-4" /> Edit Profile
                </Button>
            )}
            <Badge className={cn(
                "rounded-xl font-black px-4 py-2 uppercase tracking-widest text-[10px] border-none shadow-lg",
                resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : 
                resolvedP.overall_status === 'action_needed' ? "bg-emerald-600 text-white" :
                "bg-primary text-white"
            )}>
                Status: {resolvedP.overall_status.replace('_', ' ')}
            </Badge>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black tracking-tighter">Pregnancy Journey</CardTitle>
                        <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Automatic Clinical Tracking Engine</CardDescription>
                    </div>
                    <Badge className="bg-background text-primary border-primary/20 font-black px-4 py-1 rounded-xl text-xs">
                        {ga.weeks}+{ga.days} Wks • Trimester {trimester}
                    </Badge>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Enrolled ({activeP.gestationalAge}wk)</span>
                        <span className="text-primary">Current GA ({ga.weeks}+{ga.days}wk)</span>
                        <span>Term (40wk)</span>
                    </div>
                    <div className="relative pt-4">
                        <Progress value={progress} className="h-4 rounded-full bg-muted/50" />
                        <div className="absolute top-0 flex flex-col items-center transition-all duration-500" style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}>
                            <div className="h-8 w-px bg-primary border-dashed" />
                            <Baby className="h-5 w-5 text-primary bg-background rounded-full p-0.5 ring-4 ring-primary/10" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Enrollment</p>
                            <p className="text-xs font-bold">{safeFormatDate(enrollDate)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-primary uppercase">Estimated EDD</p>
                            <p className="text-sm font-black text-primary">{safeFormatDate(edd)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Study Site</p>
                            <p className="text-xs font-bold truncate max-w-[120px]">{activeP.healthFacility.split(' (')[0]}</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { num: 1, label: 'Enrollment', date: enrollDate, done: true },
                        { num: 2, label: '34-38 Weeks', date: resolvedP.survey2_target_date, status: resolvedP.survey2_status, done: resolvedP.survey2_completed },
                        { num: 3, label: 'Delivery Records', date: resolvedP.survey3_target_date, status: resolvedP.survey3_status, done: resolvedP.survey3_completed },
                        { num: 4, label: '6wk Postpartum', date: resolvedP.survey4_target_date, status: resolvedP.survey4_status, done: resolvedP.survey4_completed },
                    ].map((s) => (
                        <div key={s.num} className={cn(
                            "p-4 rounded-[1.5rem] border-2 transition-all",
                            s.done ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/20"
                        )}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Survey {s.num}</span>
                                {s.done ? <Activity className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-slate-300" />}
                            </div>
                            <p className="text-sm font-black tracking-tight">{s.label}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                                {safeFormatDate(s.date)}
                            </p>
                            {!s.done && s.status && (
                                <Badge className={cn(
                                    "mt-3 rounded-lg font-black text-[8px] uppercase tracking-tighter w-full justify-center shadow-none",
                                    s.status === 'overdue' ? "bg-rose-50 text-rose-600" : 
                                    s.status === 'due_now' ? "bg-emerald-50 text-emerald-600" :
                                    "bg-background text-slate-600"
                                )}>
                                    {s.status.replace('_', ' ')}
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-emerald-50/50 border-b p-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-600/20">
                        <Phone className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Contact Intelligence</CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest text-emerald-700 opacity-60">Verified outreach credentials</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Phone Numbers</Label>
                        <div className="space-y-3">
                            {Array.isArray(activeP.phoneNumber) && activeP.phoneNumber.map((num, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border-2 border-dashed border-muted">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <span className="font-mono font-black text-lg">{num}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next of Kin: {activeP.nextOfKinName || 'N/A'}</Label>
                        <div className="p-4 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-primary">Emergency Contact</span>
                                <IdBadge id="KIN" className="scale-75" hideLabel />
                            </div>
                            <p className="font-mono font-black text-lg text-primary">{activeP.alternativeContact || 'No alternative contact'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>

          {!isViewer && (
            <div className="grid grid-cols-2 gap-4">
                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-16 rounded-[1.5rem] border-2 font-black uppercase tracking-widest text-xs gap-3 shadow-xl hover:bg-muted/50 transition-all">
                            <Phone className="h-5 w-5 text-primary" /> Log Phone Contact
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-primary/5 border-b">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <DialogTitle className="text-2xl font-black tracking-tight">Log Contact Outcome</DialogTitle>
                            </div>
                        </DialogHeader>
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documenting Survey Phase</Label>
                                <Select value={selectedSurveyToLog.toString()} onValueChange={(v) => setSelectedSurveyToLog(parseInt(v))}>
                                    <SelectTrigger className="h-12 rounded-xl border-2 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2">Survey 2 (34-38 Weeks)</SelectItem>
                                        <SelectItem value="3">Survey 3 (Delivery Records)</SelectItem>
                                        <SelectItem value="4">Survey 4 (6-Week Postpartum)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Survey Status</Label>
                                <RadioGroup defaultValue={surveyCompletionStatus} onValueChange={(val: any) => setSurveyCompletionStatus(val)} className="grid grid-cols-2 gap-4">
                                    <Label htmlFor="complete" className={cn("flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all", surveyCompletionStatus === 'complete' ? "border-emerald-500 bg-emerald-50" : "border-muted hover:bg-muted/20")}>
                                        <RadioGroupItem value="complete" id="complete" className="sr-only" />
                                        <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-600" />
                                        <span className="text-xs font-black uppercase">Complete</span>
                                    </Label>
                                    <Label htmlFor="incomplete" className={cn("flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all", surveyCompletionStatus === 'incomplete' ? "border-amber-500 bg-amber-50" : "border-muted hover:bg-muted/20")}>
                                        <RadioGroupItem value="incomplete" id="incomplete" className="sr-only" />
                                        <AlertCircle className="mb-2 h-6 w-6 text-amber-600" />
                                        <span className="text-xs font-black uppercase">Incomplete</span>
                                    </Label>
                                </RadioGroup>
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qualitative Notes</Label>
                                <Textarea className="rounded-2xl border-2 min-h-[120px] italic" placeholder="Document specific feedback or barriers..." value={contactNotes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter className="p-8 bg-muted/30 border-t">
                            <Button variant="ghost" onClick={() => setIsContactDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button onClick={handleLogContactSubmit} disabled={isSubmitting} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                Commit Log
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700">
                            <Baby className="h-5 w-5" /> Record Delivery
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-emerald-50/50 border-b">
                            <DialogTitle className="text-2xl font-black tracking-tight">Confirm Delivery Details</DialogTitle>
                        </DialogHeader>
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actual Delivery Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-14 rounded-2xl border-2 text-left font-bold">
                                            <CalendarIcon className="mr-3 h-5 w-5 text-emerald-600" />
                                            {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick delivery date...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <Checkbox id="markS3" checked={markS3CompleteOnDelivery} onCheckedChange={(v) => setMarkS3CompleteOnDelivery(!!v)} />
                                <Label htmlFor="markS3" className="text-xs font-black uppercase tracking-tight text-emerald-800 cursor-pointer">Mark Survey 3 as Complete?</Label>
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery Outcome Notes</Label>
                                <Textarea className="rounded-2xl border-2 italic" placeholder="Enter clinical context..." value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter className="p-8 bg-muted/30 border-t">
                            <Button variant="ghost" onClick={() => setIsDeliveryDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button onClick={handleRecordDelivery} disabled={isSubmitting} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest bg-emerald-600 text-white shadow-xl shadow-emerald-600/20">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Baby className="mr-2 h-4 w-4" />}
                                Commit Delivery
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          )}

          <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-muted/20 border-b p-8">
                <CardTitle className="text-xl font-black tracking-tight">Timeline Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {rawEvents && rawEvents.length > 0 ? (
                    <div className="p-8 space-y-8 max-h-[600px] overflow-y-auto">
                        {rawEvents.map((e) => (
                            <div key={e.id} className="flex gap-6 relative group/event">
                                <div className={cn("h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center ring-4 ring-background z-10 bg-primary text-white shadow-lg")}>
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="space-y-1 pt-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black uppercase tracking-widest">
                                            {e.event_type.replace('_', ' ')}
                                            {e.survey_number && <span className="ml-2 text-primary opacity-60">(Survey {e.survey_number})</span>}
                                        </h4>
                                        <span className="text-[10px] font-bold text-muted-foreground" suppressHydrationWarning>
                                            {safeParseDate(e.created_at) ? formatDistanceToNow(safeParseDate(e.created_at)!, { addSuffix: true }) : 'N/A'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">"{e.notes}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-16 text-center text-muted-foreground italic text-xs font-bold">No clinical activity recorded for this participant yet.</div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] bg-emerald-50/50 dark:bg-emerald-900/10 overflow-hidden">
                <CardContent className="p-8 space-y-8">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="h-24 w-24 rounded-full bg-background shadow-2xl flex items-center justify-center ring-8 ring-emerald-100">
                            <User className="h-12 w-12 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tight">{activeP.name}</h3>
                            <IdBadge id={activeP.participantId} hideLabel />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-8 border-t border-emerald-100/50">
                        <div className="p-5 rounded-2xl bg-background/50 border shadow-sm space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Clinical Bio</p>
                            <p className="text-sm font-black">{activeP.age}y • {activeP.maritalStatus}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-background/50 border shadow-sm space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Enrollment Attribution</p>
                            <p className="text-sm font-black text-primary">{activeP.registeredBy || 'Project Staff'}</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-background/50 border shadow-sm space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Date Recorded</p>
                            <p className="text-sm font-bold">{safeFormatDate(activeP.createdAt)}</p>
                        </div>
                    </div>
                    <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10">
                        <div className="flex items-center gap-3 mb-2">
                            <Target className="h-4 w-4 text-primary" />
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-primary">Registry Audit</h5>
                        </div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                            "This record represents a verified clinical encounter. Modifications are logged in the study audit trail."
                        </p>
                    </div>
                </CardContent>
            </Card>

            {isEditingProfile && (
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100">
                            <DialogTitle className="text-xl font-black text-amber-900">Edit Clinical Profile</DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase text-amber-700/60">Manage study data for {activeP.name}</DialogDescription>
                        </DialogHeader>
                        <div className="p-8 overflow-y-auto max-h-[80vh]">
                            <AncRegistrationForm editMode={true} initialData={activeP} onOpenChange={(open) => !open && setIsEditingProfile(false)} />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
      </div>
    </div>
  );
}
