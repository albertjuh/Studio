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
  Phone, 
  Baby, 
  AlertCircle, 
  Clock,
  Download,
  Search,
  Filter,
  Hospital,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';
import { IdBadge } from '@/app/anc/components/id-badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function DueTodayActionList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimits, setDisplayLimits] = useState<Record<string, number>>({
    overdue: 10,
    dueNow: 10,
    likelyDelivered: 10,
    upcoming: 10
  });

  const participantsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'anc_registrations');
  }, [firestore]);

  const { data: participants, isLoading } = useCollection<AncRegistration>(participantsQuery);

  const prioritizedList = useMemo(() => {
    if (!participants) return { overdue: [], dueNow: [], likelyDelivered: [], upcoming: [] };
    
    const resolved = participants
        .map(p => resolveParticipantStatuses(p))
        .filter(p => p && p.isValid);

    const overdue = resolved.filter(p => p?.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p?.overall_status === 'action_needed');
    const likelyDelivered = resolved.filter(p => p?.delivery_status === 'likely_delivered' || p?.delivery_status === 'overdue_pregnancy');
    
    const upcoming = resolved.filter(p => p && 
        (p?.survey2_status === 'due_soon' || p?.survey3_status === 'due_soon' || p?.survey4_status === 'due_soon') &&
        p?.overall_status !== 'overdue' && 
        p?.overall_status !== 'action_needed'
    );

    return { overdue, dueNow, likelyDelivered, upcoming };
  }, [participants]);

  const filterAndLimit = (list: any[], type: string) => {
    const filtered = !searchTerm 
        ? list 
        : list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.participantId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return {
        visible: filtered.slice(0, displayLimits[type]),
        total: filtered.length
    };
  };

  const handleViewMore = (type: string) => {
    setDisplayLimits(prev => ({ ...prev, [type]: prev[type] + 10 }));
  };

  if (isLoading || participants === null) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
        <Activity className="h-14 w-14 animate-spin text-primary" />
        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-primary/60">Organizing Daily Action Intel...</p>
    </div>
  );

  const overdue = filterAndLimit(prioritizedList.overdue, 'overdue');
  const dueNow = filterAndLimit(prioritizedList.dueNow, 'dueNow');
  const likelyDelivered = filterAndLimit(prioritizedList.likelyDelivered, 'likelyDelivered');
  const upcoming = filterAndLimit(prioritizedList.upcoming, 'upcoming');

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-32 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pt-4">
        <div className="flex items-center gap-6">
            <Button variant="secondary" size="icon" asChild className="rounded-2xl h-14 w-14 shadow-md bg-white dark:bg-slate-900 border border-primary/10">
                <Link href="/anc/activities"><ArrowLeft className="h-6 w-6" /></Link>
            </Button>
            <div>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.25em] text-[10px] mb-2">
                    <Timer className="h-4 w-4" /> Operational Forecast
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">Action <span className="text-primary italic">List</span></h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">
                    Daily Outreach & 14-Day Study Preparation
                </p>
            </div>
        </div>
        <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest border-2 shadow-xl hover:bg-muted/50">
            <Download className="mr-3 h-5 w-5 text-primary" /> Export Hub Tasks
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
                placeholder="Search dossiers by name or ID..." 
                className="pl-12 h-14 rounded-2xl border-none ring-1 ring-primary/10 bg-white dark:bg-slate-900/50 shadow-sm focus:ring-primary/40 focus:ring-2 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-none ring-1 ring-primary/10 shadow-sm bg-white dark:bg-slate-900/50">
            <Filter className="h-5 w-5 text-slate-500" />
        </Button>
      </div>

      <div className="space-y-24">
          {/* Section: Overdue */}
          {overdue.total > 0 && (
              <div className="space-y-10">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/30 ring-4 ring-rose-50 dark:ring-rose-900/20">
                              <AlertCircle className="h-7 w-7" />
                          </div>
                          <div>
                            <h2 className="text-3xl font-black tracking-tighter uppercase tracking-tight text-slate-900 dark:text-white leading-none">Immediate Priorities</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600 mt-1.5 opacity-80">Timeline Threshold Exceeded</p>
                          </div>
                      </div>
                      <Badge className="bg-rose-50 text-rose-700 border-none font-black text-xs px-4 py-1.5 rounded-full">{overdue.total} Tasks</Badge>
                  </div>
                  <div className="space-y-6">
                      {overdue.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="critical" />
                      ))}
                      {overdue.total > overdue.visible.length && (
                          <Button onClick={() => handleViewMore('overdue')} variant="secondary" className="w-full h-14 rounded-[2rem] border-2 border-dashed border-rose-200 font-black uppercase text-[11px] tracking-[0.2em] bg-rose-50/20 text-rose-600 hover:bg-rose-50 hover:border-rose-300">
                              Load More Overdue ({overdue.total - overdue.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              </div>
          )}

          {/* Section: Due Now */}
          <div className="space-y-10">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                          <Clock className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase tracking-tight text-slate-900 dark:text-white leading-none">Active Windows</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mt-1.5 opacity-80">Survey Collection Due Today</p>
                      </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-xs px-4 py-1.5 rounded-full">{dueNow.total} Tasks</Badge>
              </div>
              {dueNow.total === 0 ? (
                  <div className="py-24 text-center bg-emerald-50/10 border-4 border-dashed border-emerald-100 rounded-[4rem] text-slate-400 font-black italic text-sm">
                      <Sparkles className="h-10 w-10 mx-auto mb-4 opacity-20" />
                      SYSTEM CLEAR: ALL WINDOWS ACCOUNTED FOR
                  </div>
              ) : (
                  <div className="space-y-6">
                      {dueNow.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="high" />
                      ))}
                      {dueNow.total > dueNow.visible.length && (
                          <Button onClick={() => handleViewMore('dueNow')} variant="secondary" className="w-full h-14 rounded-[2rem] border-2 border-dashed border-emerald-200 font-black uppercase text-[11px] tracking-[0.2em] bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300">
                              Load More Due ({dueNow.total - dueNow.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              )}
          </div>

          {/* Section: Forecast (Upcoming) */}
          <div className="space-y-10">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-blue-50 dark:ring-blue-900/20">
                          <Sparkles className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase tracking-tight text-slate-900 dark:text-white leading-none">14-Day Forecast</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mt-1.5 opacity-80">Early Protocol Preparation</p>
                      </div>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-none font-black text-xs px-4 py-1.5 rounded-full">{upcoming.total} Forecasts</Badge>
              </div>
              {upcoming.total === 0 ? (
                  <div className="py-20 text-center bg-muted/20 border-2 border-dashed rounded-[3rem] text-muted-foreground font-bold italic text-xs uppercase tracking-widest">
                      No windows opening in the next cycle.
                  </div>
              ) : (
                  <div className="space-y-6">
                      {upcoming.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="forecast" />
                      ))}
                      {upcoming.total > upcoming.visible.length && (
                          <Button onClick={() => handleViewMore('upcoming')} variant="secondary" className="w-full h-14 rounded-[2rem] border-2 border-dashed border-blue-200 font-black uppercase text-[11px] tracking-[0.2em] bg-blue-50/20 text-blue-600 hover:bg-blue-50 hover:border-blue-300">
                              Load More Forecast ({upcoming.total - upcoming.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: any, urgency: 'critical' | 'high' | 'medium' | 'forecast' }) {
    const ga = p.current_ga;

    const urgencyStyles = {
        critical: "bg-rose-50/50 dark:bg-rose-900/10 ring-rose-200 dark:ring-rose-900/30 glow-rose border-l-[8px] border-l-rose-600",
        high: "bg-emerald-50/50 dark:bg-emerald-900/10 ring-emerald-200 dark:ring-emerald-900/30 glow-emerald border-l-[8px] border-l-emerald-600",
        forecast: "bg-blue-50/50 dark:bg-blue-900/10 ring-blue-200 dark:ring-blue-900/30 glow-blue border-l-[8px] border-l-blue-600",
        medium: "bg-purple-50/50 dark:bg-purple-900/10 ring-purple-200 dark:ring-purple-900/30 border-l-[8px] border-l-purple-600"
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
            <Card className={cn(
                "border-none ring-1 shadow-none rounded-[2.5rem] overflow-hidden transition-all duration-300",
                urgencyStyles[urgency]
            )}>
                <CardContent className="p-8 flex flex-col lg:flex-row items-start lg:items-center gap-8">
                    <div className="flex-1 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{p.name}</h3>
                            <IdBadge id={p.participantId} className="scale-110 origin-right" hideLabel />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black/20 rounded-xl shadow-sm"><Calendar className="h-4 w-4 text-primary" /> GA: {ga.weeks}+{ga.days} Wks</span>
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black/20 rounded-xl shadow-sm"><Hospital className="h-4 w-4 text-primary" /> {p.healthFacility.split(' (')[0]}</span>
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl font-black"><Activity className="h-4 w-4" /> RA: {p.registeredBy}</span>
                        </div>
                        <div className="p-5 bg-white/60 dark:bg-black/10 rounded-[1.5rem] border border-white/40 dark:border-white/5">
                            <p className={cn(
                                "text-sm font-extrabold leading-relaxed",
                                urgency === 'critical' ? "text-rose-700 dark:text-rose-400" : 
                                urgency === 'high' ? "text-emerald-700 dark:text-emerald-400" : 
                                urgency === 'forecast' ? "text-blue-700 dark:text-blue-400" :
                                "text-purple-700 dark:text-purple-400"
                            )}>
                                {urgency === 'critical' ? 'CRITICAL: Protocol threshold passed. Immediate recovery outreach required.' : 
                                urgency === 'high' ? 'PRIORITY: Survey window is officially open. Schedule clinical contact today.' : 
                                urgency === 'forecast' ? 'NOTICE: Window opens within 14 days. Verify contact credentials & availability.' :
                                'UPDATE: Estimated Delivery Date passed. Verify status and prepare for postpartum follow-up.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 lg:pl-10 lg:border-l lg:border-dashed lg:border-slate-300 dark:lg:border-slate-700 shrink-0 w-full lg:w-auto">
                        <div className="grid grid-cols-4 gap-3 bg-white/50 dark:bg-black/20 p-4 rounded-3xl border border-white/30">
                            {[1, 2, 3, 4].map(s => {
                                const isDone = s === 1 || p[`survey${s}_completed`];
                                return (
                                    <div key={s} className="flex flex-col items-center gap-2">
                                        <div className={cn(
                                            "h-10 w-10 rounded-2xl flex items-center justify-center text-[11px] font-black transition-all shadow-sm",
                                            isDone ? "bg-primary text-white shadow-primary/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        )}>
                                            S{s}
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", isDone ? "text-primary" : "text-slate-400")}>
                                            {isDone ? 'DONE' : 'WAIT'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <Button size="lg" className={cn(
                            "h-16 px-10 rounded-[2rem] font-black uppercase tracking-[0.25em] text-[10px] shadow-2xl transition-all active:scale-95 group/btn w-full sm:w-auto",
                            urgency === 'critical' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : 
                            urgency === 'high' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30" :
                            "bg-primary hover:bg-primary/90 shadow-primary/30"
                        )} asChild>
                            <Link href={`/anc/participants/${p.id}`} className="flex items-center gap-3">
                                Start outreach <ChevronRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}