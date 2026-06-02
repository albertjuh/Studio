
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  CheckCircle2,
  User,
  Hospital,
  Timer,
  ExternalLink,
  Loader2,
  History,
  Activity,
  MessageSquare,
  UserCheck,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate, safeParseDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const RA_STYLES: Record<string, { text: string; bg: string; ring: string }> = {
  'Riki Mahamba': { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Lucy': { text: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Katie': { text: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Majid': { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
};

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const firestore = useFirestore();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    
    // Manual completion state
    const [isCompleting, setIsCompleting] = useState<number | null>(null);
    const [completionDate, setCompletionDate] = useState<Date>(new Date());
    const [completionNotes, setCompletionNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const docRef = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return doc(firestore, 'anc_registrations', decodeURIComponent(id));
    }, [firestore, id]);

    const { data: activeP, isLoading } = useDoc<AncRegistration>(docRef);

    const eventsQuery = useMemoFirebase(() => {
        if (!firestore || !id) return null;
        return query(collection(firestore, 'anc_registrations', decodeURIComponent(id), 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);
    const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? null) : null, [activeP]);

    const handleCompleteSurvey = async () => {
        if (!firestore || !isCompleting || !id) return;
        setIsSaving(true);
        try {
            const surveyNum = isCompleting;
            const updates: any = {
                [`survey${surveyNum}_completed`]: true,
                [`survey${surveyNum}_completed_at`]: Timestamp.fromDate(completionDate),
                updatedAt: serverTimestamp()
            };

            if (surveyNum === 3) updates.delivery_status = 'delivered';

            await updateDoc(doc(firestore, 'anc_registrations', decodeURIComponent(id)), updates);
            
            await addDoc(collection(firestore, 'anc_registrations', decodeURIComponent(id), 'timeline_events'), {
                event_type: 'survey_completed',
                survey_number: surveyNum,
                event_date: Timestamp.fromDate(completionDate),
                notes: completionNotes,
                logged_by: localStorage.getItem('ancUser') ? JSON.parse(localStorage.getItem('ancUser')!).name : 'RA',
                created_at: serverTimestamp()
            });

            toast({ title: `Survey ${surveyNum} Verified`, variant: 'success' });
            setIsCompleting(null);
            setCompletionNotes('');
            setCompletionDate(new Date());
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted || isLoading || !activeP || !resolvedP) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const surveyItems = [
        { 
            num: 1, 
            label: 'Survey 1', 
            desc: 'Enrollment', 
            done: true, 
            date: activeP.createdAt,
            status: 'completed'
        },
        { 
            num: 2, 
            label: 'Survey 2', 
            desc: 'Outreach Call', 
            done: !!(activeP as any).survey2_completed,
            date: (activeP as any).survey2_completed_at || (activeP as any).survey2_target_date || resolvedP.survey2_target_date,
            status: resolvedP.survey2_status
        },
        { 
            num: 3, 
            label: 'Survey 3', 
            desc: 'Delivery Record', 
            done: !!(activeP as any).survey3_completed,
            date: (activeP as any).survey3_completed_at || (activeP as any).survey3_target_date || resolvedP.survey3_target_date,
            status: resolvedP.survey3_status
        },
        { 
            num: 4, 
            label: 'Survey 4', 
            desc: '6wk Follow-up', 
            done: !!(activeP as any).survey4_completed,
            date: (activeP as any).survey4_completed_at || (activeP as any).survey4_target_date || resolvedP.survey4_target_date,
            status: resolvedP.survey4_status
        },
    ];

    const hasEvents = rawEvents && rawEvents.length > 0;

    return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6 px-4 md:px-0">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-8 w-8 bg-white shadow-sm ring-1 ring-border/50">
                <Link href="/anc/participants"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="space-y-0">
                <h1 className="text-lg font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <IdBadge id={activeP.participantId} hideLabel className="scale-75 origin-left" />
                    <Badge className={cn("rounded-md font-black px-1.5 py-0.5 uppercase text-[6px] tracking-widest border-none shadow-none ring-1", raStyle.bg, raStyle.text, raStyle.ring)}>
                        RA: {activeP.registeredBy}
                    </Badge>
                </div>
            </div>
        </div>
        <Badge className={cn("rounded-lg font-black px-3 py-1 uppercase text-[8px] tracking-widest border-none", resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white")}>
            {resolvedP.overall_status}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          {/* Section 1: Study Progress */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[8px] font-black tracking-widest uppercase text-primary/60 flex items-center gap-2">
                        <Timer className="h-3 w-3" /> Gestation Progress
                    </CardTitle>
                    <span className="text-primary font-black text-base tabular-nums leading-none">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                </div>
                <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-[6px] font-black uppercase tracking-widest text-slate-400">
                        <span>Enrollment: {activeP.gestationalAge}w</span>
                        <span>EDD: {safeFormatDate(resolvedP.edd, 'dd MMM')}</span>
                    </div>
                    <Progress value={progress_} className="h-1.5 rounded-full bg-primary/10" />
                </div>
            </CardHeader>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 rounded-lg border-2 flex flex-col justify-between min-h-[110px] transition-all",
                        s.done ? "border-primary/20 bg-primary/5 shadow-sm" : "border-slate-100 bg-slate-50/50"
                    )}>
                        <div className="space-y-0.5">
                            <div className="flex justify-between items-start">
                                <p className={cn(
                                    "text-[7px] font-black uppercase tracking-widest",
                                    s.done ? "text-primary" : "text-slate-400"
                                )}>Survey {s.num}</p>
                                {s.done && <CheckCircle2 className="h-2.5 w-2.5 text-primary" />}
                            </div>
                            <h4 className="text-[10px] font-black leading-tight">{s.desc}</h4>
                        </div>
                        
                        <div className="mt-2 space-y-0.5">
                            <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">
                                {s.done ? 'Verified Date' : 'Window Target'}
                            </p>
                            <p className="text-[9px] font-black text-foreground tabular-nums">
                                {s.date ? format(safeParseDate(s.date) || new Date(), 'dd MMM yy') : '--'}
                            </p>
                            {!s.done && (
                                <div className="flex flex-col gap-1 mt-1">
                                    {s.status && (
                                        <Badge variant="outline" className={cn(
                                            "text-[6px] px-1 h-3.5 border-none font-black uppercase w-fit",
                                            s.status === 'overdue' ? "bg-rose-100 text-rose-700" :
                                            s.status === 'due_now' ? "bg-amber-100 text-amber-700" :
                                            "bg-blue-100 text-blue-700"
                                        )}>
                                            {s.status}
                                        </Badge>
                                    )}
                                    <Button 
                                        onClick={(e) => { e.preventDefault(); setIsCompleting(s.num); }} 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-6 px-2 rounded-md text-[7px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                                    >
                                        Log Conducted
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          {/* Section 2: Communication Matrix (Moved here) */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50 p-3 border-b">
                <CardTitle className="text-[8px] font-black tracking-widest uppercase text-emerald-600 flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Communication Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border-2 border-dashed bg-slate-50 relative group">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5">Primary Mobile</p>
                        <p className="text-sm font-mono font-black mb-3 tabular-nums">{(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber)}</p>
                        <Button size="sm" className="w-full h-7 rounded-lg text-[7px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                            <a href={`https://wa.me/${(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber[0] : activeP.phoneNumber).replace(/\D/g, '')}`} target="_blank">WhatsApp <ExternalLink className="h-2.5 w-2.5 ml-1.5" /></a>
                        </Button>
                    </div>
                    <div className="p-3 rounded-xl border-2 border-dashed bg-slate-50">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5">Next of Kin</p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-black truncate">{activeP.nextOfKinName}</p>
                                <p className="text-[7px] font-bold text-primary uppercase">{activeP.nextOfKinRelation}</p>
                                <p className="text-[9px] font-mono font-bold mt-1.5 text-slate-600">{activeP.alternativeContact}</p>
                            </div>
                        ) : <p className="text-[9px] italic text-slate-300 py-2 text-center">No kin recorded</p>}
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Section 3: Outreach Intel & Activity (Growing Container) */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 p-3 border-b">
                <CardTitle className="text-[8px] font-black tracking-widest uppercase text-slate-500 flex items-center gap-2">
                    <History className="h-3 w-3" /> Outreach Intel & Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className={cn(hasEvents ? "max-h-[400px]" : "h-auto")}>
                    <div className="p-3 space-y-3">
                        {!hasEvents ? (
                            <div className="py-6 text-center italic text-slate-300 text-[10px] font-bold">No activity logs recorded yet.</div>
                        ) : (
                            rawEvents.map((event, i) => (
                                <div key={i} className="flex gap-3 relative pb-3 last:pb-0">
                                    {i !== rawEvents.length - 1 && <div className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-100" />}
                                    <div className={cn(
                                        "h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm",
                                        event.event_type === 'phone_contact' ? "bg-emerald-500 text-white" : "bg-primary text-white"
                                    )}>
                                        {event.event_type === 'phone_contact' ? <Phone className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                    </div>
                                    <div className="flex-1 space-y-1 pt-0.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-tight">
                                                {event.event_type === 'phone_contact' ? 'Outreach Activity' : event.event_type === 'survey_completed' ? `Survey ${event.survey_number} Conducted` : 'Study Event'}
                                            </p>
                                            <span className="text-[7px] font-black text-slate-400 uppercase">
                                                {event.event_date?.toDate ? format(event.event_date.toDate(), 'dd MMM yyyy') : '--'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                                {event.outcome && (
                                                    <Badge className="bg-white text-emerald-700 ring-1 ring-emerald-200 border-none font-black text-[7px] h-3.5 px-1 rounded-sm uppercase tracking-widest">
                                                        {event.outcome.replace('_', ' ')}
                                                    </Badge>
                                                )}
                                                {event.event_outcome_date && (
                                                    <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[7px] h-3.5 px-1 rounded-sm uppercase tracking-widest">
                                                        EVENT: {format(safeParseDate(event.event_outcome_date) || new Date(), 'dd MMM')}
                                                    </Badge>
                                                )}
                                            </div>
                                            {event.notes && (
                                                <div className="flex gap-2">
                                                    <MessageSquare className="h-2.5 w-2.5 text-slate-300 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-medium text-slate-500 italic leading-tight">"{event.notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest pl-1">RA: {event.logged_by || 'System'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-3">
            {/* Clinical Identity Card */}
            <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl p-4 text-center space-y-4 bg-white">
                <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-6 w-6" />
                </div>
                <div className="space-y-0.5">
                    <h2 className="text-base font-black tracking-tighter leading-none">{activeP.name}</h2>
                    <IdBadge id={activeP.participantId} hideLabel className="scale-75" />
                </div>
                <div className="pt-3 border-t space-y-3 text-left">
                    <div className="flex justify-between items-center">
                        <span className="text-[7px] font-black uppercase text-slate-400">Biologicals</span>
                        <div className="flex gap-1">
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[7px] h-4">{activeP.age}Y</Badge>
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[7px] h-4">{activeP.maritalStatus}</Badge>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[7px] font-black uppercase text-slate-400">Site Assignment</span>
                        <div className="flex items-start gap-1.5 bg-primary/5 p-1.5 rounded-lg">
                            <Hospital className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <p className="text-[8px] font-black text-primary uppercase leading-tight">{activeP.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* System Integrity Notification */}
            <div className="p-3 bg-slate-900 rounded-xl text-white space-y-2 shadow-lg">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-[8px] font-black uppercase tracking-widest">System Integrity</p>
                </div>
                <p className="text-[7px] font-medium leading-relaxed uppercase tracking-widest opacity-80">
                    Profile is in read-only audit mode. Updates must be logged through the Outreach unit or Manual Verification flags.
                </p>
            </div>
            
            <div className="flex items-center justify-center p-8 opacity-20">
                <Activity className="h-6 w-6 text-primary animate-pulse" />
            </div>
        </div>
      </div>

      {/* Manual Survey Completion Modal */}
      {isCompleting && (
        <Dialog open={!!isCompleting} onOpenChange={(o) => !o && setIsCompleting(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-4 bg-primary/5 border-b">
                    <h3 className="font-black text-base tracking-tight uppercase">Verify Survey {isCompleting}</h3>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Confirm clinical activity for {activeP.name}</p>
                </div>
                <div className="p-5 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Date Conducted *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full h-10 rounded-xl font-bold text-xs justify-start gap-2">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                    {format(completionDate, 'PPP')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={completionDate} onSelect={(d) => d && setCompletionDate(d)} disabled={(d) => d > new Date()} />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Conducting RA Notes</Label>
                        <Textarea 
                            value={completionNotes} 
                            onChange={e => setCompletionNotes(e.target.value)} 
                            className="rounded-xl text-[10px] italic font-medium p-3 min-h-[100px]" 
                            placeholder="Enter specific clinical or participant context from the survey session..." 
                        />
                    </div>
                </div>
                <DialogFooter className="p-3 bg-slate-50 border-t flex flex-row gap-2">
                    <Button variant="ghost" onClick={() => setIsCompleting(null)} className="h-9 rounded-xl font-black uppercase text-[8px] tracking-widest flex-1">Discard</Button>
                    <Button 
                        onClick={handleCompleteSurvey} 
                        disabled={isSaving} 
                        className="h-9 rounded-xl font-black uppercase text-[8px] tracking-widest flex-[2] bg-primary shadow-lg shadow-primary/20 text-white"
                    >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3 w-3 mr-1.5" />} 
                        Verify Activity
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
    );
}

