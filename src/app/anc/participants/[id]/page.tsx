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
import { resolveParticipantStatuses, safeParseDate, calculateCurrentGA, getTrimester } from '@/lib/timeline/formulas';
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

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // LOG OUTREACH STATE (Process Focused)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedSurveyToLog, setSelectedSurveyToLog] = useState<number>(2);
  const [contactOutcome, setContactOutcome] = useState<'contacted' | 'no_answer' | 'declined' | null>(null);
  const [pregnancyStatus, setPregnancyStatus] = useState<'still_pregnant' | 'delivered_live' | 'delivered_stillbirth' | 'abortion' | null>(null);
  const [contactNotes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OUTCOME REGISTRY STATE (Clinical Focused)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryOutcome, setDeliveryOutcome] = useState<'live_birth' | 'stillbirth' | 'abortion' | 'other' | null>(null);
  
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
    if (!firestore || !activeP?.id || isViewer || !contactOutcome) return;
    if (contactOutcome === 'contacted' && !pregnancyStatus) return;

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
            
            if (pregnancyStatus !== 'still_pregnant') {
                updateData.delivery_status = 'delivered';
                updateData.delivery_date_confirmed = serverTimestamp();
                updateData.delivery_outcome = 
                    pregnancyStatus === 'delivered_live' ? 'live_birth' : 
                    pregnancyStatus === 'delivered_stillbirth' ? 'stillbirth' : 'abortion';
                updateData.current_trimester = 'postpartum';
            }
        }

        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
        
        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            survey_number: selectedSurveyToLog,
            notes: contactNotes || `Outreach for Survey ${selectedSurveyToLog}. Outcome: ${contactOutcome}. Status: ${pregnancyStatus}`,
            created_at: serverTimestamp(),
            outcome: contactOutcome,
            pregnancy_status_at_contact: pregnancyStatus
        });
        
        toast({ title: "Outreach Logged", variant: "success" });
        setIsContactDialogOpen(false);
        setNotes('');
        setContactOutcome(null);
        setPregnancyStatus(null);
    } catch (e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRecordDelivery = async () => {
    if (!firestore || !activeP?.id || isViewer || !deliveryOutcome) return;
    setIsSubmitting(true);
    try {
        const updateData: any = { 
            delivery_status: 'delivered',
            delivery_date_confirmed: Timestamp.fromDate(deliveryDate || new Date()),
            current_trimester: 'postpartum',
            delivery_outcome: deliveryOutcome,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
        
        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), {
            event_type: 'delivery_recorded',
            event_date: Timestamp.fromDate(deliveryDate || new Date()),
            notes: deliveryNotes || `Pregnancy outcome recorded: ${deliveryOutcome.replace('_', ' ')}.`,
            created_at: serverTimestamp(),
            outcome: deliveryOutcome
        });
        
        toast({ title: "Clinical Outcome Synchronized", variant: "success" });
        setIsDeliveryDialogOpen(false);
        setDeliveryNotes('');
        setDeliveryOutcome(null);
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

    if (!window.confirm(`Permanently remove this protocol event: ${event.event_type.replace('_', ' ')}? This will revert the participant's status and clear the mistake so you can collect new data.`)) return;
    
    const recordRef = doc(firestore, 'anc_registrations', activeP.id);
    const eventRef = doc(firestore, 'anc_registrations', activeP.id, 'timeline_events', eventId);
    
    const updates: any = { updatedAt: serverTimestamp() };
    
    if (event.event_type === 'phone_contact' && event.survey_number && event.outcome === 'contacted') {
        updates[`survey${event.survey_number}_completed`] = false;
        updates[`survey${event.survey_number}_completed_at`] = null;
        updates[`survey${event.survey_number}_status`] = 'due_now';
    }
    
    if (event.event_type === 'delivery_recorded' || (event.event_type === 'phone_contact' && event.pregnancy_status_at_contact?.startsWith('delivered'))) {
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

  if (isTrulyLoading) return null;

  if (!activeP || !resolvedP || !resolvedP.isValid) return null;

  const rawEnrollDate_ = safeParseDate(activeP.enrollment_date || activeP.createdAt || activeP.firstAncDate);
  const enrollDate_ = rawEnrollDate_ || new Date();
  const ga_ = resolvedP.current_ga;
  const progress_ = Math.min(100, (ga_.weeks / 40) * 100);

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
                        {ga_.weeks}+{ga_.days} Wks Gestation
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
                        <div>
                            <p className="text-[6px] font-black uppercase text-slate-400">Survey {s.num}</p>
                            <p className="text-[9px] font-black truncate leading-none my-1">{s.label}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-[8px] font-bold text-slate-500 leading-tight">
                                Expect: {safeFormatDate(s.date)}
                            </p>
                            {s.done && (
                                <p className="text-[8px] font-black text-primary/70 leading-tight">
                                    Logged: {safeFormatDate(s.actual)}
                                </p>
                            )}
                        </div>

                        {s.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary mt-1" />}
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
                                <RadioGroup value={contactOutcome || ''} onValueChange={(v: any) => setContactOutcome(v)} className="grid grid-cols-1 gap-2">
                                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", contactOutcome === 'contacted' ? "ring-primary bg-primary/5" : "ring-slate-100 hover:ring-primary/20")} onClick={() => setContactOutcome('contacted')}>
                                        <RadioGroupItem value="contacted" id="c_contacted" />
                                        <Label htmlFor="c_contacted" className="font-black text-sm cursor-pointer flex-1 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Success: Participant Reached</Label>
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
                                    <RadioGroup value={pregnancyStatus || ''} onValueChange={(v: any) => setPregnancyStatus(v)} className="grid grid-cols-1 gap-2">
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", pregnancyStatus === 'still_pregnant' ? "ring-primary bg-primary/5" : "ring-slate-100")} onClick={() => setPregnancyStatus('still_pregnant')}>
                                            <RadioGroupItem value="still_pregnant" id="p_still_pregnant" />
                                            <Label htmlFor="p_still_pregnant" className="font-black text-sm cursor-pointer flex-1">🤰 Still Pregnant</Label>
                                        </div>
                                        <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", (pregnancyStatus && pregnancyStatus !== 'still_pregnant') ? "ring-emerald-500 bg-emerald-50" : "ring-slate-100")} onClick={() => setPregnancyStatus('delivered_live')}>
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
                                disabled={isSubmitting || !contactOutcome || (contactOutcome === 'contacted' && !pregnancyStatus)} 
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
                                          <RadioGroupItem value="live_birth" id="d_live_birth_real" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_live_birth_real" className="font-black text-sm cursor-pointer">👶 Live Birth</Label>
                                            <p className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">Confirmed neonatal vitality at delivery.</p>
                                          </div>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'stillbirth' ? "ring-rose-500 bg-rose-50" : "ring-slate-100")} onClick={() => setDeliveryOutcome('stillbirth')}>
                                          <RadioGroupItem value="stillbirth" id="d_stillbirth_real" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_stillbirth_real" className="font-black text-sm cursor-pointer">🕊️ Stillbirth</Label>
                                            <p className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">Loss occurring at/after 28 weeks gestation.</p>
                                          </div>
                                      </div>
                                      <div className={cn("flex items-center gap-3 p-4 rounded-2xl ring-2 transition-all cursor-pointer", deliveryOutcome === 'abortion' ? "ring-slate-900 bg-slate-100" : "ring-slate-100")} onClick={() => setDeliveryOutcome('abortion')}>
                                          <RadioGroupItem value="abortion" id="d_abortion_real" />
                                          <div className="flex-1">
                                            <Label htmlFor="d_abortion_real" className="font-black text-sm cursor-pointer">💔 Abortion / Early Loss</Label>
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

          <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-slate-900 text-white p-4">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Protocol Audit</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Enrollment Date</p>
                        <p className="text-xs font-bold">{safeFormatDate(enrollDate)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Est. Confinement</p>
                        <p className="text-xs font-bold text-primary">{safeFormatDate(resolvedP.edd)}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
