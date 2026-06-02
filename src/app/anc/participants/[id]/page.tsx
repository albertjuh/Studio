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
  Baby
} from 'lucide-react';
import { type AncRegistration, type TimelineEvent } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses, safeParseDate, safeFormatDate } from '@/lib/timeline/formulas';
import { useEffect, useState, useMemo, use } from 'react';
import { Label } from "@/components/ui/label";
import { IdBadge } from '@/app/anc/components/id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ParticipantTimelineDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    
    const firestore = useFirestore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        const userStr = localStorage.getItem('ancUser');
        if (userStr) {
            setUserRole(JSON.parse(userStr).role);
        }
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
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Dossier...</p>
            </div>
        );
    }

    const progress_ = Math.min(100, (resolvedP.current_ga.weeks / 40) * 100);

    const surveyItems = [
        { num: 1, label: 'Enrollment', done: true, date: activeP.firstAncDate, actual: activeP.createdAt },
        { num: 2, label: '34-38w Call', done: !!(activeP as any).survey2_completed, date: (resolvedP as any)?.survey2_target_date, actual: (activeP as any).survey2_completed_at, attempted: (activeP as any).survey2_call_attempted },
        { num: 3, label: 'Delivery', done: !!(activeP as any).survey3_completed, date: (resolvedP as any)?.survey3_target_date, actual: (activeP as any).survey3_completed_at, attempted: (activeP as any).survey3_call_attempted },
        { num: 4, label: '6wk PP', done: !!(activeP as any).survey4_completed, date: (resolvedP as any)?.survey4_target_date, actual: (activeP as any).survey4_completed_at, attempted: (activeP as any).survey4_call_attempted },
    ];

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
        <div className="flex items-center gap-2">
            <Badge className={cn(
                "rounded-lg font-black px-2 py-1 uppercase text-[8px] border-none shadow-sm",
                resolvedP.overall_status === 'overdue' ? "bg-rose-600 text-white" : "bg-primary text-white"
            )}>
                {resolvedP.overall_status.replace('_', ' ')}
            </Badge>
        </div>
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
                        s.done ? "border-primary/20 bg-primary/5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" : (s.attempted && !s.done ? "border-amber-200 bg-amber-50/50" : "border-border/50 bg-muted/20")
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
                        <p className="text-xs font-bold">{safeFormatDate(activeP.enrollment_date || activeP.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Est. Confinement</p>
                        <p className="text-xs font-bold text-primary">{safeFormatDate(resolvedP.edd)}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
          
          <div className="p-4 bg-muted/30 border-2 border-dashed rounded-2xl text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Read-Only Dossier. Updates are managed via the <Link href="/anc/survey2-calls" className="text-primary hover:underline">Survey 2 Call Plan</Link> or assigned outreach tasks.
              </p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
            <Card className="border-none ring-1 ring-border shadow-sm rounded-2xl overflow-hidden bg-card h-full">
                <CardHeader className="bg-muted/30 border-b p-3">
                    <CardTitle className="text-xs font-black tracking-widest uppercase flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-primary" /> Registry Audit Trail
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
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
                            <div className="p-12 text-center text-slate-400 italic font-bold text-[10px] uppercase tracking-widest">
                                No audit events found
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
