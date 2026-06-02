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
  ExternalLink
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { Label } from "@/components/ui/label";
import { IdBadge } from '@/app/anc/components/id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const RA_STYLES: Record<string, { text: string; bg: string }> = {
  'Riki Mahamba': { text: "text-emerald-700", bg: "bg-emerald-50" },
  'Lucy': { text: "text-cyan-700", bg: "bg-cyan-50" },
  'Katie': { text: "text-pink-700", bg: "bg-pink-50" },
  'Majid': { text: "text-yellow-700", bg: "bg-yellow-50" },
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Activity className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synthesizing Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50" };

    const surveyItems = [
        { num: 1, label: 'Enrolled', done: true, date: activeP.firstAncDate },
        { num: 2, label: 'S2: Call', done: !!(activeP as any).survey2_completed, date: resolvedP.survey2_target_date },
        { num: 3, label: 'S3: Deliv.', done: !!(activeP as any).survey3_completed, date: resolvedP.survey3_target_date },
        { num: 4, label: 'S4: 6wk PP', done: !!(activeP as any).survey4_completed, date: resolvedP.survey4_target_date },
    ];

    return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-12 pt-4 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-full h-10 w-10 bg-white shadow-sm border-none">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter leading-none">{activeP.name}</h1>
                <div className="flex items-center gap-3">
                    <IdBadge id={activeP.participantId} hideLabel className="bg-slate-100" />
                    <Badge className={cn("rounded-lg font-black px-2 py-0.5 uppercase text-[8px] border-none shadow-sm", raStyle.bg, raStyle.text)}>
                        RA: {activeP.registeredBy || 'Unknown'}
                    </Badge>
                </div>
            </div>
        </div>
        <Badge className={cn(
            "rounded-full font-black px-6 py-2 uppercase text-[10px] tracking-widest border-none shadow-lg",
            resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white"
        )}>
            {resolvedP.overall_status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          
          <Card className="border-none ring-1 ring-border shadow-xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 p-6 md:p-8 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-black tracking-[0.2em] uppercase text-primary/60">Pregnancy Journey</CardTitle>
                    <div className="flex flex-col items-end">
                        <span className="text-primary font-black text-xl tracking-tighter">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EDD: {safeFormatDate(resolvedP.edd, 'dd MMM')}</span>
                    </div>
                </div>
                <div className="space-y-3 mt-6">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>Enroll ({activeP.gestationalAge}w)</span>
                        <span className="text-primary">Conclusion</span>
                    </div>
                    <Progress value={progress_} className="h-1.5 rounded-full bg-primary/10" />
                </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                {surveyItems.map((s) => {
                    const isDone = s.done;
                    const isAttempted = (activeP as any)[`survey${s.num}_call_attempted`];
                    const isUnfinished = !isDone && isAttempted;
                    
                    return (
                        <div key={s.num} className={cn(
                            "p-5 rounded-xl border-2 transition-all group relative overflow-hidden",
                            isDone ? "border-primary/20 bg-primary/5" : 
                            isUnfinished ? "border-amber-400 bg-amber-50 animate-pulse" :
                            "border-slate-100 bg-slate-50/50 grayscale opacity-60"
                        )}>
                            <div className="space-y-1">
                                <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Phase {s.num}</p>
                                <h4 className="text-xs font-black tracking-tight">{isUnfinished ? "INC" : s.label}</h4>
                            </div>
                            <div className="mt-4 flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-slate-400">{safeFormatDate(s.date, 'dd MMM')}</span>
                                {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-primary absolute bottom-4 right-4" />}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 p-6 md:p-8 border-b">
                <CardTitle className="text-[10px] font-black tracking-[0.2em] uppercase text-primary/60 flex items-center gap-3">
                    <Phone className="h-4 w-4" /> Contact Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-xl border-2 border-dashed bg-card hover:bg-emerald-500/[0.02] transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Baby className="h-12 w-12 text-primary" />
                        </div>
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Primary Participant Contact</p>
                        <p className="text-lg font-mono font-black mb-6">{Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber}</p>
                        <Button size="sm" className="w-full h-10 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" asChild>
                            <a href={`https://wa.me/${(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber[0] : activeP.phoneNumber).replace(/\D/g, '')}`} target="_blank">
                                Start WhatsApp <ExternalLink className="h-3.5 w-3.5 ml-2" />
                            </a>
                        </Button>
                    </div>
                    <div className="p-6 rounded-xl border-2 border-dashed bg-card transition-colors relative overflow-hidden">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Emergency / Next of Kin</p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-1">
                                <p className="text-sm font-black truncate">{activeP.nextOfKinName}</p>
                                <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{activeP.nextOfKinRelation}</p>
                                <p className="font-mono font-bold text-xs mt-4 bg-muted/50 p-2 rounded-lg inline-block">{activeP.alternativeContact || 'N/A'}</p>
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-300 italic py-6">No next of kin data recorded.</p>
                        )}
                    </div>
                </div>
                
                <div className="p-4 bg-slate-50 border-2 border-dashed rounded-xl flex flex-col items-center text-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-slate-300" />
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Read-Only Audit Dossier</p>
                    <p className="text-[7px] font-medium text-slate-400 max-w-xs uppercase">Commit outcome updates exclusively via Survey 2 Call Plan.</p>
                </div>
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border shadow-xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
                <CardHeader className="bg-slate-50 border-b p-6 md:p-8">
                    <CardTitle className="text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-3">
                        <History className="h-4 w-4 text-primary" /> Timeline Events
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                        {rawEvents && rawEvents.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {rawEvents.map((event) => (
                                    <div key={event.id} className="p-6 flex items-start justify-between group hover:bg-primary/[0.02] transition-colors">
                                        <div className="flex gap-4">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                                {event.event_type === 'enrolled' ? <UserPlus className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-900">{event.event_type.replace('_', ' ')}</p>
                                                {event.notes && <p className="text-[10px] font-medium text-slate-500 italic">"{event.notes}"</p>}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{safeFormatDate(event.event_date, 'dd MMM')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center text-slate-200 italic font-black uppercase tracking-[0.3em] text-[10px]">No Events Recorded</div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl p-8 flex flex-col items-center text-center space-y-6">
                <div className="h-16 w-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden">
                    <User className="h-8 w-8" />
                </div>
                <div>
                    <h2 className="text-xl font-black tracking-tighter leading-none mb-2">{activeP.name}</h2>
                    <IdBadge id={activeP.participantId} hideLabel className="bg-slate-100" />
                </div>

                <div className="w-full pt-6 border-t border-slate-100 space-y-4 text-left">
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">Biological Metrics</p>
                        <p className="text-[10px] font-black text-slate-800">{activeP.age}y • {activeP.maritalStatus}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">RA Assignment</p>
                        <p className={cn("text-[10px] font-black", raStyle.text)}>{activeP.registeredBy || 'System'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">Health Site</p>
                        <p className="text-[10px] font-black text-primary leading-tight uppercase">{activeP.healthFacility}</p>
                    </div>
                </div>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-lg rounded-2xl overflow-hidden bg-emerald-600 text-white p-6 md:p-8 space-y-3">
                <ShieldCheck className="h-6 w-6 opacity-40" />
                <h3 className="text-xs font-black tracking-widest uppercase">Verified Dossier</h3>
                <p className="text-[8px] font-medium text-emerald-100 leading-relaxed uppercase tracking-tighter">This clinical profile is locked for integrity. Outcomes are managed via the Outreach Unit.</p>
            </Card>
        </div>
      </div>
    </div>
    );
}