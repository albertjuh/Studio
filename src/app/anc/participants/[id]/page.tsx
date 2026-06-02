
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
  CheckCircle2,
  User,
  Hospital,
  Timer,
  ExternalLink,
  Loader2,
  Clock
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeFormatDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';

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
        if (!firestore || !activeP?.id) return null;
        return query(collection(firestore, 'anc_registrations', activeP.id, 'timeline_events'), orderBy('event_date', 'desc'));
    }, [firestore, activeP?.id]);

    const { data: rawEvents } = useCollection<TimelineEvent>(eventsQuery);
    const resolvedP = useMemo(() => activeP ? (resolveParticipantStatuses(activeP) ?? null) : null, [activeP]);

    if (!mounted || isLoading || !activeP || !resolvedP) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);
    const raStyle = RA_STYLES[activeP.registeredBy || ''] || { text: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

    const surveyItems = [
        { num: 1, label: 'Enrolled', done: true },
        { num: 2, label: 'S2 Call', done: !!(activeP as any).survey2_completed },
        { num: 3, label: 'S3 Deliv', done: !!(activeP as any).survey3_completed },
        { num: 4, label: 'S4 6wk', done: !!(activeP as any).survey4_completed },
    ];

    return (
    <div className="max-w-5xl mx-auto space-y-3 pb-6">
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
        <div className="lg:col-span-8 space-y-3">
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
            <CardContent className="p-3 grid grid-cols-4 gap-2">
                {surveyItems.map((s) => (
                    <div key={s.num} className={cn(
                        "p-2 rounded-lg border-2 flex flex-col justify-between h-[60px] transition-all",
                        s.done ? "border-primary/20 bg-primary/5" : "border-slate-100 bg-slate-50/50 opacity-40"
                    )}>
                        <p className="text-[6px] font-black uppercase tracking-widest text-muted-foreground">P{s.num}</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black">{s.label}</h4>
                            {s.done && <CheckCircle2 className="h-3 w-3 text-primary" />}
                        </div>
                    </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-3 border-b">
                <CardTitle className="text-[8px] font-black tracking-widest uppercase text-primary/60 flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Communication Matrix
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border-2 border-dashed bg-slate-50 relative group">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5">Primary Mobile</p>
                        <p className="text-sm font-mono font-black mb-3 tabular-nums">{(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber.join(' / ') : activeP.phoneNumber)}</p>
                        <Button size="sm" className="w-full h-7 rounded-lg text-[7px] font-black uppercase tracking-widest bg-emerald-600" asChild>
                            <a href={`https://wa.me/${(Array.isArray(activeP.phoneNumber) ? activeP.phoneNumber[0] : activeP.phoneNumber).replace(/\D/g, '')}`} target="_blank">WhatsApp <ExternalLink className="h-2.5 w-2.5 ml-1.5" /></a>
                        </Button>
                    </div>
                    <div className="p-3 rounded-xl border-2 border-dashed bg-slate-50">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5">Next of Kin</p>
                        {activeP.nextOfKinName ? (
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-black truncate">{activeP.nextOfKinName}</p>
                                <p className="text-[7px] font-bold text-primary uppercase">{activeP.nextOfKinRelation}</p>
                                <p className="text-[9px] font-mono font-bold mt-1.5">{activeP.alternativeContact}</p>
                            </div>
                        ) : <p className="text-[9px] italic text-slate-300 py-4">No kin recorded</p>}
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-3">
            <Card className="border-none ring-1 ring-border/50 shadow-sm rounded-xl p-4 text-center space-y-4">
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

            <div className="p-3 bg-emerald-600 rounded-xl text-white space-y-2 shadow-lg shadow-emerald-900/10">
                <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <p className="text-[8px] font-black uppercase tracking-widest">Audit Policy</p>
                </div>
                <p className="text-[7px] font-medium leading-relaxed uppercase tracking-widest opacity-80">
                    Profile is in read-only audit mode. Updates must be logged through the Outreach unit.
                </p>
            </div>
        </div>
      </div>
    </div>
    );
}
