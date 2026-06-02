
"use client";

import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Phone, 
  ShieldCheck, 
  Activity,
  CheckCircle2,
  History,
  UserPlus,
  Baby,
  User,
  Hospital,
  Timer,
  Clock,
  ExternalLink,
  Info,
  ChevronRight
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const RA_STYLES: Record<string, { text: string; bg: string; ring: string }> = {
  'Riki Mahamba': { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  'Lucy': { text: "text-cyan-700", bg: "bg-cyan-50", ring: "ring-cyan-200" },
  'Katie': { text: "text-pink-700", bg: "bg-pink-50", ring: "ring-pink-200" },
  'Majid': { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" },
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
        if (!firestore || !activeP?.id) return null;
        return query(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, activeP?.id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);
    const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? null) : null, [activeP]);

    if (!mounted || isLoading || !activeP || !resolvedP || !resolvedP.isValid) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <Activity className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">Synthesizing Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const surveyItems = [
        { num: 1, label: 'Enrolled', done: true, date: activeP.firstAncDate },
        { num: 2, label: 'S2: Call', done: !!(activeP as any).survey2_completed, date: resolvedP.survey2_target_date },
        { num: 3, label: 'S3: Deliv.', done: !!(activeP as any).survey3_completed, date: resolvedP.survey3_target_date },
        { num: 4, label: 'S4: 6wk PP', done: !!(activeP as any).survey4_completed, date: resolvedP.survey4_target_date },
    ];

    return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 lg:pb-12 pt-4 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11 bg-white shadow-sm border-none hover:scale-105 transition-all">
                <Link href="/anc/participants"><ArrowLeft className="h-6 w-6" /></Link>
            </Button>
            <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-3">
                    <IdBadge id={activeP.participantId} hideLabel className="bg-slate-100/50" />
                    <Badge className={cn("rounded-lg font-black px-3 py-1 uppercase text-[9px] border-none shadow-sm ring-1", raStyle.bg, raStyle.text, raStyle.ring)}>
                        RA: {activeP.registeredBy || 'System'}
                    </Badge>
                </div>
            </div>
        </div>
        <Badge className={cn(
            "rounded-xl font-black px-8 py-2.5 uppercase text-[11px] tracking-[0.2em] border-none shadow-2xl",
            resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white"
        )}>
            {resolvedP.overall_status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          
          <Card className="border-none ring-1 ring-border shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-[11px] font-black tracking-[0.3em] uppercase text-primary/60 flex items-center gap-3">
                        <Timer className="h-4 w-4" /> Pregnancy Journey
                    </CardTitle>
                    <div className="flex flex-col items-end">
                        <span className="text-primary font-black text-3xl tracking-tighter">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">EDD: {safeFormatDate(resolvedP.edd, 'dd MMM yy')}</span>
                    </div>
                </div>
                <div className="space-y-4 mt-8">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                        <span>Enrollment ({activeP.gestationalAge}w)</span>
                        <span className="text-primary">Conclusion (40w+)</span>
                    </div>
                    <Progress value={progress_} className="h-2 rounded-full bg-primary/10 shadow-inner" />
                </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {surveyItems.map((s) => {
                    const isDone = s.done;
                    const isAttempted = (activeP as any)[`survey${s.num}_call_attempted`];
                    const isUnfinished = !isDone && isAttempted;
                    
                    return (
                        <div key={s.num} className={cn(
                            "p-6 rounded-xl border-2 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-[120px]",
                            isDone ? "border-primary/20 bg-primary/5 shadow-xl shadow-primary/5" : 
                            isUnfinished ? "border-amber-400 bg-amber-50 animate-pulse" :
                            "border-slate-100 bg-slate-50/50 grayscale opacity-40"
                        )}>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">Phase {s.num}</p>
                                <h4 className="text-sm font-black tracking-tight">{isUnfinished ? "INCOMPLETE" : s.label}</h4>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-[10px] font-black text-slate-400">{safeFormatDate(s.date, 'dd MMM')}</span>
                                {isDone && <CheckCircle2 className="h-5 w-5 text-primary drop-shadow-sm" />}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <CardTitle className="text-[11px] font-black tracking-[0.3em] uppercase text-primary/60 flex items-center gap-3">
                    <Phone className="h-5 w-5" /> Contact Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-xl border-2 border-dashed bg-card hover:bg-emerald-500/[0.03] transition-all duration-500 relative overflow-hidden group hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 group-hover:opacity-10 transition-all">
                            <Baby className="h-24 w-24 text-primary" />
                        </div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Primary Participant Contact</p>
                        <p className="text-2xl font-mono font-black mb-8 tracking-tighter">{Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber}</p>
                        <Button size="lg" className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all" asChild>
                            <a href={`https://wa.me/${(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber[0] : activeP.phoneNumber).replace(/\D/g, '')}`} target="_blank">
                                Start WhatsApp Outreach <ExternalLink className="h-4 w-4 ml-3" />
                            </a>
                        </Button>
                    </div>
                    <div className="p-8 rounded-xl border-2 border-dashed bg-card transition-all duration-500 relative overflow-hidden">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Emergency / Next of Kin</p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-1.5">
                                <p className="text-lg font-black tracking-tight truncate">{activeP.nextOfKinName}</p>
                                <p className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded inline-block uppercase tracking-widest">{activeP.nextOfKinRelation}</p>
                                <div className="mt-6 flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-black/[0.03]">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <span className="font-mono font-black text-sm">{activeP.alternativeContact || 'N/A'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 flex flex-col items-center justify-center text-center opacity-30 grayscale">
                                <Users className="h-10 w-10 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">No record found</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 bg-slate-100/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center text-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                    <p className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-[0.2em]">Verified Clinical Audit Trail</p>
                    <p className="text-[9px] font-bold text-slate-400 max-w-sm uppercase tracking-tighter">This dossier is read-only for study integrity. Log updates via the specialized Outreach Unit.</p>
                </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b p-8">
                    <CardTitle className="text-[11px] font-black tracking-[0.3em] uppercase flex items-center gap-3">
                        <History className="h-5 w-5 text-primary" /> Timeline Events
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[450px]">
                        {rawEvents && rawEvents.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rawEvents.map((event) => (
                                    <div key={event.id} className="p-8 flex items-start justify-between group hover:bg-primary/[0.03] transition-all duration-300">
                                        <div className="flex gap-6">
                                            <div className="p-4 rounded-xl bg-primary/10 text-primary shadow-sm group-hover:scale-110 transition-transform">
                                                {event.event_type === 'enrolled' ? <UserPlus className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-1.5 pt-0.5">
                                                <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">{event.event_type.replace('_', ' ')}</p>
                                                {event.notes && <p className="text-xs font-bold text-slate-500 italic max-w-lg leading-relaxed">"{event.notes}"</p>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 pt-0.5">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{safeFormatDate(event.event_date, 'dd MMM')}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{safeFormatDate(event.event_date, 'yyyy')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-32 text-center flex flex-col items-center gap-4 grayscale opacity-20">
                                <Activity className="h-12 w-12" />
                                <p className="font-black uppercase tracking-[0.4em] text-[11px]">No System Events Detected</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
            <Card className="border-none ring-1 ring-border shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-10 flex flex-col items-center text-center space-y-8 relative">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                    <Hospital className="h-20 w-20" />
                </div>
                <div className="h-24 w-28 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden shadow-inner ring-1 ring-primary/20">
                    <User className="h-12 w-12" />
                </div>
                <div className="space-y-3 w-full">
                    <h2 className="text-3xl font-black tracking-tighter leading-none">{activeP.name}</h2>
                    <div className="flex justify-center">
                        <IdBadge id={activeP.participantId} hideLabel className="bg-slate-100 dark:bg-slate-800 scale-110" />
                    </div>
                </div>

                <div className="w-full pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6 text-left">
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Biological Metrics</p>
                        <div className="flex items-center gap-3">
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-black text-xs h-7 px-3 rounded-lg">{activeP.age}Y</Badge>
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-black text-xs h-7 px-3 rounded-lg">{activeP.maritalStatus}</Badge>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Primary Assignment</p>
                        <div className={cn("text-xs font-black px-4 py-2 rounded-xl ring-1 shadow-sm flex items-center gap-2", raStyle.bg, raStyle.text, raStyle.ring)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", raStyle.text.replace('text-', 'bg-'))} />
                            {activeP.registeredBy || 'Project System'}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Clinical Site Reach</p>
                        <div className="flex items-start gap-3 bg-primary/[0.03] p-4 rounded-xl ring-1 ring-primary/10">
                            <Hospital className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-primary leading-relaxed uppercase tracking-tighter">{activeP.healthFacility}</p>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-2xl rounded-xl overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-10 space-y-6 relative group cursor-help">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-16 w-16" />
                </div>
                <div className="p-3 bg-white/20 rounded-xl w-fit">
                    <Info className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-sm font-black tracking-[0.2em] uppercase">Security Protocol v1.2</h3>
                    <p className="text-[10px] font-bold text-emerald-100 leading-relaxed uppercase tracking-widest opacity-80">
                        Historical enrollment data is encrypted and locked for administrative integrity. 
                        No clinical metrics may be edited from this portal.
                    </p>
                </div>
                <div className="pt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.4em] text-emerald-300">
                    <Activity className="h-3 w-3 animate-pulse" /> Live Audit Active
                </div>
            </Card>
        </div>
      </div>
    </div>
    );
}
