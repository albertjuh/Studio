
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
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
  Pencil,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { format, isValid, formatDistanceToNow, isAfter, startOfDay } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedSurveyToLog, setSelectedSurveyToLog] = useState<number>(2);
  const [contactOutcome, setContactOutcome] = useState<'contacted' | 'no_answer' | 'declined'>('contacted');
  const [pregnancyStatus, setPregnancyStatus] = useState<'still_pregnant' | 'delivered_live' | 'delivered_stillbirth' | 'abortion'>('still_pregnant');
  const [contactNotes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryOutcome, setDeliveryOutcome] = useState<'live_birth' | 'stillbirth' | 'abortion' | 'other'>('live_birth');
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
    return doc(firestore, 'anc_registrations', decodeURIComponent(id));
  }, [firestore, id]);

  const { data: p, isLoading } = useDoc<AncRegistration>(docRef);

  const recoveryQuery = useMemoFirebase(() => {
    if (!firestore || (!isLoading && p)) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore, isLoading, p]);

  const { data: allRegs, isLoading: isRecoveryLoading } = useCollection<AncRegistration>(recoveryQuery);

  const activeP = useMemo(() => {
    if (p) return p;
    if (!allRegs || !id) return null;
    const targetId = decodeURIComponent(id).trim().toLowerCase().replace(/\s+/g, '');
    return allRegs.find(reg => {
      const normalizedDocId = reg.id.trim().toLowerCase().replace(/\s+/g, '');
      const normalizedPropId = (reg.participantId || '').trim().toLowerCase().replace(/\s+/g, '');
      return normalizedDocId === targetId || normalizedPropId === targetId;
    }) || null;
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
            last_contact_date: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        if (contactOutcome === 'contacted') {
            updateData[`survey${selectedSurveyToLog}_completed`] = true;
            updateData[`survey${selectedSurveyToLog}_status`] = 'completed';
            updateData[`survey${selectedSurveyToLog}_completed_at`] = serverTimestamp();
            
            // Sync Pregnancy Status logic from S2 Call Plan
            if (pregnancyStatus !== 'still_pregnant') {
                updateData.delivery_status = pregnancyStatus === 'abortion' ? 'delivered' : 'delivered';
                updateData.delivery_date_confirmed = serverTimestamp();
                updateData.delivery_outcome = 
                    pregnancyStatus === 'delivered_live' ? 'live_birth' : 
                    pregnancyStatus === 'delivered_stillbirth' ? 'stillbirth' : 'abortion';
                updateData.current_trimester = 'postpartum';
                
                // If it's a delivery outcome, it often satisfies Survey 3 logic
                if (selectedSurveyToLog === 2) {
                    updateData.survey3_status = 'due_now';
                }
            }
        }

        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
        
        const eventData: any = {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            survey_number: selectedSurveyToLog,
            notes: contactNotes || `Outreach for Survey ${selectedSurveyToLog}. Outcome: ${contactOutcome}. Status: ${pregnancyStatus}`,
            created_at: serverTimestamp(),
            outcome: contactOutcome,
            pregnancy_status_at_contact: pregnancyStatus
        };
        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), eventData);
        
        toast({ title: "Contact Logged & Registry Synced", variant: "success" });
        setIsContactDialogOpen(false);
        setNotes('');
    } catch (e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRecordDelivery = async () => {
    if (!firestore || !activeP?.id || isViewer) return;
    setIsSubmitting(true);
    try {
        const updateData: any = { 
            delivery_status: 'delivered',
            delivery_date_confirmed: Timestamp.fromDate(deliveryDate || new Date()),
            current_trimester: 'postpartum',
            delivery_outcome: deliveryOutcome,
            updatedAt: serverTimestamp()
        };
        
        if (markS3CompleteOnDelivery) {
            updateData.survey3_completed = true;
            updateData.survey3_status = 'completed';
            updateData.survey3_completed_at = serverTimestamp();
        }

        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
        
        const eventData: any = {
            event_type: 'delivery_recorded',
            event_date: Timestamp.fromDate(deliveryDate || new Date()),
            notes: deliveryNotes || `Pregnancy outcome recorded: ${deliveryOutcome.replace('_', ' ')}.`,
            created_at: serverTimestamp(),
            outcome: deliveryOutcome
        };
        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), eventData);
        
        toast({ title: "Outcome Synchronized", variant: "success" });
        setIsDeliveryDialogOpen(false);
        setDeliveryNotes('');
    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleResetSurvey = (surveyNum: number) => {
    if (!firestore || !activeP?.id || !isAdmin) return;
    if (!window.confirm(`Are you sure you want to REVERT Survey ${surveyNum}? This will mark it as incomplete and may affect the study timeline.`)) return;

    const recordRef = doc(firestore, 'anc_registrations', activeP.id);
    const updateData: any = {
        [`survey${surveyNum}_completed`]: false,
        [`survey${surveyNum}_completed_at`]: null,
        [`survey${surveyNum}_status`]: 'due_now',
        updatedAt: serverTimestamp()
    };
    
    if (surveyNum === 3) {
        updateData.delivery_status = 'pregnant';
        updateData.delivery_date_confirmed = null;
        updateData.delivery_outcome = null;
    }

    updateDocumentNonBlocking(recordRef, updateData);
    
    const eventsCol = collection(firestore, 'anc_registrations', activeP.id, 'timeline_events');
    addDocumentNonBlocking(eventsCol, {
        event_type: 'survey_completed', 
        survey_number: surveyNum,
        event_date: Timestamp.now(),
        notes: `Admin Override: Survey ${surveyNum} status manually reset by ${userRole || 'Admin'}.`,
        created_at: serverTimestamp()
    });

    toast({ title: `Survey ${surveyNum} Reverted`, variant: "success" });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!firestore || !activeP?.id || !isAdmin) return;
    if (!window.confirm("Permanently remove this protocol event? This action is irreversible.")) return;
    
    const eventRef = doc(firestore, 'anc_registrations', activeP.id, 'timeline_events', eventId);
    deleteDocumentNonBlocking(eventRef);
    toast({ title: "Protocol Event Purged", variant: "success" });
  };

  if (isTrulyLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Activity className="h-7 w-7 animate-spin text-primary" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mapping Data...</p>
    </div>
  );

  if (!activeP || !resolvedP || !resolvedP.isValid) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <AlertCircle className="h-8 w-8 text-rose-500" />
        <h2 className="text-lg font-black tracking-tight">Data Discrepancy</h2>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Profile structure incompatible</p>
        <Button asChild variant="outline" className="h-9 rounded-xl text-[9px] font-black uppercase tracking-widest mt-4 border-2"><Link href="/anc/dashboard">Back to Registry</Link></Button>
    </div>
  );

  const rawEnrollDate = safeParseDate(activeP.enrollment_date || activeP.createdAt || activeP.firstAncDate);
  const enrollDate = rawEnrollDate || new Date();
  const ga = resolvedP.current_ga;
  const progress = Math.min(100, (ga.weeks / 40) * 100);

  const safeFormatDate = (dateVal: any) => {
    const d = safeParseDate(dateVal);
    if (!d || !isValid(d)) return 'Pending';
    return format(d, 'dd MMM');
  };

  const surveyItems = [
    { num: 1, label: 'Enrolled', date: enrollDate, done: true, actual: enrollDate },
    { num: 2, label: 'S2: 34-38w', date: resolvedP.survey2_target_date, done: resolvedP.survey2_completed, actual: activeP.survey2_completed_at, windowClose: resolvedP.survey2_window_close },
    { num: 3, label: 'S3: Deliv.', date: resolvedP.survey3_target_date, done: resolvedP.survey3_completed, actual: activeP.survey3_completed_at, windowClose: resolvedP.survey3_window_close },
    { num: 4, label: 'S4: 6wk PP', date: resolvedP.survey4_target_date, done: resolvedP.survey4_completed, actual: activeP.survey4_completed_at, windowClose: resolvedP.survey4_window_close },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-lg h-8 w-8 bg-background shadow-sm border-none">
                <Link href="/anc/participants"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-lg font-black tracking-tight leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-2">
                    <IdBadge id={activeP.participantId} hideLabel className="scale-75 origin-left" />
                    <Badge className="bg-violet-500/10 text-violet-600 border-none font-black text-[7px] px-1.5 h-4 uppercase">
                        RA: {activeP.registeredBy || 'Unknown'}
                    </Badge>
                </div>
            </div>
        </div>
        <Badge className={cn(
            "rounded-lg font-black px-2 py-1 uppercase text-[8px] border-none shadow-sm",
            resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white"
        )}>
            {resolvedP.overall_status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 p-3 border-b">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-black tracking-tight uppercase tracking-widest text-primary">Pregnancy Journey</CardTitle>
                    <Badge className="bg-background text-primary border-primary/10 font-black text-[8px] uppercase px-2 py-0.5 rounded-md">
                        {ga.weeks}+{ga.days} Wks
                    </Badge>
                </div>
                <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-[7px] font-black uppercase text-slate-400">
                        <span>Enroll ({activeP.gestationalAge}w)</span>
                        <span className="text-primary">EDD: {safeFormatDate(resolvedP.edd)}</span>
                    </div>
                    <Progress value={progress} className="h-1.5 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {surveyItems.map((s) => {
                    const actualDate = safeParseDate(s.actual);
                    const windowCloseDate = safeParseDate(s.windowClose);
                    const isLate = s.done && actualDate && windowCloseDate && isAfter(startOfDay(actualDate), startOfDay(windowCloseDate));

                    return (
                        <div key={s.num} className={cn(
                            "p-2 rounded-xl border-2 transition-all relative group/card h-full flex flex-col justify-between",
                            s.done ? "border-primary/20 bg-primary/5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" : "border-border/50 bg-muted/20"
                        )}>
                            <div>
                                <p className="text-[6px] font-black uppercase text-slate-400">Survey {s.num}</p>
                                <p className="text-[9px] font-black truncate leading-none my-1">{s.label}</p>
                            </div>
                            
                            <div className="space-y-1">
                                <p className={cn("text-[8px] font-bold leading-tight", s.done ? "text-primary/70" : "text-slate-500")}>
                                    {s.done ? `Logged: ${safeFormatDate(s.actual)}` : `Expect: ${safeFormatDate(s.date)}`}
                                </p>
                                {isLate && (
                                    <Badge variant="outline" className="h-3 px-1 border-rose-200 text-rose-600 font-black text-[6px] uppercase w-fit">
                                        Late Entry
                                    </Badge>
                                )}
                            </div>

                            {s.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary mt-1" />}
                            
                            {isAdmin && s.num > 1 && s.done && (
                              <button
                                type="button"
                                className="absolute -top-2 -right-1 h-6 w-6 rounded-full shadow-lg border-2 border-rose-100 bg-white hover:bg-rose-50 text-rose-600 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all z-50 pointer-events-auto"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    handleResetSurvey(s.num); 
                                }}
                                title={`Reset Survey ${s.num}`}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                    );
                })}
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-emerald-50/50 border-b p-3">
                <CardTitle className="text-xs font-black tracking-widest uppercase text-emerald-700 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" /> Contact Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-[7px] font-black uppercase text-muted-foreground">Primary Contact</Label>
                        <div className="p-2 rounded-xl bg-muted/30 border border-dashed border-muted font-mono font-black text-xs">
                            {Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber[0] : activeP.phoneNumber}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[7px] font-black uppercase text-muted-foreground">Kin / Emergency</Label>
                        <div className="p-2 rounded-xl bg-primary/5 border border-dashed border-primary/20 flex flex-col gap-1">
                            {activeP.nextOfKinName && (
                                <p className="text-[10px] font-black text-primary leading-tight">
                                    {activeP.nextOfKinName} {activeP.nextOfKinRelation && <span className="opacity-60">({activeP.nextOfKinRelation})</span>}
                                </p>
                            )}
                            <p className="font-mono font-black text-xs text-primary/70 leading-none">
                                {activeP.alternativeContact || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>

          {!isViewer && (
            <div className="grid grid-cols-2 gap-2">
                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-10 rounded-xl border-2 font-black uppercase text-[9px] gap-2 hover:bg-muted/50">
                            <Phone className="h-3.5 w-3.5 text-primary" /> Log Outreach
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-8 bg-primary/5 border-b">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-2xl shadow-lg flex items-center justify-center ring-1 ring-black/5">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black tracking-tight">Log Protocol outreach</DialogTitle>
                                    <DialogDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Record contact outcome and pregnancy status</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                          <div className="p-8 space-y-6">
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Module</Label>
                                  <Select value={selectedSurveyToLog.toString()} onValueChange={(v) => setSelectedSurveyToLog(parseInt(v))}>
                                      <SelectTrigger className="h-11 rounded-xl text-xs font-bold"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="2">Survey 2 (34-38w)</SelectItem>
                                          <SelectItem value="3">Survey 3 (Delivery)</SelectItem>
                                          <SelectItem value="4">Survey 4 (6wk PP)</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Outcome *</Label>
                                <RadioGroup value={contactOutcome} onValueChange={(v: any) => setContactOutcome(v)} className="grid grid-cols-1 gap-2">
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('contacted')}>
                                        <RadioGroupItem value="contacted" id="c_contacted" />
                                        <Label htmlFor="c_contacted" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Success: Protocol Completed</Label>
                                    </div>
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('no_answer')}>
                                        <RadioGroupItem value="no_answer" id="c_no_answer" />
                                        <Label htmlFor="c_no_answer" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Partial: No Answer / Unreachable</Label>
                                    </div>
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'declined' ? "ring-rose-500 bg-rose-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('declined')}>
                                        <RadioGroupItem value="declined" id="c_declined" />
                                        <Label htmlFor="c_declined" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><X className="h-4 w-4 text-rose-500" /> Failed: Declined Participation</Label>
                                    </div>
                                </RadioGroup>
                              </div>

                              {contactOutcome === 'contacted' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Pregnancy Status *</Label>
                                    <RadioGroup value={pregnancyStatus} onValueChange={(v: any) => setPregnancyStatus(v)} className="grid grid-cols-1 gap-2">
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", pregnancyStatus === 'still_pregnant' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setPregnancyStatus('still_pregnant')}>
                                            <RadioGroupItem value="still_pregnant" id="p_still_pregnant" />
                                            <Label htmlFor="p_still_pregnant" className="font-black text-sm cursor-pointer flex-1">🤰 Still Pregnant</Label>
                                        </div>
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", pregnancyStatus === 'delivered_live' ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setPregnancyStatus('delivered_live')}>
                                            <RadioGroupItem value="delivered_live" id="p_delivered_live" />
                                            <Label htmlFor="p_delivered_live" className="font-black text-sm cursor-pointer flex-1">👶 Delivered: Live Birth</Label>
                                        </div>
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", pregnancyStatus === 'delivered_stillbirth' ? "ring-rose-500 bg-rose-50" : "ring-slate-100")} onClick={() => setPregnancyStatus('delivered_stillbirth')}>
                                            <RadioGroupItem value="delivered_stillbirth" id="p_delivered_stillbirth" />
                                            <Label htmlFor="p_delivered_stillbirth" className="font-black text-sm cursor-pointer flex-1">🕊️ Delivered: Stillbirth</Label>
                                        </div>
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", pregnancyStatus === 'abortion' ? "ring-slate-900 bg-slate-100" : "ring-slate-100")} onClick={() => setPregnancyStatus('abortion')}>
                                            <RadioGroupItem value="abortion" id="p_abortion" />
                                            <Label htmlFor="p_abortion" className="font-black text-sm cursor-pointer flex-1">💔 Pregnancy Loss / Abortion</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                              )}

                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qualitative Notes</Label>
                                  <Textarea className="rounded-[1.5rem] border text-xs italic min-h-[120px] p-4" placeholder="Record protocol context or important participant feedback..." value={contactNotes} onChange={(e) => setNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
                            <Button variant="ghost" className="rounded-2xl font-black uppercase text-[10px] h-12 flex-1" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleLogContactSubmit} disabled={isSubmitting} className="rounded-2xl font-black uppercase text-[10px] h-12 flex-[2] bg-primary shadow-lg shadow-primary/20">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                {isSubmitting ? 'Syncing Registry...' : 'Commit Protocol Entry'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 rounded-xl font-black uppercase text-[9px] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                            <Baby className="h-3.5 w-3.5" /> Outcome Registry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-8 bg-emerald-50/50 border-b">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-2xl shadow-lg flex items-center justify-center ring-1 ring-black/5">
                                    <Baby className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black tracking-tight text-emerald-800">Outcome Registry</DialogTitle>
                                    <DialogDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Synchronize pregnancy conclusion metrics</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                          <div className="p-8 space-y-6">
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest">Event Date</Label>
                                  <Popover>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-bold ring-1 ring-emerald-100 border-none bg-background">
                                              {deliveryDate ? format(deliveryDate, "PP") : 'Select Date'}
                                              <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-40" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0" align="start"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(d) => d > new Date()} /></PopoverContent>
                                  </Popover>
                              </div>

                              <div className="space-y-3">
                                  <Label className="text-[10px] font-black uppercase tracking-widest">Outcome Category *</Label>
                                  <RadioGroup value={deliveryOutcome} onValueChange={(v: any) => setDeliveryOutcome(v)} className="grid grid-cols-1 gap-2">
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'live_birth' ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setDeliveryOutcome('live_birth')}>
                                          <RadioGroupItem value="live_birth" id="d_live_birth" />
                                          <Label htmlFor="d_live_birth" className="font-black text-sm cursor-pointer flex-1">👶 Live Birth</Label>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'stillbirth' ? "ring-rose-500 bg-rose-50" : "ring-slate-100")} onClick={() => setDeliveryOutcome('stillbirth')}>
                                          <RadioGroupItem value="stillbirth" id="d_stillbirth" />
                                          <Label htmlFor="d_stillbirth" className="font-black text-sm cursor-pointer flex-1">🕊️ Stillbirth</Label>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'abortion' ? "ring-slate-900 bg-slate-100" : "ring-slate-100")} onClick={() => setDeliveryOutcome('abortion')}>
                                          <RadioGroupItem value="abortion" id="d_abortion" />
                                          <Label htmlFor="d_abortion" className="font-black text-sm cursor-pointer flex-1">💔 Abortion / Loss</Label>
                                      </div>
                                  </RadioGroup>
                              </div>

                              <div className="flex items-center space-x-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                                  <Checkbox id="markS3" checked={markS3CompleteOnDelivery} onCheckedChange={(v) => setMarkS3CompleteOnDelivery(!!v)} />
                                  <Label htmlFor="markS3" className="text-[10px] font-black uppercase cursor-pointer text-emerald-800">Auto-complete Survey 3?</Label>
                              </div>

                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest">Researcher Notes</Label>
                                  <Textarea className="rounded-[1.5rem] border text-xs italic min-h-[100px] p-4" placeholder="Protocol context or clinical notes..." value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
                            <Button variant="ghost" className="rounded-2xl font-black uppercase text-[10px] h-12 flex-1" onClick={() => setIsDeliveryDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleRecordDelivery} disabled={isSubmitting} className="rounded-2xl font-black uppercase text-[10px] h-12 flex-[2] bg-emerald-600 shadow-lg shadow-emerald-500/20">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                {isSubmitting ? 'Saving Outcome...' : 'Commit Registry Entry'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          )}

          <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b p-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Timeline Events
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="max-h-[300px]">
                  <div className="p-4 space-y-4">
                      {rawEvents && rawEvents.length > 0 ? rawEvents.map((e) => (
                          <div key={e.id} className="flex gap-3 items-start border-l-2 border-primary/20 pl-3 py-1 group/event relative">
                              <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                          <h4 className="text-[8px] font-black uppercase text-primary">
                                              {e.event_type.replace('_', ' ')}
                                          </h4>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-[7px] font-bold text-slate-400">
                                              {safeFormatDate(e.created_at)}
                                          </span>
                                          {isAdmin && (
                                            <button 
                                              type="button"
                                              onClick={(event) => { 
                                                event.preventDefault();
                                                event.stopPropagation(); 
                                                handleDeleteEvent(e.id); 
                                              }}
                                              className="opacity-0 group-hover/event:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
                                              title="Delete Protocol Event"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                      </div>
                                  </div>
                                  <p className="text-[9px] font-medium text-slate-600 leading-tight">"{e.notes}"</p>
                              </div>
                          </div>
                      )) : (
                          <p className="text-[8px] font-bold text-center text-muted-foreground uppercase tracking-widest py-8 opacity-40 italic">No events logged.</p>
                      )}
                  </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
            <Card className="border-none ring-1 ring-border shadow-sm rounded-[1.5rem] bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col items-center text-center gap-2">
                        <div className="h-14 w-14 rounded-full bg-background shadow-md flex items-center justify-center ring-4 ring-emerald-50/50">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-base font-black tracking-tight leading-none">{activeP.name}</h3>
                        <IdBadge id={activeP.participantId} hideLabel className="scale-75" />
                        
                        {!isViewer && (
                            <Button 
                                onClick={() => setIsEditingProfile(true)} 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest border-2 mt-1 hover:bg-background/80"
                            >
                                <Pencil className="h-3 w-3 mr-1" /> Edit Profile
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-3 border-t border-emerald-100/50">
                        <div className="p-2 rounded-xl bg-background/50 border shadow-sm space-y-0.5">
                            <p className="text-[6px] font-black uppercase text-slate-400">Biological Metrics</p>
                            <p className="text-[10px] font-black">{activeP.age}y • {activeP.maritalStatus}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-background/50 border shadow-sm space-y-0.5">
                            <p className="text-[6px] font-black uppercase text-slate-400">Assignment (RA)</p>
                            <p className="text-[10px] font-black text-primary truncate">{activeP.registeredBy || 'Project Staff'}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-background/50 border shadow-sm space-y-0.5">
                            <p className="text-[6px] font-black uppercase text-slate-400">Site Assignment</p>
                            <p className="text-[10px] font-black text-primary truncate">{activeP.healthFacility.split(' (')[0]}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {isEditingProfile && (
          <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
              <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                  <DialogHeader className="p-5 bg-primary/5 border-b">
                      <DialogTitle className="text-lg font-black tracking-tight leading-none">Edit Clinical Dossier</DialogTitle>
                      <DialogDescription className="text-[8px] uppercase tracking-[0.2em] font-bold opacity-60 mt-1">Updating core record for {activeP.name}</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-5">
                      <AncRegistrationForm 
                          editMode={true} 
                          initialData={activeP} 
                          onOpenChange={(val) => setIsEditingProfile(val)} 
                      />
                  </ScrollArea>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
