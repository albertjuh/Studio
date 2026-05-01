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
    <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pt-4">
        <div className="flex items-center gap-6">
            <Button variant="secondary" size="icon" asChild className="rounded-2xl h-12 w-12 shadow-sm bg-white dark:bg-slate-900 border border-primary/10">
                <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.25em] text-[9px] mb-1.5">
                    <Timer className="h-3.5 w-3.5" /> Operational Forecast
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">Action <span className="text-primary italic">List</span></h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">
                    Daily Outreach & 14-Day Study Preparation
                </p>
            </div>
        </div>
        <Button variant="outline" className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 shadow-sm hover:bg-muted/50">
            <Download className="mr-2 h-4 w-4 text-primary" /> Export Tasks
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Search dossiers by name or ID..." 
                className="pl-11 h-12 rounded-xl border-none ring-1 ring-primary/10 bg-white dark:bg-slate-900/50 shadow-sm focus:ring-primary/40 focus:ring-2 font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-none ring-1 ring-primary/10 shadow-sm bg-white dark:bg-slate-900/50">
            <Filter className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      <div className="space-y-16">
          {/* Section: Overdue */}
          {overdue.total > 0 && (
              <div className="space-y-6">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-rose-600/30">
                              <AlertCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black tracking-tight uppercase tracking-widest leading-none">Immediate Priorities</h2>
                            <p className="text-[8px] font-black uppercase text-rose-600 mt-1 opacity-80">Timeline Threshold Exceeded</p>
                          </div>
                      </div>
                      <Badge className="bg-rose-50 text-rose-700 border-none font-black text-[10px] px-3 py-1 rounded-full">{overdue.total} Tasks</Badge>
                  </div>
                  <div className="grid gap-4">
                      {overdue.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="critical" />
                      ))}
                      {overdue.total > overdue.visible.length && (
                          <Button onClick={() => handleViewMore('overdue')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed border-rose-200 font-black uppercase text-[10px] tracking-widest bg-rose-50/20 text-rose-600 hover:bg-rose-50">
                              Load More Overdue ({overdue.total - overdue.visible.length})
                          </Button>
                      )}
                  </div>
              </div>
          )}

          {/* Section: Due Now */}
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-emerald-600/30">
                          <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight uppercase tracking-widest leading-none">Active Windows</h2>
                        <p className="text-[8px] font-black uppercase text-emerald-600 mt-1 opacity-80">Survey Collection Due Today</p>
                      </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[10px] px-3 py-1 rounded-full">{dueNow.total} Tasks</Badge>
              </div>
              {dueNow.total === 0 ? (
                  <div className="py-16 text-center bg-emerald-50/10 border-2 border-dashed border-emerald-100 rounded-[2.5rem] text-slate-400 font-black italic text-xs">
                      SYSTEM CLEAR: ALL WINDOWS ACCOUNTED FOR
                  </div>
              ) : (
                  <div className="grid gap-4">
                      {dueNow.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="high" />
                      ))}
                      {dueNow.total > dueNow.visible.length && (
                          <Button onClick={() => handleViewMore('dueNow')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed border-emerald-200 font-black uppercase text-[10px] tracking-widest bg-emerald-50/20 text-emerald-600 hover:bg-emerald-50">
                              Load More Due ({dueNow.total - dueNow.visible.length})
                          </Button>
                      )}
                  </div>
              )}
          </div>

          {/* Section: Forecast (Upcoming) */}
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30">
                          <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight uppercase tracking-widest leading-none">14-Day Forecast</h2>
                        <p className="text-[8px] font-black uppercase text-blue-600 mt-1 opacity-80">Early Protocol Preparation</p>
                      </div>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[10px] px-3 py-1 rounded-full">{upcoming.total} Forecasts</Badge>
              </div>
              {upcoming.total === 0 ? (
                  <div className="py-16 text-center bg-muted/20 border-2 border-dashed rounded-[2.5rem] text-muted-foreground font-bold italic text-[10px] uppercase tracking-widest">
                      No windows opening in the next cycle.
                  </div>
              ) : (
                  <div className="grid gap-4">
                      {upcoming.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="forecast" />
                      ))}
                      {upcoming.total > upcoming.visible.length && (
                          <Button onClick={() => handleViewMore('upcoming')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed border-blue-200 font-black uppercase text-[10px] tracking-widest bg-blue-50/20 text-blue-600 hover:bg-blue-50">
                              Load More Forecast ({upcoming.total - upcoming.visible.length})
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
        critical: "bg-rose-50/30 dark:bg-rose-900/5 ring-rose-200/50 dark:ring-rose-900/20 border-l-[6px] border-l-rose-600",
        high: "bg-emerald-50/30 dark:bg-emerald-900/5 ring-emerald-200/50 dark:ring-emerald-900/20 border-l-[6px] border-l-emerald-600",
        forecast: "bg-blue-50/30 dark:bg-blue-900/5 ring-blue-200/50 dark:ring-blue-900/20 border-l-[6px] border-l-blue-600",
        medium: "bg-purple-50/30 dark:bg-purple-900/5 ring-purple-200/50 dark:ring-purple-900/20 border-l-[6px] border-l-purple-600"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
            <Card className={cn(
                "border-none ring-1 shadow-sm rounded-3xl overflow-hidden transition-all duration-300",
                urgencyStyles[urgency]
            )}>
                <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 min-w-0 space-y-3.5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 truncate">
                                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white truncate leading-none">{p.name}</h3>
                                <IdBadge id={p.participantId} className="scale-90 origin-left" hideLabel />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">EDD: {format(p.edd, 'MMM d, yy')}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="bg-white/80 dark:bg-black/20 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-none text-slate-600">
                                <Calendar className="h-3 w-3 mr-1.5 text-primary" /> {ga.weeks}+{ga.days} Wks
                            </Badge>
                            <Badge variant="outline" className="bg-white/80 dark:bg-black/20 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-none text-slate-600">
                                <Hospital className="h-3 w-3 mr-1.5 text-primary" /> {p.healthFacility.split(' (')[0]}
                            </Badge>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-none">
                                <UserCheck className="h-3 w-3 mr-1.5" /> RA: {p.registeredBy}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                urgency === 'critical' ? "bg-rose-500" : urgency === 'high' ? "bg-emerald-500" : "bg-blue-500"
                            )} />
                            <p className={cn(
                                "text-[11px] font-bold leading-tight",
                                urgency === 'critical' ? "text-rose-700" : urgency === 'high' ? "text-emerald-700" : "text-blue-700"
                            )}>
                                {urgency === 'critical' ? 'Passed protocol threshold. Recovery outreach required.' : 
                                urgency === 'high' ? 'Survey window open. Schedule contact today.' : 
                                'Window opens in 14 days. Verify contact availability.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 w-full md:w-auto pl-0 md:pl-6 md:border-l md:border-dashed md:border-slate-200">
                        <div className="flex gap-1.5 items-center">
                            {[1, 2, 3, 4].map(s => {
                                const isDone = s === 1 || p[`survey${s}_completed`];
                                return (
                                    <div key={s} className="flex flex-col items-center gap-1">
                                        <div className={cn(
                                            "h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shadow-none",
                                            isDone ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        )}>
                                            S{s}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <Button className={cn(
                            "h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg transition-all active:scale-95 group/btn flex-1 md:flex-none",
                            urgency === 'critical' ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : 
                            urgency === 'high' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" :
                            "bg-primary hover:bg-primary/90 shadow-primary/20"
                        )} asChild>
                            <Link href={`/anc/participants/${p.id}`} className="flex items-center gap-2">
                                Outreach <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
