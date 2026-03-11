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
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { type AncRegistration } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { resolveParticipantStatuses } from '@/lib/timeline/formulas';

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
    
    const resolved = participants.map(p => resolveParticipantStatuses(p));

    const overdue = resolved.filter(p => p.overall_status === 'overdue');
    const dueNow = resolved.filter(p => p.overall_status === 'action_needed');
    const likelyDelivered = resolved.filter(p => p.delivery_status === 'likely_delivered' || p.delivery_status === 'overdue_pregnancy');
    
    const upcoming = resolved.filter(p => 
        (p.survey2_status === 'due_soon' || p.survey3_status === 'due_soon' || p.survey4_status === 'due_soon') &&
        p.overall_status !== 'overdue' && 
        p.overall_status !== 'action_needed'
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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Organizing Action & Forecast List...</p>
    </div>
  );

  const overdue = filterAndLimit(prioritizedList.overdue, 'overdue');
  const dueNow = filterAndLimit(prioritizedList.dueNow, 'dueNow');
  const likelyDelivered = filterAndLimit(prioritizedList.likelyDelivered, 'likelyDelivered');
  const upcoming = filterAndLimit(prioritizedList.upcoming, 'upcoming');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
            <Button variant="secondary" size="icon" asChild className="rounded-xl h-11 w-11">
                <Link href="/anc/activities"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-black tracking-tighter">Action & Forecast</h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Study Protocol: Daily Outreach & 14-Day Preparation
                </p>
            </div>
        </div>
        <Button variant="outline" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest border-2">
            <Download className="mr-2 h-5 w-5" /> Export for WhatsApp
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search action list..." 
                className="pl-10 h-12 rounded-2xl border-2 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2">
            <Filter className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-16 pt-4">
          {/* Section: Overdue */}
          {overdue.total > 0 && (
              <div className="space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Immediate Priority (Overdue)</h2>
                  </div>
                  <div className="space-y-4">
                      {overdue.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="critical" />
                      ))}
                      {overdue.total > overdue.visible.length && (
                          <Button onClick={() => handleViewMore('overdue')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed font-black uppercase text-[10px] tracking-widest">
                              View More Overdue ({overdue.total - overdue.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              </div>
          )}

          {/* Section: Due Now */}
          <div className="space-y-6">
              <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Active Follow-up Windows</h2>
              </div>
              {dueNow.total === 0 ? (
                  <div className="py-12 text-center bg-muted/20 border-2 border-dashed rounded-[2.5rem] text-muted-foreground font-bold italic">
                      No active windows opening today.
                  </div>
              ) : (
                  <div className="space-y-4">
                      {dueNow.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="high" />
                      ))}
                      {dueNow.total > dueNow.visible.length && (
                          <Button onClick={() => handleViewMore('dueNow')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed font-black uppercase text-[10px] tracking-widest">
                              View More Due ({dueNow.total - dueNow.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              )}
          </div>

          {/* Section: Forecast (Upcoming) */}
          <div className="space-y-6">
              <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Early Prep (1-2 Week Forecast)</h2>
              </div>
              {upcoming.total === 0 ? (
                  <div className="py-12 text-center bg-muted/20 border-2 border-dashed rounded-[2.5rem] text-muted-foreground font-bold italic text-xs">
                      No windows opening in the next 14 days.
                  </div>
              ) : (
                  <div className="space-y-4">
                      {upcoming.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="forecast" />
                      ))}
                      {upcoming.total > upcoming.visible.length && (
                          <Button onClick={() => handleViewMore('upcoming')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed font-black uppercase text-[10px] tracking-widest">
                              View More Forecast ({upcoming.total - upcoming.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              )}
          </div>

          {/* Section: Likely Delivered */}
          {likelyDelivered.total > 0 && (
              <div className="space-y-6">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Baby className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="text-xl font-black tracking-tight uppercase tracking-widest">Postpartum Verification</h2>
                  </div>
                  <div className="space-y-4">
                      {likelyDelivered.visible.map(p => (
                          <ActionCard key={p.id} participant={p} urgency="medium" />
                      ))}
                      {likelyDelivered.total > likelyDelivered.visible.length && (
                          <Button onClick={() => handleViewMore('likelyDelivered')} variant="secondary" className="w-full h-12 rounded-2xl border-2 border-dashed font-black uppercase text-[10px] tracking-widest">
                              View More Delivered ({likelyDelivered.total - likelyDelivered.visible.length}) <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}

function ActionCard({ participant: p, urgency }: { participant: any, urgency: 'critical' | 'high' | 'medium' | 'forecast' }) {
    const ga = p.current_ga;

    return (
        <Card className={cn(
            "border-none ring-1 ring-border shadow-none rounded-[2rem] overflow-hidden transition-all hover:ring-primary/40",
            urgency === 'critical' ? "bg-rose-50/30 dark:bg-rose-900/10 ring-rose-100 dark:ring-rose-900/30" : 
            urgency === 'high' ? "bg-emerald-50/30 dark:bg-emerald-900/10 ring-emerald-100 dark:ring-emerald-900/30" : 
            urgency === 'forecast' ? "bg-blue-50/30 dark:bg-blue-900/10 ring-blue-100 dark:ring-blue-900/30" :
            "bg-purple-50/30 dark:bg-purple-900/10 ring-purple-100 dark:ring-purple-900/30"
        )}>
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black tracking-tight">{p.name}</h3>
                        <Badge variant="outline" className="bg-background font-black text-[8px] uppercase tracking-widest px-2 border-2">
                            {p.participantId}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> GA: {ga.weeks}+{ga.days} Wks</span>
                        <span className="flex items-center gap-1.5"><Hospital className="h-3 w-3" /> {p.healthFacility.split(' (')[0]}</span>
                        <span className="flex items-center gap-1.5 font-black text-primary"><Phone className="h-3 w-3" /> RA: {p.registeredBy}</span>
                    </div>
                    <p className={cn(
                        "text-xs font-bold leading-relaxed",
                        urgency === 'critical' ? "text-rose-600 dark:text-rose-400" : 
                        urgency === 'high' ? "text-emerald-600 dark:text-emerald-400" : 
                        urgency === 'forecast' ? "text-blue-600 dark:text-blue-400" :
                        "text-purple-600 dark:text-purple-400"
                    )}>
                        {urgency === 'critical' ? 'Survey window passed - immediate outreach required.' : 
                         urgency === 'high' ? 'Survey window is open - schedule contact today.' : 
                         urgency === 'forecast' ? 'Window opens in 7-14 days - confirm contact info.' :
                         'EDD passed - verify delivery status & schedule S4.'}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold border-2 bg-background" asChild>
                        <Link href={`/anc/participants/${p.id}`}><Activity className="mr-2 h-4 w-4" /> Profile</Link>
                    </Button>
                    <Button size="sm" className="h-10 rounded-xl font-bold shadow-none" asChild>
                        <Link href={`/anc/participants/${p.id}`}>
                            {urgency === 'forecast' ? 'Prep Profile' : 'Action Item'} <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}