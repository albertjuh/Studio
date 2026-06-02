
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  Clock,
  Phone,
  ChevronRight
} from 'lucide-react';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { useMemo } from 'react';
import { IdBadge } from '@/app/anc/components/id-badge';

export default function ActionList() {
  const firestore = useFirestore();

  const registrationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: registrations, isLoading } = useCollection<AncRegistration>(registrationsQuery);

  const prioritizedList = useMemo(() => {
    if (!registrations) return { overdue: [], dueNow: [] };
    
    const resolved = registrations.map(p => resolveParticipantStatuses(p)).filter(p => p && p.isValid);
    const overdue = resolved.filter(p => p?.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p?.overall_status === 'action_needed');

    return { overdue, dueNow };
  }, [registrations]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Organizing Intel...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 lg:pb-12 pt-4 px-4 md:px-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-lg h-9 w-9">
                <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[7px] tracking-widest">
                    <Timer className="h-2.5 w-2.5" /> Study Outreach
                </div>
                <h1 className="text-2xl font-black tracking-tighter">Due Today</h1>
            </div>
        </div>
        <Button asChild className="h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-500/20 gap-2">
            <Link href="/anc/survey2-calls">
                <Phone className="h-3.5 w-3.5" /> Survey 2 Call Plan <ChevronRight className="h-3 w-3" />
            </Link>
        </Button>
      </div>

      <div className="space-y-8">
        {prioritizedList.overdue.length > 0 && (
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <h2 className="text-xs font-black uppercase tracking-widest">Immediate Recovery</h2>
                    </div>
                    <Badge className="bg-rose-50 text-rose-700 h-5 text-[8px] font-black">{prioritizedList.overdue.length}</Badge>
                </div>
                <div className="grid gap-2">
                    {prioritizedList.overdue.map(p => (
                        <ActionCard key={p.id} participant={p} urgency="critical" />
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-xs font-black uppercase tracking-widest">Active Windows</h2>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 h-5 text-[8px] font-black">{prioritizedList.dueNow.length}</Badge>
            </div>
            {prioritizedList.dueNow.length === 0 && prioritizedList.overdue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-[2rem] opacity-40 gap-4">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No pending actions detected</p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {prioritizedList.dueNow.map(p => (
                        <ActionCard key={p.id} participant={p} urgency="high" />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: any, urgency: 'critical' | 'high' }) {
    return (
        <Card className={cn(
            "border-none ring-1 shadow-sm rounded-2xl overflow-hidden transition-all",
            urgency === 'critical' ? "ring-rose-200 bg-rose-50/20 border-l-4 border-l-rose-600" : "ring-emerald-200 bg-emerald-50/20 border-l-4 border-l-emerald-600"
        )}>
            <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black tracking-tight">{p.name}</h3>
                        <IdBadge id={p.participantId} className="scale-75 origin-left" hideLabel />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-primary/5 text-primary text-[7px] font-black px-1.5 h-4 border-none shadow-none">
                            {p.current_ga.weeks}+{p.current_ga.days}w
                        </Badge>
                        <Badge className="bg-primary/5 text-primary text-[7px] font-black px-1.5 h-4 border-none shadow-none">
                            {p.healthFacility.split(' (')[0]}
                        </Badge>
                        <Badge className="bg-violet-50 text-violet-700 text-[6px] font-black px-1.5 h-4 border-none shadow-none uppercase">
                            RA: {p.registeredBy || 'Unknown'}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-dashed">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map(s => {
                            const isDone = s === 1 || p[`survey${s}_completed`];
                            const isAttempted = p[`survey${s}_call_attempted`];
                            const isUnfinishedBusiness = !isDone && isAttempted;

                            return (
                                <div 
                                    key={s} 
                                    className={cn(
                                        "h-5 px-1.5 min-w-[22px] rounded flex flex-col items-center justify-center text-[6px] font-black transition-all",
                                        isDone 
                                          ? "bg-primary text-white shadow-sm" 
                                          : isUnfinishedBusiness
                                          ? "bg-amber-100 text-amber-700 border border-amber-400 animate-pulse"
                                          : "bg-slate-100 text-slate-400 border border-slate-200 border-dashed opacity-40"
                                    )}
                                >
                                  {isUnfinishedBusiness ? "INC" : `S${s}`}
                                </div>
                            );
                        })}
                    </div>
                    <Button size="sm" className="h-8 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest bg-primary shadow-lg shadow-primary/20" asChild>
                        <Link href={`/anc/participants/${p.id}`}>Outreach</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
