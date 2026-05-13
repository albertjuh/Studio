
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  Activity, 
  AlertCircle, 
  Clock,
  Download,
  Search,
  Filter,
  Hospital,
  ChevronRight,
  Sparkles,
  Timer,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DueTodayActionList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimits, setDisplayLimits] = useState<Record<string, number>>({
    overdue: 10,
    dueNow: 10,
    upcoming: 10
  });

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const prioritizedList = useMemo(() => {
    if (!participants) return { overdue: [], dueNow: [], upcoming: [] };
    const resolved = participants.map(p => resolveParticipantStatuses(p)).filter(p => p && p.isValid);
    const overdue = resolved.filter(p => p?.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p?.overall_status === 'action_needed');
    const upcoming = resolved.filter(p => p && (p?.survey2_status === 'due_soon' || p?.survey3_status === 'due_soon' || p?.survey4_status === 'due_soon') && p?.overall_status !== 'overdue' && p?.overall_status !== 'action_needed');
    return { overdue, dueNow, upcoming };
  }, [participants]);

  const filterAndLimit = (list: any[], type: string) => {
    const filtered = !searchTerm ? list : list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.participantId.toLowerCase().includes(searchTerm.toLowerCase()));
    return { visible: filtered.slice(0, displayLimits[type]), total: filtered.length };
  };

  if (isLoading || participants === null) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Organizing Intel...</p>
    </div>
  );

  const overdue = filterAndLimit(prioritizedList.overdue, 'overdue');
  const dueNow = filterAndLimit(prioritizedList.dueNow, 'dueNow');
  const upcoming = filterAndLimit(prioritizedList.upcoming, 'upcoming');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 pt-2 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-lg h-9 w-9">
                <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[7px] tracking-widest">
                    <Timer className="h-2.5 w-2.5" /> Forecast
                </div>
                <h1 className="text-2xl font-black tracking-tighter">Action List</h1>
            </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
                placeholder="Search dossiers..." 
                className="pl-9 h-10 rounded-xl border-none ring-1 ring-primary/10 bg-background text-xs font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="space-y-8">
          {overdue.total > 0 && (
              <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600" />
                          <h2 className="text-xs font-black uppercase tracking-widest">Priorities</h2>
                      </div>
                      <Badge className="bg-rose-50 text-rose-700 h-5 text-[8px] font-black">{overdue.total}</Badge>
                  </div>
                  <div className="grid gap-2">
                      {overdue.visible.map(p => (
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
                  <Badge className="bg-emerald-50 text-emerald-700 h-5 text-[8px] font-black">{dueNow.total}</Badge>
              </div>
              {dueNow.total === 0 ? (
                  <p className="text-[10px] text-center italic py-10 border-2 border-dashed rounded-2xl opacity-40">SYSTEM CLEAR</p>
              ) : (
                  <div className="grid gap-2">
                      {dueNow.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="high" />
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: any, urgency: 'critical' | 'high' | 'medium' | 'forecast' }) {
    return (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={cn(
                "border-none ring-1 shadow-sm rounded-xl overflow-hidden transition-all",
                urgency === 'critical' ? "ring-rose-200 bg-rose-50/20 border-l-4 border-l-rose-600" : "ring-emerald-200 bg-emerald-50/20 border-l-4 border-l-emerald-600"
            )}>
                <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black tracking-tight">{p.name}</h3>
                            <IdBadge id={p.participantId} className="scale-75 origin-left" hideLabel />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-white/80 text-[7px] font-black px-1.5 h-4 border-none shadow-none">{p.current_ga.weeks}+{p.current_ga.days}w</Badge>
                            <Badge className="bg-white/80 text-[7px] font-black px-1.5 h-4 border-none shadow-none">{p.healthFacility.split(' (')[0]}</Badge>
                            <span className="text-[7px] font-black text-slate-400 ml-auto">EDD: {format(p.edd, 'dd MMM')}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(s => {
                                const isDone = s === 1 || p[`survey${s}_completed`];
                                return (
                                    <div key={s} className={cn(
                                        "h-5 w-5 rounded flex items-center justify-center text-[7px] font-black",
                                        isDone ? "bg-primary text-white" : "bg-slate-100 text-slate-300"
                                    )}>S{s}</div>
                                );
                            })}
                        </div>
                        <Button size="sm" className="h-8 px-4 rounded-lg font-black uppercase text-[8px] tracking-widest bg-primary" asChild>
                            <Link href={`/anc/participants/${p.id}`}>Outreach</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
