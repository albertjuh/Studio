
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedSurveyToLog, setSelectedSurveyToLog] = useState<number>(2);
  const [surveyCompletionStatus, setSurveyCompletionStatus] = useState<'complete' | 'incomplete'>('incomplete');
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
        const updateData: any = { last_contact_date: serverTimestamp() };
        if (surveyCompletionStatus === 'complete') {
            updateData[`survey${selectedSurveyToLog}_completed`] = true;
            updateData[`survey${selectedSurveyToLog}_status`] = 'completed';
        }
        await updateDoc(doc(firestore, 'anc_registrations', activeP.id), updateData);
        const eventData: any = {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            survey_number: selectedSurveyToLog,
            notes: contactNotes || `Follow-up contact for Survey ${selectedSurveyToLog}.`,
            created_at: serverTimestamp(),
            status_outcome: surveyCompletionStatus
        };
        await addDoc(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), eventData);
        toast({ title: "Contact Logged", variant: "success" });
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
            updatedAt: serverTimestamp()
        };
        
        if (markS3CompleteOnDelivery) {
            updateData.survey3_completed = true;
            updateData.survey3_status = 'completed';
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
                {[
                    { num: 1, label: 'Enrolled', date: enrollDate, done: true },
                    { num: 2, label: 'S2: 34-38w', date: resolvedP.survey2_target_date, done: resolvedP.survey2_completed },
                    { num: 3, label: 'S3: Deliv.', date: resolvedP.survey3_target_date, done: resolvedP.survey3_completed },
                    { num: 4, label: 'S4: 6wk PP', date: resolvedP.survey4_target_date, done: resolvedP.survey4_completed },
                ].map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 rounded-xl border-2 transition-all",
                        s.done ? "border-primary/20 bg-primary/5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" : "border-border/50 bg-muted/20"
                    )}>
                        <p className="text-[6px] font-black uppercase text-slate-400">Survey {s.num}</p>
                        <p className="text-[9px] font-black truncate leading-none my-1">{s.label}</p>
                        <p className="text-[8px] font-bold text-slate-500">{safeFormatDate(s.date)}</p>
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
                        <Button variant="outline" className="h-10 rounded-xl border-2 font-black uppercase text-[9px] gap-2 hover:bg-muted/50">
                            <Phone className="h-3.5 w-3.5 text-primary" /> Log Follow-up
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-5 bg-primary/5 border-b">
                            <DialogTitle className="text-lg font-black tracking-tight">Log Outreach</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[50vh]">
                          <div className="p-5 space-y-4">
                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Target Module</Label>
                                  <Select value={selectedSurveyToLog.toString()} onValueChange={(v) => setSelectedSurveyToLog(parseInt(v))}>
                                      <SelectTrigger className="h-10 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="2">Survey 2 (34-38w)</SelectItem>
                                          <SelectItem value="3">Survey 3 (Delivery)</SelectItem>
                                          <SelectItem value="4">Survey 4 (6wk PP)</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Contact Outcome</Label>
                                  <RadioGroup defaultValue={surveyCompletionStatus} onValueChange={(val: any) => setSurveyCompletionStatus(val)} className="grid grid-cols-2 gap-2">
                                      <Label htmlFor="complete" className={cn("flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all", surveyCompletionStatus === 'complete' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-muted text-muted-foreground")}>
                                          <RadioGroupItem value="complete" id="complete" className="sr-only" />
                                          <CheckCircle2 className="h-5 w-5 mb-1" />
                                          <span className="text-[9px] font-black uppercase">Successful</span>
                                      </Label>
                                      <Label htmlFor="incomplete" className={cn("flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all", surveyCompletionStatus === 'incomplete' ? "border-amber-500 bg-amber-50 text-amber-700" : "border-muted text-muted-foreground")}>
                                          <RadioGroupItem value="incomplete" id="incomplete" className="sr-only" />
                                          <AlertCircle className="h-5 w-5 mb-1" />
                                          <span className="text-[9px] font-black uppercase">Partial/Failed</span>
                                      </Label>
                                  </RadioGroup>
                              </div>
                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Handover Notes</Label>
                                  <Textarea className="rounded-xl border text-xs italic min-h-[100px]" placeholder="Record qualitative context..." value={contactNotes} onChange={(e) => setNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-5 bg-muted/20 border-t">
                            <Button onClick={handleLogContactSubmit} disabled={isSubmitting} className="w-full h-11 rounded-xl font-black uppercase text-[10px] bg-primary shadow-lg shadow-primary/20">
                                {isSubmitting ? 'Syncing...' : 'Commit Protocol Entry'}
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
                    <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-background">
                        <DialogHeader className="p-5 bg-emerald-50/50 border-b">
                            <DialogTitle className="text-lg font-black tracking-tight text-emerald-800">Synchronize Outcome</DialogTitle>
                            <DialogDescription className="text-[8px] font-bold uppercase tracking-widest opacity-60">Record pregnancy conclusion metrics</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[50vh]">
                          <div className="p-5 space-y-4">
                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest">Event Date</Label>
                                  <Popover>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full h-10 rounded-lg text-xs font-bold ring-1 ring-emerald-100 border-none">
                                              {deliveryDate ? format(deliveryDate, "PP") : 'Select Date'}
                                              <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-40" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(d) => d > new Date()} /></PopoverContent>
                                  </Popover>
                              </div>

                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest">Outcome Category</Label>
                                  <Select value={deliveryOutcome} onValueChange={(v: any) => setDeliveryOutcome(v)}>
                                      <SelectTrigger className="h-10 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="live_birth">Live Birth</SelectItem>
                                          <SelectItem value="stillbirth">Stillbirth</SelectItem>
                                          <SelectItem value="abortion">Abortion (Loss)</SelectItem>
                                          <SelectItem value="other">Other Outcome</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>

                              <div className="flex items-center space-x-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                  <Checkbox id="markS3" checked={markS3CompleteOnDelivery} onCheckedChange={(v) => setMarkS3CompleteOnDelivery(!!v)} />
                                  <Label htmlFor="markS3" className="text-[9px] font-black uppercase cursor-pointer">Auto-complete Survey 3?</Label>
                              </div>

                              <div className="space-y-1.5">
                                  <Label className="text-[8px] font-black uppercase tracking-widest">Researcher Notes</Label>
                                  <Textarea className="rounded-xl border text-xs italic" placeholder="Protocol context or clinical notes..." value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} />
                              </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter className="p-5 bg-muted/20 border-t">
                            <Button onClick={handleRecordDelivery} disabled={isSubmitting} className="w-full h-11 rounded-xl font-black uppercase text-[10px] bg-emerald-600 shadow-lg shadow-emerald-500/20">
                                {isSubmitting ? 'Syncing...' : 'Log Final Outcome'}
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
                          <div key={e.id} className="flex gap-3 items-start border-l-2 border-primary/20 pl-3 py-1">
                              <div className="space-y-0.5 flex-1">
                                  <div className="flex items-center justify-between">
                                      <h4 className="text-[8px] font-black uppercase text-primary">
                                          {e.event_type.replace('_', ' ')}
                                      </h4>
                                      <span className="text-[7px] font-bold text-slate-400">
                                          {safeFormatDate(e.created_at)}
                                      </span>
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
