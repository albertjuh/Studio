"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
  History,
  Activity,
  MessageSquare,
  UserCheck,
  Smartphone,
  Clock,
  X
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate, safeParseDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { format } from 'date-fns';

const RA_STYLES: Record<string, { text: string; bg: string; ring: string }> = {
  'Riki Mahamba': { text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Lucy': { text: "text-cyan-600", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Katie': { text: "text-pink-600", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Majid': { text: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
};

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const firestore = useFirestore();
    const [mounted, setMounted] = useState(false);

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

    if (!mounted || isLoading || !activeP || !resolvedP) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const surveyItems = [
        { num: 1, label: 'Enrollment', done: true, date: activeP.createdAt, status: 'completed' },
        { num: 2, label: 'Outreach', done: !!(activeP as any).survey2_completed, date: (activeP as any).survey2_completed_at || (activeP as any).survey2_target_date || resolvedP.survey2_target_date, status: resolvedP.survey2_status },
        { num: 3, label: 'Delivery', done: !!(activeP as any).survey3_completed, date: (activeP as any).survey3_completed_at || (activeP as any).survey3_target_date || resolvedP.survey3_target_date, status: resolvedP.survey3_status },
        { num: 4, label: '6wk Follow', done: !!(activeP as any).survey4_completed, date: (activeP as any).survey4_completed_at || (activeP as any).survey4_target_date || resolvedP.survey4_target_date, status: resolvedP.survey4_status },
    ];

    const hasEvents = rawEvents && rawEvents.length > 0;

    return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6 px-3 md:px-0">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 md:h-8 md:w-8 bg-white shadow-sm ring-1 ring-border/50">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5 md:h-4 md:w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-xl md:text-lg font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 md:mt-0.5">
                    <IdBadge id={activeP.participantId} hideLabel className="scale-95 md:scale-75 origin-left" />
                    <Badge className={cn("rounded-md font-black px-2 py-0.5 uppercase text-[8px] md:text-[6px] tracking-widest border-none shadow-none ring-1", raStyle.bg, raStyle.text, raStyle.ring)}>
                        RA: {activeP.registeredBy}
                    </Badge>
                </div>
            </div>
        </div>
        <Badge className={cn("rounded-lg font-black px-4 py-2 md:py-1 uppercase text-[10px] md:text-[8px] tracking-widest border-none", resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white shadow-lg shadow-primary/20")}>
            {resolvedP.overall_status}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4 md:space-y-3">
          {/* Survey Progress */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-4 md:p-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-primary/60 flex items-center gap-2">
                        <Timer className="h-4 w-4 md:h-3 md:w-3" /> Milestone Suite
                    </CardTitle>
                    <span className="text-primary font-black text-2xl md:text-base tabular-nums leading-none">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                </div>
                <div className="space-y-2 md:space-y-1.5 mt-4 md:mt-3">
                    <div className="flex justify-between text-[9px] md:text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>GA Enroll: {activeP.gestationalAge}w</span>
                        <span>EDD: {safeFormatDate(resolvedP.edd, 'dd MMM')}</span>
                    </div>
                    <Progress value={progress_} className="h-2 rounded-full bg-primary/10" />
                </div>
            </CardHeader>
            <CardContent className="p-2 md:p-3 grid grid-cols-4 gap-1.5 md:gap-2">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 md:p-2.5 rounded-xl border-2 flex flex-col justify-between min-h-[110px] md:min-h-[90px] transition-all duration-500",
                        s.done 
                          ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                          : "bg-primary/[0.04] border-primary/20 text-primary/40"
                    )}>
                        <div className="space-y-1">
                            <div className="flex justify-between items-start">
                                <p className={cn("text-[9px] md:text-[7px] font-black uppercase tracking-[0.2em]", s.done ? "text-white/80" : "text-primary/60")}>
                                    Survey {s.num}
                                </p>
                                {s.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <h4 className={cn("text-[11px] md:text-[9px] font-black leading-tight tracking-tight uppercase", s.done ? "text-white" : "text-primary/80")}>
                                {s.label}
                            </h4>
                        </div>
                        <div className="space-y-0.5">
                            <p className={cn("text-[7px] md:text-[6px] font-bold uppercase tracking-widest leading-none", s.done ? "text-white/60" : "text-primary/40")}>
                                {s.done ? 'Recorded' : 'Target'}
                            </p>
                            <p className={cn("text-[11px] md:text-[9px] font-black tabular-nums leading-none", s.done ? "text-white" : "text-primary/70")}>
                                {s.date ? format(safeParseDate(s.date) || new Date(), 'dd MMM') : '--'}
                            </p>
                            {!s.done && s.status && (
                                <Badge variant="outline" className={cn(
                                    "text-[7px] md:text-[6px] px-1 h-4 border-none font-black uppercase w-fit mt-1.5", 
                                    s.status === 'overdue' ? "bg-rose-100 text-rose-700" : 
                                    s.status === 'due_now' ? "bg-amber-100 text-amber-700" : 
                                    "bg-blue-100 text-blue-700"
                                )}>
                                    {s.status}
                                </Badge>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          {/* Communication Matrix */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-4 md:p-3 border-b">
                <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-slate-600 flex items-center gap-2">
                    <Phone className="h-4 w-4 md:h-3 md:w-3" /> Communication Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
                    <div className="p-4 md:p-2.5 rounded-xl border ring-1 ring-border/50 bg-muted/30">
                        <p className="text-[9px] md:text-[7px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Primary Mobile</p>
                        <div className="flex items-center gap-2.5 md:gap-2">
                            <div className="p-1.5 md:p-1 rounded-md bg-emerald-50 text-emerald-600">
                                <Smartphone className="h-4 w-4 md:h-3 md:w-3" />
                            </div>
                            <p className="text-base md:text-sm font-mono font-black tabular-nums text-slate-800 tracking-tight">
                                {(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber)}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 md:p-2.5 rounded-xl border ring-1 ring-border/50 bg-muted/30">
                        <p className="text-[9px] md:text-[7px] font-black uppercase text-slate-400 mb-2 tracking-[0.2em]">Next of Kin</p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-0.5">
                                <div className="flex items-baseline justify-between">
                                    <p className="text-sm md:text-xs font-black truncate text-slate-800">{activeP.nextOfKinName}</p>
                                    <p className="text-[9px] md:text-[7px] font-bold text-primary uppercase">{activeP.nextOfKinRelation}</p>
                                </div>
                                <p className="text-xs md:text-[9px] font-mono font-bold text-slate-600 tabular-nums">{activeP.alternativeContact}</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 md:gap-2 text-slate-300 py-1.5 md:py-1">
                                <User className="h-4 w-4 md:h-3 md:w-3" />
                                <p className="text-sm md:text-[9px] italic font-bold">No kin recorded</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
          </Card>

          {/* Outreach Timeline */}
          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50 p-4 md:p-3 border-b">
                <CardTitle className="text-[10px] md:text-[8px] font-black tracking-widest uppercase text-slate-500 flex items-center gap-2">
                    <History className="h-4 w-4 md:h-3 md:w-3" /> Outreach Intel & Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className={cn(hasEvents ? "max-h-[500px] md:max-h-[400px]" : "h-auto")}>
                    <div className="p-4 md:p-3 space-y-6 md:space-y-3">
                        {!hasEvents ? (
                            <div className="py-14 text-center italic text-slate-300 text-sm md:text-[10px] font-bold">No activity logs recorded yet.</div>
                        ) : (
                            rawEvents.map((event, i) => (
                                <div key={i} className="flex gap-4 md:gap-3 relative pb-6 md:pb-3 last:pb-0">
                                    {i !== rawEvents.length - 1 && <div className="absolute left-[19px] md:left-[13px] top-10 md:top-7 bottom-0 w-px bg-slate-100" />}
                                    <div className={cn("h-10 w-10 md:h-7 md:w-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm", event.event_type === 'phone_contact' ? "bg-emerald-500 text-white" : "bg-primary text-white")}>
                                        {event.event_type === 'phone_contact' ? <Phone className="h-4 w-4 md:h-3 md:w-3" /> : <UserCheck className="h-4 w-4 md:h-3 md:w-3" />}
                                    </div>
                                    <div className="flex-1 space-y-2 md:space-y-1 pt-1 md:pt-0.5">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs md:text-[10px] font-black uppercase tracking-tight">{event.event_type === 'phone_contact' ? 'Outreach Activity' : event.event_type === 'survey_completed' ? `Survey ${event.survey_number} Conducted` : 'Study Event'}</p>
                                            <span className="text-[10px] md:text-[7px] font-black text-slate-400 uppercase">{event.event_date?.toDate ? format(event.event_date.toDate(), 'dd MMM yyyy') : '--'}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 md:p-2 rounded-lg border border-slate-100">
                                            <div className="flex flex-wrap gap-2 md:gap-1.5 mb-2.5 md:mb-1.5">
                                                {event.outcome && <Badge className="bg-white text-emerald-700 ring-1 ring-emerald-200 border-none font-black text-[10px] md:text-[7px] h-5 md:h-3.5 px-2 md:px-1 rounded-sm uppercase tracking-widest">{event.outcome.replace('_', ' ')}</Badge>}
                                                {(event as any).event_outcome_date && <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] md:text-[7px] h-5 md:h-3.5 px-2 md:px-1 rounded-sm uppercase tracking-widest">EVENT: {format(safeParseDate((event as any).event_outcome_date) || new Date(), 'dd MMM')}</Badge>}
                                            </div>
                                            {event.notes && <div className="flex gap-3 md:gap-2"><MessageSquare className="h-4 w-4 md:h-2.5 md:w-2.5 text-slate-300 shrink-0 mt-1 md:mt-0.5" /><p className="text-sm md:text-[10px] font-medium text-slate-500 italic leading-tight">"{event.notes}"</p></div>}
                                        </div>
                                        <p className="text-[10px] md:text-[7px] font-bold text-slate-400 uppercase tracking-widest pl-1">RA: {event.logged_by || 'System'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4 md:space-y-3">
            {/* Clinical Identity Header */}
            <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl p-8 md:p-4 text-center space-y-6 md:space-y-4 bg-white">
                <div className="h-16 w-16 md:h-12 md:w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary"><User className="h-8 w-8 md:h-6 md:w-6" /></div>
                <div className="space-y-1.5 md:space-y-0.5">
                    <h2 className="text-2xl md:text-base font-black tracking-tighter leading-none">{activeP.name}</h2>
                    <IdBadge id={activeP.participantId} hideLabel className="scale-110 md:scale-75 origin-center" />
                </div>
                <div className="pt-6 md:pt-3 border-t space-y-5 md:space-y-3 text-left">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] md:text-[7px] font-black uppercase text-slate-400 tracking-[0.1em]">Biologicals</span>
                        <div className="flex gap-2 md:gap-1">
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] md:text-[7px] h-6 md:h-4 px-2">{activeP.age}Y</Badge>
                            <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] md:text-[7px] h-6 md:h-4 px-2">{activeP.maritalStatus}</Badge>
                        </div>
                    </div>
                    <div className="space-y-2 md:space-y-1">
                        <span className="text-[10px] md:text-[7px] font-black uppercase text-slate-400 tracking-[0.1em]">Site Assignment</span>
                        <div className="flex items-start gap-3 md:gap-1.5 bg-primary/5 p-3 md:p-1.5 rounded-lg">
                            <Hospital className="h-5 w-5 md:h-3 md:w-3 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm md:text-[8px] font-black text-primary uppercase leading-tight">{activeP.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="p-5 md:p-3 bg-slate-900 rounded-xl text-white space-y-3 md:space-y-2 shadow-lg">
                <div className="flex items-center gap-3 md:gap-1.5"><ShieldCheck className="h-5 w-5 md:h-3.5 md:w-3.5 text-emerald-400" /><p className="text-[11px] md:text-[8px] font-black uppercase tracking-widest">System Integrity</p></div>
                <p className="text-[10px] md:text-[7px] font-medium leading-relaxed uppercase tracking-widest opacity-80">Profile is in read-only audit mode. Milestone updates are synchronized automatically from the Outreach and Clinical modules.</p>
            </div>
            
            <div className="flex items-center justify-center p-12 md:p-8 opacity-20"><Activity className="h-8 w-8 md:h-6 md:w-6 text-primary animate-pulse" /></div>
        </div>
      </div>
    </div>
    );
}
