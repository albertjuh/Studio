
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Activity, 
  AlertCircle, 
  Clock,
  Search,
  ChevronRight,
  Sparkles,
  Timer,
  Users,
  ChevronDown,
  CheckCircle2,
  Phone
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

const RA_COLORS: Record<string, string> = {
  'Riki Mahamba': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  'Lucy': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200',
  'Katie': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200',
  'Majid': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
};

export default function DueTodayActionList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [displayLimits, setDisplayLimits] = useState<Record<string, number>>({
    overdue: 20,
    dueNow: 20,
    upcoming: 20,
    all: 30
  });

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const prioritizedList = useMemo(() => {
    if (!participants) return { overdue: [], dueNow: [], upcoming: [], all: [] };
    const resolved = participants.map(p => resolveParticipantStatuses(p)).filter(p => p && p.isValid);
    const overdue = resolved.filter(p => p?.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p?.overall_status === 'action_needed');
    const upcoming = resolved.filter(p => p && (p?.survey2_status === 'due_soon' || p?.survey3_status === 'due_soon' || p?.survey4_status === 'due_soon') && p?.overall_status !== 'overdue' && p?.overall_status !== 'action_needed');
    
    const all = [...resolved].sort((a, b) => {
        const dA = (a?.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date();
        const dB = (b?.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date();
        return dB.getTime() - dA.getTime();
    });

    return { overdue, dueNow, upcoming, all };
  }, [participants]);

  const filterAndLimit = (list: any[], type: string) => {
    const filtered = !searchTerm ? list : list.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.participantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.registeredBy || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
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
  const allList = filterAndLimit(prioritizedList.all, 'all');

  const incrementLimit = (type: string) => {
    setDisplayLimits(prev => ({
        ...prev,
        [type]: prev[type] + 20
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 pt-2 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" asChild className="rounded-lg h-9 w-9">
                <Link href="/anc/activities"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-primary font-black uppercase text-[7px] tracking-widest">
                    <Timer className="h-2.5 w-2.5" /> Study Outreach
                </div>
                <h1 className="text-2xl font-black tracking-tighter">Action List</h1>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl font-black uppercase text-[8px] tracking-widest bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-cyan-500/20 text-cyan-700 dark:text-cyan-400">
                <Link href="/anc/survey2-calls" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Survey 2 Call Plan
                </Link>
            </Button>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/50">
                <Switch 
                    id="show-all" 
                    checked={showAll} 
                    onCheckedChange={setShowAll}
                    className="scale-75"
                />
                <Label htmlFor="show-all" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                    {showAll ? "Global Timeline" : "Actions Only"}
                </Label>
            </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
                placeholder="Search name, ID, or RA..." 
                className="pl-9 h-10 rounded-xl border-none ring-1 ring-primary/10 bg-background text-xs font-bold shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="space-y-8">
          {showAll ? (
              <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <h2 className="text-xs font-black uppercase tracking-widest">Global Registry</h2>
                      </div>
                      <Badge className="bg-primary/10 text-primary h-5 text-[8px] font-black uppercase">{allList.total} Enrolled</Badge>
                  </div>
                  <div className="grid gap-2">
                      {allList.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency={p.overall_status === 'overdue' ? 'critical' : p.overall_status === 'action_needed' ? 'high' : 'forecast'} />
                      ))}
                  </div>
                  {allList.total > displayLimits.all && (
                      <div className="flex justify-center pt-4">
                          <Button 
                            variant="ghost" 
                            className="text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/5" 
                            onClick={() => incrementLimit('all')}
                          >
                              <ChevronDown className="h-3 w-3" /> Load More Records ({allList.total - displayLimits.all} remaining)
                          </Button>
                      </div>
                  )}
              </div>
          ) : (
              <>
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
                        {overdue.total > displayLimits.overdue && (
                            <div className="flex justify-center pt-2">
                                <Button 
                                    variant="ghost" 
                                    className="text-[9px] font-black uppercase tracking-[0.2em] gap-2 hover:text-rose-600"
                                    onClick={() => incrementLimit('overdue')}
                                >
                                    <ChevronDown className="h-3 w-3" /> Load All Priorities
                                </Button>
                            </div>
                        )}
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
                    {dueNow.total === 0 && overdue.total === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-[2rem] opacity-40 gap-4">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No pending actions detected</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {dueNow.visible.map(p => (
                                <ActionCard key={p.id} participant={p} urgency="high" />
                            ))}
                        </div>
                    )}
                    {dueNow.total > displayLimits.dueNow && (
                        <div className="flex justify-center pt-2">
                            <Button 
                                variant="ghost" 
                                className="text-[9px] font-black uppercase tracking-[0.2em] gap-2 hover:text-emerald-600"
                                onClick={() => incrementLimit('dueNow')}
                            >
                                <ChevronDown className="h-3 w-3" /> Load More Active Windows ({dueNow.total - displayLimits.dueNow} remaining)
                            </Button>
                        </div>
                    )}
                </div>
              </>
          )}
      </div>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: any, urgency: 'critical' | 'high' | 'medium' | 'forecast' }) {
    const raName = p.registeredBy || 'Unknown';
    const raColorClass = RA_COLORS[raName] || 'bg-violet-500/10 text-violet-600 border-none';

    return (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={cn(
                "border-none ring-1 shadow-sm rounded-2xl overflow-hidden transition-all",
                urgency === 'critical' ? "ring-rose-200 bg-rose-50/20 border-l-4 border-l-rose-600" : 
                urgency === 'high' ? "ring-emerald-200 bg-emerald-50/20 border-l-4 border-l-emerald-600" :
                "ring-blue-100 bg-blue-50/20 border-l-4 border-l-blue-400"
            )}>
                <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black tracking-tight">{p.name}</h3>
                            <IdBadge id={p.participantId} className="scale-75 origin-left" hideLabel />
                            <Badge className={cn("text-[7px] font-black px-1.5 h-4 border shadow-none ml-auto md:ml-0", raColorClass)}>
                                RA: {raName}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-primary/5 text-primary text-[7px] font-black px-1.5 h-4 border-none shadow-none">
                                {p.current_ga.weeks}+{p.current_ga.days}w
                            </Badge>
                            <Badge className="bg-primary/5 text-primary text-[7px] font-black px-1.5 h-4 border-none shadow-none">
                                {p.healthFacility.split(' (')[0]}
                            </Badge>
                            <span className="text-[7px] font-black text-slate-400 ml-auto">EDD: {format(p.edd, 'dd MMM')}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-dashed">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(s => {
                                const isDone = s === 1 || p[`survey${s}_completed`];
                                return (
                                    <div key={s} className={cn(
                                        "h-5 w-5 rounded flex flex-col items-center justify-center text-[7px] font-black transition-all",
                                        isDone 
                                          ? "bg-primary text-white shadow-sm" 
                                          : "bg-amber-50 text-amber-700 border border-amber-200 border-dashed"
                                    )}>
                                      {isDone ? `S${s}` : (
                                        <>
                                          <span className="leading-none text-[5px] opacity-60">S{s}</span>
                                          <span className="text-[6px] mt-0.5 leading-none">⏳</span>
                                        </>
                                      )}
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
        </motion.div>
    );
}
