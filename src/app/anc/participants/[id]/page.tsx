
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
  MapPin,
  User,
  Users,
  CheckCircle2,
  CalendarIcon,
  MessageSquare,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [survey2Status, setSurvey2Status] = useState<'complete' | 'incomplete'>('incomplete');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [contactNotes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date());
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryOutcome, setDeliveryOutcome] = useState<'live_birth' | 'stillbirth' | 'other'>('live_birth');

  useEffect(() => {
    const userStr = localStorage.getItem('ancUser');
    if (userStr) {
      setUserRole(JSON.parse(userStr).role);
    }
  }, []);

  const isViewer = userRole === 'viewer';
  const isAdmin = userRole === 'admin';
  
  const handleRecordDelivery = async () => {
    if (!firestore || !id || isViewer || !deliveryDate) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(firestore, 'anc_registrations', id as string), {
        delivery_date_confirmed: true,
        delivery_date: Timestamp.fromDate(deliveryDate),
        delivery_outcome: deliveryOutcome,
        survey3_completed: true,
        survey3_status: 'completed',
        survey4_status: 'pending',
        overall_status: 'on_track',
        last_updated: serverTimestamp(),
      });
      await addDoc(collection(firestore, 'anc_registrations', id as string, 'timeline_events'), {
        event_type: 'delivery_recorded',
        event_date: Timestamp.fromDate(deliveryDate),
        notes: deliveryNotes || `Delivery recorded. Outcome: ${deliveryOutcome.replace('_', ' ')}. Survey 3 complete. Survey 4 (6-week postpartum) now active.`,
        created_at: serverTimestamp(),
        status_outcome: deliveryOutcome,
      });
      toast({ title: "Delivery Recorded", description: "Survey 3 marked complete. Participant advanced to Survey 4 (6-week postpartum).", variant: "success" });
      setIsDeliveryDialogOpen(false);
      setDeliveryNotes('');
      setDeliveryDate(new Date());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTimelineEvent = async (eventId: string) => {
    if (!firestore || !id || !isAdmin) return;
    if (!confirm("Are you sure you want to remove this timeline event?")) return;

    try {
        await deleteDoc(doc(firestore, 'anc_registrations', id as string, 'timeline_events', eventId));
        toast({ title: "Event Purged", variant: "success" });
    } catch (err: any) {
        toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
    }
  };

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'anc_registrations', id as string);
  }, [firestore, id]);

  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'anc_registrations', id as string, 'timeline_events'), orderBy('created_at', 'desc'));
  }, [firestore, id]);

  const { data: p, isLoading } = useDoc<AncRegistration>(docRef);
  const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);

  const resolvedP = useMemo(() => p ? resolveParticipantStatuses(p) : null, [p]);

  const handleLogContactSubmit = async () => {
    if (!firestore || !id || isViewer) return;
    setIsSubmitting(true);

    try {
        if (survey2Status === 'complete') {
            await updateDoc(doc(firestore, 'anc_registrations', id as string), {
                survey2_completed: true,
                survey2_status: 'completed',
                last_contact_date: serverTimestamp()
            });
        }

        const eventData: any = {
            event_type: 'phone_contact',
            event_date: Timestamp.now(),
            notes: contactNotes || (survey2Status === 'complete' ? 'Survey 2 successfully completed.' : 'Follow-up call made.'),
            created_at: serverTimestamp(),
            status_outcome: survey2Status
        };

        if (survey2Status === 'incomplete' && reminderDate) {
            eventData.reminder_date = Timestamp.fromDate(reminderDate);
            eventData.event_type = 'reminder_set';
            eventData.notes = `${contactNotes ? contactNotes + ' ' : ''}Follow-up set for ${format(reminderDate, 'PPP')}.`;
        }

        await addDoc(collection(firestore, 'anc_registrations', id as string, 'timeline_events'), eventData);
        toast({ title: "Contact Logged", variant: "success" });
        setIsContactDialogOpen(false);
        setSurvey2Status('incomplete');
        setReminderDate(undefined);
        setNotes('');
    } catch (e: any) {
        toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading || !p || !resolvedP || !resolvedP.isValid) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Timeline Intelligence...</p>
    </div>
  );

  const enrollDate = safeParseDate(p.enrollment_date || p.createdAt || p.firstAncDate) || new Date();
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
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
            <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{p.name}</h1>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <IdBadge id={p.participantId} hideLabel />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span>{p.healthFacility}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
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
                        <span>Enrolled ({p.gestationalAge}wk)</span>
                        <span className="text-primary">Current GA ({ga.weeks}+{ga.days}wk)</span>
                        <span>Term (40wk)</span>
                    </div>
                    <div className="relative pt-4">
                        <Progress value={progress} className="h-4 rounded-full bg-muted/50" />
                        <div className="absolute top-0 left-[progress%] -translate-x-1/2 flex flex-col items-center" style={{ left: `${progress}%` }}>
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
                            <p className="text-xs font-bold truncate max-w-[120px]">{p.healthFacility}</p>
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

          {!isViewer && (
            <div className="grid grid-cols-2 gap-4">
                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-16 rounded-[1.5rem] border-2 font-black uppercase tracking-widest text-xs gap-3">
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
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Survey 2 Status</Label>
                                <RadioGroup defaultValue={survey2Status} onValueChange={(val: any) => setSurvey2Status(val)} className="grid grid-cols-2 gap-4">
                                    <Label htmlFor="complete" className={cn("flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer", survey2Status === 'complete' ? "border-emerald-500 bg-emerald-50" : "border-muted")}>
                                        <RadioGroupItem value="complete" id="complete" className="sr-only" />
                                        <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-600" />
                                        <span className="text-xs font-black uppercase">Complete</span>
                                    </Label>
                                    <Label htmlFor="incomplete" className={cn("flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer", survey2Status === 'incomplete' ? "border-amber-500 bg-amber-50" : "border-muted")}>
                                        <RadioGroupItem value="incomplete" id="incomplete" className="sr-only" />
                                        <AlertCircle className="mb-2 h-6 w-6 text-amber-600" />
                                        <span className="text-xs font-black uppercase">Incomplete</span>
                                    </Label>
                                </RadioGroup>
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes</Label>
                                <Textarea className="rounded-2xl border-2" value={contactNotes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter className="p-8 bg-muted/30 border-t">
                            <Button variant="ghost" onClick={() => setIsContactDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button onClick={handleLogContactSubmit} disabled={isSubmitting} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest bg-primary">Save Log</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                
                <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs gap-3">
                            <Baby className="h-5 w-5" /> Record Delivery
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-background">
                        <DialogHeader className="p-8 bg-emerald-50/50 border-b">
                            <DialogTitle className="text-2xl font-black tracking-tight">Confirm Delivery</DialogTitle>
                        </DialogHeader>
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery Date</Label>
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
                        </div>
                        <DialogFooter className="p-8 bg-muted/30 border-t">
                            <Button variant="ghost" onClick={() => setIsDeliveryDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                            <Button onClick={handleRecordDelivery} disabled={isSubmitting} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest bg-emerald-600 text-white">Commit Delivery</Button>
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
                        {rawEvents.map((e, i) => (
                            <div key={e.id} className="flex gap-6 relative group/event">
                                <div className={cn("h-10 w-10 rounded-2xl shrink-0 flex items-center justify-center ring-4 ring-background z-10 bg-primary text-white")}>
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="space-y-1 pt-1 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black uppercase tracking-widest">{e.event_type.replace('_', ' ')}</h4>
                                        <span className="text-[10px] font-bold text-muted-foreground" suppressHydrationWarning>
                                            {safeParseDate(e.created_at) ? formatDistanceToNow(safeParseDate(e.created_at)!, { addSuffix: true }) : 'N/A'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{e.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground italic text-xs">No activity recorded yet.</div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-none rounded-[2.5rem] bg-emerald-50/50 dark:bg-emerald-900/10">
                <CardContent className="p-8 space-y-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-background shadow-xl flex items-center justify-center ring-4 ring-emerald-100">
                            <User className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight">{p.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-6 border-t border-emerald-100/50">
                        <div className="p-4 rounded-2xl bg-background/50 border shadow-sm">
                            <p className="text-[9px] font-black uppercase text-slate-400">Clinical Bio</p>
                            <p className="text-sm font-bold">{p.age}y • {p.maritalStatus}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-background/50 border shadow-sm">
                            <p className="text-[9px] font-black uppercase text-slate-400">RA Recorded By</p>
                            <p className="text-sm font-bold">{p.registeredBy || 'Project Staff'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
