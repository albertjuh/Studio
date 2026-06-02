
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
  Pencil,
  ClipboardList,
  Target,
  User,
  Heart,
  Hospital
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeParseDate, safeFormatDate } from '@/lib/timeline/formulas';
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
                <Activity className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synthesizing Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50" };

    const surveyItems = [
        { num: 1, label: 'Enrolled', done: true, date: activeP.firstAncDate, actual: activeP.createdAt },
        { num: 2, label: 'S2: 34-38w', done: !!(activeP as any).survey2_completed, date: resolvedP.survey2_target_date, actual: (activeP as any).survey2_completed_at },
        { num: 3, label: 'S3: Deliv.', done: !!(activeP as any).survey3_completed, date: resolvedP.survey3_target_date, actual: (activeP as any).survey3_completed_at },
        { num: 4, label: 'S4: 6wk PP', done: !!(activeP as any).survey4_completed, date: resolvedP.survey4_target_date, actual: (activeP as any).survey4_completed_at },
    ];

    return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-12 pt-4 px-4 md:px-0">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-full h-10 w-10 bg-white shadow-sm border-none">
                <Link href="/anc/participants"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter leading-none">{activeP.name}</h1>
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
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Pregnancy Journey Card */}
          <Card className="border-none ring-1 ring-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black tracking-widest uppercase text-primary">Pregnancy Journey</CardTitle>
                    <div className="flex flex-col items-end">
                        <span className="text-primary font-black text-sm">{resolvedP.current_ga.weeks}+{resolvedP.current_ga.days} WKS</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EDD: {safeFormatDate(resolvedP.edd, 'dd MMM')}</span>
                    </div>
                </div>
                <div className="space-y-3 mt-6">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>Enroll ({activeP.gestationalAge}w)</span>
                        <span className="text-primary">Conclusion</span>
                    </div>
                    <Progress value={progress_} className="h-2 rounded-full bg-primary/10 shadow-inner" />
                </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-5 rounded-3xl border-2 transition-all group relative overflow-hidden",
                        s.done ? "border-primary/20 bg-primary/5 shadow-sm" : "border-slate-100 bg-slate-50/50 grayscale opacity-60"
                    )}>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Survey {s.num}</p>
                            <h4 className="text-sm font-black tracking-tight">{s.label}</h4>
                        </div>
                        <div className="mt-4 flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold text-slate-400">{safeFormatDate(s.date, 'dd MMM')}</span>
                            {s.done && <CheckCircle2 className="h-4 w-4 text-primary absolute bottom-4 right-4" />}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          {/* Contact Matrix Card */}
          <Card className="border-none ring-1 ring-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <CardTitle className="text-lg font-black tracking-widest uppercase text-primary flex items-center gap-3">
                    <Phone className="h-6 w-6" /> Contact Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Primary Contact</Label>
                        <div className="p-5 rounded-[2rem] bg-slate-100/50 border-2 border-white shadow-inner font-mono font-black text-lg text-slate-900">
                            {Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kin / Emergency</Label>
                        <div className="p-5 rounded-[2rem] bg-primary/5 border-2 border-white shadow-inner flex flex-col gap-1">
                            <p className="text-sm font-black text-primary leading-tight">{activeP.nextOfKinName || 'Next of Kin'}</p>
                            <p className="font-mono font-black text-lg text-primary/70 leading-none">{activeP.alternativeContact || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button asChild variant="outline" className="h-14 rounded-[2rem] border-2 font-black uppercase tracking-widest flex-1 group hover:bg-primary/5">
                        <Link href="/anc/survey2-calls" className="flex items-center justify-center gap-3">
                            <Phone className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            Log Follow-Up
                        </Link>
                    </Button>
                    <Button asChild className="h-14 rounded-[2rem] font-black uppercase tracking-widest flex-1 bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                        <Link href="/anc/survey2-calls" className="flex items-center justify-center gap-3">
                            <Activity className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            Outcome Registry
                        </Link>
                    </Button>
                </div>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card className="border-none ring-1 ring-border shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
                <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-lg font-black tracking-widest uppercase flex items-center gap-3">
                        <History className="h-6 w-6 text-primary" /> Timeline Events
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                        {rawEvents && rawEvents.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {rawEvents.map((event) => (
                                    <div key={event.id} className="p-6 flex items-start justify-between group hover:bg-primary/[0.02] transition-colors">
                                        <div className="flex gap-4">
                                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                                {event.event_type === 'enrolled' ? <UserPlus className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-black uppercase tracking-tight text-slate-900">{event.event_type.replace('_', ' ')}</p>
                                                {event.notes && <p className="text-xs font-medium text-slate-500 italic">"{event.notes}"</p>}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeFormatDate(event.event_date, 'dd MMM')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center text-slate-300 italic font-black uppercase tracking-[0.3em] text-xs">No Events Recorded</div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar Sidebar */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border-none ring-1 ring-border shadow-2xl rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-xl p-8 flex flex-col items-center text-center space-y-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden group">
                    <User className="h-12 w-12 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tighter">{activeP.name}</h2>
                    <div className="flex justify-center mt-2">
                        <IdBadge id={activeP.participantId} hideLabel />
                    </div>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-[1.5rem] border-2 font-black uppercase tracking-widest text-[10px] gap-3">
                    <Pencil className="h-4 w-4" /> Edit Profile
                </Button>

                <div className="w-full pt-6 border-t border-slate-100 space-y-4 text-left">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Biological Metrics</p>
                        <p className="text-sm font-black text-slate-800">{activeP.age}y • {activeP.maritalStatus}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Assignment (RA)</p>
                        <p className={cn("text-sm font-black", raStyle.text)}>{activeP.registeredBy || 'Project Lead'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Site Assignment</p>
                        <p className="text-sm font-black text-primary leading-tight">{activeP.healthFacility}</p>
                    </div>
                </div>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-xl rounded-[2.5rem] overflow-hidden bg-emerald-600 text-white p-8 space-y-4">
                <div className="p-3 bg-white/20 w-fit rounded-2xl">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight">Clinical Integrity</h3>
                    <p className="text-xs font-medium text-emerald-100 leading-relaxed mt-1">This dossier is synchronized with the central PartoMa Study registry.</p>
                </div>
            </Card>
        </div>
      </div>
    </div>
    );
}
