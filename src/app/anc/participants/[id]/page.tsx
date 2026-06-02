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
  Trash2,
  X,
  History
} from 'lucide-react';
import { format, isValid, formatDistanceToNow, isAfter, startOfDay } from 'date-fns';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { resolveParticipantStatuses, safeParseDate, calculateCurrentGA, getTrimester, safeFormatDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    
    const firestore = useFirestore();
    const { toast } = useToast();
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // LOG OUTREACH STATE
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [selectedSurveyToLog, setSelectedSurveyToLog] = useState<number>(2);
    const [contactOutcome, setContactOutcome] = useState('');
    const [deliveryStatus, setDeliveryStatus] = useState('');
    const [contactNotes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // OUTCOME REGISTRY STATE
    const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryOutcome, setDeliveryOutcome] = useState('');
    
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

    const { data: activeP, isLoading } = useDoc<AncRegistration>(docRef);

    const eventsQuery = useMemoFirebase(() => {
        if (!firestore || !activeP?.id) return null;
        return query(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, activeP?.id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);

    const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? { 
        current_ga: { weeks: 0, days: 0 },
        edd: new Date(),
        current_trimester: 'unknown' as any,
        delivery_status: 'unknown' as any,
        overall_status: 'unknown' as any,
        isValid: false,
        diagnostics: { missingGA: false, invalidDate: false }
    }) : null, [activeP]);

    if (isLoading || !activeP || !resolvedP || !resolvedP.isValid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Activity className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);

    const surveyItems = [
        { num: 1, label: 'Enrollment', done: true, date: activeP.firstAncDate, actual: activeP.createdAt },
        { num: 2, label: '34-38w Call', done: activeP.survey2_completed, date: resolvedP.survey2_target_date, actual: activeP.survey2_completed_at, attempted: activeP.survey2_call_attempted },
        { num: 3, label: 'Delivery', done: activeP.survey3_completed, date: resolvedP.survey3_target_date, actual: activeP.survey3_completed_at, attempted: activeP.survey3_call_attempted },
        { num: 4, label: '6wk PP', done: activeP.survey4_completed, date: resolvedP.survey4_target_date, actual: activeP.survey4_completed_at, attempted: activeP.survey4_call_attempted },
    ];

    const handleLogContactSubmit = async () => {
        if (!firestore || !activeP?.id || isViewer || !contactOutcome) return;
        if (contactOutcome === 'contacted' && !deliveryStatus) return;

        setIsSubmitting(true);
        try {
            const updateData: any = { 
                [`survey${selectedSurveyToLog}_call_attempted`]: true,
                last_contact_date: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`survey${selectedSurveyToLog}_call_outcome`]: contactOutcome 
            };

            if (contactOutcome === 'contacted') {
                updateData[`survey${selectedSurveyToLog}_completed`] = true;
                updateData[`survey${selectedSurveyToLog}_status`] = 'completed';
                updateData[`survey${selectedSurveyToLog}_completed_at`] = serverTimestamp();
                
                if (deliveryStatus !== 'still_pregnant') {
                    updateData.delivery_status = 'delivered';
                    updateData.delivery_date_confirmed = serverTimestamp();
                    updateData.delivery_outcome = 
                        deliveryStatus === 'delivered_live' ? 'live_birth' : 
                        deliveryStatus === 'delivered_stillbirth' ? 'stillbirth' : 'abortion';
                    updateData.current_trimester = 'postpartum';
                }
            }

            await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
            
            await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), {
                event_type: 'phone_contact',
                event_date: Timestamp.now(),
                survey_number: selectedSurveyToLog,
                notes: contactNotes || `Outreach for Survey ${selectedSurveyToLog}. Outcome: ${contactOutcome}. Status: ${deliveryStatus}`,
                created_at: serverTimestamp(),
                outcome: contactOutcome,
                pregnancy_status_at_contact: deliveryStatus
            });
            
            toast({ title: "Outreach Logged", variant: "success" });
            setIsContactDialogOpen(false);
            setNotes('');
            setContactOutcome('');
            setDeliveryStatus('');
        } catch (e: any) {
            toast({ title: "Update Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordDelivery = async () => {
        if (!firestore || !activeP?.id || isViewer || !deliveryOutcome || !deliveryDate) return;
        setIsSubmitting(true);
        try {
            const updateData: any = { 
                delivery_status: 'delivered',
                delivery_date_confirmed: Timestamp.fromDate(deliveryDate),
                current_trimester: 'postpartum',
                delivery_outcome: deliveryOutcome,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
            
            await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), {
                event_type: 'delivery_recorded',
                event_date: Timestamp.fromDate(deliveryDate),
                notes: deliveryNotes || `Pregnancy outcome recorded: ${deliveryOutcome?.replace('_', ' ')}.`,
                created_at: serverTimestamp(),
                outcome: deliveryOutcome
            });
            
            toast({ title: "Clinical Outcome Synchronized", variant: "success" });
            setIsDeliveryDialogOpen(false);
            setDeliveryNotes('');
            setDeliveryOutcome('');
            setDeliveryDate(undefined);
        } catch (e: any) {
            toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!firestore || !activeP?.id || !isAdmin) return;
        const event = rawEvents?.find(e => e.id === eventId);
        if (!event) return;

        const recordRef = doc(firestore, 'anc_registrations', activeP.id);
        const eventRef = doc(firestore, 'anc_registrations', activeP.id, 'timeline_events', eventId);
        
        const updates: any = { updatedAt: serverTimestamp() };
        
        if (event.event_type === 'phone_contact' && event.survey_number && event.outcome === 'contacted') {
            updates[`survey${event.survey_number}_completed`] = false;
            updates[`survey${event.survey_number}_completed_at`] = null;
            updates[`survey${event.survey_number}_status`] = 'due_now';
        }
        
        if (event.event_type === 'delivery_recorded' || (event.event_type === 'phone_contact' && event.pregnancy_status_at_contact && event.pregnancy_status_at_contact !== 'still_pregnant')) {
            updates.delivery_status = 'pregnant';
            updates.delivery_date_confirmed = null;
            updates.delivery_outcome = null;
            
            const gaAtEnroll = Number(activeP.gestationalAge) || 20;
            const enrollDate = safeParseDate(activeP.enrollment_date || activeP.createdAt || activeP.firstAncDate) || new Date();
            const currentGA = calculateCurrentGA(enrollDate, gaAtEnroll);
            updates.current_trimester = getTrimester(currentGA.weeks);
        }

        try {
            await updateDoc(recordRef, updates);
            await deleteDoc(eventRef);
            toast({ title: "Event Delogged & Status Reverted", variant: "success" });
        } catch (e: any) {
            toast({ title: "Operation Failed", description: e.message, variant: "destructive" });
        }
    };

    return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 pt-2 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-8 w-8 bg-background shadow-sm border-none">
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
                        {resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} Wks Gestation
                    </Badge>
                </div>
                <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-[7px] font-black uppercase text-slate-400">
                        <span>Enroll ({activeP.gestationalAge}w)</span>
                        <span className="text-primary">EDD: {safeFormatDate(resolvedP.edd)}</span>
                    </div>
                    <Progress value={progress_} className="h-1.5 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 rounded-xl border-2 transition-all relative group/card h-full flex flex-col justify-between",
                        s.done ? "border-primary/20 bg-primary/5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" : "border-border/50 bg-muted/20"
                    )}>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className={cn("text-[6px] font-black uppercase tracking-widest", s.done ? "text-primary/60" : "text-muted-foreground/40")}>Survey {s.num}</span>
                                {s.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary" />}
                            </div>
                            <h4 className={cn("text-[10px] font-black leading-tight", s.done ? "text-primary" : "text-muted-foreground")}>{s.label}</h4>
                        </div>
                        <div className="mt-2 space-y-0.5">
                            <p className="text-[7px] font-bold text-slate-400">Expect: {safeFormatDate(s.date)}</p>
                            <p className="text-[8px] font-black text-primary/70 leading-tight">
                                Logged: {s.done ? safeFormatDate(s.actual) : (s.attempted ? 'INC' : 'Pending')}
                            </p>
                        </div>
                    </div>
                ))}
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
                            {Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber}
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
                        <Button variant="outline" className="h-10 rounded-xl border-2 font-black uppercase text-[9px] gap-2 hover:bg-muted/50 group">
                            <Phone className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" /> 
                            Log Outreach
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-8 bg-primary/5 border-b">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-2xl shadow-lg flex items-center justify-center ring-1 ring-black/5">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black tracking-tight">Log Outreach Effort</DialogTitle>
                                    <DialogDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Document call attempts and survey reachability</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                          <div className="p-8 space-y-6">
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Survey Window</Label>
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
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reachability Outcome *</Label>
                                <RadioGroup value={contactOutcome} onValueChange={setContactOutcome} className="grid grid-cols-1 gap-2">
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('contacted')}>
                                        <RadioGroupItem value="contacted" id="contacted" />
                                        <Label htmlFor="contacted" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Success: Protocol Completed</Label>
                                    </div>
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'no_answer' ? "ring-amber-500 bg-amber-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('no_answer')}>
                                        <RadioGroupItem value="no_answer" id="no_answer" />
                                        <Label htmlFor="no_answer" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Partial: No Answer / Unreachable</Label>
                                    </div>
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'declined' ? "ring-rose-500 bg-rose-50/30" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('declined')}>
                                        <RadioGroupItem value="declined" id="declined" />
                                        <Label htmlFor="declined" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><X className="h-4 w-4 text-rose-500" /> Failed: Declined Participation</Label>
                                    </div>
                                </RadioGroup>
                              </div>

                              {contactOutcome === 'contacted' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Pregnancy Status *</Label>
                                    <RadioGroup value={deliveryStatus} onValueChange={setDeliveryStatus} className="grid grid-cols-1 gap-2">
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryStatus === 'still_pregnant' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setDeliveryStatus('still_pregnant')}>
                                            <RadioGroupItem value="still_pregnant" id="still_pregnant" />
                                            <Label htmlFor="still_pregnant" className="font-black text-sm cursor-pointer flex-1">🤰 Still Pregnant</Label>
                                        </div>
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", (deliveryStatus && deliveryStatus !== 'still_pregnant') ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setDeliveryStatus('delivered_live')}>
                                            <div className="flex flex-col gap-1">
                                                <Label className="font-black text-sm cursor-pointer">Confirmed Outcome</Label>
                                                <p className="text-[10px] font-medium text-slate-500 leading-tight">If an outcome has occurred, please use the specialized "Outcome Registry" for full clinical documentation.</p>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>
                              )}

                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outreach Context / Notes</Label>
                                  <Textarea className="rounded-[1.5rem] border text-xs italic min-h-[120px] p-4" placeholder="Record protocol context or important participant feedback..." value={contactNotes} onChange={(e) => setNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
                            <Button variant="ghost" className="rounded-2xl font-black uppercase text-[10px] h-12 flex-1" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
                            <Button 
                                onClick={handleLogContactSubmit} 
                                disabled={isSubmitting || !contactOutcome || (contactOutcome === 'contacted' && !deliveryStatus)} 
                                className="rounded-2xl font-black uppercase text-[10px] h-12 flex-[2] bg-primary shadow-lg shadow-primary/20"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                {isSubmitting ? 'Processing...' : 'Commit Outreach Entry'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 rounded-xl font-black uppercase text-[9px] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 gap-2 group">
                            <Baby className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" /> 
                            Outcome Registry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-8 bg-emerald-50/50 border-b">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-2xl shadow-lg flex items-center justify-center ring-1 ring-black/5">
                                    <Baby className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black tracking-tight text-emerald-800">Pregnancy Outcome</DialogTitle>
                                    <DialogDescription className="text-[9px] font-bold uppercase tracking-widest opacity-60">Synchronize verified clinical conclusion metrics</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                          <div className="p-8 space-y-6">
                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Confirmed Event Date *</Label>
                                  <Popover>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-bold ring-1 ring-emerald-100 border-none bg-background shadow-inner">
                                              {deliveryDate ? format(deliveryDate, "PPP") : 'Select clinical date'}
                                              <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-40" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0" align="start"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(d) => d > new Date()} /></PopoverContent>
                                  </Popover>
                              </div>

                              <div className="space-y-3">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Clinical Outcome Category *</Label>
                                  <RadioGroup value={deliveryOutcome || ''} onValueChange={(v: any) => setDeliveryOutcome(v)} className="grid grid-cols-1 gap-2">
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'live_birth' ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setDeliveryOutcome('live_birth')}>
                                          <RadioGroupItem value="live_birth" id="d_live_birth" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_live_birth" className="font-black text-sm cursor-pointer">👶 Live Birth</Label>
                                            <p className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">Confirmed neonatal vitality at delivery.</p>
                                          </div>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'stillbirth' ? "ring-rose-500 bg-rose-50" : "ring-slate-100")} onClick={() => setDeliveryOutcome('stillbirth')}>
                                          <RadioGroupItem value="stillbirth" id="d_stillbirth" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_stillbirth" className="font-black text-sm cursor-pointer">🕊️ Stillbirth</Label>
                                            <p className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">Loss occurring at/after 28 weeks gestation.</p>
                                          </div>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'abortion' ? "ring-slate-900 bg-slate-100" : "ring-slate-100")} onClick={() => setDeliveryOutcome('abortion')}>
                                          <RadioGroupItem value="abortion" id="d_abortion" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_abortion" className="font-black text-sm cursor-pointer">💔 Abortion / Early Loss</Label>
                                            <p className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">Loss occurring before 28 weeks gestation.</p>
                                          </div>
                                      </div>
                                  </RadioGroup>
                              </div>

                              <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Clinical / Transfer Notes</Label>
                                  <Textarea className="rounded-[1.5rem] border text-xs italic min-h-[100px] p-4" placeholder="Record specifics about the delivery facility or clinical circumstances..." value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-8 bg-muted/20 border-t flex flex-col sm:flex-row gap-3">
                            <Button variant="ghost" className="rounded-2xl font-black uppercase text-[10px] h-12 flex-1" onClick={() => setIsDeliveryDialogOpen(false)}>Cancel</Button>
                            <Button 
                                onClick={handleRecordDelivery} 
                                disabled={isSubmitting || !deliveryOutcome} 
                                className="rounded-2xl font-black uppercase text-[10px] h-12 flex-[2] bg-emerald-600 shadow-lg shadow-emerald-500/20"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                {isSubmitting ? 'Syncing Registry...' : 'Finalize Outcome Entry'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
            <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card h-full">
                <CardHeader className="bg-muted/30 border-b p-3">
                    <CardTitle className="text-xs font-black tracking-widest uppercase flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-primary" /> Registry Audit Trail
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-full min-h-[200px]">
                        {rawEvents && rawEvents.length > 0 ? (
                            <div className="divide-y divide-border/40">
                                {rawEvents.map((event) => (
                                    <div key={event.id} className="p-4 space-y-2 hover:bg-muted/10 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "p-1.5 rounded-lg",
                                                    event.event_type === 'enrolled' ? "bg-emerald-50/10 text-emerald-600" :
                                                    event.event_type === 'phone_contact' ? "bg-blue-50/10 text-blue-600" :
                                                    "bg-purple-50/10 text-purple-600"
                                                )}>
                                                    {event.event_type === 'enrolled' ? <UserPlus className="h-3.5 w-3.5" /> :
                                                     event.event_type === 'phone_contact' ? <Phone className="h-3.5 w-3.5" /> :
                                                     <Baby className="h-3.5 w-3.5" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-tight leading-none">
                                                        {event.event_type.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                                        {safeFormatDate(event.event_date)}
                                                    </p>
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                        {event.notes && (
                                            <p className="text-[10px] font-medium text-slate-600 leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-dashed">
                                                "{event.notes}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 italic">
                                <History className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest opacity-60">No audit events found</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
